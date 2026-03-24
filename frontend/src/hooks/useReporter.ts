import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
const KEY_ID = 'lpnfuel_reporter_id'
const KEY_NICK = 'lpnfuel_nickname'

export interface ReporterLevel {
  min_points: number
  title: string
  icon: string
}

export interface ReporterProfile {
  totalPoints: number
  level: ReporterLevel
  nextLevel: ReporterLevel | null
  pointsToNext: number | null
}

function getOrCreateId(): string {
  let id = localStorage.getItem(KEY_ID)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY_ID, id)
  }
  return id
}

export function useReporter() {
  const [reporterId] = useState(getOrCreateId)
  const [nickname, setNicknameState] = useState(() => localStorage.getItem(KEY_NICK) || '')
  const [profile, setProfile] = useState<ReporterProfile | null>(null)

  const setNickname = useCallback((name: string) => {
    const trimmed = name.slice(0, 20)
    setNicknameState(trimmed)
    localStorage.setItem(KEY_NICK, trimmed)
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/reporters/${reporterId}`)
      if (!res.ok) return
      const data = await res.json()
      setProfile({
        totalPoints: data.reporter.total_points,
        level: data.level,
        nextLevel: data.next_level || null,
        pointsToNext: data.points_to_next ?? null,
      })
    } catch {}
  }, [reporterId])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  return { reporterId, nickname, setNickname, profile, refreshProfile }
}
