package controller

import (
        "bytes"
        "context"
        "crypto/md5"
        "encoding/base64"
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

const heleketAPIBase = "https://api.heleket.com"

// heleketSign computes the request signature: md5(base64(json_body) + api_key)
func heleketSign(jsonBody []byte, apiKey string) string {
        encoded := base64.StdEncoding.EncodeToString(jsonBody)
        raw := encoded + apiKey
        return fmt.Sprintf("%x", md5.Sum([]byte(raw)))
}

// heleketWebhookSign computes the webhook verification signature.
// Formula: md5(uuid + ":" + order_id + ":" + status + ":" + api_key)
func heleketWebhookSign(uuid, orderID, status, apiKey string) string {
        raw := uuid + ":" + orderID + ":" + status + ":" + apiKey
        return fmt.Sprintf("%x", md5.Sum([]byte(raw)))
}

// ─── Amount ────────────────────────────────────────────────────────────────

func getHeleketMinTopup() int64 {
        minTopup := setting.HeleketMinTopUp
        if minTopup <= 0 {
                minTopup = 1
        }
        return int64(minTopup)
}

func getHeleketPayMoney(amount int64, group string) float64 {
        dAmount := decimal.NewFromInt(amount)

        topupGroupRatio := common.GetTopupGroupRatio(group)
        if topupGroupRatio == 0 {
                topupGroupRatio = 1
        }

        unitPrice := setting.HeleketUnitPrice
        if unitPrice <= 0 {
                unitPrice = 1.0
        }

        money := dAmount.
                Mul(decimal.NewFromFloat(unitPrice)).
                Mul(decimal.NewFromFloat(topupGroupRatio))

        return money.InexactFloat64()
}

func RequestHeleketAmount(c *gin.Context) {
        if !isHeleketTopUpEnabled() {
                c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Heleket не настроен"})
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

        money := getHeleketPayMoney(req.Amount, group)
        c.JSON(http.StatusOK, gin.H{
                "message": "success",
                "data":    fmt.Sprintf("%.4f", money),
        })
}

// ─── Pay ───────────────────────────────────────────────────────────────────

type HeleketPayRequest struct {
        Amount        int64  `json:"amount"`
        PaymentMethod string `json:"payment_method"`
}

type heleketCreateInvoiceRequest struct {
        Amount      string `json:"amount"`
        Currency    string `json:"currency"`
        OrderID     string `json:"order_id"`
        URLCallback string `json:"url_callback"`
        URLReturn   string `json:"url_return,omitempty"`
}

type heleketCreateInvoiceResponse struct {
        State  int    `json:"state"`
        Result struct {
                UUID          string `json:"uuid"`
                OrderID       string `json:"order_id"`
                Amount        string `json:"amount"`
                PaymentAmount string `json:"payment_amount"`
                Currency      string `json:"currency"`
                URL           string `json:"url"`
        } `json:"result"`
        Message string `json:"message"`
}

func createHeleketInvoice(ctx context.Context, orderID string, amountUSD float64) (string, error) {
        if setting.HeleketApiKey == "" || setting.HeleketMerchantUUID == "" {
                return "", fmt.Errorf("Heleket API ключ или Merchant UUID не настроены")
        }

        serverAddress := strings.TrimRight(system_setting.ServerAddress, "/")
        callbackURL := serverAddress + "/api/heleket/webhook"

        currency := setting.HeleketCurrency
        if currency == "" {
                currency = "USD"
        }

        body := heleketCreateInvoiceRequest{
                Amount:      fmt.Sprintf("%.4f", amountUSD),
                Currency:    currency,
                OrderID:     orderID,
                URLCallback: callbackURL,
        }
        if setting.HeleketReturnURL != "" {
                body.URLReturn = setting.HeleketReturnURL
        }

        jsonBody, err := json.Marshal(body)
        if err != nil {
                return "", fmt.Errorf("serialization error: %v", err)
        }

        sign := heleketSign(jsonBody, setting.HeleketApiKey)

        req, err := http.NewRequest("POST", heleketAPIBase+"/v1/payment", bytes.NewReader(jsonBody))
        if err != nil {
                return "", fmt.Errorf("create request error: %v", err)
        }
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("merchant", setting.HeleketMerchantUUID)
        req.Header.Set("sign", sign)

        logger.LogInfo(ctx, fmt.Sprintf("Heleket создание инвойса order_id=%s amount=%.4f currency=%s callback=%s", orderID, amountUSD, currency, callbackURL))

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

        logger.LogInfo(ctx, fmt.Sprintf("Heleket API ответ order_id=%s status=%d body=%q", orderID, resp.StatusCode, string(respBody)))

        var invoiceResp heleketCreateInvoiceResponse
        if err := json.Unmarshal(respBody, &invoiceResp); err != nil {
                return "", fmt.Errorf("parse response error: %v (body: %s)", err, string(respBody))
        }

        if invoiceResp.State != 0 {
                return "", fmt.Errorf("Heleket API error state=%d message=%q", invoiceResp.State, invoiceResp.Message)
        }

        if invoiceResp.Result.URL == "" {
                return "", fmt.Errorf("Heleket API вернул пустой URL (body: %s)", string(respBody))
        }

        logger.LogInfo(ctx, fmt.Sprintf("Heleket инвойс создан order_id=%s uuid=%s url=%q", orderID, invoiceResp.Result.UUID, invoiceResp.Result.URL))
        return invoiceResp.Result.URL, nil
}

func RequestHeleketPay(c *gin.Context) {
        if !isHeleketTopUpEnabled() {
                c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Heleket не настроен"})
                return
        }

        bodyBytes, err := io.ReadAll(c.Request.Body)
        if err != nil {
                c.JSON(http.StatusOK, gin.H{"message": "error", "data": "read error"})
                return
        }
        logger.LogInfo(c.Request.Context(), fmt.Sprintf("Heleket запрос оплаты user_id=%d body=%q", c.GetInt("id"), string(bodyBytes)))
        c.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))

        var req HeleketPayRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
                return
        }

        if req.Amount <= 0 {
                c.JSON(http.StatusOK, gin.H{"message": "error", "data": "请输入充值金额"})
                return
        }

        minTopup := getHeleketMinTopup()
        if req.Amount < minTopup {
                c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("最低充值 %d", minTopup)})
                return
        }

        id := c.GetInt("id")
        user, _ := model.GetUserById(id, false)

        ref := fmt.Sprintf("heleket-%d-%d-%s", user.Id, time.Now().UnixMilli(), randstr.String(6))
        tradeNo := "hk_" + common.Sha1([]byte(ref))

        money := getHeleketPayMoney(req.Amount, user.Group)

        topUp := &model.TopUp{
                UserId:          id,
                Amount:          req.Amount,
                Money:           money,
                TradeNo:         tradeNo,
                PaymentMethod:   model.PaymentMethodHeleket,
                PaymentProvider: model.PaymentProviderHeleket,
                CreateTime:      time.Now().Unix(),
                Status:          common.TopUpStatusPending,
        }
        if err := topUp.Insert(); err != nil {
                logger.LogError(c.Request.Context(), fmt.Sprintf("Heleket создание заказа не удалось user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
                c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
                return
        }

        payURL, err := createHeleketInvoice(c.Request.Context(), tradeNo, money)
        if err != nil {
                logger.LogError(c.Request.Context(), fmt.Sprintf("Heleket создание инвойса не удалось user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
                c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败: " + err.Error()})
                return
        }

        logger.LogInfo(c.Request.Context(), fmt.Sprintf("Heleket заказ создан user_id=%d trade_no=%s amount=%d money=%.4f", id, tradeNo, req.Amount, money))
        c.JSON(http.StatusOK, gin.H{
                "message": "success",
                "data": gin.H{
                        "pay_link": payURL,
                        "order_id": tradeNo,
                },
        })
}

// ─── Webhook ───────────────────────────────────────────────────────────────

type heleketWebhookPayload struct {
        UUID          string `json:"uuid"`
        OrderID       string `json:"order_id"`
        Amount        string `json:"amount"`
        PaymentAmount string `json:"payment_amount"`
        Currency      string `json:"currency"`
        Status        string `json:"status"`
        Sign          string `json:"sign"`
}

func HeleketWebhook(c *gin.Context) {
        if !isHeleketWebhookEnabled() {
                logger.LogWarn(c.Request.Context(), fmt.Sprintf("Heleket webhook отклонён reason=disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
                c.AbortWithStatus(http.StatusForbidden)
                return
        }

        bodyBytes, err := io.ReadAll(c.Request.Body)
        if err != nil {
                logger.LogError(c.Request.Context(), fmt.Sprintf("Heleket webhook чтение тела ошибка error=%q", err.Error()))
                c.AbortWithStatus(http.StatusBadRequest)
                return
        }

        logger.LogInfo(c.Request.Context(), fmt.Sprintf("Heleket webhook получен path=%q client_ip=%s body=%q", c.Request.RequestURI, c.ClientIP(), string(bodyBytes)))

        var payload heleketWebhookPayload
        if err := json.Unmarshal(bodyBytes, &payload); err != nil {
                logger.LogError(c.Request.Context(), fmt.Sprintf("Heleket webhook разбор ошибка error=%q body=%q", err.Error(), string(bodyBytes)))
                c.AbortWithStatus(http.StatusBadRequest)
                return
        }

        // Verify signature
        expectedSign := heleketWebhookSign(payload.UUID, payload.OrderID, payload.Status, setting.HeleketApiKey)
        if !strings.EqualFold(expectedSign, payload.Sign) {
                logger.LogWarn(c.Request.Context(), fmt.Sprintf("Heleket webhook неверная подпись order_id=%s uuid=%s status=%s expected=%s got=%s", payload.OrderID, payload.UUID, payload.Status, expectedSign, payload.Sign))
                c.AbortWithStatus(http.StatusUnauthorized)
                return
        }

        logger.LogInfo(c.Request.Context(), fmt.Sprintf("Heleket webhook подпись верна order_id=%s uuid=%s status=%s amount=%s currency=%s", payload.OrderID, payload.UUID, payload.Status, payload.Amount, payload.Currency))

        // Only process paid status
        if payload.Status != "paid" {
                logger.LogInfo(c.Request.Context(), fmt.Sprintf("Heleket webhook статус не paid, пропускаем order_id=%s status=%s", payload.OrderID, payload.Status))
                c.Status(http.StatusOK)
                return
        }

        tradeNo := payload.OrderID
        if tradeNo == "" {
                logger.LogWarn(c.Request.Context(), fmt.Sprintf("Heleket webhook пустой order_id uuid=%s", payload.UUID))
                c.AbortWithStatus(http.StatusBadRequest)
                return
        }

        LockOrder(tradeNo)
        defer UnlockOrder(tradeNo)

        topUp := model.GetTopUpByTradeNo(tradeNo)
        if topUp == nil {
                logger.LogWarn(c.Request.Context(), fmt.Sprintf("Heleket webhook заказ не найден trade_no=%s uuid=%s", tradeNo, payload.UUID))
                c.AbortWithStatus(http.StatusBadRequest)
                return
        }

        if topUp.Status != common.TopUpStatusPending {
                logger.LogInfo(c.Request.Context(), fmt.Sprintf("Heleket webhook заказ уже обработан trade_no=%s status=%s", tradeNo, topUp.Status))
                c.Status(http.StatusOK)
                return
        }

        err = model.RechargeHeleket(tradeNo, c.ClientIP())
        if err != nil {
                logger.LogError(c.Request.Context(), fmt.Sprintf("Heleket webhook начисление не удалось trade_no=%s uuid=%s error=%q", tradeNo, payload.UUID, err.Error()))
                c.AbortWithStatus(http.StatusInternalServerError)
                return
        }

        logger.LogInfo(c.Request.Context(), fmt.Sprintf("Heleket оплата успешна trade_no=%s uuid=%s quota=%d money=%.4f client_ip=%s", tradeNo, payload.UUID, topUp.Amount, topUp.Money, c.ClientIP()))
        c.Status(http.StatusOK)
}
