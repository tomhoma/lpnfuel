import type { PricesResponse } from '../types'

// Map station brand names to price API brand keys
const BRAND_MAP: Record<string, string> = {
  'ปตท.': 'PTT',
  'พีที': 'PTT',       // PT uses PTT-like pricing
  'บางจาก': 'บางจาก',
}

// Map our fuel keys (gas91, diesel, etc.) to the price API fuel_type keys
const FUEL_MAP: Record<string, string> = {
  diesel: 'diesel',
  gas91: 'gasohol91',
  gas95: 'gasohol95',
  e20: 'gasoholE20',
}

/**
 * Look up the price for a specific brand + fuel type
 */
export function getPrice(
  prices: PricesResponse | null,
  stationBrand: string,
  fuelKey: string
): number | null {
  if (!prices?.prices) return null
  const priceBrand = BRAND_MAP[stationBrand]
  if (!priceBrand) return null
  const priceFuel = FUEL_MAP[fuelKey]
  if (!priceFuel) return null
  return prices.prices[priceBrand]?.[priceFuel] ?? null
}

/**
 * Get diesel price for ticker display (cheapest across all brands)
 */
export function getCheapestDiesel(prices: PricesResponse | null): { brand: string; price: number } | null {
  if (!prices?.prices) return null
  let best: { brand: string; price: number } | null = null
  for (const [brand, fuels] of Object.entries(prices.prices)) {
    const p = fuels['diesel']
    if (p && p > 0 && (!best || p < best.price)) {
      best = { brand, price: p }
    }
  }
  return best
}
