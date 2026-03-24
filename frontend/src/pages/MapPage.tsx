import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { StationWithStatus, FuelType, FilterStatus, BrandFilter } from '../types'
import { useStations, usePrices } from '../hooks/useStations'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversine } from '../hooks/useDistance'
import MapView from '../components/MapView'
import FilterBar from '../components/FilterBar'
import StatsBar from '../components/StatsBar'
import BottomSheet from '../components/BottomSheet'
import SurveyPopup from '../components/SurveyPopup'

function hasFuel(s: StationWithStatus): boolean {
  return s.gas95 === 'มี' || s.gas91 === 'มี' || s.e20 === 'มี' || s.diesel === 'มี'
}

function getFuelValue(s: StationWithStatus, fuel: FuelType): string {
  switch (fuel) {
    case 'gas95': return s.gas95
    case 'gas91': return s.gas91
    case 'e20': return s.e20
    case 'diesel': return s.diesel
  }
}

export default function MapPage() {
  const { data, loading, error, lastUpdated, dataVersion, justRefreshed } = useStations()
  const prices = usePrices()
  const geo = useGeolocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [splashDone, setSplashDone] = useState(false)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all')
  const [fuelFilter, setFuelFilter] = useState<FuelType | null>(null)
  const [districtFilter, setDistrictFilter] = useState<string | null>(null)
  const [selectedStation, setSelectedStation] = useState<StationWithStatus | null>(null)

  // Read district from URL params (e.g. /?district=เมืองลำพูน)
  useEffect(() => {
    const d = searchParams.get('district')
    if (d) {
      setDistrictFilter(d)
      searchParams.delete('district')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const filteredStations = useMemo(() => {
    if (!data?.stations) return []

    let stations = data.stations

    // Add distance if user location available
    if (geo.lat != null && geo.lng != null) {
      stations = stations.map(s => {
        if (s.lat == null || s.lng == null) return s
        return { ...s, distance_km: haversine(geo.lat!, geo.lng!, s.lat, s.lng) }
      })
    }

    return stations.filter(s => {
      // District filter
      if (districtFilter && s.district !== districtFilter) return false

      // Brand filter
      if (brandFilter !== 'all' && s.brand !== brandFilter) return false

      // Status filter
      if (statusFilter === 'available' && !hasFuel(s)) return false
      if (statusFilter === 'empty' && hasFuel(s)) return false
      if (statusFilter === 'incoming' && s.transport_status !== 'กำลังจัดส่ง' && s.transport_status !== 'กำลังลงน้ำมัน') return false

      // Fuel filter
      if (fuelFilter && getFuelValue(s, fuelFilter) !== 'มี') return false

      return true
    })
  }, [data, statusFilter, brandFilter, fuelFilter, districtFilter, geo.lat, geo.lng])

  const handleStationClick = useCallback((station: StationWithStatus) => {
    setSelectedStation(station)
  }, [])

  if (loading || !splashDone) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-center animate-fadeIn">
          <img src="/logo.png" alt="LPN Fuel" className="w-48 mx-auto mb-6 drop-shadow-xl object-contain" />
          <div className="w-6 h-6 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-dvh flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">โหลดข้อมูลไม่ได้</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }

  const summary = data?.summary ?? { total: 0, with_fuel: 0, all_empty: 0, diesel_crisis: false, diesel_count: 0 }

  const sourceTime = data?.updated_at
    ? new Date(data.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="h-dvh flex flex-col">
      {/* App header */}
      <div className="bg-white/95 backdrop-blur-sm flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] border-b border-gray-50">
        <div className="flex items-center gap-2 py-1">
          <span className="text-base font-bold text-gray-800">ค้นหาน้ำมันในลำพูน</span>
        </div>
        <div className="text-xs text-gray-400">
          ข้อมูลจาก <a href="https://script.google.com/macros/s/AKfycbwoSjjJd-6VA9k9eLIOrr5OD8bzBRIAm6ZT8KZAmA1YqpgRTXmQlpWSsbSIUI7BG8wZ/exec" target="_blank" rel="noopener noreferrer" className="underline">FuelRadar</a> {sourceTime && <span className={`inline-flex items-center gap-1 transition-colors duration-700 ${justRefreshed ? 'text-green-500' : ''}`}><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>{justRefreshed ? 'อัพเดทแล้ว' : sourceTime}</span>}
        </div>
      </div>

      {/* Filter */}
      <FilterBar
        selectedFuel={fuelFilter}
        onFuelSelect={setFuelFilter}
        stationCount={filteredStations.length}
      />

      {/* District filter badge */}
      {districtFilter && (
        <div className="bg-blue-50 border-b border-blue-100 px-3 py-1 flex items-center justify-between">
          <span className="text-sm text-blue-700">อ.{districtFilter}</span>
          <button onClick={() => setDistrictFilter(null)} className="text-sm text-blue-500 active:scale-95 min-h-[44px] flex items-center">
            ดูทั้งหมด &times;
          </button>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          stations={filteredStations}
          selectedFuel={fuelFilter}
          onStationClick={handleStationClick}
          userLat={geo.lat}
          userLng={geo.lng}
          dataVersion={dataVersion}
          locateTrigger={geo.requestCount}
        />

        {/* Locate me — top right */}
        <div className="absolute top-3 right-3 z-[500]">
          <button
            onClick={geo.request}
            className="bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center border border-gray-200 active:scale-90 transition"
            title="ตำแหน่งของฉัน"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2" />
            </svg>
          </button>
        </div>

        {/* Floating stats overlay */}
        <StatsBar summary={summary} stations={data?.stations || []} prices={prices} />
      </div>

      {/* Bottom sheet */}
      <BottomSheet station={selectedStation} onClose={() => setSelectedStation(null)} prices={prices} />

      {/* Survey popup — shows once after splash */}
      <SurveyPopup />
    </div>
  )
}
