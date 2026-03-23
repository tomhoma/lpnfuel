-- Add district column to fuel_prices (nullable for brands without district data like Bangchak)
ALTER TABLE fuel_prices ADD COLUMN IF NOT EXISTS district TEXT DEFAULT '';

-- Recreate index to include district
DROP INDEX IF EXISTS idx_prices_latest;
CREATE INDEX idx_prices_latest ON fuel_prices(brand, district, fuel_type, fetched_at DESC);
