import type { PricesResponse } from '../types'

const FUEL_DISPLAY: { key: string; label: string }[] = [
  { key: 'diesel', label: 'ดีเซล' },
  { key: 'gasohol91', label: '91' },
  { key: 'gasohol95', label: '95' },
  { key: 'gasoholE20', label: 'E20' },
]

const BRAND_MAP: Record<string, string> = {
  'ปตท.': 'PTT',
  'พีที': 'PTT',
}

interface Props {
  prices: PricesResponse | null | undefined
  brand: string
  district: string
}

export default function FuelPriceGrid({ prices, brand, district }: Props) {
  if (!prices?.prices) return null

  const priceBrand = BRAND_MAP[brand]
  if (!priceBrand) return null

  // Try district → fallback empty → fallback เมืองลำพูน
  const getPrice = (fuelKey: string): number | null => {
    const d = prices.prices[district]?.[priceBrand]?.[fuelKey]
    if (d != null) return d
    const f = prices.prices['']?.[priceBrand]?.[fuelKey]
    if (f != null) return f
    return prices.prices['เมืองลำพูน']?.[priceBrand]?.[fuelKey] ?? null
  }

  const items = FUEL_DISPLAY.map(f => ({
    ...f,
    price: getPrice(f.key),
  })).filter(f => f.price !== null)

  if (items.length === 0) return null

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        ราคาน้ำมัน ({district || 'ลำพูน'})
      </span>
      <div className="grid grid-cols-4 gap-1.5">
        {items.map(f => (
          <div
            key={f.key}
            className="bg-gray-50 rounded-lg p-2 text-center"
          >
            <p className="text-[10px] text-gray-400 font-medium">{f.label}</p>
            <p className="text-sm font-bold text-gray-800">{f.price!.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
