package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"lpnfuel/api"
	"lpnfuel/config"
	"lpnfuel/db"
)

func main() {
	log.SetOutput(os.Stdout)
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
		_ = importGeoCSV(context.Background(), "data/stations_geo.csv")
	}

	router := api.NewRouter(cfg.CORSOrigins, cfg.IngestAPIKey)
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

	// Find column indices from header
	if len(records) == 0 {
		return fmt.Errorf("empty CSV")
	}
	header := records[0]
	idIdx, latIdx, lngIdx := -1, -1, -1
	for i, col := range header {
		switch col {
		case "id":
			idIdx = i
		case "lat":
			latIdx = i
		case "lng":
			lngIdx = i
		}
	}
	if idIdx < 0 || latIdx < 0 || lngIdx < 0 {
		return fmt.Errorf("CSV missing required columns (id, lat, lng)")
	}

	count := 0
	for i, rec := range records {
		if i == 0 {
			continue
		}
		if len(rec) <= latIdx || len(rec) <= lngIdx {
			continue
		}
		id := rec[idIdx]
		lat, err1 := strconv.ParseFloat(rec[latIdx], 64)
		lng, err2 := strconv.ParseFloat(rec[lngIdx], 64)
		if err1 != nil || err2 != nil || (lat == 0 && lng == 0) {
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
