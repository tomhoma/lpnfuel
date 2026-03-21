package api

import (
	"net/http"

	"github.com/rs/cors"
)

func NewRouter(corsOrigins []string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", handleHealth)
	mux.HandleFunc("GET /api/v1/stations", handleStations)
	mux.HandleFunc("GET /api/v1/stations/nearest", handleNearest)
	mux.HandleFunc("GET /api/v1/stations/{id}", handleStationByID)
	mux.HandleFunc("GET /api/v1/dashboard", handleDashboard)
	mux.HandleFunc("GET /api/v1/prices", handlePrices)

	c := cors.New(cors.Options{
		AllowedOrigins: corsOrigins,
		AllowedMethods: []string{"GET", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},
	})

	return c.Handler(loggingMiddleware(jsonMiddleware(mux)))
}
