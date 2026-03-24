import { useEffect, useState } from 'react'
import type { StationWithStatus, PricesResponse } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

// ─── Fuel types per brand ─────────────────────────────────────────
const BRAND_FUELS: Record<string, string[]> = {
  'ปตท.': ['gsh95', 'gsh91', 'e20', 'e85', 'spg95', 'bzn95', 'diesel_b7', 'diesel_b10', 'diesel_b20', 'diesel_premium'],
  'พีที': ['gsh95', 'gsh91', 'e20', 'diesel_b7', 'diesel_premium'],
  'บางจาก': ['gsh95', 'gsh91', 'e20', 'e85', 'spg95', 'diesel_b7', 'diesel_premium'],
  'คาลเท็กซ์': ['gsh95', 'gsh91', 'e20', 'spg95', 'diesel_b7', 'diesel_premium'],
  'เชลล์': ['gsh95', 'gsh91', 'e20', 'spg95', 'diesel_b7', 'diesel_premium'],
}

const FUEL_LABELS: Record<string, string> = {
  gsh95: 'แก๊สโซฮอล์ 95',
  gsh91: 'แก๊สโซฮอล์ 91',
  e20: 'E20',
  e85: 'E85',
  spg95: 'พรีเมียม 95',
  bzn95: 'เบนซิน 95',
  diesel_b7: 'ดีเซล B7',
  diesel_b10: 'ดีเซล B10',
  diesel_b20: 'ดีเซล B20',
  diesel_premium: 'ดีเซลพรีเมียม',
}

// Map catalog fuel_type → PTTOR price API key
const PRICE_MAP: Record<string, string> = {
  gsh95: 'gasohol95',
  gsh91: 'gasohol91',
  e20: 'gasoholE20',
  e85: 'gasoholE85',
  spg95: 'super_power_gsh95',
  bzn95: 'benzin95',
  diesel_b7: 'diesel',
  diesel_b10: 'diesel',       // same base price
  diesel_b20: 'diesel',       // same base price
  diesel_premium: 'premium_diesel',
}

// Map GAS status fields → which catalog fuel types they cover
const GAS_FALLBACK: Record<string, string[]> = {
  diesel: ['diesel_b7', 'diesel_b10', 'diesel_b20', 'diesel_premium'],
  gas95: ['gsh95', 'spg95', 'bzn95'],
  gas91: ['gsh91'],
  e20: ['e20', 'e85'],
}

const BRAND_PRICE_MAP: Record<string, string> = {
  'ปตท.': 'PTT',
  'พีที': 'PTT',
}

type FuelStatus = 'available' | 'empty' | 'unknown' | null

interface FuelReport {
  fuel_type: string
  status: string
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Get today's 1AM reset boundary in Asia/Bangkok */
function getTodayResetTime(): Date {
  const now = new Date()
  // Convert to Bangkok time (+7)
  const bangkokOffset = 7 * 60 * 60 * 1000
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const bangkokMs = utcMs + bangkokOffset
  const bangkokNow = new Date(bangkokMs)

  const reset = new Date(bangkokNow)
  reset.setHours(1, 0, 0, 0)

  // If current time is before 1AM, use yesterday's 1AM
  if (bangkokNow.getHours() < 1) {
    reset.setDate(reset.getDate() - 1)
  }

  // Convert back to local time
  const resetUtc = reset.getTime() - bangkokOffset + now.getTimezoneOffset() * -60000
  return new Date(resetUtc - now.getTimezoneOffset() * 60000)
}

function getGASStatus(station: StationWithStatus, fuelId: string): FuelStatus {
  for (const [gasField, catalogIds] of Object.entries(GAS_FALLBACK)) {
    if (catalogIds.includes(fuelId)) {
      const val = (station as any)[gasField] as string | undefined
      if (val === 'มี') return 'available'
      if (val === 'หมด') return 'empty'
      return null // '-' or missing
    }
  }
  return null
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

// ─── Component ────────────────────────────────────────────────────

interface Props {
  station: StationWithStatus
  prices?: PricesResponse | null
}

export default function FuelStatusGrid({ station, prices }: Props) {
  const [reports, setReports] = useState<FuelReport[]>([])

  useEffect(() => {
    fetch(`${API_URL}/stations/${station.id}/reports?limit=30`)
      .then(r => r.json())
      .then(d => setReports(d.reports || []))
      .catch(() => setReports([]))
  }, [station.id])

  const availableFuels = BRAND_FUELS[station.brand] || Object.keys(FUEL_LABELS)
  const resetTime = getTodayResetTime()

  // Filter reports to today (after 1AM reset)
  const todayReports = reports.filter(r => new Date(r.created_at) >= resetTime)

  // Build status map: user report → GAS fallback
  const latestUserReport = new Map<string, FuelReport>()
  for (const r of todayReports) {
    if (!latestUserReport.has(r.fuel_type)) {
      latestUserReport.set(r.fuel_type, r)
    }
  }

  // Price lookup
  const priceBrand = BRAND_PRICE_MAP[station.brand]
  const getPrice = (fuelId: string): number | null => {
    if (!prices?.prices || !priceBrand) return null
    const priceKey = PRICE_MAP[fuelId]
    if (!priceKey) return null
    // Try station district → empty → เมืองลำพูน
    const d = prices.prices[station.district]?.[priceBrand]?.[priceKey]
    if (d != null) return d
    const f = prices.prices['']?.[priceBrand]?.[priceKey]
    if (f != null) return f
    return prices.prices['เมืองลำพูน']?.[priceBrand]?.[priceKey] ?? null
  }

  // Build rows
  const gasFuels = availableFuels.filter(id => !id.startsWith('diesel'))
  const dieselFuels = availableFuels.filter(id => id.startsWith('diesel'))

  const hasUserReports = todayReports.length > 0
  const mostRecentReport = todayReports[0]

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          สถานะน้ำมัน
        </span>
        <span className="text-[10px] text-gray-400">
          {hasUserReports
            ? `ผู้ใช้รายงาน ${timeAgo(mostRecentReport.created_at)}`
            : 'ข้อมูลจากระบบ'}
        </span>
      </div>

      {/* Gasoline group */}
      {gasFuels.length > 0 && (
        <FuelGroup label="เบนซิน / แก๊สโซฮอล์" fuels={gasFuels} station={station}
          latestUserReport={latestUserReport} getPrice={getPrice} />
      )}

      {/* Diesel group */}
      {dieselFuels.length > 0 && (
        <FuelGroup label="ดีเซล" fuels={dieselFuels} station={station}
          latestUserReport={latestUserReport} getPrice={getPrice} />
      )}
    </div>
  )
}

function FuelGroup({ label, fuels, station, latestUserReport, getPrice }: {
  label: string
  fuels: string[]
  station: StationWithStatus
  latestUserReport: Map<string, FuelReport>
  getPrice: (fuelId: string) => number | null
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-1">{label}</p>
      <div className="space-y-0.5">
        {fuels.map(fuelId => {
          const userReport = latestUserReport.get(fuelId)
          let status: FuelStatus
          let source: 'user' | 'gas'

          if (userReport) {
            status = userReport.status as FuelStatus
            source = 'user'
          } else {
            status = getGASStatus(station, fuelId)
            source = 'gas'
          }

          const price = getPrice(fuelId)

          return (
            <FuelRow
              key={fuelId}
              label={FUEL_LABELS[fuelId]}
              status={status}
              source={source}
              price={price}
            />
          )
        })}
      </div>
    </div>
  )
}

function FuelRow({ label, status, source, price }: {
  label: string
  status: FuelStatus
  source: 'user' | 'gas'
  price: number | null
}) {
  const statusConfig = {
    available: { text: 'มี', bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    empty: { text: 'หมด', bg: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    unknown: { text: '?', bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  }

  const sc = status ? statusConfig[status] : null

  return (
    <div className="flex items-center py-1 px-1 rounded-lg hover:bg-gray-50 transition">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc?.dot || 'bg-gray-200'}`} />

      {/* Fuel name */}
      <span className="text-xs text-gray-700 ml-2 flex-1 truncate">{label}</span>

      {/* Status badge */}
      {sc ? (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sc.bg} ${source === 'user' ? 'ring-1 ring-amber-300' : ''}`}>
          {sc.text}
        </span>
      ) : (
        <span className="text-[10px] text-gray-300 px-1.5">—</span>
      )}

      {/* Price */}
      {price !== null ? (
        <span className="text-xs font-bold text-gray-800 ml-2 w-12 text-right">{price.toFixed(2)}</span>
      ) : (
        <span className="w-12 ml-2" />
      )}
    </div>
  )
}
