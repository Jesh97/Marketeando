import { useEffect, useState } from 'react'
import apiClient from '../api/client'

function Home() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus('backend no disponible'))
  }, [])

  return (
    <div>
      <h1>Marketeando</h1>
      <p>Estado del backend: {status}</p>
    </div>
  )
}

export default Home
