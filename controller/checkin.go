package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// checkTelegramSubscription проверяет подписку пользователя на Telegram-канал.
// Возвращает "NEED_TELEGRAM_LINK" если аккаунт не привязан,
// "NEED_TELEGRAM_SUBSCRIPTION" если не подписан на канал.
func checkTelegramSubscription(userId int, channelId string) error {
	if channelId == "" || common.TelegramBotToken == "" {
		return nil
	}

	user, err := model.GetUserById(userId, false)
	if err != nil || user == nil || user.TelegramId == "" {
		return fmt.Errorf("NEED_TELEGRAM_LINK")
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/getChatMember?chat_id=%s&user_id=%s",
		common.TelegramBotToken, channelId, user.TelegramId)

	resp, err := http.Get(url) //nolint:noctx
	if err != nil {
		return nil // сетевая ошибка — пропускаем проверку
	}
	defer resp.Body.Close()

	var result struct {
		Ok     bool `json:"ok"`
		Result struct {
			Status string `json:"status"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil
	}
	if !result.Ok {
		return nil
	}

	status := result.Result.Status
	if status == "left" || status == "kicked" || status == "" {
		return fmt.Errorf("NEED_TELEGRAM_SUBSCRIPTION")
	}
	return nil
}

func GetCheckinStatus(c *gin.Context) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "签到功能未启用")
		return
	}
	userId := c.GetInt("id")
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))

	stats, err := model.GetUserCheckinStats(userId, month)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":             setting.Enabled,
			"min_quota":           setting.MinQuota,
			"max_quota":           setting.MaxQuota,
			"telegram_channel_id": setting.TelegramChannelId,
			"stats":               stats,
		},
	})
}

func DoCheckin(c *gin.Context) {
	setting := operation_setting.GetCheckinSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "签到功能未启用")
		return
	}

	userId := c.GetInt("id")

	if err := checkTelegramSubscription(userId, setting.TelegramChannelId); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	checkin, err := model.UserCheckin(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("用户签到，获得额度 %s (连续第%d天)", logger.LogQuota(checkin.QuotaAwarded), checkin.Streak))
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "签到成功",
		"data": gin.H{
			"quota_awarded": checkin.QuotaAwarded,
			"checkin_date":  checkin.CheckinDate,
			"streak":        checkin.Streak,
			"is_milestone":  model.IsMilestoneStreak(checkin.Streak),
		},
	})
}
