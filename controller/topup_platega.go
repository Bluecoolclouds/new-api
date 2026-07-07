package controller

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	system_setting "github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/thanhpk/randstr"
)

const plategalAPIBase = "https://app.platega.io"

// ─── Amount calculation ─────────────────────────────────────────────────────

func getPlategalMinTopup() int64 {
	minTopup := setting.PlategalMinTopUp
	if minTopup <= 0 {
		minTopup = 100
	}
	return int64(minTopup)
}

const plategalQuotaPerDollar = int64(500000)

func getPlategalPayMoney(amount int64, group string) float64 {
	dAmount := decimal.NewFromInt(amount * plategalQuotaPerDollar)

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	unitPrice := setting.PlategalUnitPrice
	if unitPrice <= 0 {
		unitPrice = 0.0002
	}

	discountRatio := getAmountDiscount(int(amount))

	money := dAmount.
		Mul(decimal.NewFromFloat(unitPrice)).
		Mul(decimal.NewFromFloat(topupGroupRatio)).
		Mul(decimal.NewFromFloat(discountRatio)).
		Round(2)

	return money.InexactFloat64()
}

func RequestPlategalAmount(c *gin.Context) {
	if !isPlategalTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Platega не настроена"})
		return
	}

	var req struct {
		Amount int64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	id := c.GetInt("id")
	user, _ := model.GetUserById(id, false)
	group := user.Group

	money := getPlategalPayMoney(req.Amount, group)
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    fmt.Sprintf("%.2f", money),
	})
}

// ─── Pay ────────────────────────────────────────────────────────────────────

type PlategalPayRequest struct {
	Amount int64 `json:"amount"`
}

type plategalCreateTxRequest struct {
	PaymentDetails struct {
		Amount   int    `json:"amount"`
		Currency string `json:"currency"`
	} `json:"paymentDetails"`
	Description string `json:"description"`
	Return      string `json:"return"`
	FailedURL   string `json:"failedUrl"`
	Payload     string `json:"payload"`
}

type plategalCreateTxResponse struct {
	TransactionId string  `json:"transactionId"`
	Status        string  `json:"status"`
	URL           string  `json:"url"`
	ExpiresIn     string  `json:"expiresIn"`
	Rate          float64 `json:"rate"`
}

func createPlategalTransaction(tradeNo string, amountRUB float64) (string, error) {
	if setting.PlategalMerchantId == "" || setting.PlategalApiSecret == "" {
		return "", fmt.Errorf("Platega MerchantId или ApiSecret не настроены")
	}

	serverAddress := strings.TrimRight(system_setting.ServerAddress, "/")
	successURL := serverAddress + "/wallet"
	failURL := serverAddress + "/wallet"

	reqBody := plategalCreateTxRequest{
		Description: "Пополнение баланса APINET",
		Return:      successURL,
		FailedURL:   failURL,
		Payload:     tradeNo,
	}
	reqBody.PaymentDetails.Amount = int(amountRUB)
	reqBody.PaymentDetails.Currency = "RUB"

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal error: %v", err)
	}

	req, err := http.NewRequest("POST", plategalAPIBase+"/v2/transaction/process", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("create request error: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-MerchantId", setting.PlategalMerchantId)
	req.Header.Set("X-Secret", setting.PlategalApiSecret)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP request error: %v", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Platega API вернул статус %d: %s", resp.StatusCode, string(respBody))
	}

	var txResp plategalCreateTxResponse
	if err := json.Unmarshal(respBody, &txResp); err != nil {
		return "", fmt.Errorf("parse response error: %v (body: %s)", err, string(respBody))
	}

	if txResp.URL == "" {
		return "", fmt.Errorf("Platega API вернул пустой url (body: %s)", string(respBody))
	}

	return txResp.URL, nil
}

func RequestPlategalPay(c *gin.Context) {
	if !isPlategalTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Platega не настроена"})
		return
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "read error"})
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Platega запрос оплаты user_id=%d body=%q", c.GetInt("id"), string(bodyBytes)))
	c.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	var req PlategalPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "请输入充值金额"})
		return
	}

	id := c.GetInt("id")
	user, _ := model.GetUserById(id, false)

	ref := fmt.Sprintf("plategal-%d-%d-%s", user.Id, time.Now().UnixMilli(), randstr.String(6))
	tradeNo := "ptg_" + common.Sha1([]byte(ref))

	money := getPlategalPayMoney(req.Amount, user.Group)
	minTopup := getPlategalMinTopup()
	if money < float64(minTopup) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("Минимальная сумма пополнения %d рублей", minTopup)})
		return
	}

	topUp := &model.TopUp{
		UserId:          id,
		Amount:          req.Amount,
		Money:           money,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodPlategal,
		PaymentProvider: model.PaymentProviderPlategal,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Platega создание заказа не удалось user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	payURL, err := createPlategalTransaction(tradeNo, money)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Platega создание транзакции не удалось user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败: " + err.Error()})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Platega заказ создан user_id=%d trade_no=%s amount=%d money=%.2f", id, tradeNo, req.Amount, money))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"pay_link": payURL,
			"order_id": tradeNo,
		},
	})
}

// ─── Webhook ────────────────────────────────────────────────────────────────

type plategalCallbackPayload struct {
	Id            string  `json:"id"`
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	Status        string  `json:"status"`
	PaymentMethod int     `json:"paymentMethod"`
	Payload       string  `json:"payload"`
}

func PlategalWebhook(c *gin.Context) {
	if !isPlategalWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Platega webhook отклонён reason=disabled client_ip=%s", c.ClientIP()))
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	merchantId := c.GetHeader("X-MerchantId")
	apiSecret := c.GetHeader("X-Secret")

	if merchantId != setting.PlategalMerchantId || apiSecret != setting.PlategalApiSecret {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Platega webhook неверная аутентификация client_ip=%s", c.ClientIP()))
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Platega webhook чтение тела ошибка error=%q", err.Error()))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	var payload plategalCallbackPayload
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Platega webhook парсинг JSON ошибка body=%q error=%q", string(bodyBytes), err.Error()))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Platega webhook получен id=%s status=%s amount=%.2f payload=%s client_ip=%s",
		payload.Id, payload.Status, payload.Amount, payload.Payload, c.ClientIP()))

	if payload.Status != "CONFIRMED" {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("Platega webhook статус не CONFIRMED, пропускаем id=%s status=%s", payload.Id, payload.Status))
		c.Status(http.StatusOK)
		return
	}

	tradeNo := payload.Payload
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), "Platega webhook пустой payload (tradeNo)")
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Platega webhook заказ не найден trade_no=%s", tradeNo))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	if topUp.Status != common.TopUpStatusPending {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("Platega webhook заказ уже обработан trade_no=%s status=%s", tradeNo, topUp.Status))
		c.Status(http.StatusOK)
		return
	}

	if err := model.RechargePlategal(tradeNo, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Platega webhook начисление не удалось trade_no=%s error=%q", tradeNo, err.Error()))
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Platega оплата успешна trade_no=%s quota=%d money=%.2f client_ip=%s", tradeNo, topUp.Amount, topUp.Money, c.ClientIP()))
	c.Status(http.StatusOK)
}
