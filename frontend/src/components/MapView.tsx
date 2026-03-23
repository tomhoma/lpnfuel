import { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { StationWithStatus, FuelType } from '../types'
import 'leaflet/dist/leaflet.css'

// Brand logo mapping
const BRAND_LOGO: Record<string, string> = {
  'ปตท.': '/logos/ptt.png',
  'พีที': '/logos/pt.png',
  'บางจาก': '/logos/bangchak.png',
  'คาลเท็กซ์': '/logos/caltex.png',
  'เชลล์': '/logos/shell.png',
}

// Create custom icon with logo + status border
const iconCache = new Map<string, L.DivIcon>()

function getBrandIcon(brand: string, statusColor: string, size: number): L.DivIcon {
  const key = `${brand}-${statusColor}-${size}`
  if (iconCache.has(key)) return iconCache.get(key)!

  const logo = BRAND_LOGO[brand] || '/logos/ptt.png'
  const borderWidth = 4
  const totalSize = size + borderWidth * 2

  const icon = L.divIcon({
    className: 'brand-marker',
    iconSize: [totalSize, totalSize],
    iconAnchor: [totalSize / 2, totalSize / 2],
    tooltipAnchor: [0, -totalSize / 2],
    html: `<div style="
      width:${totalSize}px;height:${totalSize}px;
      border-radius:50%;
      border:${borderWidth}px solid ${statusColor};
      background:#fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;
    "><img src="${logo}" style="width:${size - 2}px;height:${size - 2}px;object-fit:contain;border-radius:50%;" /></div>`,
  })

  iconCache.set(key, icon)
  return icon
}

interface MapViewProps {
  stations: StationWithStatus[]
  selectedFuel: FuelType | null
  onStationClick: (station: StationWithStatus) => void
  userLat?: number | null
  userLng?: number | null
  dataVersion: number
  locateTrigger?: number
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

const MIN_VISIBLE = 3

/** หา bounds ที่ครอบอย่างน้อย N ปั๊มที่ใกล้ center มากสุด + รวม center ด้วย */
function boundsAroundCenter(center: L.LatLng, points: StationWithStatus[], n: number, fitOpts: L.FitBoundsOptions) {
  const sorted = [...points].sort((a, b) =>
    center.distanceTo(L.latLng(a.lat!, a.lng!)) - center.distanceTo(L.latLng(b.lat!, b.lng!))
  )
  const nearest = sorted.slice(0, Math.min(n, sorted.length))
  const latlngs: L.LatLng[] = nearest.map(s => L.latLng(s.lat!, s.lng!))
  latlngs.push(center) // รวม user/center ไว้ใน bounds ด้วย
  return L.latLngBounds(latlngs)
}

function FlyToUser({ lat, lng, stations, locateTrigger }: { lat: number; lng: number; stations: StationWithStatus[]; locateTrigger?: number }) {
  const map = useMap()
  const hasInitial = useRef(false)
  const prevTrigger = useRef(locateTrigger ?? 0)

  const flyToUser = useCallback(() => {
    const userLatLng = L.latLng(lat, lng)
    const points = stations.filter(s => s.lat != null && s.lng != null)
    const fitOpts = {
      paddingTopLeft: [80, 20] as [number, number],
      paddingBottomRight: [20, 100] as [number, number],
    }

    if (points.length >= MIN_VISIBLE) {
      const nearBounds = boundsAroundCenter(userLatLng, points, MIN_VISIBLE, fitOpts)
      map.flyToBounds(nearBounds, { ...fitOpts, maxZoom: 14, duration: 1 })
    } else {
      map.flyTo([lat, lng], 13, { duration: 1 })
    }
  }, [map, lat, lng, stations])

  // Initial fly on first render
  useEffect(() => {
    if (hasInitial.current) return
    flyToUser()
    hasInitial.current = true
  }, [flyToUser])

  // Re-fly when user clicks locate button (trigger changes)
  useEffect(() => {
    const trigger = locateTrigger ?? 0
    if (trigger !== prevTrigger.current) {
      prevTrigger.current = trigger
      flyToUser()
    }
  }, [locateTrigger, flyToUser])

  return null
}

function FitBounds({ stations, userLat, userLng, dataVersion }: { stations: StationWithStatus[]; userLat?: number | null; userLng?: number | null; dataVersion: number }) {
  const map = useMap()
  const prevCount = useRef(stations.length)
  const prevDataVersion = useRef(dataVersion)
  const hasInitialFit = useRef(false)

  useEffect(() => {
    const points = stations.filter(s => s.lat != null && s.lng != null)
    if (points.length === 0) return

    const bounds = L.latLngBounds(points.map(s => L.latLng(s.lat!, s.lng!)))
    const fitOpts = {
      paddingTopLeft: [80, 20] as [number, number],
      paddingBottomRight: [20, 100] as [number, number],
    }

    if (!hasInitialFit.current) {
      map.fitBounds(bounds, { ...fitOpts, maxZoom: DEFAULT_ZOOM })
      hasInitialFit.current = true
      prevCount.current = stations.length
      prevDataVersion.current = dataVersion
      return
    }

    // Background data refresh → อัพเดท count เฉยๆ ไม่ zoom
    if (dataVersion !== prevDataVersion.current) {
      prevDataVersion.current = dataVersion
      prevCount.current = stations.length
      return
    }

    // Filter เปลี่ยน (user action) → zoom ถ้าจำเป็น
    if (stations.length !== prevCount.current) {
      const currentBounds = map.getBounds()
      const visibleStations = points.filter(s => currentBounds.contains(L.latLng(s.lat!, s.lng!)))

      if (visibleStations.length < MIN_VISIBLE) {
        const center = (userLat != null && userLng != null)
          ? L.latLng(userLat, userLng)
          : map.getCenter()
        const nearBounds = boundsAroundCenter(center, points, MIN_VISIBLE, fitOpts)
        map.flyToBounds(nearBounds, { ...fitOpts, maxZoom: 14, duration: 0.5 })
      }

      prevCount.current = stations.length
    }
  }, [stations, map, userLat, userLng, dataVersion])

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

  const maskGeoJson = useMemo(() => {
    if (!geoData) return null
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
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [worldRing, ...holes],
      },
    }
  }, [geoData])

  if (!maskGeoJson || !geoData) return null

  return (
    <>
      {/* Mask นอกลำพูน */}
      <GeoJSON
        key="mask"
        data={maskGeoJson}
        interactive={false}
        style={{
          color: 'transparent',
          weight: 0,
          fillColor: '#000000',
          fillOpacity: 0.1,
        }}
      />
      {/* เส้นขอบอำเภอ */}
      <GeoJSON
        key="districts"
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

export default function MapView({ stations, selectedFuel, onStationClick, userLat, userLng, dataVersion, locateTrigger }: MapViewProps) {
  const markerSize = useMemo(() => {
    return window.innerWidth < 640 ? 28 : 24
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
      <FitBounds stations={stations} userLat={userLat} userLng={userLng} dataVersion={dataVersion} />

      {/* District boundaries */}
      <DistrictOverlay />

      {stations.map((s) => {
        if (s.lat == null || s.lng == null) return null
        const color = getMarkerColor(s, selectedFuel)
        const icon = getBrandIcon(s.brand, color, markerSize)
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onStationClick(s),
            }}
          >
            <Tooltip direction="top" className="station-tooltip">
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
          </Marker>
        )
      })}

      {userLat != null && userLng != null && (
        <>
          <UserLocationMarker lat={userLat} lng={userLng} />
          <FlyToUser lat={userLat} lng={userLng} stations={stations} locateTrigger={locateTrigger} />
        </>
      )}
    </MapContainer>
  )
}
