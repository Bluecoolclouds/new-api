package middleware

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
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
