package guestpolicy

import (
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
)

// GuestServiceUser identifies only the dedicated, non-login service wallet.
func GuestServiceUser(id int) bool {
	configured, err := strconv.Atoi(os.Getenv("APINET_GUEST_SERVICE_USER_ID"))
	return err == nil && configured > 0 && id == configured
}

// ValidateGuestBilling pins the actual billing snapshot, not a public pricing cache.
// The isolated gateway reserves the complete audited per-call price before ingress.
func ValidateGuestBilling(c *gin.Context, info *relaycommon.RelayInfo) *types.NewAPIError {
	if !GuestServiceUser(info.UserId) {
		return nil
	}
	deny := func() *types.NewAPIError {
		return types.NewErrorWithStatusCode(fmt.Errorf("guest pricing or request policy unavailable"), types.ErrorCodeInvalidRequest, http.StatusForbidden, types.ErrOptionWithSkipRetry())
	}
	if os.Getenv("APINET_GUEST_SPENDING_ENABLED") != "true" || c.Request.Method != "POST" || c.Request.URL.Path != "/v1/chat/completions" {
		return deny()
	}
	p := info.PriceData
	expected, allowed := Prices[info.OriginModelName]
	reserved, err := strconv.Atoi(c.GetHeader("X-Guest-Reserve-Micros"))
	if !allowed || err != nil || reserved != int(expected*1000000+0.5) || !p.UsePrice || p.FreeModel || p.ModelPrice != expected || p.GroupRatioInfo.GroupRatio != 1 || p.GroupRatioInfo.HasSpecialRatio || len(p.OtherRatios()) != 0 || info.TieredBillingSnapshot != nil || common.QuotaPerUnit != 500000 {
		return deny()
	}
	if info.ChannelMeta != nil && (info.ChannelType != 1 || len(info.ChannelMeta.ParamOverride) != 0 || info.ChannelMeta.ChannelSetting.PassThroughBodyEnabled || info.ChannelMeta.ChannelSetting.SystemPrompt != "") {
		return deny()
	}
	r, ok := info.Request.(*dto.GeneralOpenAIRequest)
	if !ok || r.MaxTokens == nil || *r.MaxTokens == 0 || *r.MaxTokens > 512 || r.MaxCompletionTokens != nil || (r.Stream != nil && *r.Stream) || (r.N != nil && *r.N != 1) || len(r.Tools) != 0 || len(r.Functions) != 0 || r.WebSearchOptions != nil || len(r.ExtraBody) != 0 || len(r.Modalities) != 0 || len(r.Audio) != 0 || len(r.ServiceTier) != 0 || len(r.SearchParameters) != 0 || len(r.EnableSearch) != 0 || len(r.WebSearch) != 0 || len(r.Messages) == 0 || len(r.Messages) > 20 {
		return deny()
	}
	total := 0
	for _, m := range r.Messages {
		text, ok := m.Content.(string)
		if !ok || (m.Role != "user" && m.Role != "assistant") || len(m.ToolCalls) != 0 || m.ToolCallId != "" {
			return deny()
		}
		total += len(text)
	}
	if total > 16000 {
		return deny()
	}
	info.ForcePreConsume = true
	return nil
}
