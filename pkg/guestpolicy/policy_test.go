package guestpolicy

import (
	"fmt"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"testing"
)

func TestGuestPolicy(t *testing.T) {
	t.Setenv("APINET_GUEST_SERVICE_USER_ID", "42")
	t.Setenv("APINET_GUEST_SPENDING_ENABLED", "true")
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
	c.Request.Header.Set("X-Guest-Reserve-Micros", "20000")
	tokens := uint(512)
	fixture := func() *relaycommon.RelayInfo {
		return &relaycommon.RelayInfo{UserId: 42, OriginModelName: "deepseek-coder-33B-instruct", PriceData: types.PriceData{UsePrice: true, ModelPrice: .02, GroupRatioInfo: types.GroupRatioInfo{GroupRatio: 1}}, Request: &dto.GeneralOpenAIRequest{MaxTokens: &tokens, Messages: []dto.Message{{Role: "user", Content: "hello"}}}}
	}
	good := fixture()
	if ValidateGuestBilling(c, good) != nil || !good.ForcePreConsume {
		t.Fatal("valid trial denied")
	}
	for _, mutate := range []func(*relaycommon.RelayInfo){
		func(i *relaycommon.RelayInfo) { i.PriceData.ModelPrice = .03 },
		func(i *relaycommon.RelayInfo) { i.PriceData.UsePrice = false },
		func(i *relaycommon.RelayInfo) { i.PriceData.FreeModel = true },
		func(i *relaycommon.RelayInfo) { i.PriceData.GroupRatioInfo.GroupRatio = 1.1 },
		func(i *relaycommon.RelayInfo) { i.PriceData.AddOtherRatio("x", 2) },
		func(i *relaycommon.RelayInfo) { i.OriginModelName = "expensive" },
		func(i *relaycommon.RelayInfo) { v := true; i.Request.(*dto.GeneralOpenAIRequest).Stream = &v },
		func(i *relaycommon.RelayInfo) { v := uint(513); i.Request.(*dto.GeneralOpenAIRequest).MaxTokens = &v },
		func(i *relaycommon.RelayInfo) { i.Request.(*dto.GeneralOpenAIRequest).Messages[0].Role = "tool" },
		func(i *relaycommon.RelayInfo) {
			i.Request.(*dto.GeneralOpenAIRequest).Messages[0].Content = []string{"image"}
		},
	} {
		i := fixture()
		mutate(i)
		if ValidateGuestBilling(c, i) == nil {
			t.Fatal("unsafe request allowed")
		}
	}
	normal := fixture()
	normal.UserId = 43
	normal.PriceData.ModelPrice = 99
	if ValidateGuestBilling(c, normal) != nil || normal.ForcePreConsume {
		t.Fatal("paid user changed")
	}
	t.Setenv("APINET_GUEST_SPENDING_ENABLED", "false")
	if ValidateGuestBilling(c, fixture()) == nil {
		t.Fatal("disabled trial allowed")
	}
}

func TestCatalogPricesAndReservation(t *testing.T) {
	t.Setenv("APINET_GUEST_SERVICE_USER_ID", "42")
	t.Setenv("APINET_GUEST_SPENDING_ENABLED", "true")
	for name, price := range Prices {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
		c.Request.Header.Set("X-Guest-Reserve-Micros", fmt.Sprint(int(price*1000000+.5)))
		n := uint(512)
		i := &relaycommon.RelayInfo{UserId: 42, OriginModelName: name, PriceData: types.PriceData{UsePrice: true, ModelPrice: price, GroupRatioInfo: types.GroupRatioInfo{GroupRatio: 1}}, Request: &dto.GeneralOpenAIRequest{MaxTokens: &n, Messages: []dto.Message{{Role: "user", Content: "x"}}}}
		if ValidateGuestBilling(c, i) != nil {
			t.Fatalf("audited %s denied", name)
		}
		i.PriceData.ModelPrice += .000001
		if ValidateGuestBilling(c, i) == nil {
			t.Fatal("price change admitted")
		}
		i.PriceData.ModelPrice = price
		c.Request.Header.Set("X-Guest-Reserve-Micros", "1")
		if ValidateGuestBilling(c, i) == nil {
			t.Fatal("underreserve admitted")
		}
	}
}

// No combination of token tariffs/limits makes an unaudited provider contract safe.
func TestTokenContractsRemainClosed(t *testing.T) {
	t.Setenv("APINET_GUEST_SERVICE_USER_ID", "42")
	t.Setenv("APINET_GUEST_SPENDING_ENABLED", "true")
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
	c.Request.Header.Set("X-Guest-Reserve-Micros", "500000")
	for _, ratio := range []float64{0, .1, 1, 10, 1e20} {
		n := uint(1)
		i := &relaycommon.RelayInfo{UserId: 42, OriginModelName: "gpt-6-astra", PriceData: types.PriceData{UsePrice: false, ModelRatio: ratio, CompletionRatio: ratio, CacheRatio: ratio, CacheCreationRatio: ratio, CacheCreation5mRatio: ratio, CacheCreation1hRatio: ratio, ImageRatio: ratio, GroupRatioInfo: types.GroupRatioInfo{GroupRatio: 1}}, Request: &dto.GeneralOpenAIRequest{MaxTokens: &n, Messages: []dto.Message{{Role: "user", Content: "x"}}}}
		if ValidateGuestBilling(c, i) == nil {
			t.Fatal("token tariff admitted without enforceable provider contract")
		}
		i.UserId = 43
		if ValidateGuestBilling(c, i) != nil || i.ForcePreConsume {
			t.Fatal("paid token billing affected")
		}
	}
}
