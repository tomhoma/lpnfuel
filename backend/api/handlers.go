package api

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"lpnfuel/db"
	"lpnfuel/fetcher"
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
		UpdatedAt: db.GetLastFetchTime(ctx),
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

func handleIngest(w http.ResponseWriter, r *http.Request) {
	// API key auth
	key := r.Header.Get("X-API-Key")
	if key == "" || key != ingestAPIKey {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid API key"})
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1MB limit
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "read body: " + err.Error()})
		return
	}

	// If body is a JSON-escaped string (e.g. "[{\"Brand\":...}]"), unescape it
	bodyStr := string(body)
	if len(bodyStr) > 2 && bodyStr[0] == '"' {
		var unescaped string
		if err := json.Unmarshal(body, &unescaped); err == nil {
			bodyStr = unescaped
		}
	}

	records, err := fetcher.ParseGASRecords(bodyStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "parse: " + err.Error()})
		return
	}

	ctx := r.Context()
	updated := 0
	for _, rec := range records {
		brand := normalizeBrand(strings.TrimSpace(rec.Brand))
		name := strings.ReplaceAll(strings.TrimSpace(rec.StationName), "_", " ")

		station := models.Station{
			ID:       strings.TrimSpace(rec.ID),
			Brand:    brand,
			Name:     name,
			District: strings.TrimSpace(rec.District),
			HasE20:   rec.E20 != "-",
			HasGas95: rec.Gas95 != "-",
		}

		if err := db.UpsertStation(ctx, station); err != nil {
			log.Printf("ingest upsert station %s: %v", rec.ID, err)
			continue
		}

		sourceUpdated := fetcher.ParseThaiDate(rec.LastUpdated)
		eta := rec.TransportETA
		if eta == "" {
			eta = rec.Col10
		}

		fs := models.FuelStatus{
			StationID:       rec.ID,
			Gas95:           rec.Gas95,
			Gas91:           rec.Gas91,
			E20:             rec.E20,
			Diesel:          rec.Diesel,
			TransportStatus: rec.TransportStatus,
			TransportETA:    eta,
			SourceUpdated:   sourceUpdated,
		}

		if err := db.UpsertFuelStatus(ctx, fs); err != nil {
			log.Printf("ingest upsert fuel_status %s: %v", rec.ID, err)
			continue
		}

		updated++
	}

	log.Printf("Ingest: %d stations updated", updated)
	writeJSON(w, http.StatusOK, map[string]any{
		"status":           "ok",
		"stations_updated": updated,
	})
}

func handleUpdateGeo(w http.ResponseWriter, r *http.Request) {
	key := r.Header.Get("X-API-Key")
	if key == "" || key != ingestAPIKey {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid API key"})
		return
	}

	id := r.PathValue("id")

	var body struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	if body.Lat == 0 && body.Lng == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "lat and lng required"})
		return
	}

	if err := db.UpdateStationGeo(r.Context(), id, body.Lat, body.Lng); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	log.Printf("Geo updated: station %s → lat=%f lng=%f", id, body.Lat, body.Lng)
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"id":     id,
		"lat":    body.Lat,
		"lng":    body.Lng,
	})
}

func normalizeBrand(brand string) string {
	// Normalize คาลเท๊กซ์ (mai tri ๊) → คาลเท็กซ์ (mai taikhu ็)
	brand = strings.ReplaceAll(brand, "เท๊ก", "เท็ก")
	// Normalize sub-brands
	if strings.HasPrefix(brand, "บางจาก") && strings.Contains(brand, "ซัสโก้") {
		return "บางจาก"
	}
	return brand
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

const maxReportDistanceKm = 3.0
const reportRateLimitWindow = 3 * time.Minute

var validStatuses = map[string]bool{"available": true, "empty": true, "unknown": true}

func handleSubmitReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	stationID := r.PathValue("id")

	var req models.SubmitReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	if len(req.Reports) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no reports provided"})
		return
	}
	if req.Lat == 0 && req.Lng == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "lat and lng required"})
		return
	}

	// Get station to check distance
	station, _, err := db.GetStationWithHistory(ctx, stationID)
	if err != nil || station == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "station not found"})
		return
	}

	// Check GPS proximity
	var distKm float64
	if station.Lat != nil && station.Lng != nil {
		distKm = geo.Haversine(req.Lat, req.Lng, *station.Lat, *station.Lng)
		if distKm > maxReportDistanceKm {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error":       "too far from station",
				"distance_km": distKm,
				"max_km":      maxReportDistanceKm,
			})
			return
		}
	}

	accepted := 0
	rateLimited := 0
	var retryAfterSec int
	for _, rpt := range req.Reports {
		if !validStatuses[rpt.Status] {
			continue
		}

		lastReport, err := db.CheckReportRateLimit(ctx, stationID, rpt.FuelType, reportRateLimitWindow)
		if err != nil {
			log.Printf("rate limit check error: %v", err)
			continue
		}
		if lastReport != nil {
			elapsed := time.Since(*lastReport)
			remaining := reportRateLimitWindow - elapsed
			if remaining > 0 {
				secs := int(remaining.Seconds()) + 1
				if secs > retryAfterSec {
					retryAfterSec = secs
				}
				rateLimited++
				continue
			}
		}

		report := models.FuelReport{
			StationID:   stationID,
			FuelType:    rpt.FuelType,
			Status:      rpt.Status,
			ReporterLat: &req.Lat,
			ReporterLng: &req.Lng,
			DistanceKm:  &distKm,
		}

		if _, err := db.InsertFuelReport(ctx, report); err != nil {
			log.Printf("insert report error: %v", err)
			continue
		}
		accepted++
	}

	status := http.StatusOK
	resp := map[string]any{
		"status":       "ok",
		"accepted":     accepted,
		"rate_limited": rateLimited,
	}
	if accepted == 0 && rateLimited > 0 {
		status = http.StatusTooManyRequests
		resp["error"] = "พึ่งอัพเดทไปเมื่อสักครู่ กรุณารออีกสักครู่"
		resp["retry_after_seconds"] = retryAfterSec
	}

	writeJSON(w, status, resp)
}

func handleGetReports(w http.ResponseWriter, r *http.Request) {
	stationID := r.PathValue("id")
	limit := 20
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	reports, err := db.GetRecentReports(r.Context(), stationID, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"reports": reports})
}

func handleFuelTypes(w http.ResponseWriter, r *http.Request) {
	catalog, err := db.GetFuelTypeCatalog(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"fuel_types": catalog})
}

func handleLatestReport(w http.ResponseWriter, r *http.Request) {
	t := db.GetLatestReportTime(r.Context())
	resp := map[string]any{"latest_report_at": nil}
	if t != nil {
		resp["latest_report_at"] = t.Format(time.RFC3339)
	}
	writeJSON(w, http.StatusOK, resp)
}
