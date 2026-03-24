-- Fuel type catalog (reference/lookup table)
CREATE TABLE IF NOT EXISTS fuel_type_catalog (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  grp    TEXT NOT NULL,   -- 'gasoline' or 'diesel'
  sort   INT DEFAULT 0
);

-- Seed catalog data
INSERT INTO fuel_type_catalog (id, name, grp, sort) VALUES
  ('gsh95',          'แก๊สโซฮอล์ 95',         'gasoline', 1),
  ('gsh91',          'แก๊สโซฮอล์ 91',         'gasoline', 2),
  ('e20',            'แก๊สโซฮอล์ E20',        'gasoline', 3),
  ('e85',            'แก๊สโซฮอล์ E85',        'gasoline', 4),
  ('spg95',          'พรีเมียม 95',            'gasoline', 5),
  ('bzn95',          'เบนซิน 95',             'gasoline', 6),
  ('diesel_b7',      'ดีเซล B7',              'diesel',   7),
  ('diesel_b10',     'ดีเซล B10',             'diesel',   8),
  ('diesel_b20',     'ดีเซล B20',             'diesel',   9),
  ('diesel_premium', 'ดีเซล พรีเมียม',        'diesel',  10)
ON CONFLICT (id) DO NOTHING;

-- User fuel reports
CREATE TABLE IF NOT EXISTS fuel_reports (
  id            BIGSERIAL PRIMARY KEY,
  station_id    TEXT NOT NULL REFERENCES stations(id),
  fuel_type     TEXT NOT NULL REFERENCES fuel_type_catalog(id),
  status        TEXT NOT NULL CHECK (status IN ('available', 'empty', 'unknown')),
  reporter_lat  DOUBLE PRECISION,
  reporter_lng  DOUBLE PRECISION,
  distance_km   DOUBLE PRECISION,
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_station ON fuel_reports(station_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_recent ON fuel_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_ratelimit ON fuel_reports(station_id, fuel_type, created_at DESC);
