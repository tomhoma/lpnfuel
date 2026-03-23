import type { FuelType } from '../types'

interface FilterBarProps {
  selectedFuel: FuelType | null
  onFuelSelect: (f: FuelType | null) => void
  stationCount: number
}

const FUEL_OPTIONS: { value: FuelType | null; label: string; color: string }[] = [
  { value: null, label: 'ทั้งหมด', color: 'bg-blue-600 border-blue-600' },
  { value: 'diesel', label: 'ดีเซล', color: 'bg-blue-500 border-blue-500' },
  { value: 'gas91', label: '91', color: 'bg-green-500 border-green-500' },
  { value: 'gas95', label: '95', color: 'bg-yellow-500 border-yellow-500' },
  { value: 'e20', label: 'E20', color: 'bg-purple-500 border-purple-500' },
]

export default function FilterBar({ selectedFuel, onFuelSelect, stationCount }: FilterBarProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm px-2.5 py-1">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {FUEL_OPTIONS.map(f => {
          const isActive = selectedFuel === f.value
          return (
            <button
              key={f.value ?? 'all'}
              onClick={() => onFuelSelect(f.value)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95
                ${isActive
                  ? `${f.color} text-white shadow-sm`
                  : 'bg-white border-gray-200 text-gray-600'
                }`}
            >
              {f.label}
            </button>
          )
        })}

        {/* Count */}
        <span className="text-xs text-gray-400 ml-auto flex-shrink-0 tabular-nums">
          {stationCount} ปั๊ม
        </span>
      </div>
    </div>
  )
}
