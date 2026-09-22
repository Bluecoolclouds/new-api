package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"

	"github.com/gin-gonic/gin"
)

type cbrDailyResp struct {
	Valute map[string]struct {
		Value float64 `json:"Value"`
	} `json:"Valute"`
}

type cbrXMLValCurs struct {
	Valute []struct {
		CharCode  string `xml:"CharCode"`
		VunitRate string `xml:"VunitRate"`
	} `xml:"Valute"`
}

type openERResp struct {
	Rates map[string]float64 `json:"rates"`
}

type coinbaseResp struct {
	Data struct {
		Rates map[string]string `json:"rates"`
	} `json:"data"`
}

var (
	cbrMu          sync.RWMutex
	lastCBRRate    float64
	lastCBRFetchAt time.Time
)

func newCBRHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 5 * time.Second,
	}
}

func fetchFromCBRMirror(client *http.Client) (float64, error) {
	req, err := http.NewRequest("GET", "https://www.cbr-xml-daily.ru/daily_json.js", nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var data cbrDailyResp
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, err
	}
	usd, ok := data.Valute["USD"]
	if !ok || usd.Value <= 0 {
		return 0, fmt.Errorf("invalid USD rate in CBR mirror")
	}
	return usd.Value, nil
}

func fetchFromCBROfficialXML(client *http.Client) (float64, error) {
	req, err := http.NewRequest("GET", "https://www.cbr.ru/scripts/XML_daily.asp", nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	bodyStr := string(bodyBytes)
	idx := strings.Index(bodyStr, "<CharCode>USD</CharCode>")
	if idx != -1 {
		sub := bodyStr[idx:]
		vStart := strings.Index(sub, "<VunitRate>")
		vEnd := strings.Index(sub, "</VunitRate>")
		if vStart != -1 && vEnd != -1 && vEnd > vStart {
			rawVal := sub[vStart+len("<VunitRate>") : vEnd]
			normalized := strings.TrimSpace(strings.ReplaceAll(rawVal, ",", "."))
			rate, err := strconv.ParseFloat(normalized, 64)
			if err == nil && rate > 0 {
				return rate, nil
			}
		}
	}
	return 0, fmt.Errorf("USD not found in official CBR XML")
}

func fetchFromOpenERAPI(client *http.Client) (float64, error) {
	req, err := http.NewRequest("GET", "https://open.er-api.com/v6/latest/USD", nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var data openERResp
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, err
	}
	rub, ok := data.Rates["RUB"]
	if !ok || rub <= 0 {
		return 0, fmt.Errorf("invalid RUB rate in OpenERAPI")
	}
	return rub, nil
}

func fetchFromExchangeRateV4(client *http.Client) (float64, error) {
	req, err := http.NewRequest("GET", "https://api.exchangerate-api.com/v4/latest/USD", nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var data openERResp
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, err
	}
	rub, ok := data.Rates["RUB"]
	if !ok || rub <= 0 {
		return 0, fmt.Errorf("invalid RUB rate in ExchangeRateV4")
	}
	return rub, nil
}

func fetchFromCoinbase(client *http.Client) (float64, error) {
	req, err := http.NewRequest("GET", "https://api.coinbase.com/v2/exchange-rates?currency=USD", nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var data coinbaseResp
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, err
	}
	rubStr, ok := data.Data.Rates["RUB"]
	if !ok {
		return 0, fmt.Errorf("RUB not found in Coinbase rates")
	}
	rate, err := strconv.ParseFloat(rubStr, 64)
	if err != nil || rate <= 0 {
		return 0, fmt.Errorf("invalid RUB rate in Coinbase")
	}
	return rate, nil
}

// computeConsensusRate calculates a robust consensus exchange rate using median filtering.
// Outlier-resistant: rejects values outside the sane range (50.0..200.0 RUB/USD)
// and picks the median of all responding independent oracles.
func computeConsensusRate(rates []float64) (float64, error) {
	var valid []float64
	for _, r := range rates {
		if !math.IsNaN(r) && !math.IsInf(r, 0) && r >= 50.0 && r <= 200.0 {
			valid = append(valid, r)
		}
	}
	if len(valid) == 0 {
		return 0, fmt.Errorf("no valid exchange rates within sanity range [50..200]")
	}

	sort.Float64s(valid)
	n := len(valid)
	if n%2 == 1 {
		return valid[n/2], nil
	}
	return (valid[n/2-1] + valid[n/2]) / 2.0, nil
}

// fetchMultiSourceRates concurrently queries 5 independent oracle sources and returns
// the median consensus rate along with diagnostic breakdown.
func fetchMultiSourceRates() (float64, string, error) {
	client := newCBRHTTPClient()

	type sourceResult struct {
		name string
		rate float64
		err  error
	}

	sources := []struct {
		name string
		fn   func(*http.Client) (float64, error)
	}{
		{"CBR_Mirror", fetchFromCBRMirror},
		{"CBR_XML", fetchFromCBROfficialXML},
		{"OpenER_API", fetchFromOpenERAPI},
		{"ExchangeRate_V4", fetchFromExchangeRateV4},
		{"Coinbase", fetchFromCoinbase},
	}

	resChan := make(chan sourceResult, len(sources))
	var wg sync.WaitGroup

	for _, s := range sources {
		wg.Add(1)
		go func(srcName string, fn func(*http.Client) (float64, error)) {
			defer wg.Done()
			r, err := fn(client)
			resChan <- sourceResult{name: srcName, rate: r, err: err}
		}(s.name, s.fn)
	}

	wg.Wait()
	close(resChan)

	var validRates []float64
	var details []string

	for res := range resChan {
		if res.err == nil && res.rate > 0 {
			validRates = append(validRates, res.rate)
			details = append(details, fmt.Sprintf("%s=%.4f", res.name, res.rate))
		} else {
			details = append(details, fmt.Sprintf("%s=(err: %v)", res.name, res.err))
		}
	}

	diag := strings.Join(details, ", ")
	consensus, err := computeConsensusRate(validRates)
	if err != nil {
		cbrMu.RLock()
		cached := lastCBRRate
		cbrMu.RUnlock()
		if cached > 0 {
			common.SysLog(fmt.Sprintf("CBR oracle failure (%v), fallback to cached rate %.4f. Details: %s", err, cached, diag))
			return cached, diag + " [FALLBACK_CACHED]", nil
		}
		return 0, diag, err
	}

	return consensus, diag, nil
}

func GetLiveCBRRate() (float64, error) {
	rate, diag, err := fetchMultiSourceRates()
	if err != nil {
		return 0, err
	}

	cbrMu.Lock()
	lastCBRRate = rate
	lastCBRFetchAt = time.Now()
	cbrMu.Unlock()

	common.SysLog(fmt.Sprintf("CBR Oracle Consensus: %.4f RUB/USD [Sources: %s]", rate, diag))
	return rate, nil
}

func applyCBRRateInternal() error {
	rate, err := GetLiveCBRRate()
	if err != nil {
		return err
	}

	unitPrice := math.Ceil(rate) + setting.FreeKassaCBRMarkup
	if unitPrice <= 0 {
		unitPrice = math.Ceil(rate)
	}

	unitPriceStr := strconv.FormatFloat(unitPrice, 'f', 2, 64)

	if err := model.UpdateOption("FreeKassaUnitPrice", unitPriceStr); err != nil {
		return fmt.Errorf("failed to update FreeKassaUnitPrice: %w", err)
	}

	creditUnitPrice := unitPrice / 500000.0
	creditUnitPriceStr := strconv.FormatFloat(creditUnitPrice, 'f', 8, 64)

	if err := model.UpdateOption("PallyUnitPrice", creditUnitPriceStr); err != nil {
		common.SysLog("CBR: failed to sync PallyUnitPrice: " + err.Error())
	}
	if err := model.UpdateOption("PlategalUnitPrice", creditUnitPriceStr); err != nil {
		common.SysLog("CBR: failed to sync PlategalUnitPrice: " + err.Error())
	}
	if err := model.UpdateOption("USDExchangeRate", unitPriceStr); err != nil {
		common.SysLog("CBR: failed to sync USDExchangeRate: " + err.Error())
	}
	if err := model.UpdateOption("general_setting.custom_currency_exchange_rate", unitPriceStr); err != nil {
		common.SysLog("CBR: failed to sync custom_currency_exchange_rate: " + err.Error())
	}

	common.SysLog(fmt.Sprintf("CBR dynamic sync applied: USD/RUB=%.4f (FK=%.2f, Pally=%s, Plategal=%s)", rate, unitPrice, creditUnitPriceStr, creditUnitPriceStr))
	return nil
}

func StartCBRAutoSync() {
	go func() {
		time.Sleep(10 * time.Second)
		if _, err := GetLiveCBRRate(); err != nil {
			common.SysLog("CBR initial fetch failed: " + err.Error())
		}
		for {
			if setting.FreeKassaCBRAutoSync {
				if err := applyCBRRateInternal(); err != nil {
					common.SysLog("CBR auto-sync error: " + err.Error())
				}
			}
			time.Sleep(6 * time.Hour)
		}
	}()
}

func GetCBRRateHandler(c *gin.Context) {
	rate, err := GetLiveCBRRate()
	if err != nil {
		logger.LogError(c.Request.Context(), "CBR rate fetch failed: "+err.Error())
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"message": "Не удалось получить курс валют: " + err.Error(),
		})
		return
	}

	cbrMu.RLock()
	fetchedAt := lastCBRFetchAt
	cbrMu.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"rate":      rate,
		"fetchedAt": fetchedAt.Unix(),
	})
}

func ApplyCBRRateHandler(c *gin.Context) {
	if err := applyCBRRateInternal(); err != nil {
		logger.LogError(c.Request.Context(), "CBR rate apply failed: "+err.Error())
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"message": "Не удалось применить курс валют: " + err.Error(),
		})
		return
	}

	cbrMu.RLock()
	rate := lastCBRRate
	cbrMu.RUnlock()

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("CBR rate applied: USD/RUB=%.4f unitPrice=%.2f", rate, setting.FreeKassaUnitPrice))

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   fmt.Sprintf("Курс применён: USD/RUB = %.4f, цена единицы = %.2f ₽", rate, setting.FreeKassaUnitPrice),
		"rate":      rate,
		"unitPrice": setting.FreeKassaUnitPrice,
	})
}
