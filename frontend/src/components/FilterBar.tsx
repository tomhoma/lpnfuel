import { useState } from 'react'
import type { FuelType } from '../types'
import { useReporter } from '../hooks/useReporter'

interface FilterBarProps {
  selectedFuel: FuelType | null
  onFuelSelect: (f: FuelType | null) => void
}

const FUEL_OPTIONS: { value: FuelType | null; label: string; color: string }[] = [
  { value: null, label: 'ทั้งหมด', color: 'bg-blue-600 border-blue-600' },
  { value: 'diesel', label: 'ดีเซล', color: 'bg-blue-500 border-blue-500' },
  { value: 'gas91', label: '91', color: 'bg-green-500 border-green-500' },
  { value: 'gas95', label: '95', color: 'bg-yellow-500 border-yellow-500' },
  { value: 'e20', label: 'E20', color: 'bg-purple-500 border-purple-500' },
]

export default function FilterBar({ selectedFuel, onFuelSelect }: FilterBarProps) {
  const { nickname, setNickname, profile } = useReporter()
  const [showProfile, setShowProfile] = useState(false)
  const [editName, setEditName] = useState('')

  const displayName = nickname || 'ผู้ใช้งาน'
  const levelIcon = profile?.level.icon || '🔰'

  const openProfile = () => {
    setEditName(nickname)
    setShowProfile(true)
  }

  const saveName = () => {
    setNickname(editName.trim())
    setShowProfile(false)
  }

  return (
    <>
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm px-2.5 py-1">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {FUEL_OPTIONS.map(f => {
            const isActive = selectedFuel === f.value
            return (
              <button
                key={f.value ?? 'all'}
                onClick={() => onFuelSelect(f.value)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95
                  ${isActive
                    ? `${f.color} text-white shadow-sm`
                    : 'bg-white border-gray-200 text-gray-600'
                  }`}
              >
                {f.label}
              </button>
            )
          })}

          {/* Reporter badge */}
          <button
            onClick={openProfile}
            className="ml-auto flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 active:scale-95 transition"
          >
            <span className="text-xs">{levelIcon}</span>
            <span className="text-xs text-gray-600 font-medium max-w-[80px] truncate">{displayName}</span>
          </button>
        </div>
      </div>

      {/* Profile modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 animate-fadeIn" onClick={() => setShowProfile(false)}>
          <div className="bg-white rounded-2xl w-[300px] shadow-2xl p-5 space-y-4 animate-slideUp" onClick={e => e.stopPropagation()}>
            {/* Level + points */}
            <div className="text-center">
              <div className="text-4xl mb-1">{levelIcon}</div>
              <div className="text-sm font-bold text-gray-800">{profile?.level.title || 'มือใหม่หัดเติม'}</div>
              <div className="text-xs text-gray-400 mt-1">
                {profile?.totalPoints ?? 0} แต้ม
                {profile?.nextLevel && profile.pointsToNext != null && (
                  <span> · อีก {profile.pointsToNext} แต้มถึง {profile.nextLevel.icon} {profile.nextLevel.title}</span>
                )}
              </div>
              {/* Progress bar */}
              {profile?.nextLevel && profile.pointsToNext != null && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((profile.totalPoints - (profile.level.min_points)) / (profile.nextLevel.min_points - profile.level.min_points)) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Nickname input */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">ชื่อเล่น</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="ตั้งชื่อเล่น"
                maxLength={20}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                autoFocus
              />
              <p className="text-[10px] text-gray-300 mt-1">สูงสุด 20 ตัวอักษร · แสดงใน ticker ด้านล่าง</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowProfile(false)}
                className="flex-1 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg active:scale-95 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveName}
                className="flex-1 py-2 text-sm text-white bg-emerald-500 rounded-lg font-semibold active:scale-95 transition"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
