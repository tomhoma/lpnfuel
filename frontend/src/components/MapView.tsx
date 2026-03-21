import { useMemo, useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON, useMap } from 'react-leaflet'
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
const LAMPHUN_CENTER: [number, number] = [18.135286, 98.962983]
const LAMPHUN_BOUNDS = L.latLngBounds(
  L.latLng(17.70, 98.55),  // SW corner
  L.latLng(18.75, 99.35),  // NE corner
)
const MIN_ZOOM = 9
const MAX_ZOOM = 16
const DEFAULT_ZOOM = 11

// District colors (light, distinct)
const DISTRICT_COLORS: Record<string, string> = {
  'เมืองลำพูน': '#3B82F6',
  'แม่ทา': '#10B981',
  'บ้านโฮ่ง': '#F59E0B',
  'ลี้': '#8B5CF6',
  'ทุ่งหัวช้าง': '#EF4444',
  'ป่าซาง': '#EC4899',
  'บ้านธิ': '#06B6D4',
  'เวียงหนองล่อง': '#F97316',
}

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

interface FuelItem {
  label: string
  available: boolean
}

function getFuelItems(s: StationWithStatus): FuelItem[] {
  return [
    { label: 'ดีเซล', available: s.diesel === 'มี' },
    { label: '91', available: s.gas91 === 'มี' },
    { label: '95', available: s.gas95 === 'มี' },
    { label: 'E20', available: s.e20 === 'มี' },
  ]
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

function FitBounds({ stations }: { stations: StationWithStatus[] }) {
  const map = useMap()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip the initial render — only fit when filter changes
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const points = stations.filter(s => s.lat != null && s.lng != null)
    if (points.length === 0) return

    const bounds = L.latLngBounds(points.map(s => L.latLng(s.lat!, s.lng!)))
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 0.5 })
  }, [stations, map])

  return null
}

function DistrictOverlay() {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null)

  useEffect(() => {
    fetch('/lamphun-districts.geojson')
      .then(r => r.json())
      .then(data => setGeoData(data))
      .catch(() => {})
  }, [])

  if (!geoData) return null

  return (
    <GeoJSON
      data={geoData}
      interactive={false}
      style={(feature) => {
        const name = feature?.properties?.short_name || ''
        const color = DISTRICT_COLORS[name] || '#6B7280'
        return {
          color: color,
          weight: 1.5,
          opacity: 0.6,
          fillColor: color,
          fillOpacity: 0.06,
          dashArray: '4 4',
        }
      }}
    />
  )
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

      {/* Auto-fit to filtered stations */}
      <FitBounds stations={stations} />

      {/* District boundaries */}
      <DistrictOverlay />

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
              <div style={{ fontWeight: 600 }}>{s.brand} {s.name}</div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                {getFuelItems(s).map(f => (
                  <span
                    key={f.label}
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 500,
                      backgroundColor: f.available ? '#DCFCE7' : '#FEE2E2',
                      color: f.available ? '#166534' : '#991B1B',
                      border: `1px solid ${f.available ? '#BBF7D0' : '#FECACA'}`,
                    }}
                  >
                    {f.label}
                  </span>
                ))}
              </div>
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
