import { useMemo, useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { StationWithStatus, FuelType } from '../types'
import 'leaflet/dist/leaflet.css'

interface MapViewProps {
  stations: StationWithStatus[]
  selectedFuel: FuelType | null
  onStationClick: (station: StationWithStatus) => void
  userLat?: number | null
  userLng?: number | null
}

// Lamphun province bounds — lock map to this area
const LAMPHUN_CENTER: [number, number] = [18.45, 98.98]
const LAMPHUN_BOUNDS = L.latLngBounds(
  L.latLng(17.70, 98.55),  // SW corner
  L.latLng(18.75, 99.35),  // NE corner
)
const MIN_ZOOM = 9
const MAX_ZOOM = 16
const DEFAULT_ZOOM = 11

function getMarkerColor(station: StationWithStatus, fuel: FuelType | null): string {
  if (station.transport_status === 'กำลังจัดส่ง' || station.transport_status === 'กำลังลงน้ำมัน') {
    return '#CA8A04'
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

function fuelSummary(s: StationWithStatus): string {
  const items: string[] = []
  if (s.diesel === 'มี') items.push('ดีเซล')
  if (s.gas91 === 'มี') items.push('91')
  if (s.gas95 === 'มี') items.push('95')
  if (s.e20 === 'มี') items.push('E20')
  return items.length > 0 ? items.join(' ') : 'หมด'
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
      <Tooltip permanent className="user-tooltip">คุณอยู่ที่นี่</Tooltip>
    </CircleMarker>
  )
}

function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const [hasMoved, setHasMoved] = useState(false)
  useEffect(() => {
    if (!hasMoved) {
      map.flyTo([lat, lng], 13, { duration: 1 })
      setHasMoved(true)
    }
  }, [map, lat, lng, hasMoved])
  return null
}

export default function MapView({ stations, selectedFuel, onStationClick, userLat, userLng }: MapViewProps) {
  const markerSize = useMemo(() => {
    return window.innerWidth < 640 ? 11 : 9
  }, [])

  return (
    <MapContainer
      center={LAMPHUN_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={LAMPHUN_BOUNDS}
      maxBoundsViscosity={1.0}
      className="w-full h-full z-0"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OSM'
      />

      {stations.map((s) => {
        if (s.lat == null || s.lng == null) return null
        const color = getMarkerColor(s, selectedFuel)
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={markerSize}
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
            <Tooltip direction="top" offset={[0, -8]} className="station-tooltip">
              <span className="font-semibold">{s.brand}</span> {s.name}
              <br />
              <span className="text-xs">{fuelSummary(s)}</span>
            </Tooltip>
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
