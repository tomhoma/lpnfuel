-- Reporter identity and points tracking
CREATE TABLE IF NOT EXISTS reporters (
  id           TEXT PRIMARY KEY,
  nickname     TEXT DEFAULT '',
  total_points INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Add reporter identity to fuel_reports
ALTER TABLE fuel_reports ADD COLUMN IF NOT EXISTS reporter_id TEXT DEFAULT '';
ALTER TABLE fuel_reports ADD COLUMN IF NOT EXISTS nickname    TEXT DEFAULT '';

-- Index for per-reporter cooldown and daily point queries
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON fuel_reports(reporter_id, created_at DESC);
