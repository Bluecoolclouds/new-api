package service

import (
	"fmt"
	"github.com/QuantumNous/new-api/common"
	guestpolicy "github.com/QuantumNous/new-api/pkg/guestpolicy"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"net/http"
)

// GuestServiceUser identifies the dedicated trial wallet without affecting paid users.
func GuestServiceUser(id int) bool { return guestpolicy.GuestServiceUser(id) }
func ValidateGuestBilling(c *gin.Context, info *relaycommon.RelayInfo) *types.NewAPIError {
	if GuestServiceUser(info.UserId) {
		var raw map[string]interface{}
		if err := common.UnmarshalBodyReusable(c, &raw); err != nil || len(raw) == 0 {
			return types.NewErrorWithStatusCode(fmt.Errorf("guest body denied"), types.ErrorCodeInvalidRequest, http.StatusForbidden, types.ErrOptionWithSkipRetry())
		}
		if messages, ok := raw["messages"].([]interface{}); ok {
			for _, message := range messages {
				fields, ok := message.(map[string]interface{})
				if !ok {
					return types.NewErrorWithStatusCode(fmt.Errorf("guest message denied"), types.ErrorCodeInvalidRequest, http.StatusForbidden, types.ErrOptionWithSkipRetry())
				}
				for key := range fields {
					if key != "role" && key != "content" {
						return types.NewErrorWithStatusCode(fmt.Errorf("guest message field denied"), types.ErrorCodeInvalidRequest, http.StatusForbidden, types.ErrOptionWithSkipRetry())
					}
				}
			}
		}
		for key := range raw {
			switch key {
			case "model", "messages", "max_tokens", "stream", "n":
			default:
				return types.NewErrorWithStatusCode(fmt.Errorf("guest field denied"), types.ErrorCodeInvalidRequest, http.StatusForbidden, types.ErrOptionWithSkipRetry())
			}
		}
	}
	return guestpolicy.ValidateGuestBilling(c, info)
}
