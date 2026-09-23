package model

import (
	"errors"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func budgetTestDB(t *testing.T, token Token) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "budget.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = sqlDB.Close() })
	old := DB
	DB = db
	t.Cleanup(func() { DB = old })
	if err := db.AutoMigrate(&Token{}); err != nil {
		t.Fatal(err)
	}
	token.Id, token.UserId, token.Key, token.GatewayEnabled = 1, 1, "budget-test", true
	if err := db.Create(&token).Error; err != nil {
		t.Fatal(err)
	}
	return db
}

func TestGatewayBudgetConcurrentReservationsAndRefund(t *testing.T) {
	db := budgetTestDB(t, Token{GatewayDailyLimit: 30, GatewayMonthlyLimit: 40, GatewayConcurrencyLimit: 3})
	const n = 16
	results := make(chan *GatewayBudgetReservation, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := &GatewayBudgetReservation{TokenID: 1}
			if r.Reserve(10) == nil {
				results <- r
			}
		}()
	}
	wg.Wait()
	close(results)
	var winners []*GatewayBudgetReservation
	for r := range results {
		winners = append(winners, r)
	}
	if len(winners) != 3 {
		t.Fatalf("expected three winners, got %d", len(winners))
	}
	var token Token
	if err := db.First(&token, 1).Error; err != nil {
		t.Fatal(err)
	}
	if token.GatewayDailyUsed != 30 || token.GatewayMonthlyUsed != 30 || token.GatewayActiveRequests != 3 {
		t.Fatalf("unexpected reserved counters: %+v", token)
	}
	if err := winners[0].Finish(0); err != nil {
		t.Fatal(err)
	}
	if err := winners[0].Finish(0); err != nil {
		t.Fatal(err)
	}
	replacement := &GatewayBudgetReservation{TokenID: 1}
	if err := replacement.Reserve(10); err != nil {
		t.Fatalf("refunded reservation must be reusable: %v", err)
	}
	if err := replacement.Reserve(20); !errors.Is(err, ErrGatewayBudgetExceeded) {
		t.Fatalf("increase over daily cap must fail: %v", err)
	}
	if err := replacement.Finish(15); err != nil {
		t.Fatal(err)
	}
	if err := db.First(&token, 1).Error; err != nil {
		t.Fatal(err)
	}
	if token.GatewayDailyUsed != 35 || token.GatewayMonthlyUsed != 35 || token.GatewayActiveRequests != 2 {
		t.Fatalf("unexpected settled counters: %+v", token)
	}
}

func TestGatewayBudgetDayAndMonthRollover(t *testing.T) {
	db := budgetTestDB(t, Token{GatewayDailyLimit: 10, GatewayMonthlyLimit: 15})
	jan31 := time.Date(2026, 1, 31, 23, 59, 0, 0, time.UTC)
	feb1 := jan31.Add(2 * time.Minute)
	a := &GatewayBudgetReservation{TokenID: 1}
	if err := a.reserveAt(10, jan31); err != nil {
		t.Fatal(err)
	}
	b := &GatewayBudgetReservation{TokenID: 1}
	if err := b.reserveAt(10, feb1); err != nil {
		t.Fatal(err)
	}
	// Completing the previous period must not subtract from the new period.
	if err := a.Finish(0); err != nil {
		t.Fatal(err)
	}
	var token Token
	if err := db.First(&token, 1).Error; err != nil {
		t.Fatal(err)
	}
	// AfterFind presents current-date counters as zero; inspect persisted
	// counters directly because this test uses a synthetic historical date.
	var used struct {
		Day, Month             int64
		DailyUsed, MonthlyUsed int64
		Active                 int
	}
	if err := db.Raw("SELECT gateway_day AS day, gateway_month AS month, gateway_daily_used AS daily_used, gateway_monthly_used AS monthly_used, gateway_active_requests AS active FROM tokens WHERE id = 1").Scan(&used).Error; err != nil {
		t.Fatal(err)
	}
	if used.Day != gatewayDay(feb1) || used.Month != gatewayMonth(feb1) || used.DailyUsed != 10 || used.MonthlyUsed != 10 || used.Active != 1 {
		t.Fatalf("new period corrupted by late refund: %+v", used)
	}
	if err := b.reserveAt(15, feb1); !errors.Is(err, ErrGatewayBudgetExceeded) {
		t.Fatalf("daily cap must still apply after rollover: %v", err)
	}
}

func TestGatewayBudgetFallbackReusesOneReservation(t *testing.T) {
	db := budgetTestDB(t, Token{GatewayDailyLimit: 30, GatewayMonthlyLimit: 30, GatewayConcurrencyLimit: 1})
	r := &GatewayBudgetReservation{TokenID: 1}
	for _, target := range []int64{10, 10, 20, 12} {
		if err := r.Reserve(target); err != nil {
			t.Fatal(err)
		}
	}
	if err := r.Finish(15); err != nil {
		t.Fatal(err)
	}
	var token Token
	if err := db.First(&token, 1).Error; err != nil {
		t.Fatal(err)
	}
	if token.GatewayDailyUsed != 15 || token.GatewayMonthlyUsed != 15 || token.GatewayActiveRequests != 0 {
		t.Fatalf("fallback double-counted: %+v", token)
	}
}
