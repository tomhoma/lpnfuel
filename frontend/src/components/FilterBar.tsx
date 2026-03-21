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
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95
              ${status === s.value
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600'
              }`}
          >
            {s.dot && status !== s.value && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
            {s.label}
          </button>
        ))}

        <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-0.5" />

        {/* Brand */}
        <select
          value={brand}
          onChange={e => onBrand(e.target.value as BrandFilter)}
          className="flex-shrink-0 text-xs font-medium border border-gray-200 rounded-full px-2.5 py-1 bg-white text-gray-600 appearance-none pr-6 bg-no-repeat bg-[right_6px_center] bg-[length:12px]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239CA3AF'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'/%3E%3C/svg%3E")` }}
        >
          {BRAND_OPTIONS.map(b => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>

        {/* Count */}
        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0 tabular-nums">
          {stationCount} ปั๊ม
        </span>
      </div>
    </div>
  )
}
