import { useEffect, useRef, useState } from 'react'
import type { StationWithStatus } from '../types'
import FuelBadge from './FuelBadge'
import TransportBadge from './TransportBadge'
import { formatDistance } from '../hooks/useDistance'

const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbzHG04vwNASOVIZjkKiwo6OU8gkUQOKg5lF8X86kENf3jc47D5eWPANGqjj6kOvo4ZB/exec'

interface BottomSheetProps {
  station: StationWithStatus | null
  onClose: () => void
}

export default function BottomSheet({ station, onClose }: BottomSheetProps) {
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

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (station) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [station, onClose])

  // Reset geo report state when station changes
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

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/20 animate-fadeIn">
      <div
        ref={sheetRef}
        className="bottom-sheet bg-white rounded-t-2xl w-full max-w-lg shadow-2xl max-h-[60vh] overflow-y-auto animate-slideUp"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2.5 pb-1 sticky top-0 bg-white rounded-t-2xl">
          <div className="w-8 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-5 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {station.brand}
                </span>
                {station.distance_km != null && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {formatDistance(station.distance_km)}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold leading-snug mt-1">{station.name}</h2>
              <span className="text-xs text-gray-400">{station.district}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 -mt-0.5 text-gray-300 hover:text-gray-500 active:scale-90 transition"
              aria-label="ปิด"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Fuel Status Grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <FuelBadge label="ดีเซล" value={station.diesel} />
            <FuelBadge label="แก๊ส 91" value={station.gas91} />
            <FuelBadge label="95" value={station.gas95} />
            <FuelBadge label="E20" value={station.e20} />
          </div>

          {/* Transport */}
          {station.transport_status && (
            <TransportBadge status={station.transport_status} eta={station.transport_eta} />
          )}

          {/* Updated at */}
          {station.source_updated && (
            <p className="text-[10px] text-gray-400">
              อัปเดต: {new Date(station.source_updated).toLocaleString('th-TH', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}

          {/* Navigate button */}
          {navURL && (
            <a
              href={navURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              นำทางไปปั๊มนี้
            </a>
          )}

          {/* Geo report */}
          {!showGeoReport && !geoSent && (
            <button
              onClick={() => setShowGeoReport(true)}
              className="w-full text-center text-[11px] text-gray-400 hover:text-red-500 transition py-1"
            >
              แจ้งตำแหน่งบนแผนที่ไม่ถูกต้อง
            </button>
          )}

          {showGeoReport && !geoSent && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-gray-500">
                กรุณาระบุตำแหน่งที่ถูกต้องของปั๊ม เช่น อยู่ใกล้สถานที่อะไร ถนนอะไร จุดสังเกตคืออะไร เพื่อให้ admin ค้นหาใน Google Maps
              </p>
              <textarea
                value={geoDetail}
                onChange={(e) => setGeoDetail(e.target.value)}
                placeholder="เช่น ปั๊มอยู่ตรงแยกไฟแดงหน้าโลตัส ถนน 106 ฝั่งขาเข้าเมือง"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={3}
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
                  {geoSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังส่ง...
                    </span>
                  ) : 'ส่งแจ้งตำแหน่ง'}
                </button>
              </div>
            </div>
          )}

          {geoSent && (
            <div className="text-center py-2">
              <p className="text-sm text-green-600 font-semibold">ขอบคุณที่แจ้งข้อมูล</p>
              <p className="text-[11px] text-gray-400">admin จะตรวจสอบและอัปเดตตำแหน่งให้</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
