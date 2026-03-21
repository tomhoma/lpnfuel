package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL  string
	Port         string
	CORSOrigins  []string
	IngestAPIKey string
}

func Load() *Config {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	corsOrigins := []string{"http://localhost:5173"}
	if v := os.Getenv("CORS_ORIGINS"); v != "" {
		corsOrigins = strings.Split(v, ",")
	}

	return &Config{
		DatabaseURL:  dbURL,
		Port:         port,
		CORSOrigins:  corsOrigins,
		IngestAPIKey: getEnvOrDefault("INGEST_API_KEY", "changeme-secret-key"),
	}
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
