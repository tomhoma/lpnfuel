import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { StationWithStatus, FuelType, FilterStatus, BrandFilter } from '../types'
import { useStations } from '../hooks/useStations'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversine } from '../hooks/useDistance'
import MapView from '../components/MapView'
import FilterBar from '../components/FilterBar'
import FuelSelector from '../components/FuelSelector'
import StatsBar from '../components/StatsBar'
import BottomSheet from '../components/BottomSheet'

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
  const { data, loading, error, lastUpdated } = useStations()
  const geo = useGeolocation()

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all')
  const [fuelFilter, setFuelFilter] = useState<FuelType | null>(null)
  const [selectedStation, setSelectedStation] = useState<StationWithStatus | null>(null)

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
  }, [data, statusFilter, brandFilter, fuelFilter, geo.lat, geo.lng])

  const handleStationClick = useCallback((station: StationWithStatus) => {
    setSelectedStation(station)
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-center animate-fadeIn">
          {/* Fuel pump icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11l4.553-2.276A1 1 0 0121 9.618v6.764a1 1 0 01-1.447.894L15 15M3 6h8a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">LPN Fuel</h1>
          <p className="text-sm text-gray-400 mb-6">สถานะน้ำมันจังหวัดลำพูน</p>
          <div className="w-6 h-6 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
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
    <div className="h-screen flex flex-col">
      {/* App header */}
      <div className="bg-white/95 backdrop-blur-sm flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] border-b border-gray-50">
        <div className="flex items-center gap-1.5 py-1">
          <span className="text-sm font-bold text-gray-800">LPN Fuel</span>
          <span className="text-[10px] text-gray-400">ลำพูน</span>
        </div>
        <div className="text-[10px] text-gray-400">
          ข้อมูลจาก <a href="https://script.google.com/macros/s/AKfycbwoSjjJd-6VA9k9eLIOrr5OD8bzBRIAm6ZT8KZAmA1YqpgRTXmQlpWSsbSIUI7BG8wZ/exec" target="_blank" rel="noopener noreferrer" className="underline">FuelRadar</a> {sourceTime && <span>· {sourceTime}</span>}
        </div>
      </div>

      {/* Filter */}
      <FilterBar
        status={statusFilter}
        brand={brandFilter}
        onStatus={setStatusFilter}
        onBrand={setBrandFilter}
        stationCount={filteredStations.length}
      />

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          stations={filteredStations}
          selectedFuel={fuelFilter}
          onStationClick={handleStationClick}
          userLat={geo.lat}
          userLng={geo.lng}
        />

        {/* Fuel type selector - top left */}
        <FuelSelector selected={fuelFilter} onSelect={setFuelFilter} />

        {/* Floating stats overlay */}
        <StatsBar summary={summary} />

        {/* Right-side floating buttons */}
        <div className="absolute bottom-14 right-3 z-[500] flex flex-col gap-2">
          {/* Locate me */}
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
          {/* Dashboard */}
          <Link
            to="/dashboard"
            className="bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center border border-gray-200 active:scale-90 transition"
            title="Dashboard"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Bottom sheet */}
      <BottomSheet station={selectedStation} onClose={() => setSelectedStation(null)} />
    </div>
  )
}
