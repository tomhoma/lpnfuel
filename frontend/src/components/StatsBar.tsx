import { useEffect, useMemo, useState } from 'react'
import type { StationWithStatus } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

const FUEL_SHORT: Record<string, string> = {
  gsh95: '95', gsh91: '91', e20: 'E20', e85: 'E85',
  spg95: 'พรีเมียม95', bzn95: 'เบนซิน95',
  diesel_b7: 'B7', diesel_b10: 'B10', diesel_b20: 'B20', diesel_premium: 'ดีเซลพรีเมียม',
}

interface ReportItem {
  station_name: string
  station_brand: string
  fuel_type: string
  status: string
  created_at: string
}

interface TickerEntry {
  icon: string
  text: string
  highlight: boolean // true = good news (มี), false = neutral/bad
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

interface StatsBarProps {
  stations: StationWithStatus[]
}

export default function StatsBar({ stations }: StatsBarProps) {
  const [reports, setReports] = useState<ReportItem[]>([])

  // Fetch recent global reports
  useEffect(() => {
    const fetchReports = () => {
      fetch(`${API_URL}/reports?limit=20`)
        .then(r => r.json())
        .then(d => setReports(d.reports || []))
        .catch(() => {})
    }
    fetchReports()
    const interval = setInterval(fetchReports, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const tickerEntries = useMemo(() => {
    const entries: TickerEntry[] = []

    // 1. Community reports (group by batch — same station + close timestamps)
    const seen = new Set<string>()
    for (const r of reports) {
      const batchKey = `${r.station_name}-${r.created_at.slice(0, 16)}`
      if (seen.has(batchKey)) continue
      seen.add(batchKey)

      // Collect all fuels in same batch
      const batchReports = reports.filter(rr =>
        rr.station_name === r.station_name &&
        Math.abs(new Date(rr.created_at).getTime() - new Date(r.created_at).getTime()) <= 10_000
      )

      const availableFuels = batchReports
        .filter(rr => rr.status === 'available')
        .map(rr => FUEL_SHORT[rr.fuel_type] || rr.fuel_type)
      const emptyFuels = batchReports
        .filter(rr => rr.status === 'empty')
        .map(rr => FUEL_SHORT[rr.fuel_type] || rr.fuel_type)

      const name = r.station_name || `${r.station_brand} #${(r as any).station_id}`
      const ago = timeAgo(r.created_at)

      if (availableFuels.length > 0) {
        entries.push({
          icon: '👤',
          text: `${name} — ${availableFuels.join(', ')} มี · ${ago}`,
          highlight: true,
        })
      } else if (emptyFuels.length > 0) {
        entries.push({
          icon: '👤',
          text: `${name} — ${emptyFuels.join(', ')} หมด · ${ago}`,
          highlight: false,
        })
      }

      if (entries.length >= 8) break
    }

    // 2. Stations with incoming supply (กำลังจัดส่ง / กำลังลงน้ำมัน)
    const incoming = stations.filter(s =>
      s.transport_status === 'กำลังจัดส่ง' || s.transport_status === 'กำลังลงน้ำมัน'
    )
    for (const s of incoming.slice(0, 4)) {
      const status = s.transport_status === 'กำลังลงน้ำมัน' ? 'กำลังลงน้ำมัน' : 'กำลังจัดส่ง'
      entries.push({
        icon: '🚛',
        text: `${s.brand} ${s.name} ${status}${s.transport_eta ? ` · ${s.transport_eta}` : ''}`,
        highlight: true,
      })
    }

    // Fallback if no data
    if (entries.length === 0) {
      entries.push({
        icon: '📡',
        text: 'รอข้อมูลจากชาวลำพูน...',
        highlight: false,
      })
    }

    return entries
  }, [reports, stations])

  // Need enough copies to fill the seamless loop
  const copies = 4

  return (
    <div
      className="absolute left-3 right-3 z-[500] block"
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="bg-gray-900/80 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg overflow-hidden">
        <div className="inline-flex whitespace-nowrap animate-ticker will-change-transform">
          {Array.from({ length: copies }).map((_, copyIdx) => (
            <span key={copyIdx} className="inline-flex items-center text-[13px] pr-8" aria-hidden={copyIdx > 0 || undefined}>
              {tickerEntries.map((entry, i) => (
                <span key={`${copyIdx}-${i}`} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-gray-600 mx-2">·</span>}
                  <span>{entry.icon}</span>
                  <span className={`font-medium ${entry.highlight ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {entry.text}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
