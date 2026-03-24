# LPNFuel

Real-time fuel station status dashboard for Lamphun province, Thailand. Mobile-first web app showing availability of fuel across 63 stations on an interactive map.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS + Leaflet |
| Backend | Go (net/http + pgx) |
| Database | PostgreSQL (Neon.tech) |
| Frontend Hosting | Cloudflare Pages (auto-deploy from GitHub) |
| Backend Hosting | Railway |
| Data Source | FuelRadar (Google Apps Script) |
| Feedback | Google Sheets via Apps Script |
| Analytics | Cloudflare Web Analytics |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────┐
│  FuelRadar GAS  │────▶│  Railway (Go BE) │────▶│  Neon.tech │
│  (data source)  │POST │  /api/v1/ingest  │     │ PostgreSQL │
└─────────────────┘     └──────┬───────────┘     └────────────┘
                               │ GET /api/v1/*
                        ┌──────▼───────────┐
                        │ Cloudflare Pages  │
                        │ lpnfuel.pages.dev │
                        │ (React frontend)  │
                        └──────────────────┘
```

## URLs

| Service | URL |
|---|---|
| Frontend (Production) | https://lpnfuel.pages.dev |
| Backend API | https://lpnfuel-production.up.railway.app/api/v1 |
| FuelRadar Data Source | [Google Apps Script](https://script.google.com/macros/s/AKfycbwoSjjJd-6VA9k9eLIOrr5OD8bzBRIAm6ZT8KZAmA1YqpgRTXmQlpWSsbSIUI7BG8wZ/exec) |
| Feedback Sheet | [Google Sheets](https://docs.google.com/spreadsheets/d/1ilfXdXbLXhBoXIgPfA77fP1rq02ODruq6wYls8rw5Cg) |

## Project Structure

```
lpnfuel/
├── backend/
│   ├── api/                    # HTTP handlers, router, CORS middleware
│   │   ├── handlers.go         # All endpoint handlers + brand normalization
│   │   ├── router.go           # Route definitions
│   │   └── middleware.go       # CORS middleware
│   ├── db/
│   │   ├── db.go               # Database connection pool
│   │   ├── queries.go          # All SQL queries (upsert, select, geo)
│   │   └── migrations/001_init.sql  # Schema + materialized views
│   ├── models/models.go        # Go structs (Station, FuelStatus, etc.)
│   ├── config/config.go        # Environment variable loading
│   ├── data/stations_geo.csv   # Station GPS coordinates (copy for Docker build)
│   ├── testdata/ingest_payload.json  # Sample ingest payload
│   ├── main.go                 # Entry point + CSV geo import on startup
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── public/
│   │   ├── logo.png            # App logo (Lamphun mascot)
│   │   └── lamphun-districts.geojson  # 8 district boundaries from OSM (~524KB)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.tsx     # Leaflet map + district overlay + mask
│   │   │   ├── FilterBar.tsx   # Status filter pills (ทั้งหมด/มี/หมด/กำลังส่ง)
│   │   │   ├── FuelSelector.tsx # Fuel type floating buttons (ดีเซล/91/95/E20)
│   │   │   ├── StatsBar.tsx    # Floating stats overlay (links to dashboard)
│   │   │   ├── BottomSheet.tsx # Station detail popup + geo report
│   │   │   ├── FeedbackCard.tsx # Feedback form → Google Sheets
│   │   │   ├── FuelBadge.tsx   # Fuel status badge component
│   │   │   ├── TransportBadge.tsx # Transport status component
│   │   │   ├── TrendChart.tsx  # 7-day trend chart (recharts)
│   │   │   └── PriceCard.tsx   # Fuel price display
│   │   ├── pages/
│   │   │   ├── MapPage.tsx     # Main map page
│   │   │   └── DashboardPage.tsx # Dashboard with charts
│   │   ├── hooks/              # Custom React hooks (useDistance, etc.)
│   │   ├── types/index.ts      # TypeScript interfaces
│   │   └── styles/global.css   # Animations, tooltip styles
│   ├── .env.production         # VITE_API_URL for production build
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── api-collection/             # Bruno API testing collection
│   ├── bruno.json
│   ├── environments/           # Local + Production environments
│   └── *.bru                   # API endpoint definitions
├── scripts/
│   ├── ingest.js               # Node.js + Playwright cron script (fetches GAS → POST /ingest)
│   ├── .env                    # GAS_URL, API_URL, API_KEY, TIMEOUT_MS
│   └── .env.example
├── data/
│   └── stations_geo.csv        # Master station coordinates (63 stations, source of truth)
└── README.md
```

## API Endpoints

### Public endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/stations` | All stations with fuel status + summary |
| GET | `/api/v1/stations/{id}` | Station detail + 7-day history |
| GET | `/api/v1/stations/nearest?lat=&lng=` | Nearest stations by GPS |
| GET | `/api/v1/prices` | Fuel prices by brand |
| GET | `/api/v1/fuel-types` | Fuel type catalog |
| GET | `/api/v1/reports` | Global recent fuel reports |
| GET | `/api/v1/reports/latest` | Latest report timestamp |
| POST | `/api/v1/stations/{id}/report` | Submit user fuel report |
| GET | `/api/v1/stations/{id}/reports` | Reports for a station |

### Data ingestion (protected)

```
POST /api/v1/ingest
Header: X-API-Key: <INGEST_API_KEY>
Content-Type: application/json
```

Body: JSON array of station records. Also accepts escaped JSON strings (auto-unescaped).

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

### Station Geo Update

```
PUT /api/v1/stations/{id}/geo
Header: X-API-Key: <INGEST_API_KEY>
Content-Type: application/json
```

```json
{ "lat": 18.57064, "lng": 99.04493 }
```

## Key Features

### Frontend
- **Map locked to Lamphun province** — maxBounds prevents scrolling to other provinces
- **District overlay** — GeoJSON boundaries from OpenStreetMap with colored dashed borders
- **Outside mask** — Areas outside Lamphun dimmed with semi-transparent black overlay
- **Fuel type filter** — Floating circular buttons (ดีเซล, 91, 95, E20) with auto-zoom
- **Status filter** — Pills for ทั้งหมด/มี/หมด/กำลังส่ง + brand dropdown
- **Splash screen** — Logo + loading animation on first load (1s minimum)
- **Geo report** — Users can report incorrect station locations → Google Sheets
- **Feedback form** — Bug reports/suggestions → Google Sheets
- **Stats bar** — Shows fuel availability counts + crisis alerts for all fuel types

### Backend
- **Brand normalization** — Fixes Thai character variants (๊→็), merges บางจาก-ซัสโก้→บางจาก
- **Auto-unescape JSON** — Handles escaped JSON strings in ingest body
- **CSV geo import** — Loads station coordinates from CSV on startup
- **Auto-append new stations** — New station IDs from GAS are automatically appended to `stations_geo.csv` (with `lat=0, lng=0`)
- **`updated_at` from ingest** — Uses `fetched_at` timestamp, not server time

## Data Flow

1. **Cron job** (`scripts/ingest.js`) runs every 5 minutes on local machine via Playwright headless browser
2. Fetches station data from Google Apps Script (GAS)
3. POSTs data to `POST /api/v1/ingest` with API key
4. Backend normalizes brands, upserts stations + fuel status into PostgreSQL
5. If new station IDs are found, auto-appends to `stations_geo.csv` (with `lat=0, lng=0`)
6. Frontend fetches from `GET /api/v1/stations` and renders on map
7. `stations_geo.csv` provides GPS coordinates on backend startup (source of truth for geo)
8. **Price scheduler** (built-in) fetches PTTOR fuel prices daily at 05:15 & 19:30 ICT

### Updating Station GPS Coordinates

| Method | Use case |
|---|---|
| Edit `data/stations_geo.csv` | Bulk update — copy to `backend/data/` → push → redeploy |
| `PUT /api/v1/stations/{id}/geo` | Update single station via API |

> ⚠️ `data/stations_geo.csv` is the source of truth. `backend/data/stations_geo.csv` is a copy for Docker build — keep them in sync.

## Station Data

- **63 stations** across 8 districts in Lamphun province
- Station IDs have gaps matching GAS source data (1-39, 41, 43-46, 54-58, 60-62, 64-73)
- Brands: ปตท., บางจาก, พีที, คาลเท็กซ์, เชลล์
- GPS coordinates sourced from Google Maps

## Development

### Prerequisites

- Go 1.22+
- Node.js 22+ (via nvm)
- PostgreSQL (or Neon.tech connection string)

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

### WSL Notes

If using WSL on Windows, ensure node runs from WSL path:
```bash
export PATH="$HOME/.nvm/versions/node/v22.18.0/bin:$PATH"
```

### Build

```bash
# Frontend production build
cd frontend
npm run build   # outputs to dist/

# Backend
cd backend
go build -o lpnfuel .
```

## Environment Variables

### Backend (Railway)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...@neon.tech/lpnfuel` |
| `PORT` | Server port | `8080` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `https://lpnfuel.pages.dev` |
| `INGEST_API_KEY` | API key for ingest endpoint | `lpnfuel-dev-key-1980` |

### Frontend (.env.production)

| Variable | Description | Value |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `https://lpnfuel-production.up.railway.app/api/v1` |

## Deployment

- **Frontend**: Auto-deploys via Cloudflare Pages when pushing to `main` on GitHub
- **Backend**: Auto-deploys via Railway when pushing to `main` on GitHub
- **No GitHub Actions needed** — both platforms handle CI/CD directly

## License

MIT
