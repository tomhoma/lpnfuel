import type { FilterStatus, BrandFilter } from '../types'

interface FilterBarProps {
  status: FilterStatus
  brand: BrandFilter
  onStatus: (s: FilterStatus) => void
  onBrand: (b: BrandFilter) => void
  stationCount: number
}

const STATUS_OPTIONS: { value: FilterStatus; label: string; dot?: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'available', label: 'มี', dot: 'bg-green-500' },
  { value: 'empty', label: 'หมด', dot: 'bg-red-500' },
  { value: 'incoming', label: 'กำลังส่ง', dot: 'bg-yellow-500' },
]

const BRAND_OPTIONS: { value: BrandFilter; label: string }[] = [
  { value: 'all', label: 'ทุกแบรนด์' },
  { value: 'ปตท.', label: 'ปตท.' },
  { value: 'บางจาก', label: 'บางจาก' },
  { value: 'พีที', label: 'พีที' },
  { value: 'คาลเท็กซ์', label: 'คาลเท็กซ์' },
  { value: 'เชลล์', label: 'เชลล์' },
]

export default function FilterBar({ status, brand, onStatus, onBrand, stationCount }: FilterBarProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {/* Status */}
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => onStatus(s.value)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95
              ${status === s.value
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600'
              }`}
          >
            {s.dot && status !== s.value && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
            {s.label}
          </button>
        ))}



        {/* Count */}
        <span className="text-sm text-gray-400 ml-auto flex-shrink-0 tabular-nums">
          {stationCount} ปั๊ม
        </span>
      </div>
    </div>
  )
}
