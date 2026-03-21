import { useState, useEffect } from 'react'

interface GeoState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  })

  const request = () => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'เบราว์เซอร์ไม่รองรับ GPS' }))
      return
    }
    setState(s => ({ ...s, loading: true }))
    navigator.geolocation.getCurrentPosition(
      pos => setState({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        error: null,
        loading: false,
      }),
      err => setState(s => ({ ...s, error: err.message, loading: false })),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    request()
  }, [])

  return { ...state, request }
}
