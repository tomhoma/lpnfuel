package fetcher

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"lpnfuel/models"
)

// ParseGASRecords parses the raw callback response body into GASRecords.
// Supports both direct JSON array and GAS callback format:
// )]}' [["op.exec", [0, "JSON_STRING"]], ["di", 1166]]
func ParseGASRecords(body string) ([]models.GASRecord, error) {
	// Try direct JSON array first
	var records []models.GASRecord
	if err := json.Unmarshal([]byte(body), &records); err == nil && len(records) > 0 {
		return records, nil
	}

	// Remove )]}' prefix
	bodyStr := body
	if strings.HasPrefix(bodyStr, ")]}'") {
		if idx := strings.Index(bodyStr, "\n"); idx != -1 {
			bodyStr = strings.TrimSpace(bodyStr[idx+1:])
		}
	}

	// Parse outer array: [["op.exec", [0, "JSON_STRING"]], ["di", 1166]]
	var outer []json.RawMessage
	if err := json.Unmarshal([]byte(bodyStr), &outer); err != nil {
		return nil, fmt.Errorf("parse outer: %w (preview: %.300s)", err, body)
	}

	for _, raw := range outer {
		var item []json.RawMessage
		if err := json.Unmarshal(raw, &item); err != nil || len(item) < 2 {
			continue
		}

		var opName string
		if err := json.Unmarshal(item[0], &opName); err != nil || opName != "op.exec" {
			continue
		}

		// item[1] = [0, "JSON_STRING"] or [0, [...]]
		var inner []json.RawMessage
		if err := json.Unmarshal(item[1], &inner); err != nil || len(inner) < 2 {
			continue
		}

		// Try as JSON string first
		var jsonStr string
		if err := json.Unmarshal(inner[1], &jsonStr); err == nil {
			if err := json.Unmarshal([]byte(jsonStr), &records); err == nil && len(records) > 0 {
				return records, nil
			}
		}

		// Try as direct array
		if err := json.Unmarshal(inner[1], &records); err == nil && len(records) > 0 {
			return records, nil
		}
	}

	return nil, fmt.Errorf("no station data found (preview: %.500s)", body)
}

func ParseThaiDate(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}

	loc, _ := time.LoadLocation("Asia/Bangkok")
	for _, f := range []string{
		"02/01/2006 15:04",
		"2/1/2006 15:04",
		"02/01/2006 15:04:05",
		"2006-01-02 15:04:05",
	} {
		if t, err := time.ParseInLocation(f, s, loc); err == nil {
			return &t
		}
	}
	return nil
}
