import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { OverallSummary, StationWithStatus } from '../types'

interface StatsBarProps {
  summary: OverallSummary
  stations: StationWithStatus[]
}

const FUEL_TYPES = [
  { key: 'diesel' as const, label: 'ดีเซล', dot: 'bg-blue-400' },
  { key: 'gas91' as const, label: '91', dot: 'bg-green-400' },
  { key: 'gas95' as const, label: '95', dot: 'bg-yellow-400' },
  { key: 'e20' as const, label: 'E20', dot: 'bg-purple-400' },
]

export default function StatsBar({ summary, stations }: StatsBarProps) {
  const fuelCounts = useMemo(() => {
    return FUEL_TYPES.map(({ key, label, dot }) => {
      const count = stations.filter(s => s[key] === 'มี').length
      return { key, label, dot, count }
    })
  }, [stations])

  const total = stations.length

  const tickerItems = fuelCounts.map(f => {
    if (f.count === 0) return { ...f, text: `${f.label} หมด`, alert: true }
    const isCrisis = f.count <= Math.ceil(total * 0.2)
    if (isCrisis) return { ...f, text: `${f.label} เหลือ ${f.count}`, alert: true }
    return { ...f, text: `${f.label} ${f.count}`, alert: false }
  })

  const separator = <span className="text-gray-600 mx-1">·</span>

  const renderItems = () =>
    tickerItems.map((item, i) => (
      <span key={item.key} className="inline-flex items-center gap-1">
        {i > 0 && separator}
        <span className={`inline-block w-2 h-2 rounded-full ${item.dot}`} />
        <span className={`font-medium ${item.alert ? 'text-red-400' : 'text-gray-300'}`}>
          {item.text}
        </span>
      </span>
    ))

  return (
    <Link
      to="/dashboard"
      className="absolute bottom-16 left-3 right-14 z-[500] block active:scale-[0.98] transition-transform"
    >
      <div className="bg-gray-900/80 backdrop-blur-md rounded-full px-3 py-1.5 shadow-lg overflow-hidden">
        <div className="inline-flex whitespace-nowrap animate-ticker will-change-transform">
          <span className="inline-flex items-center text-[11px] pr-8">
            {renderItems()}
          </span>
          <span className="inline-flex items-center text-[11px] pr-8" aria-hidden="true">
            {renderItems()}
          </span>
        </div>
      </div>
    </Link>
  )
}
