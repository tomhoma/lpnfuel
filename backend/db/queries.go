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

func InsertHistory(ctx context.Context, fs models.FuelStatus) error {
	_, err := Pool.Exec(ctx, `
		INSERT INTO fuel_history (station_id, gas95, gas91, e20, diesel, transport_status)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, fs.StationID, fs.Gas95, fs.Gas91, fs.E20, fs.Diesel, fs.TransportStatus)
	return err
}

func RefreshDistrictSummary(ctx context.Context) error {
	_, err := Pool.Exec(ctx, `REFRESH MATERIALIZED VIEW district_summary`)
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

func GetDistrictSummaries(ctx context.Context) ([]models.DistrictSummary, error) {
	rows, err := Pool.Query(ctx, `
		SELECT district, total_stations, stations_with_fuel, stations_all_empty,
		       diesel_available, gas91_available, incoming_supply
		FROM district_summary
		ORDER BY total_stations DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.DistrictSummary
	for rows.Next() {
		var ds models.DistrictSummary
		err := rows.Scan(
			&ds.District, &ds.TotalStations, &ds.WithFuel, &ds.AllEmpty,
			&ds.DieselAvailable, &ds.Gas91Available, &ds.IncomingSupply,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, ds)
	}
	return result, nil
}

func GetLatestPrices(ctx context.Context) (map[string]map[string]float64, error) {
	rows, err := Pool.Query(ctx, `
		SELECT DISTINCT ON (brand, fuel_type) brand, fuel_type, price
		FROM fuel_prices
		ORDER BY brand, fuel_type, fetched_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]map[string]float64)
	for rows.Next() {
		var brand, fuelType string
		var price float64
		if err := rows.Scan(&brand, &fuelType, &price); err != nil {
			continue
		}
		if result[brand] == nil {
			result[brand] = make(map[string]float64)
		}
		result[brand][fuelType] = price
	}
	return result, nil
}

func UpsertFuelPrices(ctx context.Context, prices []models.FuelPrice) error {
	for _, p := range prices {
		_, err := Pool.Exec(ctx, `
			INSERT INTO fuel_prices (brand, fuel_type, price)
			VALUES ($1, $2, $3)
		`, p.Brand, p.FuelType, p.Price)
		if err != nil {
			return fmt.Errorf("insert price %s/%s: %w", p.Brand, p.FuelType, err)
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

func GetTrend7d(ctx context.Context) (models.TrendData, error) {
	rows, err := Pool.Query(ctx, `
		SELECT
			DATE_TRUNC('hour', recorded_at) as hour,
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE gas95 = 'มี') as gas95_available,
			COUNT(*) FILTER (WHERE gas91 = 'มี') as gas91_available,
			COUNT(*) FILTER (WHERE e20 = 'มี') as e20_available,
			COUNT(*) FILTER (WHERE diesel = 'มี') as diesel_available
		FROM fuel_history
		WHERE recorded_at > now() - INTERVAL '7 days'
		GROUP BY hour
		ORDER BY hour
	`)
	if err != nil {
		return models.TrendData{}, err
	}
	defer rows.Close()

	var trend models.TrendData
	for rows.Next() {
		var hour time.Time
		var total, gas95, gas91, e20, diesel int
		if err := rows.Scan(&hour, &total, &gas95, &gas91, &e20, &diesel); err != nil {
			continue
		}
		if total == 0 {
			continue
		}
		dateStr := hour.Format("2006-01-02 15:04")
		pct := func(n int) float64 { return float64(n) / float64(total) * 100 }
		trend.Gas95 = append(trend.Gas95, models.TrendPoint{Date: dateStr, Percent: pct(gas95)})
		trend.Gas91 = append(trend.Gas91, models.TrendPoint{Date: dateStr, Percent: pct(gas91)})
		trend.E20 = append(trend.E20, models.TrendPoint{Date: dateStr, Percent: pct(e20)})
		trend.Diesel = append(trend.Diesel, models.TrendPoint{Date: dateStr, Percent: pct(diesel)})
	}
	return trend, nil
}

func UpdateStationGeo(ctx context.Context, id string, lat, lng float64) error {
	_, err := Pool.Exec(ctx, `
		UPDATE stations SET lat = $1, lng = $2, updated_at = now() WHERE id = $3
	`, lat, lng, id)
	return err
}
