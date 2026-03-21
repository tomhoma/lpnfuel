package api

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"time"

	"lpnfuel/db"
	"lpnfuel/geo"
	"lpnfuel/models"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	writeJSON(w, http.StatusOK, models.HealthResponse{
		Status:       "ok",
		LastFetch:    db.GetLastFetchTime(ctx),
		StationCount: db.GetStationCount(ctx),
	})
}

func handleStations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stations, err := db.GetAllStationsWithStatus(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	q := r.URL.Query()
	brand := q.Get("brand")
	district := q.Get("district")
	fuel := q.Get("fuel")
	status := q.Get("status")

	filtered := stations[:0]
	for _, s := range stations {
		if brand != "" && s.Brand != brand {
			continue
		}
		if district != "" && s.District != district {
			continue
		}
		if fuel != "" && status != "" {
			val := fuelValue(s.FuelStatus, fuel)
			if val != status {
				continue
			}
		}
		filtered = append(filtered, s)
	}

	summary := computeSummary(filtered)
	writeJSON(w, http.StatusOK, models.StationsResponse{
		Stations:  filtered,
		Summary:   summary,
		UpdatedAt: time.Now(),
	})
}

func handleStationByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	station, history, err := db.GetStationWithHistory(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "station not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"station":    station,
		"history_7d": history,
	})
}

func handleNearest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()

	lat, err1 := strconv.ParseFloat(q.Get("lat"), 64)
	lng, err2 := strconv.ParseFloat(q.Get("lng"), 64)
	if err1 != nil || err2 != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "lat and lng required"})
		return
	}

	fuel := q.Get("fuel")
	limit := 5
	if l, err := strconv.Atoi(q.Get("limit")); err == nil && l > 0 {
		limit = l
	}

	stations, err := db.GetAllStationsWithStatus(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	var candidates []models.StationWithStatus
	for _, s := range stations {
		if s.Lat == nil || s.Lng == nil {
			continue
		}
		if fuel != "" && fuelValue(s.FuelStatus, fuel) != "มี" {
			continue
		}
		d := geo.Haversine(lat, lng, *s.Lat, *s.Lng)
		s.DistanceKm = &d
		candidates = append(candidates, s)
	}

	sort.Slice(candidates, func(i, j int) bool {
		return *candidates[i].DistanceKm < *candidates[j].DistanceKm
	})

	if len(candidates) > limit {
		candidates = candidates[:limit]
	}

	writeJSON(w, http.StatusOK, map[string]any{"stations": candidates})
}

func handleDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stations, err := db.GetAllStationsWithStatus(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	summary := computeSummary(stations)

	byDistrict, _ := db.GetDistrictSummaries(ctx)

	// Brand summary
	brandMap := map[string]*models.BrandSummary{}
	for _, s := range stations {
		bs := brandMap[s.Brand]
		if bs == nil {
			bs = &models.BrandSummary{Brand: s.Brand}
			brandMap[s.Brand] = bs
		}
		bs.Total++
		if hasFuel(s.FuelStatus) {
			bs.WithFuel++
		}
	}
	var byBrand []models.BrandSummary
	for _, bs := range brandMap {
		if bs.Total > 0 {
			bs.AvailableRate = float64(bs.WithFuel) / float64(bs.Total) * 100
		}
		byBrand = append(byBrand, *bs)
	}
	sort.Slice(byBrand, func(i, j int) bool {
		return byBrand[i].AvailableRate > byBrand[j].AvailableRate
	})

	// Incoming supply
	var incoming []models.StationWithStatus
	for _, s := range stations {
		if s.TransportStatus == "กำลังจัดส่ง" || s.TransportStatus == "กำลังลงน้ำมัน" {
			incoming = append(incoming, s)
		}
	}

	trend, _ := db.GetTrend7d(ctx)

	writeJSON(w, http.StatusOK, models.DashboardResponse{
		Overall:        summary,
		ByDistrict:     byDistrict,
		ByBrand:        byBrand,
		IncomingSupply: incoming,
		Trend7d:        trend,
		UpdatedAt:      time.Now(),
	})
}

func handlePrices(w http.ResponseWriter, r *http.Request) {
	prices, err := db.GetLatestPrices(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, models.PricesResponse{
		Prices: prices,
		Date:   time.Now().Format("2006-01-02"),
	})
}

func fuelValue(fs models.FuelStatus, fuel string) string {
	switch fuel {
	case "gas95":
		return fs.Gas95
	case "gas91":
		return fs.Gas91
	case "e20":
		return fs.E20
	case "diesel":
		return fs.Diesel
	}
	return ""
}

func hasFuel(fs models.FuelStatus) bool {
	return fs.Gas95 == "มี" || fs.Gas91 == "มี" || fs.E20 == "มี" || fs.Diesel == "มี"
}

func computeSummary(stations []models.StationWithStatus) models.OverallSummary {
	s := models.OverallSummary{Total: len(stations)}
	for _, st := range stations {
		if hasFuel(st.FuelStatus) {
			s.WithFuel++
		} else {
			s.AllEmpty++
		}
		if st.Diesel == "มี" {
			s.DieselCount++
		}
	}
	s.DieselCrisis = s.Total > 0 && float64(s.DieselCount)/float64(s.Total) < 0.2
	return s
}

