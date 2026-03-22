import type { FuelType } from '../types'

interface FuelSelectorProps {
  selected: FuelType | null
  onSelect: (f: FuelType | null) => void
}

const FUELS: { value: FuelType; label: string; color: string; activeColor: string }[] = [
  { value: 'diesel', label: 'ดีเซล', color: 'bg-white text-blue-700 border-blue-400', activeColor: 'bg-blue-600 text-white border-blue-600' },
  { value: 'gas91', label: '91', color: 'bg-white text-green-700 border-green-400', activeColor: 'bg-green-600 text-white border-green-600' },
  { value: 'gas95', label: '95', color: 'bg-white text-yellow-700 border-yellow-400', activeColor: 'bg-yellow-500 text-white border-yellow-500' },
  { value: 'e20', label: 'E20', color: 'bg-white text-purple-700 border-purple-400', activeColor: 'bg-purple-600 text-white border-purple-600' },
]

export default function FuelSelector({ selected, onSelect }: FuelSelectorProps) {
  return (
    <div className="absolute top-3 left-3 z-[500] flex flex-col gap-2">
      {FUELS.map(f => (
        <button
          key={f.value}
          onClick={() => onSelect(selected === f.value ? null : f.value)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold border-2 shadow-lg active:scale-90 transition-all
            ${selected === f.value ? f.activeColor : f.color}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
