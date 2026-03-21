import { useState, useMemo, useCallback } from 'react'
import type { StationWithStatus, FuelType, FilterStatus, BrandFilter } from '../types'
import { useStations } from '../hooks/useStations'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversine } from '../hooks/useDistance'
import MapView from '../components/MapView'
import FilterBar from '../components/FilterBar'
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
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">กำลังโหลดข้อมูลปั๊ม...</p>
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

  return (
    <div className="h-screen flex flex-col">
      {/* Filter */}
      <FilterBar
        status={statusFilter}
        brand={brandFilter}
        fuel={fuelFilter}
        onStatus={setStatusFilter}
        onBrand={setBrandFilter}
        onFuel={setFuelFilter}
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

        {/* Locate me button */}
        <button
          onClick={geo.request}
          className="absolute bottom-20 right-3 z-[500] bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center border border-gray-200"
          title="ตำแหน่งของฉัน"
        >
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Stats bar */}
      <StatsBar summary={summary} lastUpdated={lastUpdated} />

      {/* Bottom sheet */}
      <BottomSheet station={selectedStation} onClose={() => setSelectedStation(null)} />
    </div>
  )
}
