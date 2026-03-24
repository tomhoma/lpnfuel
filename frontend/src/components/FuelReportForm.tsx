import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

interface FuelTypeCatalog {
  id: string
  name: string
  group: string
  sort: number
}

interface ReportEntry {
  fuel_type: string
  status: 'available' | 'empty' | 'unknown'
}

interface Props {
  stationId: string
  stationBrand: string
}

// Fuel types available per brand (only show relevant ones)
const BRAND_FUELS: Record<string, string[]> = {
  'ปตท.': ['gsh95', 'gsh91', 'e20', 'e85', 'spg95', 'bzn95', 'diesel_b7', 'diesel_b10', 'diesel_b20', 'diesel_premium'],
  'พีที': ['gsh95', 'gsh91', 'e20', 'diesel_b7', 'diesel_premium'],
  'บางจาก': ['gsh95', 'gsh91', 'e20', 'e85', 'spg95', 'diesel_b7', 'diesel_premium'],
  'คาลเท็กซ์': ['gsh95', 'gsh91', 'e20', 'spg95', 'diesel_b7', 'diesel_premium'],
  'เชลล์': ['gsh95', 'gsh91', 'e20', 'spg95', 'diesel_b7', 'diesel_premium'],
}

const FUEL_LABELS: Record<string, string> = {
  gsh95: '95',
  gsh91: '91',
  e20: 'E20',
  e85: 'E85',
  spg95: 'พรีเมียม 95',
  bzn95: 'เบนซิน 95',
  diesel_b7: 'ดีเซล B7',
  diesel_b10: 'ดีเซล B10',
  diesel_b20: 'ดีเซล B20',
  diesel_premium: 'ดีเซลพรีเมียม',
}

const STATUS_CONFIG = [
  { value: 'available' as const, label: 'มี', emoji: '🟢', color: 'bg-emerald-500 text-white' },
  { value: 'empty' as const, label: 'หมด', emoji: '🔴', color: 'bg-red-500 text-white' },
  { value: 'unknown' as const, label: 'ไม่ทราบ', emoji: '⚪', color: 'bg-gray-300 text-gray-700' },
]

export default function FuelReportForm({ stationId, stationBrand }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [reports, setReports] = useState<Record<string, ReportEntry['status'] | null>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [geoError, setGeoError] = useState(false)

  // Reset when station changes
  useEffect(() => {
    setExpanded(false)
    setReports({})
    setResult(null)
    setSubmitting(false)
    setGeoError(false)
  }, [stationId])

  const availableFuels = BRAND_FUELS[stationBrand] || Object.keys(FUEL_LABELS)

  const toggleStatus = useCallback((fuelId: string, status: ReportEntry['status']) => {
    setReports(prev => ({
      ...prev,
      [fuelId]: prev[fuelId] === status ? null : status, // toggle off if same
    }))
  }, [])

  const selectedCount = Object.values(reports).filter(v => v !== null).length

  const handleSubmit = async () => {
    const entries: ReportEntry[] = Object.entries(reports)
      .filter(([, status]) => status !== null)
      .map(([fuel_type, status]) => ({ fuel_type, status: status! }))

    if (entries.length === 0) return

    setSubmitting(true)
    setResult(null)

    // Get user location
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        })
      })

      const resp = await fetch(`${API_URL}/stations/${stationId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: entries,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      })

      const data = await resp.json()

      if (resp.status === 403) {
        setResult({ ok: false, message: `📍 คุณอยู่ห่างจากปั๊มเกิน ${data.max_km} กม. (${data.distance_km?.toFixed(1)} กม.)` })
      } else if (resp.status === 429) {
        const secs = data.retry_after_seconds || 180
        setResult({ ok: false, message: `⏳ พึ่งอัพเดทไป รออีก ${secs} วินาที` })
      } else if (data.accepted > 0) {
        setResult({ ok: true, message: `✅ ส่งสำเร็จ ${data.accepted} รายการ` })
        // Auto collapse after success
        setTimeout(() => {
          setExpanded(false)
          setReports({})
          setResult(null)
        }, 2000)
      } else {
        setResult({ ok: false, message: 'ไม่สามารถส่งได้ กรุณาลองใหม่' })
      }
    } catch {
      setGeoError(true)
      setResult({ ok: false, message: '📍 ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        รายงานสถานะน้ำมัน
      </button>
    )
  }

  // Gas and diesel groups
  const gasFuels = availableFuels.filter(id => !id.startsWith('diesel'))
  const dieselFuels = availableFuels.filter(id => id.startsWith('diesel'))

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">รายงานสถานะน้ำมัน</h3>
        <button
          onClick={() => { setExpanded(false); setReports({}); setResult(null) }}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          ยกเลิก
        </button>
      </div>

      <p className="text-xs text-gray-400">กดเลือกสถานะแต่ละชนิดน้ำมัน</p>

      {/* Gasoline group */}
      {gasFuels.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">เบนซิน / แก๊สโซฮอล์</p>
          <div className="space-y-1">
            {gasFuels.map(fuelId => (
              <FuelRow
                key={fuelId}
                fuelId={fuelId}
                label={FUEL_LABELS[fuelId]}
                selected={reports[fuelId] ?? null}
                onSelect={(status) => toggleStatus(fuelId, status)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Diesel group */}
      {dieselFuels.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">ดีเซล</p>
          <div className="space-y-1">
            {dieselFuels.map(fuelId => (
              <FuelRow
                key={fuelId}
                fuelId={fuelId}
                label={FUEL_LABELS[fuelId]}
                selected={reports[fuelId] ?? null}
                onSelect={(status) => toggleStatus(fuelId, status)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Result message */}
      {result && (
        <p className={`text-sm text-center font-semibold py-1 ${result.ok ? 'text-green-600' : 'text-red-500'}`}>
          {result.message}
        </p>
      )}

      {/* Submit button */}
      {!result?.ok && (
        <button
          onClick={handleSubmit}
          disabled={selectedCount === 0 || submitting}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:shadow-none transition-all text-sm"
        >
          {submitting
            ? 'กำลังส่ง...'
            : selectedCount > 0
              ? `ส่งรายงาน (${selectedCount} รายการ)`
              : 'เลือกสถานะน้ำมันก่อน'}
        </button>
      )}

      {geoError && (
        <p className="text-[11px] text-gray-400 text-center">
          💡 ต้องเปิด GPS เพื่อยืนยันว่าอยู่ใกล้ปั๊ม (ภายใน 3 กม.)
        </p>
      )}
    </div>
  )
}

function FuelRow({ fuelId, label, selected, onSelect }: {
  fuelId: string
  label: string
  selected: ReportEntry['status'] | null
  onSelect: (status: ReportEntry['status']) => void
}) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-xs font-medium text-gray-600 w-24 truncate">{label}</span>
      <div className="flex gap-1 flex-1">
        {STATUS_CONFIG.map(sc => {
          const isActive = selected === sc.value
          return (
            <button
              key={sc.value}
              onClick={() => onSelect(sc.value)}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95
                ${isActive
                  ? sc.color + ' shadow-sm ring-2 ring-offset-1 ring-gray-300'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
            >
              {sc.emoji} {sc.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
