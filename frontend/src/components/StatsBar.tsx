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

  return (
    <Link
      to="/dashboard"
      className="absolute bottom-16 left-3 right-14 z-[500] bg-white/95 backdrop-blur-md shadow-xl rounded-2xl px-4 py-3 border border-gray-200/60 block active:scale-[0.97] transition-transform"
    >
      {/* Top row: availability pills + total */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-xs font-bold text-green-700">{summary.with_fuel}</span>
          <span className="text-[10px] text-green-600">มี</span>
        </div>
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs font-bold text-red-700">{summary.all_empty}</span>
          <span className="text-[10px] text-red-600">หมด</span>
        </div>
        <span className="ml-auto text-[11px] text-gray-400 font-medium">{summary.total} ปั๊ม</span>
      </div>

      {/* Fuel type chips */}
      <div className="flex gap-1.5 mt-2.5">
        {fuelCounts.map(f => {
          const isEmpty = f.count === 0
          const isCrisis = !isEmpty && f.count <= Math.ceil(total * 0.2)

          let chipBg = 'bg-green-50 border-green-200'
          let countColor = 'text-green-700'
          let labelColor = 'text-green-600'

          if (isEmpty) {
            chipBg = 'bg-orange-50 border-orange-200'
            countColor = 'text-orange-600'
            labelColor = 'text-orange-500'
          } else if (isCrisis) {
            chipBg = 'bg-red-50 border-red-200'
            countColor = 'text-red-700'
            labelColor = 'text-red-500'
          }

          return (
            <div
              key={f.key}
              className={`flex-1 flex flex-col items-center rounded-lg border py-1.5 ${chipBg}`}
            >
              <span className={`text-sm font-bold leading-none ${countColor}`}>
                {isEmpty ? '—' : f.count}
              </span>
              <span className={`text-[10px] mt-0.5 font-medium ${labelColor}`}>
                {f.label}
              </span>
            </div>
          )
        })}
      </div>
    </Link>
  )
}
