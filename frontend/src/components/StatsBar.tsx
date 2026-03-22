import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { OverallSummary, StationWithStatus } from '../types'

interface StatsBarProps {
  summary: OverallSummary
  stations: StationWithStatus[]
}

const FUEL_TYPES = [
  { key: 'diesel' as const, label: 'ดีเซล' },
  { key: 'gas91' as const, label: '91' },
  { key: 'gas95' as const, label: '95' },
  { key: 'e20' as const, label: 'E20' },
]

export default function StatsBar({ summary, stations }: StatsBarProps) {
  const fuelCounts = useMemo(() => {
    return FUEL_TYPES.map(({ key, label }) => {
      const count = stations.filter(s => s[key] === 'มี').length
      return { key, label, count }
    })
  }, [stations])

  const total = stations.length

  // Build ticker text parts
  const tickerParts = fuelCounts
    .map(f => {
      if (f.count === 0) return `${f.label} หมด`
      const isCrisis = f.count <= Math.ceil(total * 0.2)
      if (isCrisis) return `${f.label} เหลือ ${f.count} ปั๊ม`
      return `${f.label} ${f.count} ปั๊ม`
    })

  const hasAlert = fuelCounts.some(f => f.count === 0 || f.count <= Math.ceil(total * 0.2))

  return (
    <Link
      to="/dashboard"
      className="absolute bottom-16 left-3 right-14 z-[500] block active:scale-[0.98] transition-transform"
    >
      {/* Slim ticker bar */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg">
        {/* Static summary */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-bold text-green-400">{summary.with_fuel}</span>
          <span className="text-gray-500 text-[10px]">/</span>
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs font-bold text-red-400">{summary.all_empty}</span>
        </div>

        <span className="text-gray-600">|</span>

        {/* Scrolling ticker */}
        <div className="overflow-hidden flex-1 min-w-0">
          <div className={`flex whitespace-nowrap ${hasAlert ? 'animate-ticker' : 'animate-ticker-slow'}`}>
            <span className="flex items-center gap-3 text-[11px] pr-8">
              {tickerParts.map((text, i) => {
                const f = fuelCounts[i]
                const isEmpty = f.count === 0
                const isCrisis = !isEmpty && f.count <= Math.ceil(total * 0.2)
                let color = 'text-gray-300'
                if (isEmpty) color = 'text-orange-400'
                else if (isCrisis) color = 'text-red-400'

                return (
                  <span key={f.key} className={`${color} font-medium`}>
                    {isEmpty ? '⚠ ' : ''}{text}
                  </span>
                )
              })}
              <span className="text-gray-500 text-[10px]">{summary.total} ปั๊ม</span>
            </span>
            {/* Duplicate for seamless loop */}
            <span className="flex items-center gap-3 text-[11px] pr-8" aria-hidden>
              {tickerParts.map((text, i) => {
                const f = fuelCounts[i]
                const isEmpty = f.count === 0
                const isCrisis = !isEmpty && f.count <= Math.ceil(total * 0.2)
                let color = 'text-gray-300'
                if (isEmpty) color = 'text-orange-400'
                else if (isCrisis) color = 'text-red-400'

                return (
                  <span key={f.key} className={`${color} font-medium`}>
                    {isEmpty ? '⚠ ' : ''}{text}
                  </span>
                )
              })}
              <span className="text-gray-500 text-[10px]">{summary.total} ปั๊ม</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
