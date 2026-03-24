import { useState, useEffect, useCallback, useRef } from 'react'
import type { StationsResponse, DashboardResponse, PricesResponse } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

export function useStations() {
  const [data, setData] = useState<StationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dataVersion, setDataVersion] = useState(0)       // นับครั้งที่ข้อมูลเปลี่ยนจริง
  const [justRefreshed, setJustRefreshed] = useState(false) // flash indicator

  const prevUpdatedAt = useRef<string | null>(null)
  const isFirstFetch = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await window.fetch(`${API_URL}/stations`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: StationsResponse = await res.json()

      const isNew = json.updated_at !== prevUpdatedAt.current
      const wasFirst = isFirstFetch.current

      if (isNew) {
        prevUpdatedAt.current = json.updated_at
        isFirstFetch.current = false
        setData(json)
        setLastUpdated(new Date())
        setDataVersion(v => v + 1)

        // Flash "อัพเดทแล้ว" เฉพาะตอนที่ไม่ใช่ครั้งแรก
        if (!wasFirst) {
          setJustRefreshed(true)
          setTimeout(() => setJustRefreshed(false), 2500)
        }
      }

      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่ได้')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { data, loading, error, lastUpdated, dataVersion, justRefreshed, refresh: fetchData }
}

export function useDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.fetch(`${API_URL}/dashboard`)
      .then(r => r.json())
      .then((json: DashboardResponse) => { setData(json); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return { data, loading, error }
}

export function usePrices() {
  const [data, setData] = useState<PricesResponse | null>(null)

  useEffect(() => {
    window.fetch(`${API_URL}/prices`)
      .then(r => r.json())
      .then((json: PricesResponse) => setData(json))
      .catch(() => {})
  }, [])

  return data
}

export function useLatestReport() {
  const [time, setTime] = useState<string | null>(null)

  const fetchLatest = useCallback(async () => {
    try {
      const res = await window.fetch(`${API_URL}/reports/latest`)
      const json = await res.json()
      if (json.latest_report_at) setTime(json.latest_report_at)
    } catch {}
  }, [])

  useEffect(() => {
    fetchLatest()
    const interval = setInterval(fetchLatest, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchLatest])

  return time
}
