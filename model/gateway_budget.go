package model

import (
	"errors"
	"fmt"
	"time"
)

func gatewayDay(t time.Time) int64 { return t.UTC().Unix() / 86400 }
func gatewayMonth(t time.Time) int64 {
	t = t.UTC()
	return int64(t.Year()*12 + int(t.Month()))
}

// GatewayBudgetReservation belongs to one request, including all its fallback attempts.
// Amounts are quota units (the same currency-backed units used by wallet billing).
type GatewayBudgetReservation struct {
	TokenID    int
	Day, Month int64
	Amount     int64
	Active     bool
}

var ErrGatewayBudgetExceeded = errors.New("AI Gateway budget or parallel request limit reached")

func (r *GatewayBudgetReservation) Reserve(target int64) error {
	return r.reserveAt(target, time.Now().UTC())
}

func (r *GatewayBudgetReservation) reserveAt(target int64, now time.Time) error {
	if target < 0 {
		return errors.New("negative gateway reservation")
	}
	day, month := gatewayDay(now), gatewayMonth(now)
	sameDay, sameMonth := r.Active && r.Day == day, r.Active && r.Month == month
	dayDelta, monthDelta := target, target
	if sameDay {
		dayDelta -= r.Amount
	}
	if sameMonth {
		monthDelta -= r.Amount
	}
	if r.Active && sameDay && sameMonth && target <= r.Amount {
		return nil
	}
	acquire := 0
	if !r.Active {
		acquire = 1
	}
	// One conditional SQL UPDATE serializes competing reservations on the token row.
	// CASE resets period counters within that same write; no stale read can bypass a limit.
	// Explicit assignment order matters on MySQL: evaluate the old period
	// before overwriting it. PostgreSQL and SQLite also accept this statement.
	result := DB.Exec(`UPDATE tokens SET
		gateway_daily_used = (CASE WHEN gateway_day = ? THEN gateway_daily_used ELSE 0 END) + ?,
		gateway_monthly_used = (CASE WHEN gateway_month = ? THEN gateway_monthly_used ELSE 0 END) + ?,
		gateway_day = ?, gateway_month = ?,
		gateway_active_requests = gateway_active_requests + ?
		WHERE id = ? AND deleted_at IS NULL AND gateway_enabled = ?
		AND (gateway_concurrency_limit = 0 OR gateway_active_requests + ? <= gateway_concurrency_limit)
		AND (gateway_daily_limit = 0 OR (CASE WHEN gateway_day = ? THEN gateway_daily_used ELSE 0 END) + ? <= gateway_daily_limit)
		AND (gateway_monthly_limit = 0 OR (CASE WHEN gateway_month = ? THEN gateway_monthly_used ELSE 0 END) + ? <= gateway_monthly_limit)`,
		day, dayDelta, month, monthDelta, day, month, acquire, r.TokenID, true,
		acquire, day, dayDelta, month, monthDelta)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return ErrGatewayBudgetExceeded
	}
	r.Active, r.Day, r.Month, r.Amount = true, day, month, target
	return nil
}

// Finish releases the slot once and reconciles the reservation against actual
// cost. Settlement may exceed the estimate; the excess remains visible and
// subsequent requests are blocked until the next period.
func (r *GatewayBudgetReservation) Finish(actual int64) error {
	if !r.Active {
		return nil
	}
	if actual < 0 {
		return fmt.Errorf("negative gateway charge")
	}
	delta := actual - r.Amount
	result := DB.Exec(`UPDATE tokens SET
		gateway_daily_used = CASE WHEN gateway_day = ? THEN gateway_daily_used + ? ELSE gateway_daily_used END,
		gateway_monthly_used = CASE WHEN gateway_month = ? THEN gateway_monthly_used + ? ELSE gateway_monthly_used END,
		gateway_active_requests = CASE WHEN gateway_active_requests > 0 THEN gateway_active_requests - 1 ELSE 0 END
		WHERE id = ?`, r.Day, delta, r.Month, delta, r.TokenID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return fmt.Errorf("gateway budget token not found")
	}
	r.Active = false
	return nil
}
