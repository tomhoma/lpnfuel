package scheduler

import (
	"context"
	"log"
	"time"

	"lpnfuel/db"
	"lpnfuel/fetcher"
)

// StartPriceScheduler runs price fetching on startup and then daily at 05:15 and 19:30 ICT.
// - 05:15 catches the 05:00 effective price (PTT/Bangchak announce ~19:00 previous evening)
// - 19:30 catches any evening price updates
func StartPriceScheduler(ctx context.Context) {
	// Fetch immediately on startup
	go fetchAndStore(ctx)

	go func() {
		loc, err := time.LoadLocation("Asia/Bangkok")
		if err != nil {
			log.Printf("Price scheduler: cannot load timezone, using UTC+7 offset")
			loc = time.FixedZone("ICT", 7*60*60)
		}

		for {
			now := time.Now().In(loc)
			next := nextFetchTime(now, loc)
			wait := next.Sub(now)

			log.Printf("Price scheduler: next fetch at %s (in %s)", next.Format("2006-01-02 15:04"), wait.Round(time.Minute))

			select {
			case <-time.After(wait):
				fetchAndStore(ctx)
			case <-ctx.Done():
				log.Println("Price scheduler: stopped")
				return
			}
		}
	}()
}

// nextFetchTime returns the next 05:15 or 19:30 in the given timezone
func nextFetchTime(now time.Time, loc *time.Location) time.Time {
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	times := []time.Time{
		today.Add(5*time.Hour + 15*time.Minute),  // 05:15
		today.Add(19*time.Hour + 30*time.Minute),  // 19:30
	}

	for _, t := range times {
		if t.After(now) {
			return t
		}
	}

	// Both passed today → next day 05:15
	return today.Add(24*time.Hour + 5*time.Hour + 15*time.Minute)
}

func fetchAndStore(ctx context.Context) {
	log.Println("Price fetch: starting...")
	prices := fetcher.FetchAllPrices()
	if len(prices) == 0 {
		log.Println("Price fetch: no prices returned")
		return
	}

	if err := db.UpsertFuelPrices(ctx, prices); err != nil {
		log.Printf("Price fetch: store error: %v", err)
		return
	}
	log.Printf("Price fetch: stored %d prices (PTT + บางจาก)", len(prices))
}
