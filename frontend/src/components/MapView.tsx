import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { StationWithStatus, FuelType } from '../types'
import 'leaflet/dist/leaflet.css'

interface MapViewProps {
  stations: StationWithStatus[]
  selectedFuel: FuelType | null
  onStationClick: (station: StationWithStatus) => void
  userLat?: number | null
  userLng?: number | null
}

const CENTER: [number, number] = [18.35, 98.92]
const ZOOM = 10

function getMarkerColor(station: StationWithStatus, fuel: FuelType | null): string {
  if (station.transport_status === 'กำลังจัดส่ง' || station.transport_status === 'กำลังลงน้ำมัน') {
    return '#CA8A04' // incoming yellow
  }

  const hasFuel = fuel
    ? getFuelValue(station, fuel) === 'มี'
    : station.gas95 === 'มี' || station.gas91 === 'มี' || station.e20 === 'มี' || station.diesel === 'มี'

  return hasFuel ? '#16A34A' : '#DC2626'
}

function getFuelValue(s: StationWithStatus, fuel: FuelType): string {
  switch (fuel) {
    case 'gas95': return s.gas95
    case 'gas91': return s.gas91
    case 'e20': return s.e20
    case 'diesel': return s.diesel
  }
}

function UserLocationMarker({ lat, lng }: { lat: number; lng: number }) {
  return (
    <CircleMarker
      center={[lat, lng]}
      radius={8}
      pathOptions={{
        color: '#2563EB',
        fillColor: '#3B82F6',
        fillOpacity: 1,
        weight: 3,
      }}
    >
      <Popup>ตำแหน่งของคุณ</Popup>
    </CircleMarker>
  )
}

function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useMemo(() => {
    map.flyTo([lat, lng], 13, { duration: 1 })
  }, [map, lat, lng])
  return null
}

export default function MapView({ stations, selectedFuel, onStationClick, userLat, userLng }: MapViewProps) {
  return (
    <MapContainer
      center={CENTER}
      zoom={ZOOM}
      className="w-full h-full z-0"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />

      {stations.map((s) => {
        if (s.lat == null || s.lng == null) return null
        const color = getMarkerColor(s, selectedFuel)
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={9}
            pathOptions={{
              color: '#fff',
              fillColor: color,
              fillOpacity: 0.9,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onStationClick(s),
            }}
          >
            <Popup>
              <div className="text-sm font-sans">
                <strong>{s.brand}</strong> {s.name}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {userLat != null && userLng != null && (
        <>
          <UserLocationMarker lat={userLat} lng={userLng} />
          <FlyToUser lat={userLat} lng={userLng} />
        </>
      )}
    </MapContainer>
  )
}
