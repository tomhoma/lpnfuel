-- Stations master data
CREATE TABLE IF NOT EXISTS stations (
  id          TEXT PRIMARY KEY,
  brand       TEXT NOT NULL,
  name        TEXT NOT NULL,
  district    TEXT NOT NULL,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  has_e20     BOOLEAN DEFAULT true,
  has_gas95   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Current fuel status (upserted every 3 min)
CREATE TABLE IF NOT EXISTS fuel_status (
  station_id       TEXT PRIMARY KEY REFERENCES stations(id),
  gas95            TEXT NOT NULL,
  gas91            TEXT NOT NULL,
  e20              TEXT NOT NULL,
  diesel           TEXT NOT NULL,
  transport_status TEXT,
  transport_eta    TEXT,
  source_updated   TIMESTAMPTZ,
  fetched_at       TIMESTAMPTZ DEFAULT now()
);

-- Historical snapshots
CREATE TABLE IF NOT EXISTS fuel_history (
  id            BIGSERIAL PRIMARY KEY,
  station_id    TEXT NOT NULL REFERENCES stations(id),
  gas95         TEXT NOT NULL,
  gas91         TEXT NOT NULL,
  e20           TEXT NOT NULL,
  diesel        TEXT NOT NULL,
  transport_status TEXT,
  recorded_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_station_time ON fuel_history(station_id, recorded_at);

-- Fuel retail prices
CREATE TABLE IF NOT EXISTS fuel_prices (
  id          SERIAL PRIMARY KEY,
  brand       TEXT NOT NULL,
  fuel_type   TEXT NOT NULL,
  price       DECIMAL(6,2) NOT NULL,
  fetched_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prices_latest ON fuel_prices(brand, fuel_type, fetched_at DESC);

-- District summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS district_summary AS
SELECT
  s.district,
  COUNT(*) AS total_stations,
  COUNT(*) FILTER (WHERE fs.gas95 = 'มี' OR fs.gas91 = 'มี' OR fs.e20 = 'มี' OR fs.diesel = 'มี') AS stations_with_fuel,
  COUNT(*) FILTER (WHERE fs.gas95 = 'หมด' AND fs.gas91 = 'หมด' AND (fs.e20 = 'หมด' OR fs.e20 = '-') AND fs.diesel = 'หมด') AS stations_all_empty,
  COUNT(*) FILTER (WHERE fs.diesel = 'มี') AS diesel_available,
  COUNT(*) FILTER (WHERE fs.gas91 = 'มี') AS gas91_available,
  COUNT(*) FILTER (WHERE fs.transport_status = 'กำลังจัดส่ง') AS incoming_supply
FROM stations s
JOIN fuel_status fs ON s.id = fs.station_id
GROUP BY s.district;
