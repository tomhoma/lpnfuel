# LPNFuel

Real-time fuel station status dashboard for Lamphun province, Thailand. Mobile-first web app showing availability of fuel across 57 stations on an interactive map.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS + Leaflet |
| Backend | Go |
| Database | PostgreSQL (Neon.tech) |
| Hosting | Cloudflare Pages (FE) + Railway (BE) |

## API

### Public endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/stations` | All stations with fuel status |
| GET | `/api/v1/stations/{id}` | Station detail + 7-day history |
| GET | `/api/v1/stations/nearest?lat=&lng=` | Nearest stations by GPS |
| GET | `/api/v1/dashboard` | Summary by district/brand + trend |
| GET | `/api/v1/prices` | Fuel prices |

### Data ingestion

```
POST /api/v1/ingest
Header: X-API-Key: <INGEST_API_KEY>
Content-Type: application/json
```

Body: JSON array of station records.

```json
[
  {
    "ID": "1",
    "Brand": "ปตท.",
    "StationName": "ปตท. สาขาประตูโขง",
    "District": "เมืองลำพูน",
    "Gas95": "มี",
    "Gas91": "มี",
    "E20": "-",
    "Diesel": "หมด",
    "TransportStatus": "กำลังจัดส่ง",
    "TransportETA": "14:00",
    "LastUpdated": "21/03/2026 12:00",
    "Col10": ""
  }
]
```

Field values: `"มี"` = available, `"หมด"` = empty, `"-"` = not sold at this station.

Response:
```json
{"status": "ok", "stations_updated": 57}
```

## Development

### Prerequisites

- Go 1.21+
- Node.js 18+

### Setup

```bash
# Backend
cd backend
cp .env.example .env   # set DATABASE_URL and INGEST_API_KEY
go mod download
go run main.go

# Frontend
cd frontend
npm install
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default: 8080) |
| `CORS_ORIGINS` | Allowed origins, comma-separated |
| `INGEST_API_KEY` | API key for POST /api/v1/ingest |

## License

MIT
