import { useState, useEffect, useCallback } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  address: string | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: null,
    error: null,
    loading: true,
  })

  const obterEndereco = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt`,
        { headers: { 'User-Agent': 'PontoDigitalBM/1.0' } }
      )
      const data = await response.json()
      return data.display_name || null
    } catch {
      return null
    }
  }, [])

  const obterLocalizacao = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalização não suportada', loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const address = await obterEndereco(latitude, longitude)
        setState({
          latitude,
          longitude,
          accuracy,
          address,
          error: null,
          loading: false,
        })
      },
      (error) => {
        let message = 'Erro ao obter localização'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permissão de localização negada'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Localização indisponível'
            break
          case error.TIMEOUT:
            message = 'Tempo excedido ao obter localização'
            break
        }
        setState(prev => ({ ...prev, error: message, loading: false }))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    )
  }, [obterEndereco])

  useEffect(() => {
    obterLocalizacao()
  }, [obterLocalizacao])

  return { ...state, atualizar: obterLocalizacao }
}
