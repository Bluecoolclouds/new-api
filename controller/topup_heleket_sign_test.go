package controller

import (
	"crypto/md5"
	"encoding/base64"
	"fmt"
	"testing"
)

// reference computes Heleket's signature the documented way:
// md5(base64(body_without_sign) + api_key).
func reference(bodyWithoutSign, apiKey string) string {
	encoded := base64.StdEncoding.EncodeToString([]byte(bodyWithoutSign))
	return fmt.Sprintf("%x", md5.Sum([]byte(encoded+apiKey)))
}

func TestHeleketStripSign(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "sign at end",
			in:   `{"order_id":"hk_1","status":"paid","sign":"abc"}`,
			want: `{"order_id":"hk_1","status":"paid"}`,
		},
		{
			name: "sign in middle",
			in:   `{"order_id":"hk_1","sign":"abc","status":"paid"}`,
			want: `{"order_id":"hk_1","status":"paid"}`,
		},
		{
			name: "preserves escaped slashes",
			in:   `{"url":"https:\/\/jm.ttyunos.com\/x","sign":"abc"}`,
			want: `{"url":"https:\/\/jm.ttyunos.com\/x"}`,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := string(heleketStripSign([]byte(tc.in)))
			if got != tc.want {
				t.Fatalf("heleketStripSign() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestHeleketWebhookSign(t *testing.T) {
	const apiKey = "test_api_key_123"

	// Body exactly as Heleket would send it (escaped slashes, sign last).
	body := `{"type":"payment","uuid":"d1d7abce","order_id":"hk_f80543","amount":"18.60000000","status":"paid","sign":"PLACEHOLDER"}`
	stripped := `{"type":"payment","uuid":"d1d7abce","order_id":"hk_f80543","amount":"18.60000000","status":"paid"}`

	want := reference(stripped, apiKey)
	got := heleketWebhookSign([]byte(body), apiKey)
	if got != want {
		t.Fatalf("heleketWebhookSign() = %q, want %q", got, want)
	}

	// Wrong key must not match.
	if heleketWebhookSign([]byte(body), "wrong_key") == want {
		t.Fatal("signature matched with wrong api key")
	}
}
