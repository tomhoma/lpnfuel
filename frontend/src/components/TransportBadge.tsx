interface TransportBadgeProps {
  status: string
  eta?: string
}

export default function TransportBadge({ status, eta }: TransportBadgeProps) {
  if (!status) return null

  const config = {
    'ล่าช้า': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: '⚠️' },
    'กำลังจัดส่ง': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: '🚚' },
    'กำลังลงน้ำมัน': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '⛽' },
  }[status] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: 'ℹ️' }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border}`}>
      <span>{config.icon}</span>
      <div>
        <div className={`text-sm font-semibold ${config.text}`}>{status}</div>
        {eta && <div className="text-xs text-gray-500">{eta}</div>}
      </div>
    </div>
  )
}
