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

  const alerts = fuelCounts.filter(f => f.count === 0)

  return (
    <Link
      to="/dashboard"
      className="absolute bottom-14 left-3 z-[500] bg-white/90 backdrop-blur-sm shadow-lg rounded-xl px-3 py-2 border border-gray-200/50 block active:scale-95 transition"
    >
      <div className="flex items-center gap-1.5 text-xs">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
        <span className="text-gray-600">มีน้ำมัน <b className="text-green-600">{summary.with_fuel}</b></span>
        <span className="text-gray-300">|</span>
        <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
        <span className="text-gray-600">หมด <b className="text-red-600">{summary.all_empty}</b></span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{summary.total} ปั๊ม</span>
      </div>
      {fuelCounts.map(f => {
        if (f.count === 0) return null // แสดงใน alerts แทน
        const total = stations.length
        const isCrisis = f.count > 0 && f.count <= Math.ceil(total * 0.2)
        if (!isCrisis) return null
        return (
          <div key={f.key} className="text-red-600 font-semibold text-[10px] mt-0.5">
            {f.label}เหลือ {f.count} ปั๊ม
          </div>
        )
      })}
      {alerts.map(f => (
        <div key={f.key} className="text-orange-500 font-semibold text-[10px] mt-0.5">
          ไม่มี{f.label} รอน้ำมันจัดส่ง
        </div>
      ))}
    </Link>
  )
}
