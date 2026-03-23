export interface Station {
  id: string
  brand: string
  name: string
  district: string
  lat: number | null
  lng: number | null
  has_e20: boolean
  has_gas95: boolean
  created_at: string
  updated_at: string
}

export interface FuelStatus {
  station_id: string
  gas95: string   // 'มี' | 'หมด' | '-'
  gas91: string
  e20: string
  diesel: string
  transport_status: string  // 'ล่าช้า' | 'กำลังจัดส่ง' | 'กำลังลงน้ำมัน'
  transport_eta: string
  source_updated: string | null
  fetched_at: string
}

export interface StationWithStatus extends Station, FuelStatus {
  distance_km?: number
}

export interface OverallSummary {
  total: number
  with_fuel: number
  all_empty: number
  diesel_crisis: boolean
  diesel_count: number
}

export interface StationsResponse {
  stations: StationWithStatus[]
  summary: OverallSummary
  updated_at: string
}

export interface DistrictSummary {
  district: string
  total_stations: number
  with_fuel: number
  all_empty: number
  diesel_available: number
  gas91_available: number
  incoming_supply: number
}

export interface BrandSummary {
  brand: string
  total: number
  with_fuel: number
  available_rate: number
}

export interface TrendPoint {
  date: string
  percent: number
}

export interface TrendData {
  gas95: TrendPoint[]
  gas91: TrendPoint[]
  e20: TrendPoint[]
  diesel: TrendPoint[]
}

export interface DashboardResponse {
  overall: OverallSummary
  by_district: DistrictSummary[]
  by_brand: BrandSummary[]
  incoming_supply: StationWithStatus[]
  trend_7d: TrendData
  updated_at: string
}

export interface PricesResponse {
  prices: Record<string, Record<string, Record<string, number>>>  // district → brand → fuel → price
  date: string
}

export interface StationDetailResponse {
  station: StationWithStatus
  history_7d: FuelStatus[]
}

export type FuelType = 'gas95' | 'gas91' | 'e20' | 'diesel'
export type FilterStatus = 'all' | 'available' | 'empty' | 'incoming'
export type BrandFilter = 'all' | 'ปตท.' | 'บางจาก' | 'พีที' | 'คาลเท็กซ์' | 'เชลล์'
