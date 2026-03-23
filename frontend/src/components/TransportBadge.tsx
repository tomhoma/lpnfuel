interface TransportBadgeProps {
  status: string
  eta?: string
}

export default function TransportBadge({ status, eta }: TransportBadgeProps) {
  if (!status) return null

  const config = {
    'ล่าช้า': { text: 'text-red-600', icon: '⚠️' },
    'กำลังจัดส่ง': { text: 'text-yellow-700', icon: '🚚' },
    'กำลังลงน้ำมัน': { text: 'text-green-700', icon: '⛽' },
  }[status] ?? { text: 'text-gray-600', icon: 'ℹ️' }

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${config.text}`}>
      <span className="text-xs">{config.icon}</span>
      {status}
      {eta && <span className="text-gray-400 font-normal">({eta})</span>}
    </span>
  )
}
