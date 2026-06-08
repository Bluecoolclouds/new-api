package model

import (
	"errors"
	"math/rand"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

// Checkin 签到记录
type Checkin struct {
	Id           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId       int    `json:"user_id" gorm:"not null;uniqueIndex:idx_user_checkin_date"`
	CheckinDate  string `json:"checkin_date" gorm:"type:varchar(10);not null;uniqueIndex:idx_user_checkin_date"` // 格式: YYYY-MM-DD
	QuotaAwarded int    `json:"quota_awarded" gorm:"not null"`
	Streak       int    `json:"streak" gorm:"default:0"` // 签到时的连续天数
	CreatedAt    int64  `json:"created_at" gorm:"bigint"`
}

// CheckinRecord 用于API返回的签到记录（不包含敏感字段）
type CheckinRecord struct {
	CheckinDate  string `json:"checkin_date"`
	QuotaAwarded int    `json:"quota_awarded"`
	Streak       int    `json:"streak"`
}

// streakMilestones — дни стрика с супер-наградой и множителем
var streakMilestones = map[int]float64{
	7:  3.0,
	15: 5.0,
	25: 7.0,
	31: 10.0,
}

func (Checkin) TableName() string {
	return "checkins"
}

// GetUserCheckinRecords 获取用户在指定日期范围内的签到记录
func GetUserCheckinRecords(userId int, startDate, endDate string) ([]Checkin, error) {
	var records []Checkin
	err := DB.Where("user_id = ? AND checkin_date >= ? AND checkin_date <= ?",
		userId, startDate, endDate).
		Order("checkin_date DESC").
		Find(&records).Error
	return records, err
}

// HasCheckedInToday 检查用户今天是否已签到
func HasCheckedInToday(userId int) (bool, error) {
	today := time.Now().Format("2006-01-02")
	var count int64
	err := DB.Model(&Checkin{}).
		Where("user_id = ? AND checkin_date = ?", userId, today).
		Count(&count).Error
	return count > 0, err
}

// GetUserStreak вычисляет текущий стрик непрерывных чекинов.
// alreadyCheckedToday=true — считать от сегодня; false — от вчера (до нынешнего чекина).
func GetUserStreak(userId int, alreadyCheckedToday bool) int {
	var dates []string
	DB.Model(&Checkin{}).
		Where("user_id = ?", userId).
		Order("checkin_date DESC").
		Limit(40).
		Pluck("checkin_date", &dates)

	if len(dates) == 0 {
		return 0
	}

	startOffset := 0
	if !alreadyCheckedToday {
		startOffset = 1
	}

	streak := 0
	for i := 0; i < len(dates); i++ {
		expected := time.Now().AddDate(0, 0, -(startOffset + i)).Format("2006-01-02")
		if dates[i] == expected {
			streak++
		} else {
			break
		}
	}
	return streak
}

// calculateStreakMultiplier возвращает множитель награды для данного дня стрика.
func calculateStreakMultiplier(streak int) float64 {
	if mult, ok := streakMilestones[streak]; ok {
		return mult
	}
	base := 1.0 + float64(streak-1)*0.05
	if base > 2.5 {
		base = 2.5
	}
	return base
}

// IsMilestoneStreak проверяет, является ли данный стрик майлстоуном.
func IsMilestoneStreak(streak int) bool {
	_, ok := streakMilestones[streak]
	return ok
}

// UserCheckin 执行用户签到
func UserCheckin(userId int) (*Checkin, error) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		return nil, errors.New("签到功能未启用")
	}

	hasChecked, err := HasCheckedInToday(userId)
	if err != nil {
		return nil, err
	}
	if hasChecked {
		return nil, errors.New("今日已签到")
	}

	prevStreak := GetUserStreak(userId, false)
	newStreak := prevStreak + 1

	base := setting.MinQuota
	if setting.MaxQuota > setting.MinQuota {
		base = setting.MinQuota + rand.Intn(setting.MaxQuota-setting.MinQuota+1)
	}
	mult := calculateStreakMultiplier(newStreak)
	quotaAwarded := int(float64(base) * mult)

	today := time.Now().Format("2006-01-02")
	checkin := &Checkin{
		UserId:       userId,
		CheckinDate:  today,
		QuotaAwarded: quotaAwarded,
		Streak:       newStreak,
		CreatedAt:    time.Now().Unix(),
	}

	if common.UsingSQLite {
		return userCheckinWithoutTransaction(checkin, userId, quotaAwarded)
	}
	return userCheckinWithTransaction(checkin, userId, quotaAwarded)
}

func userCheckinWithTransaction(checkin *Checkin, userId int, quotaAwarded int) (*Checkin, error) {
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(checkin).Error; err != nil {
			return errors.New("签到失败，请稍后重试")
		}
		if err := tx.Model(&User{}).Where("id = ?", userId).
			Update("quota", gorm.Expr("quota + ?", quotaAwarded)).Error; err != nil {
			return errors.New("签到失败：更新额度出错")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	go func() {
		_ = cacheIncrUserQuota(userId, int64(quotaAwarded))
	}()
	return checkin, nil
}

func userCheckinWithoutTransaction(checkin *Checkin, userId int, quotaAwarded int) (*Checkin, error) {
	if err := DB.Create(checkin).Error; err != nil {
		return nil, errors.New("签到失败，请稍后重试")
	}
	if err := IncreaseUserQuota(userId, quotaAwarded, true); err != nil {
		DB.Delete(checkin)
		return nil, errors.New("签到失败：更新额度出错")
	}
	return checkin, nil
}

// GetUserCheckinStats 获取用户签到统计信息
func GetUserCheckinStats(userId int, month string) (map[string]interface{}, error) {
	startDate := month + "-01"
	endDate := month + "-31"

	records, err := GetUserCheckinRecords(userId, startDate, endDate)
	if err != nil {
		return nil, err
	}

	checkinRecords := make([]CheckinRecord, len(records))
	for i, r := range records {
		checkinRecords[i] = CheckinRecord{
			CheckinDate:  r.CheckinDate,
			QuotaAwarded: r.QuotaAwarded,
			Streak:       r.Streak,
		}
	}

	hasCheckedToday, _ := HasCheckedInToday(userId)
	currentStreak := GetUserStreak(userId, hasCheckedToday)

	var totalCheckins int64
	var totalQuota int64
	DB.Model(&Checkin{}).Where("user_id = ?", userId).Count(&totalCheckins)
	DB.Model(&Checkin{}).Where("user_id = ?", userId).Select("COALESCE(SUM(quota_awarded), 0)").Scan(&totalQuota)

	return map[string]interface{}{
		"total_quota":      totalQuota,
		"total_checkins":   totalCheckins,
		"checkin_count":    len(records),
		"checked_in_today": hasCheckedToday,
		"current_streak":   currentStreak,
		"records":          checkinRecords,
	}, nil
}
