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
const LAMPHUN_CENTER: [number, number] = [18.10, 98.96]
const LAMPHUN_BOUNDS = L.latLngBounds(
  L.latLng(17.40, 98.55),  // SW corner - ขยายลงใต้เพื่อให้แผนที่เลื่อนขึ้นได้
  L.latLng(18.75, 99.35),  // NE corner
)
const MIN_ZOOM = 9
const MAX_ZOOM = 16
const DEFAULT_ZOOM = 10

// District colors (light, distinct)
const DISTRICT_COLORS: Record<string, string> = {
  'เมืองลำพูน': '#3B82F6',
  'แม่ทา': '#2d2e2aff',
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
  const prevCount = useRef(stations.length)
  const hasInitialFit = useRef(false)

  useEffect(() => {
    const points = stations.filter(s => s.lat != null && s.lng != null)
    if (points.length === 0) return

    const bounds = L.latLngBounds(points.map(s => L.latLng(s.lat!, s.lng!)))
    // paddingTopLeft: [left, top], paddingBottomRight: [right, bottom]
    const fitOpts = {
      paddingTopLeft: [80, 20] as [number, number],    // ซ้ายเผื่อปุ่มน้ำมัน
      paddingBottomRight: [20, 100] as [number, number], // ล่างเผื่อ stats bar
    }

    if (!hasInitialFit.current) {
      // Initial: zoom out ให้เห็นทั้งจังหวัด
      map.fitBounds(bounds, { ...fitOpts, maxZoom: DEFAULT_ZOOM })
      hasInitialFit.current = true
      prevCount.current = stations.length
      return
    }

    if (stations.length !== prevCount.current) {
      // Filter เปลี่ยน: zoom เข้าหาปั๊มที่เหลือ
      map.flyToBounds(bounds, { ...fitOpts, maxZoom: 13, duration: 0.5 })
      prevCount.current = stations.length
    }
  }, [stations, map])

  return null
}

function DistrictOverlay() {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null)

  useEffect(() => {
    fetch('/lamphun-districts.geojson')
      .then(r => r.json())
      .then(data => setGeoData(data))
      .catch(() => { })
  }, [])

  if (!geoData) return null

  // สร้าง mask: สี่เหลี่ยมครอบโลก เจาะรูตรงลำพูน
  const worldRing: [number, number][] = [
    [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
  ]
  const holes: [number, number][][] = []
  geoData.features.forEach(f => {
    const g = f.geometry
    if (g.type === 'Polygon') {
      holes.push(g.coordinates[0] as [number, number][])
    } else if (g.type === 'MultiPolygon') {
      g.coordinates.forEach(poly => holes.push(poly[0] as [number, number][]))
    }
  })

  const maskGeoJson: GeoJSON.Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [worldRing, ...holes],
    },
  }

  return (
    <>
      {/* Mask นอกลำพูน */}
      <GeoJSON
        data={maskGeoJson}
        interactive={false}
        style={{
          color: 'transparent',
          weight: 0,
          fillColor: '#e5e7eb',
          fillOpacity: 0.45,
        }}
      />
      {/* เส้นขอบอำเภอ */}
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
            fillColor: 'transparent',
            fillOpacity: 0,
            dashArray: '4 4',
          }
        }}
      />
    </>
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
