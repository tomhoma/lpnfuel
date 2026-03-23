import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { OverallSummary, StationWithStatus, PricesResponse } from '../types'
import { getCheapestDiesel } from '../hooks/usePriceLookup'

interface StatsBarProps {
  summary: OverallSummary
  stations: StationWithStatus[]
  prices?: PricesResponse | null
}

const FUEL_TYPES = [
  { key: 'diesel' as const, label: 'ดีเซล', dot: 'bg-blue-400' },
  { key: 'gas91' as const, label: '91', dot: 'bg-green-400' },
  { key: 'gas95' as const, label: '95', dot: 'bg-yellow-400' },
  { key: 'e20' as const, label: 'E20', dot: 'bg-purple-400' },
]

export default function StatsBar({ summary, stations, prices }: StatsBarProps) {
  const fuelCounts = useMemo(() => {
    return FUEL_TYPES.map(({ key, label, dot }) => {
      const count = stations.filter(s => s[key] === 'มี').length
      return { key, label, dot, count }
    })
  }, [stations])

  const total = stations.length
  const cheapDiesel = getCheapestDiesel(prices ?? null)

  const tickerItems = fuelCounts.map(f => {
    if (f.count === 0) return { ...f, text: `${f.label} หมด`, alert: true }
    const isCrisis = f.count <= Math.ceil(total * 0.2)
    if (isCrisis) return { ...f, text: `${f.label} เหลือ ${f.count} ปั๊ม`, alert: true }
    return { ...f, text: `${f.label} เหลือ ${f.count} ปั๊ม`, alert: false }
  })

  const separator = <span className="text-gray-600 mx-1">·</span>

  const renderItems = () => (
    <>
      {tickerItems.map((item, i) => (
        <span key={item.key} className="inline-flex items-center gap-1">
          {i > 0 && separator}
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.dot}`} />
          <span className={`font-medium ${item.alert ? 'text-red-400' : 'text-gray-300'}`}>
            {item.text}
          </span>
        </span>
      ))}
      {cheapDiesel && (
        <span className="inline-flex items-center gap-1">
          {separator}
          <span className="text-blue-300 font-medium">⛽ ดีเซล ฿{cheapDiesel.price.toFixed(2)}</span>
        </span>
      )}
    </>
  )

  return (
    <Link
      to="/dashboard"
      className="absolute left-3 right-3 z-[500] block active:scale-[0.98] transition-transform"
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="bg-gray-900/80 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg overflow-hidden">
        <div className="inline-flex whitespace-nowrap animate-ticker will-change-transform">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className="inline-flex items-center text-[13px] pr-8" aria-hidden={i > 0 || undefined}>
              {renderItems()}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
