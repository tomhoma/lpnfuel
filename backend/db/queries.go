package db

import (
	"context"
	"fmt"
	"time"

	"lpnfuel/models"
)

func UpsertStation(ctx context.Context, s models.Station) error {
	_, err := Pool.Exec(ctx, `
		INSERT INTO stations (id, brand, name, district, has_e20, has_gas95, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())
		ON CONFLICT (id) DO UPDATE SET
			brand = EXCLUDED.brand,
			name = EXCLUDED.name,
			district = EXCLUDED.district,
			has_e20 = EXCLUDED.has_e20,
			has_gas95 = EXCLUDED.has_gas95,
			updated_at = now()
	`, s.ID, s.Brand, s.Name, s.District, s.HasE20, s.HasGas95)
	return err
}

func UpsertFuelStatus(ctx context.Context, fs models.FuelStatus) error {
	_, err := Pool.Exec(ctx, `
		INSERT INTO fuel_status (station_id, gas95, gas91, e20, diesel, transport_status, transport_eta, source_updated, fetched_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
		ON CONFLICT (station_id) DO UPDATE SET
			gas95 = EXCLUDED.gas95,
			gas91 = EXCLUDED.gas91,
			e20 = EXCLUDED.e20,
			diesel = EXCLUDED.diesel,
			transport_status = EXCLUDED.transport_status,
			transport_eta = EXCLUDED.transport_eta,
			source_updated = EXCLUDED.source_updated,
			fetched_at = now()
	`, fs.StationID, fs.Gas95, fs.Gas91, fs.E20, fs.Diesel, fs.TransportStatus, fs.TransportETA, fs.SourceUpdated)
	return err
}


func GetAllStationsWithStatus(ctx context.Context) ([]models.StationWithStatus, error) {
	rows, err := Pool.Query(ctx, `
		SELECT
			s.id, s.brand, s.name, s.district, s.lat, s.lng, s.has_e20, s.has_gas95, s.created_at, s.updated_at,
			COALESCE(fs.gas95, '-') as gas95,
			COALESCE(fs.gas91, '-') as gas91,
			COALESCE(fs.e20, '-') as e20,
			COALESCE(fs.diesel, '-') as diesel,
			COALESCE(fs.transport_status, '') as transport_status,
			COALESCE(fs.transport_eta, '') as transport_eta,
			fs.source_updated,
			COALESCE(fs.fetched_at, now()) as fetched_at
		FROM stations s
		LEFT JOIN fuel_status fs ON s.id = fs.station_id
		ORDER BY s.id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.StationWithStatus
	for rows.Next() {
		var sw models.StationWithStatus
		err := rows.Scan(
			&sw.Station.ID, &sw.Station.Brand, &sw.Station.Name, &sw.Station.District,
			&sw.Station.Lat, &sw.Station.Lng, &sw.Station.HasE20, &sw.Station.HasGas95,
			&sw.Station.CreatedAt, &sw.Station.UpdatedAt,
			&sw.FuelStatus.Gas95, &sw.FuelStatus.Gas91, &sw.FuelStatus.E20, &sw.FuelStatus.Diesel,
			&sw.FuelStatus.TransportStatus, &sw.FuelStatus.TransportETA,
			&sw.FuelStatus.SourceUpdated, &sw.FuelStatus.FetchedAt,
		)
		if err != nil {
			return nil, err
		}
		sw.FuelStatus.StationID = sw.Station.ID
		result = append(result, sw)
	}
	return result, nil
}

func GetStationWithHistory(ctx context.Context, id string) (*models.StationWithStatus, []models.FuelStatus, error) {
	var sw models.StationWithStatus
	err := Pool.QueryRow(ctx, `
		SELECT
			s.id, s.brand, s.name, s.district, s.lat, s.lng, s.has_e20, s.has_gas95, s.created_at, s.updated_at,
			COALESCE(fs.gas95, '-'), COALESCE(fs.gas91, '-'), COALESCE(fs.e20, '-'), COALESCE(fs.diesel, '-'),
			COALESCE(fs.transport_status, ''), COALESCE(fs.transport_eta, ''),
			fs.source_updated, COALESCE(fs.fetched_at, now())
		FROM stations s
		LEFT JOIN fuel_status fs ON s.id = fs.station_id
		WHERE s.id = $1
	`, id).Scan(
		&sw.Station.ID, &sw.Station.Brand, &sw.Station.Name, &sw.Station.District,
		&sw.Station.Lat, &sw.Station.Lng, &sw.Station.HasE20, &sw.Station.HasGas95,
		&sw.Station.CreatedAt, &sw.Station.UpdatedAt,
		&sw.FuelStatus.Gas95, &sw.FuelStatus.Gas91, &sw.FuelStatus.E20, &sw.FuelStatus.Diesel,
		&sw.FuelStatus.TransportStatus, &sw.FuelStatus.TransportETA,
		&sw.FuelStatus.SourceUpdated, &sw.FuelStatus.FetchedAt,
	)
	if err != nil {
		return nil, nil, err
	}
	sw.FuelStatus.StationID = sw.Station.ID

	rows, err := Pool.Query(ctx, `
		SELECT station_id, gas95, gas91, e20, diesel, transport_status, recorded_at
		FROM fuel_history
		WHERE station_id = $1
		ORDER BY recorded_at DESC
		LIMIT 336
	`, id) // 336 = 7 days * 24h * 2 (every 30min)
	if err != nil {
		return &sw, nil, nil
	}
	defer rows.Close()

	var history []models.FuelStatus
	for rows.Next() {
		var fs models.FuelStatus
		var recordedAt time.Time
		err := rows.Scan(&fs.StationID, &fs.Gas95, &fs.Gas91, &fs.E20, &fs.Diesel, &fs.TransportStatus, &recordedAt)
		if err != nil {
			continue
		}
		fs.FetchedAt = recordedAt
		history = append(history, fs)
	}
	return &sw, history, nil
}


func GetLatestPrices(ctx context.Context) (map[string]map[string]map[string]float64, error) {
	rows, err := Pool.Query(ctx, `
		SELECT DISTINCT ON (district, brand, fuel_type) district, brand, fuel_type, price
		FROM fuel_prices
		ORDER BY district, brand, fuel_type, fetched_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]map[string]map[string]float64)
	for rows.Next() {
		var district, brand, fuelType string
		var price float64
		if err := rows.Scan(&district, &brand, &fuelType, &price); err != nil {
			continue
		}
		if result[district] == nil {
			result[district] = make(map[string]map[string]float64)
		}
		if result[district][brand] == nil {
			result[district][brand] = make(map[string]float64)
		}
		result[district][brand][fuelType] = price
	}
	return result, nil
}

func UpsertFuelPrices(ctx context.Context, prices []models.FuelPrice) error {
	for _, p := range prices {
		// Only insert if price changed or no record today
		_, err := Pool.Exec(ctx, `
			INSERT INTO fuel_prices (brand, district, fuel_type, price)
			SELECT $1, $2, $3, $4
			WHERE NOT EXISTS (
				SELECT 1 FROM fuel_prices
				WHERE brand = $1 AND district = $2 AND fuel_type = $3
				  AND price = $4
				  AND fetched_at::date = CURRENT_DATE
			)
		`, p.Brand, p.District, p.FuelType, p.Price)
		if err != nil {
			return fmt.Errorf("insert price %s/%s/%s: %w", p.Brand, p.District, p.FuelType, err)
		}
	}
	return nil
}

func GetStationCount(ctx context.Context) int {
	var count int
	Pool.QueryRow(ctx, `SELECT COUNT(*) FROM stations`).Scan(&count)
	return count
}

func GetLastFetchTime(ctx context.Context) time.Time {
	var t time.Time
	Pool.QueryRow(ctx, `SELECT MAX(fetched_at) FROM fuel_status`).Scan(&t)
	return t
}


func UpdateStationGeo(ctx context.Context, id string, lat, lng float64) error {
	_, err := Pool.Exec(ctx, `
		UPDATE stations SET lat = $1, lng = $2, updated_at = now() WHERE id = $3
	`, lat, lng, id)
	return err
}

// InsertFuelReport inserts a user-submitted fuel report
func InsertFuelReport(ctx context.Context, r models.FuelReport) (int64, error) {
	var id int64
	err := Pool.QueryRow(ctx, `
		INSERT INTO fuel_reports (station_id, fuel_type, status, reporter_lat, reporter_lng, distance_km, note, user_agent, ip_address, batch_id, reporter_id, nickname)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`, r.StationID, r.FuelType, r.Status, r.ReporterLat, r.ReporterLng, r.DistanceKm, r.Note, r.UserAgent, r.IPAddress, r.BatchID, r.ReporterID, r.Nickname).Scan(&id)
	return id, err
}

// GetRecentReports returns latest reports for a station
func GetRecentReports(ctx context.Context, stationID string, limit int) ([]models.FuelReport, error) {
	rows, err := Pool.Query(ctx, `
		SELECT fr.id, fr.station_id, fr.fuel_type, fr.status,
		       fr.reporter_lat, fr.reporter_lng, fr.distance_km, fr.note,
		       COALESCE(fr.user_agent, ''), COALESCE(fr.ip_address, ''), COALESCE(fr.batch_id, ''),
		       fr.created_at
		FROM fuel_reports fr
		WHERE fr.station_id = $1
		ORDER BY fr.created_at DESC
		LIMIT $2
	`, stationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.FuelReport
	for rows.Next() {
		var r models.FuelReport
		if err := rows.Scan(&r.ID, &r.StationID, &r.FuelType, &r.Status,
			&r.ReporterLat, &r.ReporterLng, &r.DistanceKm, &r.Note,
			&r.UserAgent, &r.IPAddress, &r.BatchID,
			&r.CreatedAt); err != nil {
			continue
		}
		result = append(result, r)
	}
	return result, nil
}

// ReportWithStation is a FuelReport with station name and brand for the global feed
type ReportWithStation struct {
	models.FuelReport
	StationName   string `json:"station_name"`
	StationBrand  string `json:"station_brand"`
	ReporterIcon  string `json:"reporter_icon,omitempty"`
}

// GetGlobalRecentReports returns latest reports across all stations with station info
func GetGlobalRecentReports(ctx context.Context, limit int) ([]ReportWithStation, error) {
	rows, err := Pool.Query(ctx, `
		SELECT fr.id, fr.station_id, fr.fuel_type, fr.status,
		       fr.reporter_lat, fr.reporter_lng, fr.distance_km, fr.note,
		       COALESCE(fr.user_agent, ''), COALESCE(fr.ip_address, ''), COALESCE(fr.batch_id, ''),
		       COALESCE(fr.reporter_id, ''), COALESCE(fr.nickname, ''),
		       fr.created_at,
		       COALESCE(s.name, ''), COALESCE(s.brand, ''),
		       COALESCE(r.total_points, 0)
		FROM fuel_reports fr
		LEFT JOIN stations s ON fr.station_id = s.id
		LEFT JOIN reporters r ON fr.reporter_id = r.id
		ORDER BY fr.created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ReportWithStation
	for rows.Next() {
		var rws ReportWithStation
		var totalPoints int
		if err := rows.Scan(&rws.ID, &rws.StationID, &rws.FuelType, &rws.Status,
			&rws.ReporterLat, &rws.ReporterLng, &rws.DistanceKm, &rws.Note,
			&rws.UserAgent, &rws.IPAddress, &rws.BatchID,
			&rws.ReporterID, &rws.Nickname,
			&rws.CreatedAt,
			&rws.StationName, &rws.StationBrand, &totalPoints); err != nil {
			continue
		}
		// Calculate reporter icon based on total points
		rws.ReporterIcon = getReporterIcon(totalPoints)
		result = append(result, rws)
	}
	return result, nil
}

// getReporterIcon returns the icon for a reporter based on their total points
func getReporterIcon(points int) string {
	levels := []struct {
		minPoints int
		icon      string
	}{
		{100, "👑"},
		{50, "💎"},
		{30, "🐎"},
		{15, "🌊"},
		{5, "🏮"},
		{0, "🌱"},
	}
	for _, l := range levels {
		if points >= l.minPoints {
			return l.icon
		}
	}
	return "🌱"
}

// CheckReportRateLimit returns the last report time for this station+fuel within the window
func CheckReportRateLimit(ctx context.Context, stationID, fuelType string, window time.Duration) (*time.Time, error) {
	var lastReport *time.Time
	err := Pool.QueryRow(ctx, `
		SELECT MAX(created_at) FROM fuel_reports
		WHERE station_id = $1 AND fuel_type = $2
		  AND created_at > now() - $3::interval
	`, stationID, fuelType, fmt.Sprintf("%d seconds", int(window.Seconds()))).Scan(&lastReport)
	if err != nil {
		return nil, err
	}
	return lastReport, nil
}

// GetFuelTypeCatalog returns all fuel types
func GetFuelTypeCatalog(ctx context.Context) ([]models.FuelTypeCatalog, error) {
	rows, err := Pool.Query(ctx, `SELECT id, name, grp, sort FROM fuel_type_catalog ORDER BY sort`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.FuelTypeCatalog
	for rows.Next() {
		var ft models.FuelTypeCatalog
		if err := rows.Scan(&ft.ID, &ft.Name, &ft.Group, &ft.Sort); err != nil {
			continue
		}
		result = append(result, ft)
	}
	return result, nil
}

// CommunityOverride represents a community report override for a GAS fuel category
type CommunityOverride struct {
	StationID   string
	GasCategory string // "diesel", "gas95", "gas91", "e20"
	Status      string // "available" or "empty"
}

// GetTodayReportOverrides returns the latest community report per station per GAS category
// for today (after 1AM ICT reset). Returns map[stationID]map[gasCategory]string ("มี"/"หมด")
func GetTodayReportOverrides(ctx context.Context) (map[string]map[string]string, error) {
	ict, _ := time.LoadLocation("Asia/Bangkok")
	now := time.Now().In(ict)

	// Reset at 1AM ICT (same as frontend getTodayResetTime)
	resetTime := time.Date(now.Year(), now.Month(), now.Day(), 1, 0, 0, 0, ict)
	if now.Before(resetTime) {
		resetTime = resetTime.AddDate(0, 0, -1)
	}

	// Step 1: Get latest report per station per fuel_type (granular)
	// Step 2: Group by gas_category — if ANY fuel in group = available → group = มี
	rows, err := Pool.Query(ctx, `
		WITH latest_per_fuel AS (
			SELECT DISTINCT ON (station_id, fuel_type)
				station_id, fuel_type, status,
				CASE
					WHEN fuel_type IN ('diesel_b7','diesel_b10','diesel_b20','diesel_premium') THEN 'diesel'
					WHEN fuel_type IN ('gsh95','spg95','bzn95') THEN 'gas95'
					WHEN fuel_type = 'gsh91' THEN 'gas91'
					WHEN fuel_type IN ('e20','e85') THEN 'e20'
				END as gas_category
			FROM fuel_reports
			WHERE created_at >= $1
			ORDER BY station_id, fuel_type, created_at DESC
		)
		SELECT station_id, gas_category,
			CASE WHEN bool_or(status = 'available') THEN 'available' ELSE 'empty' END as status
		FROM latest_per_fuel
		WHERE gas_category IS NOT NULL
		GROUP BY station_id, gas_category
	`, resetTime.UTC())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]map[string]string)
	for rows.Next() {
		var stationID, gasCategory, status string
		if err := rows.Scan(&stationID, &gasCategory, &status); err != nil {
			continue
		}
		// Convert report status → Thai GAS status
		thaiStatus := "-"
		switch status {
		case "available":
			thaiStatus = "มี"
		case "empty":
			thaiStatus = "หมด"
		}
		if result[stationID] == nil {
			result[stationID] = make(map[string]string)
		}
		result[stationID][gasCategory] = thaiStatus
	}
	return result, nil
}

// UpsertReporter creates or updates a reporter record
func UpsertReporter(ctx context.Context, id, nickname string) error {
	_, err := Pool.Exec(ctx, `
		INSERT INTO reporters (id, nickname, updated_at)
		VALUES ($1, $2, now())
		ON CONFLICT (id) DO UPDATE SET
			nickname = CASE WHEN $2 = '' THEN reporters.nickname ELSE $2 END,
			updated_at = now()
	`, id, nickname)
	return err
}

// IncrementReporterPoints atomically adds points and returns new total
func IncrementReporterPoints(ctx context.Context, reporterID string, points int) (int, error) {
	var total int
	err := Pool.QueryRow(ctx, `
		UPDATE reporters SET total_points = total_points + $2, updated_at = now()
		WHERE id = $1
		RETURNING total_points
	`, reporterID, points).Scan(&total)
	return total, err
}

// GetReporterDailyPoints counts how many report rows this reporter has today (1AM ICT reset)
func GetReporterDailyPoints(ctx context.Context, reporterID string) (int, error) {
	ict, _ := time.LoadLocation("Asia/Bangkok")
	now := time.Now().In(ict)
	resetTime := time.Date(now.Year(), now.Month(), now.Day(), 1, 0, 0, 0, ict)
	if now.Before(resetTime) {
		resetTime = resetTime.AddDate(0, 0, -1)
	}

	var count int
	err := Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM fuel_reports
		WHERE reporter_id = $1 AND created_at >= $2
	`, reporterID, resetTime.UTC()).Scan(&count)
	return count, err
}

// CheckReporterGlobalCooldown returns the last report time for this reporter within 10 minutes
func CheckReporterGlobalCooldown(ctx context.Context, reporterID string) (*time.Time, error) {
	var lastReport *time.Time
	err := Pool.QueryRow(ctx, `
		SELECT MAX(created_at) FROM fuel_reports
		WHERE reporter_id = $1
		  AND created_at > now() - interval '10 minutes'
	`, reporterID).Scan(&lastReport)
	return lastReport, err
}

// GetReporter returns a reporter by ID
func GetReporter(ctx context.Context, id string) (*models.Reporter, error) {
	var r models.Reporter
	err := Pool.QueryRow(ctx, `
		SELECT id, nickname, total_points, created_at FROM reporters WHERE id = $1
	`, id).Scan(&r.ID, &r.Nickname, &r.TotalPoints, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// GetLatestReportTime returns the most recent fuel report time globally
func GetLatestReportTime(ctx context.Context) *time.Time {
	var t *time.Time
	Pool.QueryRow(ctx, `SELECT MAX(created_at) FROM fuel_reports`).Scan(&t)
	return t
}
