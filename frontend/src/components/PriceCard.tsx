import type { PricesResponse } from '../types'

interface PriceCardProps {
  prices: PricesResponse | null
}

// Main 4 fuel types users care about
const MAIN_FUELS = [
  { key: 'diesel', label: 'ดีเซล', color: 'bg-blue-500' },
  { key: 'gasohol91', label: '91', color: 'bg-green-500' },
  { key: 'gasohol95', label: '95', color: 'bg-yellow-500' },
  { key: 'gasoholE20', label: 'E20', color: 'bg-purple-500' },
] as const

const BRAND_DISPLAY: Record<string, { label: string; note: string }> = {
  'PTT': { label: 'ปตท.', note: 'ราคาจังหวัดลำพูน' },
}

export default function PriceCard({ prices }: PriceCardProps) {
  if (!prices || !Object.keys(prices.prices).length) {
    return null
  }

  // Flatten district-level prices into brand-level for display
  // Use เมืองลำพูน as default district for overview card
  const brandFuels = new Map<string, Record<string, number>>()
  for (const [, districtBrands] of Object.entries(prices.prices)) {
    for (const [brand, fuels] of Object.entries(districtBrands)) {
      if (!brandFuels.has(brand)) {
        brandFuels.set(brand, {})
      }
      const existing = brandFuels.get(brand)!
      for (const [fuel, price] of Object.entries(fuels)) {
        // Keep the first price found (prioritizes non-empty district)
        if (existing[fuel] == null) {
          existing[fuel] = price
        }
      }
    }
  }

  // Try to use เมืองลำพูน prices for PTT if available
  const mueangPrices = prices.prices['เมืองลำพูน']
  if (mueangPrices) {
    for (const [brand, fuels] of Object.entries(mueangPrices)) {
      brandFuels.set(brand, fuels)
    }
  }

  const brands = Array.from(brandFuels.keys())

  // Find cheapest diesel for comparison
  const dieselPrices = brands
    .map(b => ({ brand: b, price: brandFuels.get(b)?.['diesel'] }))
    .filter((x): x is { brand: string; price: number } => x.price != null && x.price > 0)
    .sort((a, b) => a.price - b.price)

  const hasDieselDiff = dieselPrices.length >= 2 &&
    dieselPrices[dieselPrices.length - 1].price - dieselPrices[0].price > 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">⛽ ราคาน้ำมันวันนี้</h3>
        <span className="text-[10px] text-gray-400">บาท/ลิตร</span>
      </div>

      {/* Brand rows — card style */}
      <div className="px-4 pb-3 space-y-3">
        {brands.map(brand => {
          const fuels = brandFuels.get(brand) ?? {}
          const info = BRAND_DISPLAY[brand] ?? { label: brand, note: '' }

          return (
            <div key={brand} className="bg-gray-50 rounded-xl p-3">
              {/* Brand name + note */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-sm font-bold">{info.label}</span>
                <span className="text-[10px] text-gray-400">{info.note}</span>
              </div>

              {/* Fuel prices grid */}
              <div className="grid grid-cols-4 gap-2">
                {MAIN_FUELS.map(fuel => {
                  const p = fuels[fuel.key]
                  return (
                    <div key={fuel.key} className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <span className={`w-2 h-2 rounded-full ${fuel.color}`} />
                        <span className="text-[11px] text-gray-500 font-medium">{fuel.label}</span>
                      </div>
                      <span className="text-base font-bold tabular-nums text-gray-800">
                        {p != null ? p.toFixed(2) : '-'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Diesel comparison tip */}
      {hasDieselDiff && (() => {
        const diff = dieselPrices[dieselPrices.length - 1].price - dieselPrices[0].price
        const cheapest = BRAND_DISPLAY[dieselPrices[0].brand]?.label ?? dieselPrices[0].brand
        return (
          <div className="bg-blue-50 px-4 py-2.5 text-xs text-blue-700 font-medium border-t border-blue-100">
            💡 ดีเซล {cheapest} ถูกกว่า {diff.toFixed(2)} บาท/ลิตร
          </div>
        )
      })()}
    </div>
  )
}
