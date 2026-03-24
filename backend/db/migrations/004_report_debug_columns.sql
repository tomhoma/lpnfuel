-- Add debug/tracking columns to fuel_reports
ALTER TABLE fuel_reports ADD COLUMN IF NOT EXISTS user_agent  TEXT DEFAULT '';
ALTER TABLE fuel_reports ADD COLUMN IF NOT EXISTS ip_address  TEXT DEFAULT '';
ALTER TABLE fuel_reports ADD COLUMN IF NOT EXISTS batch_id    TEXT DEFAULT '';
