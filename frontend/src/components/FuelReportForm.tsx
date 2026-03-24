import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

interface ReportEntry {
  fuel_type: string
  status: 'available' | 'empty' | 'unknown'
}

interface Props {
  stationId: string
  stationName: string
  stationBrand: string
  currentStatuses: Record<string, string | null>  // fuelId → 'available'|'empty'|'unknown'|null
  onClose: () => void
}

const BRAND_FUELS: Record<string, string[]> = {
  'ปตท.': ['gsh95', 'gsh91', 'e20', 'e85', 'spg95', 'bzn95', 'diesel_b7', 'diesel_b10', 'diesel_b20', 'diesel_premium'],
  'พีที': ['gsh95', 'gsh91', 'e20', 'diesel_b7', 'diesel_premium'],
  'บางจาก': ['gsh95', 'gsh91', 'e20', 'e85', 'spg95', 'diesel_b7', 'diesel_premium'],
  'คาลเท็กซ์': ['gsh95', 'gsh91', 'e20', 'spg95', 'diesel_b7', 'diesel_premium'],
  'เชลล์': ['gsh95', 'gsh91', 'e20', 'spg95', 'diesel_b7', 'diesel_premium'],
}

const BRAND_LOGO: Record<string, string> = {
  'ปตท.': '/logos/ptt.png',
  'พีที': '/logos/pt.png',
  'บางจาก': '/logos/bangchak.png',
  'คาลเท็กซ์': '/logos/caltex.png',
  'เชลล์': '/logos/shell.png',
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

export default function FuelReportForm({ stationId, stationName, stationBrand, currentStatuses, onClose }: Props) {
  // Pre-fill with current statuses
  const [reports, setReports] = useState<Record<string, ReportEntry['status'] | null>>(() => {
    const init: Record<string, ReportEntry['status'] | null> = {}
    for (const [k, v] of Object.entries(currentStatuses)) {
      init[k] = (v as ReportEntry['status']) || null
    }
    return init
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [geoError, setGeoError] = useState(false)

  const availableFuels = BRAND_FUELS[stationBrand] || Object.keys(FUEL_LABELS)

  const toggleStatus = useCallback((fuelId: string, status: ReportEntry['status']) => {
    setReports(prev => ({
      ...prev,
      [fuelId]: prev[fuelId] === status ? null : status,
    }))
  }, [])

  // Count how many selections changed from current
  const changedCount = Object.entries(reports).filter(([k, v]) => {
    return v !== null && v !== currentStatuses[k]
  }).length



  const handleSubmit = async () => {
    const entries: ReportEntry[] = Object.entries(reports)
      .filter(([key, status]) => status !== null && status !== currentStatuses[key])
      .map(([fuel_type, status]) => ({ fuel_type, status: status! }))

    if (entries.length === 0) return

    setSubmitting(true)
    setResult(null)

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
        setTimeout(() => onClose(), 1200)
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

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const gasFuels = availableFuels.filter(id => !id.startsWith('diesel'))
  const dieselFuels = availableFuels.filter(id => id.startsWith('diesel'))

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 animate-fadeIn">
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col animate-slideUp"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="flex justify-center mb-2">
            <div className="w-8 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {BRAND_LOGO[stationBrand] && (
                <img src={BRAND_LOGO[stationBrand]} alt={stationBrand} className="w-8 h-8 object-contain rounded-lg" />
              )}
              <div>
                <h3 className="text-base font-bold text-gray-800">รายงานสถานะน้ำมัน</h3>
                <p className="text-xs text-gray-400 mt-0.5">{stationName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-300 hover:text-gray-500 active:scale-90 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Gasoline group */}
          {gasFuels.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">เบนซิน / แก๊สโซฮอล์</p>
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
          )}

          {/* Diesel group */}
          {dieselFuels.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">ดีเซล</p>
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
          )}

        </div>

        {/* Fixed footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 space-y-2">
          {result && (
            <p className={`text-sm text-center font-semibold ${result.ok ? 'text-green-600' : 'text-red-500'}`}>
              {result.message}
            </p>
          )}

          {geoError && (
            <p className="text-[11px] text-gray-400 text-center">
              💡 กรุณาเปิด GPS / อนุญาตตำแหน่ง แล้วลองใหม่
            </p>
          )}

          {!result?.ok && (
            <button
              onClick={handleSubmit}
              disabled={changedCount === 0 || submitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:shadow-none transition-all text-sm"
            >
              {submitting
                ? 'กำลังส่ง...'
                : changedCount > 0
                  ? `ส่งรายงาน (${changedCount} รายการ)`
                  : 'เลือกสถานะน้ำมันก่อน'}
            </button>
          )}
        </div>
      </div>
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
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95
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
