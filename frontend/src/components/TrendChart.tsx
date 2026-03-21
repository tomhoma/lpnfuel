import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { TrendData } from '../types'

interface TrendChartProps {
  data: TrendData
}

export default function TrendChart({ data }: TrendChartProps) {
  if (!data.diesel?.length) {
    return <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีข้อมูลแนวโน้ม</p>
  }

  // Merge all fuel types into one dataset keyed by date
  const merged = data.diesel.map((d, i) => ({
    date: d.date.slice(5), // show MM-DD HH:mm
    diesel: d.percent,
    gas91: data.gas91?.[i]?.percent ?? 0,
    gas95: data.gas95?.[i]?.percent ?? 0,
    e20: data.e20?.[i]?.percent ?? 0,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold mb-3">แนวโน้ม 7 วัน (% ปั๊มที่มี)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={merged}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(0)}%`]}
            labelFormatter={(label) => `เวลา: ${label}`}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="diesel" stroke="#CA8A04" name="ดีเซล" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="gas91" stroke="#16A34A" name="แก๊ส 91" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="gas95" stroke="#2563EB" name="เบนซิน 95" dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="e20" stroke="#9333EA" name="E20" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
