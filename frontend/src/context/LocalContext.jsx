import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import apiClient from '../api/client'
import { useRestaurante } from './RestauranteContext'

const LocalContext = createContext(null)

export function LocalProvider({ children }) {
  const { restaurante } = useRestaurante()
  const [locales, setLocales] = useState([])
  const [idLocalActivo, setIdLocalActivo] = useState(null)
  const [loading, setLoading] = useState(false)

  const storageKey = restaurante ? `kk_local_${restaurante.id_restaurante}` : null

  const refresh = useCallback(async () => {
    if (!restaurante) {
      setLocales([])
      setIdLocalActivo(null)
      return
    }
    setLoading(true)
    try {
      const { data } = await apiClient.get(`/restaurantes/${restaurante.id_restaurante}/locales`)
      setLocales(data)
      const saved = storageKey ? parseInt(localStorage.getItem(storageKey), 10) : NaN
      const valid = !isNaN(saved) && data.some((l) => l.id_local === saved)
      setIdLocalActivo(valid ? saved : (data[0]?.id_local ?? null))
    } finally {
      setLoading(false)
    }
  }, [restaurante, storageKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  const cambiarLocal = useCallback(
    (idLocal) => {
      setIdLocalActivo(idLocal)
      if (storageKey) localStorage.setItem(storageKey, String(idLocal))
    },
    [storageKey],
  )

  const localActivo = useMemo(
    () => locales.find((l) => l.id_local === idLocalActivo) ?? null,
    [locales, idLocalActivo],
  )

  const value = useMemo(
    () => ({ locales, localActivo, cambiarLocal, loading, refresh }),
    [locales, localActivo, cambiarLocal, loading, refresh],
  )

  return <LocalContext.Provider value={value}>{children}</LocalContext.Provider>
}

export function useLocal() {
  const ctx = useContext(LocalContext)
  if (!ctx) throw new Error('useLocal debe usarse dentro de <LocalProvider>')
  return ctx
}
