package api

import (
	"net/http"

	"github.com/rs/cors"
)

var ingestAPIKey string

func NewRouter(corsOrigins []string, apiKey string) http.Handler {
	ingestAPIKey = apiKey

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", handleHealth)
	mux.HandleFunc("GET /api/v1/stations", handleStations)
	mux.HandleFunc("GET /api/v1/stations/nearest", handleNearest)
	mux.HandleFunc("GET /api/v1/stations/{id}", handleStationByID)
	mux.HandleFunc("GET /api/v1/dashboard", handleDashboard)
	mux.HandleFunc("GET /api/v1/prices", handlePrices)
	mux.HandleFunc("POST /api/v1/ingest", handleIngest)
	mux.HandleFunc("PUT /api/v1/stations/{id}/geo", handleUpdateGeo)

	c := cors.New(cors.Options{
		AllowedOrigins: corsOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "X-API-Key"},
	})

	return c.Handler(loggingMiddleware(jsonMiddleware(mux)))
}
