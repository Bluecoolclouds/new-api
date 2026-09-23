package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func TestGatewayKeyRequiresExplicitModels(t *testing.T) {
	tests := []struct {
		name  string
		token model.Token
		valid bool
	}{
		{"ordinary key", model.Token{}, true},
		{"gateway without limits", model.Token{GatewayEnabled: true}, false},
		{"gateway with empty model", model.Token{GatewayEnabled: true, ModelLimitsEnabled: true, ModelLimits: ""}, false},
		{"gateway with auto candidate", model.Token{GatewayEnabled: true, ModelLimitsEnabled: true, ModelLimits: "auto"}, false},
		{"gateway with duplicate candidates", model.Token{GatewayEnabled: true, ModelLimitsEnabled: true, ModelLimits: "gpt-4o,gpt-4o"}, false},
		{"gateway with unknown preference", model.Token{GatewayEnabled: true, GatewayProfile: "speed", ModelLimitsEnabled: true, ModelLimits: "gpt-4o"}, false},
		{"gateway with allowed model", model.Token{GatewayEnabled: true, ModelLimitsEnabled: true, ModelLimits: "gpt-4o"}, true},
		{"gateway with spaces", model.Token{GatewayEnabled: true, ModelLimitsEnabled: true, ModelLimits: "gpt-4o, gpt-4o-mini"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.token.ValidateGatewaySettings()
			if (err == nil) != tt.valid {
				t.Fatalf("ValidateGatewaySettings() error=%v, valid=%v", err, tt.valid)
			}
		})
	}
}

func TestGatewayFallbackCannotRevisitOrExpandTokenModels(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
	c.Set("gateway_models", []string{"gpt-4o", "gpt-4o-mini"})
	c.Set("token_model_limit", map[string]bool{"gpt-4o": true})
	// The only permitted model has already failed; the other configured
	// candidate cannot be used after its token permission is removed.
	name, channel, _, err := selectGatewayModelExcluding(c, "default", map[string]bool{"gpt-4o": true})
	if err == nil || name != "" || channel != nil {
		t.Fatalf("unauthorized fallback selected: %q %v %v", name, channel, err)
	}
}

func TestGatewayModelsAreCanonical(t *testing.T) {
	token := model.Token{GatewayEnabled: true, ModelLimitsEnabled: true, ModelLimits: "gpt-4o, gpt-4o-mini"}
	if err := token.ValidateGatewaySettings(); err != nil {
		t.Fatal(err)
	}
	if token.ModelLimits != "gpt-4o,gpt-4o-mini" || !token.GetModelLimitsMap()["gpt-4o-mini"] {
		t.Fatalf("model authorization mismatch after normalization: %q", token.ModelLimits)
	}
}

func TestGatewayOrderPreservesConfiguredCandidates(t *testing.T) {
	candidates := orderGatewayCandidates([]string{"gpt-4o", "gpt-4o-mini"}, "ordered")
	if len(candidates) != 2 || candidates[0].name != "gpt-4o" || candidates[1].name != "gpt-4o-mini" {
		t.Fatalf("unexpected ordered candidates: %#v", candidates)
	}
}
