import type { FuelType, FilterStatus, BrandFilter } from '../types'

interface FilterBarProps {
  status: FilterStatus
  brand: BrandFilter
  fuel: FuelType | null
  onStatus: (s: FilterStatus) => void
  onBrand: (b: BrandFilter) => void
  onFuel: (f: FuelType | null) => void
  stationCount: number
}

const STATUS_PILLS: { value: FilterStatus; label: string; color: string }[] = [
  { value: 'all', label: 'ทั้งหมด', color: '' },
  { value: 'available', label: 'มี', color: 'bg-green-500' },
  { value: 'empty', label: 'หมด', color: 'bg-red-500' },
  { value: 'incoming', label: 'กำลังส่ง', color: 'bg-yellow-500' },
]

const BRAND_PILLS: { value: BrandFilter; label: string }[] = [
  { value: 'all', label: 'ทุกแบรนด์' },
  { value: 'ปตท.', label: 'ปตท.' },
  { value: 'บางจาก', label: 'บางจาก' },
  { value: 'พีที', label: 'พีที' },
  { value: 'คาลเท็กซ์', label: 'คาลเท็กซ์' },
  { value: 'เชลล์', label: 'เชลล์' },
]

const FUEL_PILLS: { value: FuelType; label: string }[] = [
  { value: 'diesel', label: 'ดีเซล' },
  { value: 'gas91', label: '91' },
  { value: 'gas95', label: '95' },
  { value: 'e20', label: 'E20' },
]

function Pill({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  dot?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95
        ${active
          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
    >
      {dot && !active && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {children}
    </button>
  )
}

export default function FilterBar({ status, brand, fuel, onStatus, onBrand, onFuel, stationCount }: FilterBarProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 py-1.5 space-y-1 shadow-sm">
      {/* Row 1: Status + Brand */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-2.5 items-center">
        {STATUS_PILLS.map(p => (
          <Pill key={p.value} active={status === p.value} onClick={() => onStatus(p.value)} dot={p.color}>
            {p.label}
          </Pill>
        ))}
        <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-0.5" />
        {BRAND_PILLS.map(p => (
          <Pill key={p.value} active={brand === p.value} onClick={() => onBrand(p.value)}>
            {p.label}
          </Pill>
        ))}
      </div>
      {/* Row 2: Fuel type + count */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-2.5 items-center">
        {FUEL_PILLS.map(p => (
          <Pill key={p.value} active={fuel === p.value} onClick={() => onFuel(fuel === p.value ? null : p.value)}>
            {p.label}
          </Pill>
        ))}
        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
          {stationCount} ปั๊ม
        </span>
      </div>
    </div>
  )
}
