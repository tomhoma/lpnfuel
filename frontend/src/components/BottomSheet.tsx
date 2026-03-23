import { useEffect, useRef, useState } from 'react'
import type { StationWithStatus, PricesResponse } from '../types'
import FuelBadge from './FuelBadge'
import TransportBadge from './TransportBadge'
import StationHistory from './StationHistory'
import { formatDistance } from '../hooks/useDistance'
import { getPrice } from '../hooks/usePriceLookup'

const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbzHG04vwNASOVIZjkKiwo6OU8gkUQOKg5lF8X86kENf3jc47D5eWPANGqjj6kOvo4ZB/exec'

interface BottomSheetProps {
  station: StationWithStatus | null
  onClose: () => void
  prices?: PricesResponse | null
}

export default function BottomSheet({ station, onClose, prices }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [showGeoReport, setShowGeoReport] = useState(false)
  const [geoDetail, setGeoDetail] = useState('')
  const [geoSending, setGeoSending] = useState(false)
  const [geoSent, setGeoSent] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (station) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [station, onClose])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (station) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [station, onClose])

  useEffect(() => {
    setShowGeoReport(false)
    setGeoDetail('')
    setGeoSending(false)
    setGeoSent(false)
  }, [station?.id])

  const submitGeoReport = async () => {
    if (!station || !geoDetail.trim()) return
    setGeoSending(true)
    try {
      await fetch(FEEDBACK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'geo_report',
          station_id: station.id,
          station_name: station.name,
          brand: station.brand,
          district: station.district,
          current_lat: station.lat,
          current_lng: station.lng,
          detail: geoDetail.trim(),
          timestamp: new Date().toISOString(),
        }),
      })
      setGeoSent(true)
      setGeoSending(false)
    } catch {
      setGeoSending(false)
      alert('ส่งไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  if (!station) return null

  const navURL = station.lat && station.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`
    : null

  const updatedText = station.source_updated
    ? new Date(station.source_updated).toLocaleString('th-TH', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      })
    : null

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/20 animate-fadeIn">
      <div
        ref={sheetRef}
        className="bottom-sheet bg-white rounded-t-2xl w-full max-w-lg shadow-2xl max-h-[55vh] overflow-y-auto animate-slideUp"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-0.5 sticky top-0 bg-white rounded-t-2xl">
          <div className="w-8 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-4 space-y-2.5">
          {/* Row 1: brand + distance + close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {station.brand}
              </span>
              {station.distance_km != null && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {formatDistance(station.distance_km)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 -mr-1 text-gray-300 hover:text-gray-500 active:scale-90 transition"
              aria-label="ปิด"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Row 2: name + district inline */}
          <div>
            <span className="text-lg font-bold leading-tight">{station.name}</span>
            <span className="text-sm text-gray-400 ml-2">{station.district}</span>
          </div>

          {/* Row 3: fuel dots + price + transport — all inline */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
            <FuelBadge label="ดีเซล" value={station.diesel} price={getPrice(prices ?? null, station.brand, 'diesel')} />
            <FuelBadge label="91" value={station.gas91} price={getPrice(prices ?? null, station.brand, 'gas91')} />
            <FuelBadge label="95" value={station.gas95} price={getPrice(prices ?? null, station.brand, 'gas95')} />
            <FuelBadge label="E20" value={station.e20} price={getPrice(prices ?? null, station.brand, 'e20')} />
            {station.transport_status && (
              <>
                <span className="text-gray-200">|</span>
                <TransportBadge status={station.transport_status} eta={station.transport_eta} />
              </>
            )}
          </div>

          {/* 24h History Timeline */}
          <StationHistory stationId={station.id} />

          {/* Row: updated + navigate button */}
          <div className="flex items-center gap-2">
            {updatedText && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                อัปเดต: {updatedText}
              </span>
            )}
            {navURL && (
              <a
                href={navURL}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all text-sm flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                นำทาง
              </a>
            )}
          </div>

          {/* Geo report */}
          {!showGeoReport && !geoSent && (
            <button
              onClick={() => setShowGeoReport(true)}
              className="w-full text-center text-xs text-gray-400 hover:text-red-500 transition py-0.5"
            >
              แจ้งตำแหน่งบนแผนที่ไม่ถูกต้อง
            </button>
          )}

          {showGeoReport && !geoSent && (
            <div className="space-y-2 border-t pt-2">
              <p className="text-xs text-gray-500">
                ระบุตำแหน่งที่ถูกต้อง เช่น อยู่ใกล้สถานที่อะไร ถนนอะไร
              </p>
              <textarea
                value={geoDetail}
                onChange={(e) => setGeoDetail(e.target.value)}
                placeholder="เช่น ปั๊มอยู่ตรงแยกไฟแดงหน้าโลตัส ถนน 106"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGeoReport(false)}
                  className="flex-1 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={submitGeoReport}
                  disabled={!geoDetail.trim() || geoSending}
                  className="flex-1 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-40 transition"
                >
                  {geoSending ? 'กำลังส่ง...' : 'ส่งแจ้งตำแหน่ง'}
                </button>
              </div>
            </div>
          )}

          {geoSent && (
            <p className="text-center text-sm text-green-600 font-semibold py-1">
              ขอบคุณที่แจ้งข้อมูล — admin จะตรวจสอบให้
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
