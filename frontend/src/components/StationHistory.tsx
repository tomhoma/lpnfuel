import { useState, useEffect, useMemo } from 'react'
import type { FuelStatus, StationDetailResponse } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

const FUEL_TYPES = [
  { key: 'diesel' as const, label: 'ดีเซล', color: '#3B82F6' },
  { key: 'gas91' as const, label: '91', color: '#22C55E' },
  { key: 'gas95' as const, label: '95', color: '#EAB308' },
  { key: 'e20' as const, label: 'E20', color: '#A855F7' },
]

interface Props {
  stationId: string
}

export default function StationHistory({ stationId }: Props) {
  const [history, setHistory] = useState<FuelStatus[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setHistory(null)
    window.fetch(`${API_URL}/stations/${stationId}`)
      .then(r => r.json())
      .then((json: StationDetailResponse) => {
        setHistory(json.history_7d || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [stationId])

  // Group history into hourly slots for the last 24 hours
  const timeline = useMemo(() => {
    if (!history || history.length === 0) return null

    const now = Date.now()
    const h24ago = now - 24 * 60 * 60 * 1000
    const slots = 24 // 1 slot per hour

    // Filter last 24h records
    const recent = history.filter(h => {
      const t = new Date(h.fetched_at).getTime()
      return t >= h24ago && t <= now
    })

    if (recent.length === 0) return null

    // Build slots: for each hour, find the closest record
    return Array.from({ length: slots }, (_, i) => {
      const slotStart = h24ago + i * 60 * 60 * 1000
      const slotEnd = slotStart + 60 * 60 * 1000
      const slotMid = slotStart + 30 * 60 * 1000

      // Find closest record to slot midpoint
      let closest: FuelStatus | null = null
      let minDiff = Infinity
      for (const r of recent) {
        const t = new Date(r.fetched_at).getTime()
        if (t >= slotStart - 30 * 60 * 1000 && t < slotEnd + 30 * 60 * 1000) {
          const diff = Math.abs(t - slotMid)
          if (diff < minDiff) { minDiff = diff; closest = r }
        }
      }

      const hour = new Date(slotStart).getHours()
      return { hour, record: closest }
    })
  }, [history])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-xs text-gray-400 ml-2">โหลดประวัติ...</span>
      </div>
    )
  }

  if (!timeline) {
    return (
      <p className="text-xs text-gray-400 text-center py-2">ไม่มีข้อมูลย้อนหลัง 24 ชม.</p>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-500">สถานะย้อนหลัง 24 ชม.</p>
      <div className="space-y-1">
        {FUEL_TYPES.map(fuel => (
          <div key={fuel.key} className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 w-8 text-right flex-shrink-0">{fuel.label}</span>
            <div className="flex flex-1 gap-px">
              {timeline.map((slot, i) => {
                const val = slot.record ? slot.record[fuel.key] : null
                let bg = '#E5E7EB' // gray — no data
                if (val === 'มี') bg = fuel.color
                else if (val === 'หมด') bg = '#EF4444'
                // '-' = ไม่ขาย → gray

                return (
                  <div
                    key={i}
                    className="flex-1 h-3 rounded-[2px] first:rounded-l last:rounded-r"
                    style={{ backgroundColor: bg, opacity: val === '-' ? 0.3 : 0.85 }}
                    title={`${String(slot.hour).padStart(2, '0')}:00 — ${val || 'ไม่มีข้อมูล'}`}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Hour labels */}
      <div className="flex items-center gap-1.5">
        <span className="w-8 flex-shrink-0" />
        <div className="flex flex-1 justify-between">
          {[0, 6, 12, 18, 23].map(h => (
            <span key={h} className="text-[9px] text-gray-400">
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 justify-center pt-0.5">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#22C55E' }} /> มี
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> หมด
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> ไม่มีข้อมูล
        </span>
      </div>
    </div>
  )
}
