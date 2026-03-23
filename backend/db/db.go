package db

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect(databaseURL string) error {
	var err error
	Pool, err = pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return fmt.Errorf("unable to connect to database: %w", err)
	}

	if err := Pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("unable to ping database: %w", err)
	}

	log.Println("Connected to PostgreSQL")
	return nil
}

func RunMigrations() error {
	// Find migration directory
	dir := "db/migrations"
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		dir = "../backend/db/migrations"
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			return fmt.Errorf("migration directory not found")
		}
	}

	// Read and sort all .sql files
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("failed to read migration dir: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || len(entry.Name()) < 4 || entry.Name()[len(entry.Name())-4:] != ".sql" {
			continue
		}
		path := dir + "/" + entry.Name()
		sql, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read %s: %w", entry.Name(), err)
		}
		if _, err := Pool.Exec(context.Background(), string(sql)); err != nil {
			return fmt.Errorf("migration %s failed: %w", entry.Name(), err)
		}
		log.Printf("Migration applied: %s", entry.Name())
	}

	return nil
}

func Close() {
	if Pool != nil {
		Pool.Close()
	}
}
