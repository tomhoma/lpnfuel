import { useDashboard, usePrices } from '../hooks/useStations'
import TrendChart from '../components/TrendChart'
import PriceCard from '../components/PriceCard'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const { data, loading, error } = useDashboard()
  const prices = usePrices()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold">Dashboard</h1>
          <p className="text-xs text-gray-400">ภาพรวมน้ำมันลำพูน</p>
        </div>
        <Link to="/" className="text-sm text-primary font-medium">
          กลับแผนที่
        </Link>
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
              ⚠️ วิกฤตดีเซล — มีเพียง {overall.diesel_count}/{overall.total} ปั๊ม
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
              🚚 น้ำมันกำลังมา ({incoming_supply.length} ปั๊ม)
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
    </div>
  )
}
