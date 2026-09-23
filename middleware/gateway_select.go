package middleware

import (
	"fmt"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/billing_setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
)

type gatewayCandidate struct {
	name   string
	price  float64
	fixed  bool
	priced bool
}

// Cost ordering compares only like-for-like billing modes. Fixed-price calls
// and per-token ratios cannot be compared without knowing the response length.
func orderGatewayCandidates(names []string, profile string) []gatewayCandidate {
	candidates := make([]gatewayCandidate, 0, len(names))
	for _, raw := range names {
		name := strings.TrimSpace(raw)
		if name == "" || name == "auto" {
			continue
		}
		price, fixed, ok := ratio_setting.GetModelRatioOrPrice(name)
		if !ok && billing_setting.GetBillingMode(name) == billing_setting.BillingModeTieredExpr {
			expr, exists := billing_setting.GetBillingExpr(name)
			ok = exists && strings.TrimSpace(expr) != ""
		}
		candidates = append(candidates, gatewayCandidate{name: name, price: price, fixed: fixed, priced: ok})
	}
	comparable := gatewayCandidatesComparable(candidates)
	if profile == "cost" && comparable {
		sort.SliceStable(candidates, func(i, j int) bool {
			return candidates[i].price < candidates[j].price
		})
	}
	return candidates
}

func selectGatewayModel(c *gin.Context, group string) (string, *model.Channel, string, error) {
	return selectGatewayModelExcluding(c, group, nil)
}

// SelectGatewayFallback selects another explicitly permitted, priced model.
func SelectGatewayFallback(c *gin.Context, group string, excluded map[string]bool) (string, *model.Channel, error) {
	name, channel, _, err := selectGatewayModelExcluding(c, group, excluded)
	return name, channel, err
}

// selectGatewayModelExcluding rechecks both token permissions and live channel
// availability on every transition; a failed model is never selected twice.
func selectGatewayModelExcluding(c *gin.Context, group string, excluded map[string]bool) (string, *model.Channel, string, error) {
	names := c.GetStringSlice("gateway_models")
	if len(names) == 0 {
		return "", nil, "", fmt.Errorf("AI Gateway key has no allowed models")
	}
	groups := []string{group}
	if group == "auto" {
		groups = service.GetUserAutoGroup(common.GetContextKeyString(c, constant.ContextKeyUserGroup))
	}
	profile := c.GetString("gateway_profile")
	reason := "configured_order"
	if profile == "cost" && gatewayPricesComparable(names) {
		reason = "lower_configured_price"
	}
	for _, candidate := range orderGatewayCandidates(names, profile) {
		if !candidate.priced || excluded[candidate.name] {
			continue
		}
		limits, ok := c.Get("token_model_limit")
		if !ok {
			// Gateway keys always have explicit model limits.
			return "", nil, "", fmt.Errorf("AI Gateway key has no model permissions")
		}
		allowed, ok := limits.(map[string]bool)
		if !ok || !allowed[candidate.name] {
			continue
		}
		// The token's model limit is the entire candidate set; never expand it
		// to all group models, even when the group has broader access.
		for _, availableGroup := range groups {
			channel, err := model.GetRandomSatisfiedChannel(availableGroup, candidate.name, 0, c.Request.URL.Path)
			if err != nil {
				return "", nil, "", err
			}
			if channel != nil {
				if group == "auto" {
					common.SetContextKey(c, constant.ContextKeyAutoGroup, availableGroup)
				}
				if setupErr := SetupContextForSelectedChannel(c, channel, candidate.name); setupErr == nil {
					return candidate.name, channel, reason, nil
				}
			}
		}
	}
	return "", nil, "", fmt.Errorf("no available billable model for this AI Gateway key in its allowed group")
}

func gatewayPricesComparable(names []string) bool {
	return gatewayCandidatesComparable(orderGatewayCandidates(names, "ordered"))
}

func gatewayCandidatesComparable(candidates []gatewayCandidate) bool {
	if len(candidates) == 0 {
		return false
	}
	for _, candidate := range candidates {
		if !candidate.priced || candidate.fixed != candidates[0].fixed ||
			(billing_setting.GetBillingMode(candidate.name) == billing_setting.BillingModeTieredExpr) {
			return false
		}
	}
	return true
}
