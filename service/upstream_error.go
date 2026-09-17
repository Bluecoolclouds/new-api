package service

import (
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/types"
)

// NormalizeUpstreamError catches raw upstream aggregator/reseller failure messages
// (such as VVEAI/One-API out of quota or missing group routes) and rewrites them into
// clean, standardized channel errors. This prevents Chinese error messages from leaking
// to customers with positive balances and allows the relay engine to automatically failover.
func NormalizeUpstreamError(err *types.NewAPIError) *types.NewAPIError {
	if err == nil {
		return nil
	}
	msg := err.Error()
	if oai := err.ToOpenAIError(); oai.Message != "" {
		msg = oai.Message
	}

	// 1. Upstream reseller master account quota exhaustion
	if strings.Contains(msg, "user quota is not enough") || strings.Contains(msg, "quota is not enough") {
		oai := types.OpenAIError{
			Message: "Upstream provider capacity temporarily unavailable for this model",
			Type:    "upstream_error",
			Code:    "channel:upstream_capacity_exhausted",
		}
		return types.WithOpenAIError(oai, http.StatusBadGateway)
	}

	// 2. Upstream routing failure (Chinese v_api_error: "当前分组 ... 下对于模型 ... 暂无可用渠道")
	if strings.Contains(msg, "暂无可用渠道") || (strings.Contains(msg, "当前分组") && strings.Contains(msg, "暂无可用")) {
		oai := types.OpenAIError{
			Message: "Upstream provider has no active route for this model",
			Type:    "upstream_error",
			Code:    "channel:upstream_no_route",
		}
		return types.WithOpenAIError(oai, http.StatusBadGateway)
	}

	return err
}
