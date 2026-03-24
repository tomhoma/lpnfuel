import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

interface FuelReport {
  id: number
  fuel_type: string
  status: string
  created_at: string
}

const FUEL_LABELS: Record<string, string> = {
  gsh95: '95',
  gsh91: '91',
  e20: 'E20',
  e85: 'E85',
  spg95: 'พรีเมียม95',
  bzn95: 'เบนซิน95',
  diesel_b7: 'ดีเซลB7',
  diesel_b10: 'ดีเซลB10',
  diesel_b20: 'ดีเซลB20',
  diesel_premium: 'ดีเซลพรีเมียม',
}

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  available: { label: 'มี', className: 'bg-emerald-100 text-emerald-700' },
  empty: { label: 'หมด', className: 'bg-red-100 text-red-600' },
  unknown: { label: '?', className: 'bg-gray-100 text-gray-500' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ชม.ที่แล้ว`
  return `${Math.floor(hours / 24)} วันที่แล้ว`
}

export default function RecentReports({ stationId }: { stationId: string }) {
  const [reports, setReports] = useState<FuelReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/stations/${stationId}/reports?limit=10`)
      .then(r => r.json())
      .then(d => setReports(d.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [stationId])

  if (loading) return null
  if (reports.length === 0) return null

  // Group latest status per fuel type (most recent wins)
  const latestByFuel = new Map<string, FuelReport>()
  for (const r of reports) {
    if (!latestByFuel.has(r.fuel_type)) {
      latestByFuel.set(r.fuel_type, r)
    }
  }

  const entries = Array.from(latestByFuel.values())
  const mostRecent = entries[0]

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          รายงานจากผู้ใช้
        </span>
        {mostRecent && (
          <span className="text-[10px] text-gray-400">
            {timeAgo(mostRecent.created_at)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {entries.map(r => {
          const sd = STATUS_DISPLAY[r.status] || STATUS_DISPLAY.unknown
          return (
            <span
              key={r.fuel_type}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sd.className}`}
            >
              {FUEL_LABELS[r.fuel_type] || r.fuel_type}
              <span className="opacity-70">{sd.label}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
