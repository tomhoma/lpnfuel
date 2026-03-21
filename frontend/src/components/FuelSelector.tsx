import type { FuelType } from '../types'

interface FuelSelectorProps {
  selected: FuelType | null
  onSelect: (f: FuelType | null) => void
}

const FUELS: { value: FuelType; label: string; color: string; activeColor: string }[] = [
  { value: 'diesel', label: 'ดีเซล', color: 'bg-blue-100 text-blue-700 border-blue-200', activeColor: 'bg-blue-600 text-white border-blue-600' },
  { value: 'gas91', label: '91', color: 'bg-green-100 text-green-700 border-green-200', activeColor: 'bg-green-600 text-white border-green-600' },
  { value: 'gas95', label: '95', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', activeColor: 'bg-yellow-500 text-white border-yellow-500' },
  { value: 'e20', label: 'E20', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
]

export default function FuelSelector({ selected, onSelect }: FuelSelectorProps) {
  return (
    <div className="absolute top-3 left-3 z-[500] flex flex-col gap-2">
      {FUELS.map(f => (
        <button
          key={f.value}
          onClick={() => onSelect(selected === f.value ? null : f.value)}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold border shadow-lg active:scale-90 transition-all
            ${selected === f.value ? f.activeColor : f.color}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
