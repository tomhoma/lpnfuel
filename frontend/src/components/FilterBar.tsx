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
            className="ml-auto flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 active:scale-95 transition shadow-sm hover:bg-emerald-100"
          >
            <span className="text-xs">{levelIcon}</span>
            <span className="text-xs text-emerald-700 font-semibold max-w-[80px] truncate">{displayName}</span>
            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Profile modal */}
      {showProfile && (() => {
        const points = profile?.totalPoints ?? 0
        const progress = profile?.nextLevel && profile.pointsToNext != null
          ? Math.min(100, ((points - profile.level.min_points) / (profile.nextLevel.min_points - profile.level.min_points)) * 100)
          : 100
        return (
          <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/50 animate-fadeIn" onClick={() => setShowProfile(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:w-[340px] shadow-2xl animate-slideUp" onClick={e => e.stopPropagation()}>
              {/* Header card with gradient */}
              <div className="relative bg-gradient-to-br from-emerald-400 to-teal-500 rounded-t-3xl sm:rounded-t-2xl px-5 pt-6 pb-4 text-center overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />

                <div className="relative">
                  <div className="text-5xl mb-1 drop-shadow-lg">{levelIcon}</div>
                  <div className="text-white font-bold text-base">{profile?.level.title || 'ละอ่อนลำไย'}</div>
                  <div className="text-white/80 text-xs mt-0.5">{points} แต้ม</div>
                </div>

                {/* Progress bar */}
                <div className="relative mt-3 mx-4">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {profile?.nextLevel && profile.pointsToNext != null && (
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-white/60">{profile.level.icon} {profile.level.min_points}</span>
                      <span className="text-[10px] text-white/80 font-medium">อีก {profile.pointsToNext} ถึง {profile.nextLevel.icon}</span>
                      <span className="text-[10px] text-white/60">{profile.nextLevel.icon} {profile.nextLevel.min_points}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Nickname section — compact */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="ตั้งชื่อเล่น"
                    maxLength={20}
                    autoFocus={false}
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    onClick={saveName}
                    className="px-4 py-2 text-sm text-white bg-emerald-500 rounded-xl font-semibold active:scale-95 transition hover:bg-emerald-600 shadow-sm"
                  >
                    บันทึก
                  </button>
                </div>
                <p className="text-[10px] text-gray-300 mt-1.5 text-center">ชื่อจะแสดงใน ticker เมื่อคุณรายงานสถานะน้ำมัน</p>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
