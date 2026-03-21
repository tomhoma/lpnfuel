package models

import "time"

type Station struct {
	ID        string   `json:"id"`
	Brand     string   `json:"brand"`
	Name      string   `json:"name"`
	District  string   `json:"district"`
	Lat       *float64 `json:"lat"`
	Lng       *float64 `json:"lng"`
	HasE20    bool     `json:"has_e20"`
	HasGas95  bool     `json:"has_gas95"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type FuelStatus struct {
	StationID       string     `json:"station_id"`
	Gas95           string     `json:"gas95"`
	Gas91           string     `json:"gas91"`
	E20             string     `json:"e20"`
	Diesel          string     `json:"diesel"`
	TransportStatus string     `json:"transport_status"`
	TransportETA    string     `json:"transport_eta"`
	SourceUpdated   *time.Time `json:"source_updated"`
	FetchedAt       time.Time  `json:"fetched_at"`
}

type StationWithStatus struct {
	Station
	FuelStatus
	DistanceKm *float64 `json:"distance_km,omitempty"`
}

type FuelPrice struct {
	ID        int       `json:"id"`
	Brand     string    `json:"brand"`
	FuelType  string    `json:"fuel_type"`
	Price     float64   `json:"price"`
	FetchedAt time.Time `json:"fetched_at"`
}

type GASRecord struct {
	ID              string `json:"ID"`
	Brand           string `json:"Brand"`
	StationName     string `json:"StationName"`
	District        string `json:"District"`
	Gas95           string `json:"Gas95"`
	Gas91           string `json:"Gas91"`
	E20             string `json:"E20"`
	Diesel          string `json:"Diesel"`
	TransportStatus string `json:"TransportStatus"`
	TransportETA    string `json:"TransportETA"`
	LastUpdated     string `json:"LastUpdated"`
	Col10           string `json:"Col10"`
}

type DistrictSummary struct {
	District        string `json:"district"`
	TotalStations   int    `json:"total_stations"`
	WithFuel        int    `json:"with_fuel"`
	AllEmpty        int    `json:"all_empty"`
	DieselAvailable int    `json:"diesel_available"`
	Gas91Available  int    `json:"gas91_available"`
	IncomingSupply  int    `json:"incoming_supply"`
}

type DashboardResponse struct {
	Overall        OverallSummary    `json:"overall"`
	ByDistrict     []DistrictSummary `json:"by_district"`
	ByBrand        []BrandSummary    `json:"by_brand"`
	IncomingSupply []StationWithStatus `json:"incoming_supply"`
	Trend7d        TrendData         `json:"trend_7d"`
	UpdatedAt      time.Time         `json:"updated_at"`
}

type OverallSummary struct {
	Total       int  `json:"total"`
	WithFuel    int  `json:"with_fuel"`
	AllEmpty    int  `json:"all_empty"`
	DieselCrisis bool `json:"diesel_crisis"`
	DieselCount  int  `json:"diesel_count"`
}

type BrandSummary struct {
	Brand         string  `json:"brand"`
	Total         int     `json:"total"`
	WithFuel      int     `json:"with_fuel"`
	AvailableRate float64 `json:"available_rate"`
}

type TrendPoint struct {
	Date    string  `json:"date"`
	Percent float64 `json:"percent"`
}

type TrendData struct {
	Gas95  []TrendPoint `json:"gas95"`
	Gas91  []TrendPoint `json:"gas91"`
	E20    []TrendPoint `json:"e20"`
	Diesel []TrendPoint `json:"diesel"`
}

type StationsResponse struct {
	Stations  []StationWithStatus `json:"stations"`
	Summary   OverallSummary      `json:"summary"`
	UpdatedAt time.Time           `json:"updated_at"`
}

type PricesResponse struct {
	Prices map[string]map[string]float64 `json:"prices"`
	Date   string                        `json:"date"`
}

type HealthResponse struct {
	Status       string    `json:"status"`
	LastFetch    time.Time `json:"last_fetch"`
	StationCount int       `json:"station_count"`
}
