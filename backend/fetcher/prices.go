package fetcher

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"lpnfuel/db"
	"lpnfuel/models"
)

var lastPriceFetch time.Time

func FetchPricesIfStale(ctx context.Context, apiURL string) error {
	// Fetch once per day
	if !lastPriceFetch.IsZero() && time.Since(lastPriceFetch) < 23*time.Hour {
		return nil
	}

	prices, err := fetchThaiOilAPI(apiURL)
	if err != nil {
		return fmt.Errorf("fetch prices: %w", err)
	}

	if err := db.UpsertFuelPrices(ctx, prices); err != nil {
		return fmt.Errorf("upsert prices: %w", err)
	}

	lastPriceFetch = time.Now()
	log.Printf("Fetched %d fuel prices", len(prices))
	return nil
}

type thaiOilResponse struct {
	Status string                            `json:"status"`
	Data   map[string]map[string]interface{} `json:"data"`
}

var fuelTypeMap = map[string]string{
	"gasohol_95":  "gas95",
	"gasohol_91":  "gas91",
	"e20":         "e20",
	"diesel":      "diesel",
	"diesel_b7":   "diesel",
	"premium_diesel": "diesel",
}

var brandMap = map[string]string{
	"ptt":      "ptt",
	"bcp":      "bcp",
	"shell":    "shell",
	"esso":     "esso",
	"caltex":   "caltex",
	"pt":       "pt",
	"susco":    "susco",
}

func fetchThaiOilAPI(url string) ([]models.FuelPrice, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result thaiOilResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	var prices []models.FuelPrice
	for brand, fuels := range result.Data {
		brandKey, ok := brandMap[brand]
		if !ok {
			brandKey = brand
		}
		for fuelKey, priceVal := range fuels {
			fuelType, ok := fuelTypeMap[fuelKey]
			if !ok {
				continue
			}
			var price float64
			switch v := priceVal.(type) {
			case float64:
				price = v
			case string:
				fmt.Sscanf(v, "%f", &price)
			}
			if price <= 0 {
				continue
			}
			prices = append(prices, models.FuelPrice{
				Brand:    brandKey,
				FuelType: fuelType,
				Price:    price,
			})
		}
	}
	return prices, nil
}
