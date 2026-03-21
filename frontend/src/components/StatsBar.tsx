import { Link } from 'react-router-dom'
import type { OverallSummary } from '../types'

interface StatsBarProps {
  summary: OverallSummary
}

export default function StatsBar({ summary }: StatsBarProps) {
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
      {summary.diesel_crisis && (
        <div className={`font-semibold text-[10px] mt-0.5 ${summary.diesel_count === 0 ? 'text-orange-500' : 'text-red-600'}`}>
          {summary.diesel_count === 0
            ? 'รอน้ำมันดีเซลจัดส่ง'
            : `ดีเซลเหลือ ${summary.diesel_count} ปั๊ม`
          }
        </div>
      )}
    </Link>
  )
}
