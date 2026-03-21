package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"lpnfuel/api"
	"lpnfuel/config"
	"lpnfuel/db"
	"lpnfuel/fetcher"
)

func main() {
	cfg := config.Load()

	if err := db.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("DB connect: %v", err)
	}
	defer db.Close()

	if err := db.RunMigrations(); err != nil {
		log.Fatalf("Migrations: %v", err)
	}

	// Import geocoordinates from CSV on startup
	if err := importGeoCSV(context.Background(), "../data/stations_geo.csv"); err != nil {
		log.Printf("Geo import (non-fatal): %v", err)
		// Also try current dir
		_ = importGeoCSV(context.Background(), "data/stations_geo.csv")
	}

	// Initial fetch
	ctx := context.Background()
	log.Println("Running initial GAS fetch...")
	if err := fetcher.FetchAndStore(ctx, cfg.GASUrl); err != nil {
		log.Printf("Initial fetch error: %v", err)
	}
	if err := fetcher.FetchPricesIfStale(ctx, cfg.OilPriceAPI); err != nil {
		log.Printf("Initial price fetch error: %v", err)
	}

	// Cron scheduler
	loc, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		loc = time.UTC
	}

	go func() {
		ticker := time.NewTicker(cfg.CronInterval)
		defer ticker.Stop()
		for range ticker.C {
			hour := time.Now().In(loc).Hour()
			if hour < cfg.CronStartHour || hour >= cfg.CronEndHour {
				continue
			}
			ctx := context.Background()
			if err := fetcher.FetchAndStore(ctx, cfg.GASUrl); err != nil {
				log.Printf("Cron fetch error: %v", err)
			}
			if err := fetcher.FetchPricesIfStale(ctx, cfg.OilPriceAPI); err != nil {
				log.Printf("Cron price error: %v", err)
			}
		}
	}()

	router := api.NewRouter(cfg.CORSOrigins)
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server listening on %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func importGeoCSV(ctx context.Context, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	r := csv.NewReader(f)
	records, err := r.ReadAll()
	if err != nil {
		return err
	}

	count := 0
	for i, rec := range records {
		if i == 0 { // skip header
			continue
		}
		if len(rec) < 3 {
			continue
		}
		id := rec[0]
		lat, err1 := strconv.ParseFloat(rec[1], 64)
		lng, err2 := strconv.ParseFloat(rec[2], 64)
		if err1 != nil || err2 != nil {
			continue
		}
		if err := db.UpdateStationGeo(ctx, id, lat, lng); err != nil {
			log.Printf("update geo %s: %v", id, err)
			continue
		}
		count++
	}
	log.Printf("Imported %d station coordinates", count)
	return nil
}
