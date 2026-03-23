import type { PricesResponse } from '../types'

interface PriceCardProps {
  prices: PricesResponse | null
}

// Ordered fuel types we care about (maps API keys to display labels)
const FUEL_COLS = [
  { key: 'diesel', label: 'ดีเซล', color: 'text-blue-600' },
  { key: 'gasohol91', label: '91', color: 'text-green-600' },
  { key: 'gasohol95', label: '95', color: 'text-yellow-600' },
  { key: 'gasoholE20', label: 'E20', color: 'text-purple-600' },
  { key: 'gasoholE85', label: 'E85', color: 'text-pink-600' },
  { key: 'premium_diesel', label: 'พรีเมียม', color: 'text-blue-400' },
] as const

const BRAND_DISPLAY: Record<string, { label: string; note?: string }> = {
  'PTT': { label: 'ปตท.', note: 'ลำพูน' },
  'บางจาก': { label: 'บางจาก', note: 'กทม.' },
}

export default function PriceCard({ prices }: PriceCardProps) {
  if (!prices || !Object.keys(prices.prices).length) {
    return null
  }

  // Only show fuel types that exist in data
  const activeCols = FUEL_COLS.filter(col =>
    Object.values(prices.prices).some(fuels => fuels[col.key] != null)
  )

  const brands = Object.keys(prices.prices)

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">⛽ ราคาน้ำมันวันนี้</h3>
        <span className="text-[10px] text-gray-400">บาท/ลิตร</span>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-1.5 pr-2 text-gray-500 font-medium" />
              {activeCols.map(col => (
                <th key={col.key} className={`text-center py-1.5 px-1 font-bold ${col.color}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brands.map(brand => {
              const fuels = prices.prices[brand]
              const info = BRAND_DISPLAY[brand] ?? { label: brand }
              return (
                <tr key={brand} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-2">
                    <span className="font-semibold text-sm">{info.label}</span>
                    {info.note && (
                      <span className="text-[10px] text-gray-400 ml-1">({info.note})</span>
                    )}
                  </td>
                  {activeCols.map(col => {
                    const p = fuels[col.key]
                    return (
                      <td key={col.key} className="text-center py-2 px-1 tabular-nums font-medium">
                        {p != null ? p.toFixed(2) : <span className="text-gray-300">-</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Price difference highlight */}
      {brands.length >= 2 && (() => {
        const dieselPrices = brands
          .map(b => ({ brand: b, price: prices.prices[b]['diesel'] }))
          .filter(x => x.price != null && x.price > 0)
          .sort((a, b) => a.price! - b.price!)

        if (dieselPrices.length >= 2) {
          const diff = dieselPrices[dieselPrices.length - 1].price! - dieselPrices[0].price!
          if (diff > 0) {
            const cheapest = BRAND_DISPLAY[dieselPrices[0].brand]?.label ?? dieselPrices[0].brand
            return (
              <div className="mt-2 bg-blue-50 rounded-lg px-3 py-1.5 text-[11px] text-blue-700">
                💡 ดีเซล {cheapest} ถูกกว่า {diff.toFixed(2)} บาท/ลิตร
              </div>
            )
          }
        }
        return null
      })()}
    </div>
  )
}
