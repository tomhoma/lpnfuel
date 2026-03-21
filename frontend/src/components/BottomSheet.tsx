import { useEffect, useRef } from 'react'
import type { StationWithStatus } from '../types'
import FuelBadge from './FuelBadge'
import TransportBadge from './TransportBadge'
import { formatDistance } from '../hooks/useDistance'

interface BottomSheetProps {
  station: StationWithStatus | null
  onClose: () => void
}

export default function BottomSheet({ station, onClose }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

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
        </div>
      </div>
    </div>
  )
}
