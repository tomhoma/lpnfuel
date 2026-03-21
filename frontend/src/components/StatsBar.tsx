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
    <div className="absolute bottom-4 left-3 z-[500] bg-white/90 backdrop-blur-sm shadow-lg rounded-xl px-3 py-2 border border-gray-200/50">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-green-600 text-sm">{summary.with_fuel}</span>
        <span className="text-gray-500">/{summary.total} มีน้ำมัน ({pct}%)</span>
        {lastUpdated && (
          <span className="text-[10px] text-gray-400">
            {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      {summary.diesel_crisis && (
        <div className="text-red-600 font-semibold text-[10px] mt-0.5 animate-pulse">
          ดีเซลวิกฤต {summary.diesel_count} ปั๊ม
        </div>
      )}
    </div>
  )
}
