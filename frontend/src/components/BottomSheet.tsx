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

  if (!station) return null

  const navURL = station.lat && station.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`
    : null

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/30">
      <div
        ref={sheetRef}
        className="bottom-sheet bg-white rounded-t-2xl w-full max-w-lg shadow-2xl max-h-[70vh] overflow-y-auto"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-gray-400">{station.brand}</span>
                <h2 className="text-lg font-bold leading-tight">{station.name}</h2>
                <span className="text-sm text-gray-500">{station.district}</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 -mr-1 text-gray-400 hover:text-gray-600"
                aria-label="ปิด"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {station.distance_km != null && (
              <span className="text-xs text-primary font-medium">
                {formatDistance(station.distance_km)}
              </span>
            )}
          </div>

          {/* Fuel Status */}
          <div className="flex flex-wrap gap-2">
            <FuelBadge label="ดีเซล" value={station.diesel} />
            <FuelBadge label="แก๊ส 91" value={station.gas91} />
            <FuelBadge label="เบนซิน 95" value={station.gas95} />
            <FuelBadge label="E20" value={station.e20} />
          </div>

          {/* Transport */}
          {station.transport_status && (
            <TransportBadge status={station.transport_status} eta={station.transport_eta} />
          )}

          {/* Updated at */}
          {station.source_updated && (
            <p className="text-xs text-gray-400">
              อัปเดตจากแหล่งข้อมูล: {new Date(station.source_updated).toLocaleString('th-TH')}
            </p>
          )}

          {/* Navigate button */}
          {navURL && (
            <a
              href={navURL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 text-center bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              นำทางไปปั๊มนี้
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
