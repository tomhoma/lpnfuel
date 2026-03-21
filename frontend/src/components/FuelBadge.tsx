interface FuelBadgeProps {
  label: string
  value: string
}

export default function FuelBadge({ label, value }: FuelBadgeProps) {
  const config = {
    'มี': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', status: 'มี' },
    'หมด': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', status: 'หมด' },
    '-': { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', status: '-' },
  }[value] ?? { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', status: '-' }

  return (
    <div className={`flex flex-col items-center py-1.5 px-1 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="text-[10px] text-gray-500 leading-tight">{label}</div>
      <div className={`text-sm font-bold leading-tight ${config.text}`}>{config.status}</div>
    </div>
  )
}
