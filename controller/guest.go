package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/guestpolicy"
	"github.com/QuantumNous/new-api/setting/billing_setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
	"net/http"
	"regexp"
)

// Server-to-server only: TokenAuth retains wallet status and exact IP restriction.
func GuestCatalog(c *gin.Context) {
	if !guestpolicy.GuestServiceUser(c.GetInt("id")) {
		c.AbortWithStatus(403)
		return
	}
	active := model.GetGroupEnabledModels("default")
	abilities, err := model.GetAllEnableAbilityWithChannels()
	if err != nil {
		c.AbortWithStatus(503)
		return
	}
	safeRoute := map[string]bool{}
	for _, ability := range abilities {
		if ability.Group != "default" || ability.ChannelType != 1 {
			continue
		}
		channel, err := model.GetChannelById(ability.ChannelId, false)
		if err == nil && channel.Status == 1 && len(channel.GetParamOverride()) == 0 && !channel.GetSetting().PassThroughBodyEnabled && channel.GetSetting().SystemPrompt == "" {
			safeRoute[ability.Model] = true
		}
	}
	rows := make([]gin.H, 0, len(active))
	for _, name := range active {
		price, fixed := ratio_setting.GetModelPrice(name, false)
		expected, audited := guestpolicy.Prices[name]
		reason := "UNSUPPORTED_OR_UNAUDITED_MODEL"
		if !fixed {
			reason = "TOKEN_BILLING_NOT_BOUNDED"
		}
		if billing_setting.GetBillingMode(name) != billing_setting.BillingModeRatio {
			reason = "DYNAMIC_BILLING_NOT_BOUNDED"
		}
		if fixed && price > .5 {
			reason = "PRICE_EXCEEDS_TOTAL_CREDIT"
		}
		enabled := audited && fixed && price == expected && price > 0 && price <= .5 && ratio_setting.GetGroupRatio("default") == 1 && safeRoute[name] && billing_setting.GetBillingMode(name) == billing_setting.BillingModeRatio
		if enabled {
			reason = ""
		} else if audited {
			reason = "PRICE_CHANGED_OR_UNAVAILABLE"
		}
		rows = append(rows, gin.H{"id": name, "priceUSD": price, "enabled": enabled, "reason": reason, "maxOutputTokens": 512})
	}
	c.JSON(http.StatusOK, gin.H{"models": rows})
}

var guestReceiptID = regexp.MustCompile(`^[A-Za-z0-9_-]{8,64}$`)

func GuestReceipt(c *gin.Context) {
	if !guestpolicy.GuestServiceUser(c.GetInt("id")) || !guestReceiptID.MatchString(c.Param("id")) {
		c.AbortWithStatus(403)
		return
	}
	var logs []model.Log
	err := model.LOG_DB.Where("user_id = ? AND token_id = ? AND request_id = ? AND type = ?", c.GetInt("id"), c.GetInt("token_id"), c.Param("id"), model.LogTypeConsume).Limit(2).Find(&logs).Error
	if err != nil || len(logs) != 1 {
		c.JSON(202, gin.H{"final": false})
		return
	}
	var other map[string]interface{}
	_ = common.UnmarshalJsonStr(logs[0].Other, &other)
	if other["guest_settled"] != true {
		c.JSON(202, gin.H{"final": false})
		return
	}
	c.JSON(200, gin.H{"final": true, "requestId": logs[0].RequestId, "model": logs[0].ModelName, "chargedMicros": logs[0].Quota * 2})
}
