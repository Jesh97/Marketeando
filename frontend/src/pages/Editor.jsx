import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'

function formatFecha(value) {
  return new Date(value).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Editor() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get('/editor')
      .then(({ data }) => setDocuments(data))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este diseño? Esta acción no se puede deshacer.')) return
    try {
      await apiClient.delete(`/editor/${id}`)
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'No se pudo eliminar el diseño.')
    }
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">Mis diseños</h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea banners, promociones y piezas visuales con el editor libre.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/editor/new')}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
        >
          + Nuevo diseño
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Cargando diseños...</p>}

      {!loading && documents.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
          Aún no tienes diseños. Crea el primero para empezar.
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white hover:border-orange-300"
            >
              <Link to={`/editor/${doc.id}`} className="flex aspect-[4/5] items-center justify-center bg-gray-50 text-gray-300">
                <span className="text-3xl">🎨</span>
              </Link>
              <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-3">
                <div className="min-w-0">
                  <Link to={`/editor/${doc.id}`} className="block truncate text-sm font-medium text-gray-800 hover:text-orange-600">
                    {doc.title}
                  </Link>
                  <p className="text-xs text-gray-400">Editado el {formatFecha(doc.updated_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="shrink-0 rounded-md p-1.5 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="Eliminar"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}

export default Editor
