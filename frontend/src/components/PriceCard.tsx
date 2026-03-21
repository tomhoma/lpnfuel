import type { PricesResponse } from '../types'

interface PriceCardProps {
  prices: PricesResponse | null
}

const FUEL_LABELS: Record<string, string> = {
  diesel: 'ดีเซล',
  gas91: 'แก๊สโซฮอล์ 91',
  gas95: 'แก๊สโซฮอล์ 95',
  e20: 'E20',
}

const BRAND_LABELS: Record<string, string> = {
  ptt: 'ปตท.',
  bcp: 'บางจาก',
  shell: 'เชลล์',
  esso: 'เอสโซ่',
  caltex: 'คาลเท็กซ์',
  pt: 'พีที',
}

export default function PriceCard({ prices }: PriceCardProps) {
  if (!prices || !Object.keys(prices.prices).length) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold mb-2">ราคาน้ำมันวันนี้</h3>
        <p className="text-sm text-gray-400">ไม่มีข้อมูลราคา</p>
      </div>
    )
  }

  // Show the first available brand's prices as a summary
  const allFuelTypes = new Set<string>()
  Object.values(prices.prices).forEach(fuels => {
    Object.keys(fuels).forEach(ft => allFuelTypes.add(ft))
  })

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">ราคาน้ำมันวันนี้</h3>
        <span className="text-xs text-gray-400">{prices.date}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-1.5 pr-2 text-gray-500 font-medium">แบรนด์</th>
              {Array.from(allFuelTypes).map(ft => (
                <th key={ft} className="text-right py-1.5 px-1 text-gray-500 font-medium">
                  {FUEL_LABELS[ft] ?? ft}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(prices.prices).map(([brand, fuels]) => (
              <tr key={brand} className="border-b border-gray-50">
                <td className="py-1.5 pr-2 font-medium">{BRAND_LABELS[brand] ?? brand}</td>
                {Array.from(allFuelTypes).map(ft => (
                  <td key={ft} className="text-right py-1.5 px-1 tabular-nums">
                    {fuels[ft] ? `${fuels[ft].toFixed(2)}` : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
