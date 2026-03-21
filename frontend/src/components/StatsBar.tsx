import { Link } from 'react-router-dom'
import type { OverallSummary } from '../types'

interface StatsBarProps {
  summary: OverallSummary
  lastUpdated: Date | null
}

export default function StatsBar({ summary, lastUpdated }: StatsBarProps) {
  const pct = summary.total > 0
    ? Math.round(summary.with_fuel / summary.total * 100)
    : 0

  return (
    <div className="bg-white border-t border-gray-100 px-3 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-3 text-xs">
        <span>
          <span className="font-bold text-green-600">{summary.with_fuel}</span>
          <span className="text-gray-400">/{summary.total} มีน้ำมัน ({pct}%)</span>
        </span>
        {summary.diesel_crisis && (
          <span className="text-red-600 font-semibold text-[10px] bg-red-50 px-1.5 py-0.5 rounded-full animate-pulse">
            ดีเซลวิกฤต {summary.diesel_count} ปั๊ม
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {lastUpdated && (
          <span className="text-[10px] text-gray-400">
            {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <Link
          to="/dashboard"
          className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
