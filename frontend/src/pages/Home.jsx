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
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-4 px-8 text-center">
      <h1 className="text-4xl font-medium tracking-tight text-[#08060d] dark:text-[#f3f4f6] md:text-5xl">
        Marketeando
      </h1>
      <p>
        Estado del backend:{' '}
        <code className="rounded bg-[#f4f3ec] px-2 py-1 font-mono text-sm text-[#08060d] dark:bg-[#1f2028] dark:text-[#f3f4f6]">
          {status}
        </code>
      </p>
    </div>
  )
}

export default Home
