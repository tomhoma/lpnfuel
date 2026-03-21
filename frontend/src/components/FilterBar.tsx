import type { FuelType, FilterStatus, BrandFilter } from '../types'

interface FilterBarProps {
  status: FilterStatus
  brand: BrandFilter
  fuel: FuelType | null
  onStatus: (s: FilterStatus) => void
  onBrand: (b: BrandFilter) => void
  onFuel: (f: FuelType | null) => void
}

const STATUS_PILLS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'available', label: 'มีน้ำมัน' },
  { value: 'empty', label: 'หมด' },
  { value: 'incoming', label: 'กำลังส่ง' },
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
  { value: 'gas91', label: 'แก๊ส 91' },
  { value: 'gas95', label: 'เบนซิน 95' },
  { value: 'e20', label: 'E20' },
]

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors
        ${active
          ? 'bg-primary-light border-primary text-primary font-semibold'
          : 'bg-white border-gray-200 text-gray-600'
        }`}
    >
      {children}
    </button>
  )
}

export default function FilterBar({ status, brand, fuel, onStatus, onBrand, onFuel }: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-100 py-2 space-y-1.5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3">
        {STATUS_PILLS.map(p => (
          <Pill key={p.value} active={status === p.value} onClick={() => onStatus(p.value)}>
            {p.label}
          </Pill>
        ))}
        <div className="w-px bg-gray-200 flex-shrink-0 self-stretch my-0.5" />
        {BRAND_PILLS.map(p => (
          <Pill key={p.value} active={brand === p.value} onClick={() => onBrand(p.value)}>
            {p.label}
          </Pill>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3">
        {FUEL_PILLS.map(p => (
          <Pill key={p.value} active={fuel === p.value} onClick={() => onFuel(fuel === p.value ? null : p.value)}>
            {p.label}
          </Pill>
        ))}
      </div>
    </div>
  )
}
