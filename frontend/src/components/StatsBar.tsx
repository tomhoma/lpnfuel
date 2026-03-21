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
    <div className="bg-white border-t border-gray-100 px-4 py-2 flex items-center justify-between">
      <div className="flex gap-4 text-sm">
        <span>
          <span className="font-bold text-green-600">{summary.with_fuel}</span>
          <span className="text-gray-400">/{summary.total} มีน้ำมัน ({pct}%)</span>
        </span>
        {summary.diesel_crisis && (
          <span className="text-red-600 font-semibold text-xs bg-red-50 px-2 py-0.5 rounded-full">
            ⚠️ ดีเซลวิกฤต {summary.diesel_count} ปั๊ม
          </span>
        )}
      </div>
      {lastUpdated && (
        <span className="text-xs text-gray-400">
          {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
