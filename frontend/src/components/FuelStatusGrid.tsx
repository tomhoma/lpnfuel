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

// Short labels for compact chips
const FUEL_SHORT: Record<string, string> = {
  gsh95: '95',
  gsh91: '91',
  e20: 'E20',
  e85: 'E85',
  spg95: 'พรีเมียม',
  bzn95: 'เบนซิน',
  diesel_b7: 'B7',
  diesel_b10: 'B10',
  diesel_b20: 'B20',
  diesel_premium: 'พรีเมียม',
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
  diesel_b10: 'diesel',
  diesel_b20: 'diesel',
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

/** Get today's 1AM reset boundary in Asia/Bangkok */
function getTodayResetTime(): Date {
  const now = new Date()
  const bangkokOffset = 7 * 60 * 60 * 1000
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const bangkokMs = utcMs + bangkokOffset
  const bangkokNow = new Date(bangkokMs)

  const reset = new Date(bangkokNow)
  reset.setHours(1, 0, 0, 0)

  if (bangkokNow.getHours() < 1) {
    reset.setDate(reset.getDate() - 1)
  }

  const resetUtc = reset.getTime() - bangkokOffset + now.getTimezoneOffset() * -60000
  return new Date(resetUtc - now.getTimezoneOffset() * 60000)
}

function getGASStatus(station: StationWithStatus, fuelId: string): FuelStatus {
  for (const [gasField, catalogIds] of Object.entries(GAS_FALLBACK)) {
    if (catalogIds.includes(fuelId)) {
      const val = (station as any)[gasField] as string | undefined
      if (val === 'มี') return 'available'
      if (val === 'หมด') return 'empty'
      return null
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

// ─── Main Component ───────────────────────────────────────────────

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

  const availableFuels = BRAND_FUELS[station.brand] || Object.keys(FUEL_SHORT)
  const resetTime = getTodayResetTime()

  const todayReports = reports.filter(r => new Date(r.created_at) >= resetTime)

  const latestUserReport = new Map<string, FuelReport>()
  for (const r of todayReports) {
    if (!latestUserReport.has(r.fuel_type)) {
      latestUserReport.set(r.fuel_type, r)
    }
  }

  const priceBrand = BRAND_PRICE_MAP[station.brand]
  const getPrice = (fuelId: string): number | null => {
    if (!prices?.prices || !priceBrand) return null
    const priceKey = PRICE_MAP[fuelId]
    if (!priceKey) return null
    const d = prices.prices[station.district]?.[priceBrand]?.[priceKey]
    if (d != null) return d
    const f = prices.prices['']?.[priceBrand]?.[priceKey]
    if (f != null) return f
    return prices.prices['เมืองลำพูน']?.[priceBrand]?.[priceKey] ?? null
  }

  const gasFuels = availableFuels.filter(id => !id.startsWith('diesel'))
  const dieselFuels = availableFuels.filter(id => id.startsWith('diesel'))

  const hasUserReports = todayReports.length > 0
  const mostRecentReport = todayReports[0]

  // Build fuel items with status + price
  const buildItems = (fuels: string[]) => fuels.map(fuelId => {
    const userReport = latestUserReport.get(fuelId)
    return {
      id: fuelId,
      label: FUEL_SHORT[fuelId],
      status: (userReport ? userReport.status : getGASStatus(station, fuelId)) as FuelStatus,
      isUser: !!userReport,
      price: getPrice(fuelId),
    }
  })

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          สถานะน้ำมัน
        </span>
        <span className="text-[10px] text-gray-400">
          {hasUserReports
            ? `👤 ${timeAgo(mostRecentReport.created_at)}`
            : 'ข้อมูลจากระบบ'}
        </span>
      </div>

      {/* Gasoline chips */}
      {gasFuels.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-1">เบนซิน</p>
          <div className="flex flex-wrap gap-1">
            {buildItems(gasFuels).map(f => (
              <FuelChip key={f.id} {...f} />
            ))}
          </div>
        </div>
      )}

      {/* Diesel chips */}
      {dieselFuels.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-1">ดีเซล</p>
          <div className="flex flex-wrap gap-1">
            {buildItems(dieselFuels).map(f => (
              <FuelChip key={f.id} {...f} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Compact Chip ─────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  empty:     'bg-red-50 border-red-200 text-red-600',
  unknown:   'bg-gray-50 border-gray-200 text-gray-500',
}

function FuelChip({ label, status, isUser, price }: {
  id: string
  label: string
  status: FuelStatus
  isUser: boolean
  price: number | null
}) {
  const style = status ? STATUS_STYLES[status] : 'bg-gray-50 border-gray-100 text-gray-400'

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition
      ${style} ${isUser ? 'ring-1 ring-amber-300' : ''}`}
    >
      {/* Status dot */}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        status === 'available' ? 'bg-emerald-500' :
        status === 'empty' ? 'bg-red-500' :
        status === 'unknown' ? 'bg-gray-400' : 'bg-gray-200'
      }`} />

      {/* Label */}
      <span>{label}</span>

      {/* Price (if available) */}
      {price !== null && (
        <span className="text-[10px] font-bold text-gray-700 ml-0.5">{price.toFixed(2)}</span>
      )}
    </div>
  )
}
