package api

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"lpnfuel/db"
	"lpnfuel/fetcher"
	"lpnfuel/geo"
	"lpnfuel/models"
)

var csvMu sync.Mutex

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

	// Apply community report overrides (today's reports override GAS data)
	overrides, err := db.GetTodayReportOverrides(ctx)
	if err != nil {
		log.Printf("community overrides error: %v", err)
	} else {
		applyCommunityOverrides(stations, overrides)
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
	ctx := r.Context()
	id := r.PathValue("id")
	station, history, err := db.GetStationWithHistory(ctx, id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "station not found"})
		return
	}

	// Apply community report overrides for this station
	overrides, err := db.GetTodayReportOverrides(ctx)
	if err != nil {
		log.Printf("community overrides error: %v", err)
	} else {
		stations := []models.StationWithStatus{*station}
		applyCommunityOverrides(stations, overrides)
		*station = stations[0]
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

	// Apply community report overrides
	overrides, err := db.GetTodayReportOverrides(ctx)
	if err != nil {
		log.Printf("community overrides error: %v", err)
	} else {
		applyCommunityOverrides(stations, overrides)
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

	// Append new station IDs to geo CSV
	if geoCSVPath != "" {
		newCount := appendNewStationsToGeoCSV(geoCSVPath, records)
		if newCount > 0 {
			log.Printf("Ingest: appended %d new stations to %s", newCount, geoCSVPath)
		}
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

// applyCommunityOverrides merges today's community reports into station fuel status.
// Community reports take priority over GAS data.
func applyCommunityOverrides(stations []models.StationWithStatus, overrides map[string]map[string]string) {
	for i := range stations {
		so, ok := overrides[stations[i].Station.ID]
		if !ok {
			continue
		}
		cs := make(map[string]bool)
		if v, has := so["gas95"]; has {
			stations[i].FuelStatus.Gas95 = v
			cs["gas95"] = true
		}
		if v, has := so["gas91"]; has {
			stations[i].FuelStatus.Gas91 = v
			cs["gas91"] = true
		}
		if v, has := so["e20"]; has {
			stations[i].FuelStatus.E20 = v
			cs["e20"] = true
		}
		if v, has := so["diesel"]; has {
			stations[i].FuelStatus.Diesel = v
			cs["diesel"] = true
		}
		if len(cs) > 0 {
			stations[i].CommunitySource = cs
		}
	}
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
const reporterGlobalCooldown = 10 * time.Minute
const dailyPointCap = 30

var validStatuses = map[string]bool{"available": true, "empty": true, "unknown": true}

func computeLevel(totalPoints int) models.ReporterLevel {
	level := models.ReporterLevels[0]
	for _, l := range models.ReporterLevels {
		if totalPoints >= l.MinPoints {
			level = l
		}
	}
	return level
}

func nextLevel(totalPoints int) *models.ReporterLevel {
	for _, l := range models.ReporterLevels {
		if totalPoints < l.MinPoints {
			return &l
		}
	}
	return nil
}

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

	// Sanitize nickname (max 20 chars)
	nickname := strings.TrimSpace(req.Nickname)
	if len([]rune(nickname)) > 20 {
		nickname = string([]rune(nickname)[:20])
	}
	reporterID := strings.TrimSpace(req.ReporterID)

	// Per-reporter global cooldown (10 min between reports)
	if reporterID != "" {
		lastGlobal, err := db.CheckReporterGlobalCooldown(ctx, reporterID)
		if err == nil && lastGlobal != nil {
			elapsed := time.Since(*lastGlobal)
			remaining := reporterGlobalCooldown - elapsed
			if remaining > 0 {
				writeJSON(w, http.StatusTooManyRequests, map[string]any{
					"error":               "กรุณารอ 10 นาทีระหว่างการรายงาน",
					"retry_after_seconds": int(remaining.Seconds()) + 1,
				})
				return
			}
		}
	}

	// Daily point cap check
	var remainingCap int
	if reporterID != "" {
		dailyPoints, _ := db.GetReporterDailyPoints(ctx, reporterID)
		remainingCap = dailyPointCap - dailyPoints
		if remainingCap <= 0 {
			writeJSON(w, http.StatusTooManyRequests, map[string]any{
				"error":     "ถึงจำกัดรายงานวันนี้แล้ว (30 แต้ม/วัน) พรุ่งนี้มาใหม่นะ!",
				"daily_cap": dailyPointCap,
			})
			return
		}
	} else {
		remainingCap = len(req.Reports) // no cap for anonymous
	}

	// Get station to check distance
	station, _, err := db.GetStationWithHistory(ctx, stationID)
	if err != nil || station == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "station not found"})
		return
	}

	// Check GPS proximity — TEMPORARILY DISABLED
	var distKm float64
	if station.Lat != nil && station.Lng != nil {
		distKm = geo.Haversine(req.Lat, req.Lng, *station.Lat, *station.Lng)
	}

	// Generate batch ID and extract debug info
	batchID := fmt.Sprintf("%s-%d", stationID, time.Now().UnixMilli())
	userAgent := r.Header.Get("User-Agent")
	ipAddress := r.RemoteAddr
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		ipAddress = strings.Split(fwd, ",")[0]
	}

	accepted := 0
	rateLimited := 0
	var retryAfterSec int
	var acceptedFuels []string
	for _, rpt := range req.Reports {
		if !validStatuses[rpt.Status] {
			continue
		}

		// Stop if daily cap reached
		if accepted >= remainingCap {
			rateLimited++
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
			UserAgent:   userAgent,
			IPAddress:   ipAddress,
			BatchID:     batchID,
			ReporterID:  reporterID,
			Nickname:    nickname,
		}

		if _, err := db.InsertFuelReport(ctx, report); err != nil {
			log.Printf("insert report error: %v", err)
			continue
		}
		accepted++
		acceptedFuels = append(acceptedFuels, rpt.FuelType+"="+rpt.Status)
	}

	if accepted > 0 {
		log.Printf("Report: station=%s batch=%s reporter=%s nick=%s accepted=%d dist=%.1fkm ip=%s fuels=[%s]",
			stationID, batchID, reporterID, nickname, accepted, distKm, ipAddress, strings.Join(acceptedFuels, ", "))
	}

	status := http.StatusOK
	resp := map[string]any{
		"status":       "ok",
		"accepted":     accepted,
		"rate_limited": rateLimited,
	}

	// Update reporter points
	if reporterID != "" && accepted > 0 {
		if err := db.UpsertReporter(ctx, reporterID, nickname); err != nil {
			log.Printf("upsert reporter error: %v", err)
		}
		newTotal, err := db.IncrementReporterPoints(ctx, reporterID, accepted)
		if err != nil {
			log.Printf("increment points error: %v", err)
		} else {
			level := computeLevel(newTotal)
			resp["points_earned"] = accepted
			resp["total_points"] = newTotal
			resp["level"] = level
			if nl := nextLevel(newTotal); nl != nil {
				resp["next_level"] = nl
				resp["points_to_next"] = nl.MinPoints - newTotal
			}
		}
	}

	if accepted == 0 && rateLimited > 0 {
		status = http.StatusTooManyRequests
		resp["error"] = "พึ่งอัพเดทไปเมื่อสักครู่ กรุณารออีกสักครู่"
		resp["retry_after_seconds"] = retryAfterSec
	}

	writeJSON(w, status, resp)
}

func handleGetReporter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	reporter, err := db.GetReporter(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "reporter not found"})
		return
	}
	level := computeLevel(reporter.TotalPoints)
	nl := nextLevel(reporter.TotalPoints)

	resp := map[string]any{
		"reporter": reporter,
		"level":    level,
	}
	if nl != nil {
		resp["next_level"] = nl
		resp["points_to_next"] = nl.MinPoints - reporter.TotalPoints
	}
	writeJSON(w, http.StatusOK, resp)
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

// appendNewStationsToGeoCSV reads the existing CSV, finds station IDs from GAS
// that are not yet in the file, and appends them with lat=0, lng=0.
func appendNewStationsToGeoCSV(path string, records []models.GASRecord) int {
	csvMu.Lock()
	defer csvMu.Unlock()

	// Read existing IDs from CSV
	existingIDs := make(map[string]bool)
	f, err := os.Open(path)
	if err != nil {
		log.Printf("geo csv open: %v", err)
		return 0
	}
	rows, err := csv.NewReader(f).ReadAll()
	f.Close()
	if err != nil {
		log.Printf("geo csv read: %v", err)
		return 0
	}

	// Find id column index
	idIdx := -1
	if len(rows) > 0 {
		for i, col := range rows[0] {
			if col == "id" {
				idIdx = i
				break
			}
		}
	}
	if idIdx < 0 {
		log.Printf("geo csv: id column not found")
		return 0
	}

	for _, row := range rows[1:] {
		if len(row) > idIdx {
			existingIDs[row[idIdx]] = true
		}
	}

	// Collect new stations
	var newRows [][]string
	seen := make(map[string]bool)
	for _, rec := range records {
		id := strings.TrimSpace(rec.ID)
		if id == "" || existingIDs[id] || seen[id] {
			continue
		}
		seen[id] = true

		brand := normalizeBrand(strings.TrimSpace(rec.Brand))
		name := strings.ReplaceAll(strings.TrimSpace(rec.StationName), "_", " ")
		district := strings.TrimSpace(rec.District)
		searchName := buildSearchName(brand, name, district)

		newRows = append(newRows, []string{id, brand, name, district, searchName, "0", "0"})
	}

	if len(newRows) == 0 {
		return 0
	}

	// Append to CSV
	af, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("geo csv append open: %v", err)
		return 0
	}
	defer af.Close()

	w := csv.NewWriter(af)
	for _, row := range newRows {
		if err := w.Write(row); err != nil {
			log.Printf("geo csv write: %v", err)
		}
	}
	w.Flush()

	return len(newRows)
}

// buildSearchName generates the search_google_maps field for a new station.
func buildSearchName(brand, name, district string) string {
	brandSearch := map[string]string{
		"ปตท.":      "ปตท",
		"พีที":      "PT",
		"บางจาก":    "บางจาก",
		"คาลเท็กซ์": "คาลเท็กซ์",
		"เชลล์":     "Shell",
	}
	prefix := brand
	if s, ok := brandSearch[brand]; ok {
		prefix = s
	}
	return fmt.Sprintf("ปั๊ม %s %s %s ลำพูน", prefix, name, district)
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

func handleGlobalReports(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 && l <= 200 {
		limit = l
	}

	reports, err := db.GetGlobalRecentReports(r.Context(), limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"reports": reports})
}
