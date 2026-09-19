import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import apiClient from '../api/client'
import { useAuth } from './AuthContext'

const RestauranteContext = createContext(null)

export function RestauranteProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [usuario, setUsuario] = useState(null)
  const [restaurante, setRestaurante] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setUsuario(null)
      setRestaurante(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [meRes, restaurantesRes] = await Promise.all([
        apiClient.get('/auth/me'),
        apiClient.get('/restaurantes'),
      ])
      setUsuario(meRes.data)
      setRestaurante(restaurantesRes.data[0] ?? null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ usuario, restaurante, loading, refresh, setRestaurante }),
    [usuario, restaurante, loading, refresh],
  )

  return <RestauranteContext.Provider value={value}>{children}</RestauranteContext.Provider>
}

export function useRestaurante() {
  const ctx = useContext(RestauranteContext)
  if (!ctx) throw new Error('useRestaurante debe usarse dentro de <RestauranteProvider>')
  return ctx
}
