interface FuelBadgeProps {
  label: string
  value: string
  price?: number | null
}

export default function FuelBadge({ label, value, price }: FuelBadgeProps) {
  const config = {
    'มี': { dot: 'bg-green-500', text: 'text-green-700' },
    'หมด': { dot: 'bg-red-500', text: 'text-red-600' },
    '-': { dot: 'bg-gray-300', text: 'text-gray-400' },
  }[value] ?? { dot: 'bg-gray-300', text: 'text-gray-400' }

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={`text-sm font-semibold ${config.text}`}>{label}</span>
      {price != null && price > 0 && (
        <span className="text-[11px] text-gray-400 tabular-nums">฿{price.toFixed(2)}</span>
      )}
    </span>
  )
}
