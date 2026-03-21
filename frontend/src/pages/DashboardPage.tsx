import { useDashboard, usePrices } from '../hooks/useStations'
import TrendChart from '../components/TrendChart'
import PriceCard from '../components/PriceCard'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const { data, loading, error } = useDashboard()
  const prices = usePrices()

  const sourceTime = data?.updated_at
    ? new Date(data.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white/95 backdrop-blur-sm border-b border-gray-50 px-3 py-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">ภาพรวมน้ำมันจังหวัดลำพูน</span>
            <div className="text-[10px] text-gray-400">ข้อมูลจาก <a href="https://script.google.com/macros/s/AKfycbwoSjjJd-6VA9k9eLIOrr5OD8bzBRIAm6ZT8KZAmA1YqpgRTXmQlpWSsbSIUI7BG8wZ/exec" target="_blank" rel="noopener noreferrer" className="underline">FuelRadar</a></div>
          </div>
        </header>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-red-500">โหลดข้อมูลไม่ได้: {error}</p>
      </div>
    )
  }

  const { overall, by_district, by_brand, incoming_supply } = data
  const pct = overall.total > 0 ? Math.round(overall.with_fuel / overall.total * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header — same layout as MapPage */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-50 sticky top-0 z-10 px-3 py-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">ภาพรวมน้ำมันจังหวัดลำพูน</span>
          <div className="text-[10px] text-gray-400">
            ข้อมูลจาก <a href="https://script.google.com/macros/s/AKfycbwoSjjJd-6VA9k9eLIOrr5OD8bzBRIAm6ZT8KZAmA1YqpgRTXmQlpWSsbSIUI7BG8wZ/exec" target="_blank" rel="noopener noreferrer" className="underline">FuelRadar</a> {sourceTime && <span>· {sourceTime}</span>}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Overall summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{overall.with_fuel}</div>
              <div className="text-xs text-gray-500">มีน้ำมัน</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{overall.all_empty}</div>
              <div className="text-xs text-gray-500">หมด</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{pct}%</div>
              <div className="text-xs text-gray-500">Available</div>
            </div>
          </div>

          {overall.diesel_crisis && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 font-medium">
              วิกฤตดีเซล — มีเพียง {overall.diesel_count}/{overall.total} ปั๊ม
            </div>
          )}
        </div>

        {/* District breakdown */}
        {by_district?.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold mb-3">รายอำเภอ</h3>
            <div className="space-y-2">
              {by_district.map(d => {
                const pct = d.total_stations > 0
                  ? Math.round(d.with_fuel / d.total_stations * 100)
                  : 0
                return (
                  <div key={d.district} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{d.district}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-14 text-right">
                      {d.with_fuel}/{d.total_stations}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Brand breakdown */}
        {by_brand?.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold mb-3">รายแบรนด์</h3>
            <div className="space-y-2">
              {by_brand.map(b => (
                <div key={b.brand} className="flex items-center gap-3">
                  <span className="text-sm flex-1">{b.brand}</span>
                  <span className="text-xs tabular-nums text-gray-500">
                    {b.with_fuel}/{b.total} ({b.available_rate.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming supply */}
        {incoming_supply?.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold mb-3">
              น้ำมันกำลังมา ({incoming_supply.length} ปั๊ม)
            </h3>
            <div className="space-y-2">
              {incoming_supply.map(s => (
                <div key={s.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{s.brand} {s.name}</div>
                    <div className="text-xs text-gray-400">{s.district}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-yellow-700">{s.transport_status}</div>
                    {s.transport_eta && <div className="text-xs text-gray-400">{s.transport_eta}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trend chart */}
        {data.trend_7d && <TrendChart data={data.trend_7d} />}

        {/* Prices */}
        <PriceCard prices={prices} />
      </div>

      {/* Floating map button — fixed position */}
      <Link
        to="/"
        className="fixed bottom-14 right-3 z-50 bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center border border-gray-200 active:scale-90 transition"
        title="กลับแผนที่"
      >
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </Link>
    </div>
  )
}
