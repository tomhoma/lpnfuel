interface FuelBadgeProps {
  label: string
  value: string
}

export default function FuelBadge({ label, value }: FuelBadgeProps) {
  const config = {
    'มี': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', status: 'มี' },
    'หมด': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', status: 'หมด' },
    '-': { bg: 'bg-gray-100', text: 'text-gray-400', dot: 'bg-gray-300', status: 'ไม่มีขาย' },
  }[value] ?? { bg: 'bg-gray-100', text: 'text-gray-400', dot: 'bg-gray-300', status: '-' }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${config.bg}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-xs font-semibold ${config.text}`}>{config.status}</div>
      </div>
    </div>
  )
}
