package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL    string
	GASUrl         string
	OilPriceAPI    string
	Port           string
	CronInterval   time.Duration
	CronStartHour  int
	CronEndHour    int
	CORSOrigins    []string
}

func Load() *Config {
	// Load .env if present (local dev)
	_ = godotenv.Load()

	cronInterval := 3 * time.Minute
	if v := os.Getenv("CRON_INTERVAL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			cronInterval = d
		}
	}

	startHour := 7
	if v := os.Getenv("CRON_START_HOUR"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			startHour = n
		}
	}

	endHour := 22
	if v := os.Getenv("CRON_END_HOUR"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			endHour = n
		}
	}

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
		DatabaseURL:   dbURL,
		GASUrl:        getEnvOrDefault("GAS_URL", "https://script.google.com/macros/s/AKfycbwoSjjJd-6VA9k9eLIOrr5OD8bzBRIAm6ZT8KZAmA1YqpgRTXmQlpWSsbSIUI7BG8wZ/exec"),
		OilPriceAPI:   getEnvOrDefault("OIL_PRICE_API", "https://api.chnwt.dev/thai-oil-api/latest"),
		Port:          port,
		CronInterval:  cronInterval,
		CronStartHour: startHour,
		CronEndHour:   endHour,
		CORSOrigins:   corsOrigins,
	}
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
