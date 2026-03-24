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
		INSERT INTO fuel_reports (station_id, fuel_type, status, reporter_lat, reporter_lng, distance_km, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, r.StationID, r.FuelType, r.Status, r.ReporterLat, r.ReporterLng, r.DistanceKm, r.Note).Scan(&id)
	return id, err
}

// GetRecentReports returns latest reports for a station
func GetRecentReports(ctx context.Context, stationID string, limit int) ([]models.FuelReport, error) {
	rows, err := Pool.Query(ctx, `
		SELECT fr.id, fr.station_id, fr.fuel_type, fr.status,
		       fr.reporter_lat, fr.reporter_lng, fr.distance_km, fr.note, fr.created_at
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
			&r.ReporterLat, &r.ReporterLng, &r.DistanceKm, &r.Note, &r.CreatedAt); err != nil {
			continue
		}
		result = append(result, r)
	}
	return result, nil
}

// CheckReportRateLimit checks if a report was submitted for this station+fuel within the window
func CheckReportRateLimit(ctx context.Context, stationID, fuelType string, window time.Duration) (bool, error) {
	var count int
	err := Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM fuel_reports
		WHERE station_id = $1 AND fuel_type = $2
		  AND created_at > now() - $3::interval
	`, stationID, fuelType, fmt.Sprintf("%d seconds", int(window.Seconds()))).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
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
