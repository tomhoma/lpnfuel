import { useState, useEffect, useCallback } from 'react'
import type { StationsResponse, DashboardResponse, PricesResponse } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

export function useStations() {
  const [data, setData] = useState<StationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetch = useCallback(async () => {
    try {
      const res = await window.fetch(`${API_URL}/stations`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: StationsResponse = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่ได้')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 3 * 60 * 1000) // refresh every 3 min
    return () => clearInterval(interval)
  }, [fetch])

  return { data, loading, error, lastUpdated, refresh: fetch }
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
