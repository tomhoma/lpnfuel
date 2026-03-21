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
	migrationSQL, err := os.ReadFile("db/migrations/001_init.sql")
	if err != nil {
		// Try relative path from backend dir
		migrationSQL, err = os.ReadFile("../backend/db/migrations/001_init.sql")
		if err != nil {
			return fmt.Errorf("failed to read migration file: %w", err)
		}
	}

	_, err = Pool.Exec(context.Background(), string(migrationSQL))
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	log.Println("Migrations applied")
	return nil
}

func Close() {
	if Pool != nil {
		Pool.Close()
	}
}
