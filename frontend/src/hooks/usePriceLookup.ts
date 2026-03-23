import type { PricesResponse } from '../types'

// Map station brand names to price API brand keys
const BRAND_MAP: Record<string, string> = {
  'ปตท.': 'PTT',
  'พีที': 'PTT',       // PT uses PTT-like pricing
}

// Map our fuel keys (gas91, diesel, etc.) to the price API fuel_type keys
const FUEL_MAP: Record<string, string> = {
  diesel: 'diesel',
  gas91: 'gasohol91',
  gas95: 'gasohol95',
  e20: 'gasoholE20',
}

/**
 * Look up the price for a specific brand + fuel type + district
 * Falls back to empty-string district (ราคากลาง) if district-specific price not found
 */
export function getPrice(
  prices: PricesResponse | null,
  stationBrand: string,
  fuelKey: string,
  district?: string
): number | null {
  if (!prices?.prices) return null
  const priceBrand = BRAND_MAP[stationBrand]
  if (!priceBrand) return null
  const priceFuel = FUEL_MAP[fuelKey]
  if (!priceFuel) return null

  // Try district-specific price first
  if (district) {
    const districtPrice = prices.prices[district]?.[priceBrand]?.[priceFuel]
    if (districtPrice != null) return districtPrice
  }

  // Fallback to ราคากลาง (empty district key, e.g. Bangchak)
  const fallbackPrice = prices.prices['']?.[priceBrand]?.[priceFuel]
  if (fallbackPrice != null) return fallbackPrice

  // Fallback: try เมืองลำพูน as default
  return prices.prices['เมืองลำพูน']?.[priceBrand]?.[priceFuel] ?? null
}

/**
 * Get diesel price for ticker display (cheapest across all districts & brands)
 */
export function getCheapestDiesel(prices: PricesResponse | null): { brand: string; price: number } | null {
  if (!prices?.prices) return null
  let best: { brand: string; price: number } | null = null
  for (const districtPrices of Object.values(prices.prices)) {
    for (const [brand, fuels] of Object.entries(districtPrices)) {
      const p = fuels['diesel']
      if (p && p > 0 && (!best || p < best.price)) {
        best = { brand, price: p }
      }
    }
  }
  return best
}
