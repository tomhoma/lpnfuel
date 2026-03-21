package fetcher

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/cdproto/network"
	"github.com/chromedp/chromedp"

	"lpnfuel/db"
	"lpnfuel/models"
)

func FetchAndStore(ctx context.Context, gasURL string) error {
	records, err := fetchGAS(ctx, gasURL)
	if err != nil {
		return fmt.Errorf("fetch GAS: %w", err)
	}

	log.Printf("Fetched %d stations from GAS", len(records))

	for _, r := range records {
		station := models.Station{
			ID:       r.ID,
			Brand:    r.Brand,
			Name:     r.StationName,
			District: r.District,
			HasE20:   r.E20 != "-",
			HasGas95: r.Gas95 != "-",
		}

		if err := db.UpsertStation(ctx, station); err != nil {
			log.Printf("upsert station %s: %v", r.ID, err)
			continue
		}

		sourceUpdated := parseThaiDate(r.LastUpdated)
		eta := r.TransportETA
		if eta == "" {
			eta = r.Col10
		}

		fs := models.FuelStatus{
			StationID:       r.ID,
			Gas95:           r.Gas95,
			Gas91:           r.Gas91,
			E20:             r.E20,
			Diesel:          r.Diesel,
			TransportStatus: r.TransportStatus,
			TransportETA:    eta,
			SourceUpdated:   sourceUpdated,
		}

		if err := db.UpsertFuelStatus(ctx, fs); err != nil {
			log.Printf("upsert fuel_status %s: %v", r.ID, err)
			continue
		}

		if err := db.InsertHistory(ctx, fs); err != nil {
			log.Printf("insert history %s: %v", r.ID, err)
		}
	}

	if err := db.RefreshDistrictSummary(ctx); err != nil {
		log.Printf("refresh district_summary: %v", err)
	}

	return nil
}

func fetchGAS(ctx context.Context, gasURL string) ([]models.GASRecord, error) {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
	)

	allocCtx, allocCancel := chromedp.NewExecAllocator(ctx, opts...)
	defer allocCancel()

	browserCtx, browserCancel := chromedp.NewContext(allocCtx)
	defer browserCancel()

	browserCtx, timeoutCancel := context.WithTimeout(browserCtx, 60*time.Second)
	defer timeoutCancel()

	// Track the callback request
	var mu sync.Mutex
	var callbackRequestID network.RequestID
	var callbackFound bool
	done := make(chan string, 1)

	chromedp.ListenTarget(browserCtx, func(ev interface{}) {
		switch e := ev.(type) {
		case *network.EventRequestWillBeSent:
			// Capture the request ID when we see a POST to /callback
			if e.Request.Method == "POST" && strings.Contains(e.Request.URL, "/callback") {
				mu.Lock()
				callbackRequestID = e.RequestID
				callbackFound = true
				mu.Unlock()
				log.Printf("Captured callback request: %s", e.Request.URL)
			}

		case *network.EventLoadingFinished:
			// When loading finishes, check if it's our callback request
			mu.Lock()
			isCallback := callbackFound && e.RequestID == callbackRequestID
			mu.Unlock()

			if isCallback {
				go func() {
					c := chromedp.FromContext(browserCtx)
					if c == nil || c.Target == nil {
						return
					}
					body, err := network.GetResponseBody(e.RequestID).Do(browserCtx)
					if err != nil {
						log.Printf("GetResponseBody error: %v", err)
						return
					}
					select {
					case done <- string(body):
					default:
					}
				}()
			}
		}
	})

	// Navigate to the page — this triggers getStationData() automatically
	log.Println("Loading GAS web app in headless Chrome...")
	if err := chromedp.Run(browserCtx,
		network.Enable(),
		chromedp.Navigate(gasURL),
	); err != nil {
		return nil, fmt.Errorf("navigate: %w", err)
	}

	// Wait for the callback response
	log.Println("Waiting for callback response...")
	select {
	case body := <-done:
		log.Printf("Got callback response (%d bytes)", len(body))
		return parseCallbackResponse(body)
	case <-browserCtx.Done():
		return nil, fmt.Errorf("browser context cancelled")
	case <-time.After(50 * time.Second):
		return nil, fmt.Errorf("timeout waiting for callback response (50s)")
	}
}

// parseCallbackResponse parses Google Apps Script callback format:
// )]}' [["op.exec", [0, "JSON_STRING"]], ["di", 1166]]
func parseCallbackResponse(body string) ([]models.GASRecord, error) {
	// Try direct JSON array first
	var records []models.GASRecord
	if err := json.Unmarshal([]byte(body), &records); err == nil && len(records) > 0 {
		return records, nil
	}

	// Remove )]}' prefix
	bodyStr := body
	if strings.HasPrefix(bodyStr, ")]}'") {
		if idx := strings.Index(bodyStr, "\n"); idx != -1 {
			bodyStr = strings.TrimSpace(bodyStr[idx+1:])
		}
	}

	// Parse outer array: [["op.exec", [0, "JSON_STRING"]], ["di", 1166]]
	var outer []json.RawMessage
	if err := json.Unmarshal([]byte(bodyStr), &outer); err != nil {
		return nil, fmt.Errorf("parse outer: %w (preview: %.300s)", err, body)
	}

	for _, raw := range outer {
		var item []json.RawMessage
		if err := json.Unmarshal(raw, &item); err != nil || len(item) < 2 {
			continue
		}

		var opName string
		if err := json.Unmarshal(item[0], &opName); err != nil || opName != "op.exec" {
			continue
		}

		// item[1] = [0, "JSON_STRING"] or [0, [...]]
		var inner []json.RawMessage
		if err := json.Unmarshal(item[1], &inner); err != nil || len(inner) < 2 {
			continue
		}

		// Try as JSON string first
		var jsonStr string
		if err := json.Unmarshal(inner[1], &jsonStr); err == nil {
			if err := json.Unmarshal([]byte(jsonStr), &records); err == nil && len(records) > 0 {
				return records, nil
			}
		}

		// Try as direct array
		if err := json.Unmarshal(inner[1], &records); err == nil && len(records) > 0 {
			return records, nil
		}
	}

	return nil, fmt.Errorf("no station data in callback (preview: %.500s)", body)
}

func parseThaiDate(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}

	loc, _ := time.LoadLocation("Asia/Bangkok")
	for _, f := range []string{
		"02/01/2006 15:04",
		"2/1/2006 15:04",
		"02/01/2006 15:04:05",
		"2006-01-02 15:04:05",
	} {
		if t, err := time.ParseInLocation(f, s, loc); err == nil {
			return &t
		}
	}
	return nil
}
