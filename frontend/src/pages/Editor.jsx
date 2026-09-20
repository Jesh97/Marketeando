import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'
import { documentToHtml } from '../lib/editorExport'
import { TEMPLATES } from '../lib/editorTemplates'

function formatFecha(value) {
  return new Date(value).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Miniatura de una plantilla: el truco del <svg><foreignObject> escala el
// HTML real del diseño (mismo documentToHtml que exporta el editor) al
// tamaño de la tarjeta sin medir nada por JS, sin importar el tamaño real
// del lienzo (800x1000, 1000x600, 1080x1920, etc.).
function TemplatePreview({ canvas, elements, className = '' }) {
  const html = documentToHtml({ canvas, elements })
  return (
    <div
      className={`w-full overflow-hidden bg-gray-50 ${className}`}
      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
    >
      <svg viewBox={`0 0 ${canvas.width} ${canvas.height}`} className="h-full w-full">
        <foreignObject width={canvas.width} height={canvas.height}>
          <div xmlns="http://www.w3.org/1999/xhtml" dangerouslySetInnerHTML={{ __html: html }} />
        </foreignObject>
      </svg>
    </div>
  )
}

function TemplateModal({ onClose, onPickBlank, onPickTemplate, creating }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Nuevo diseño</h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            Cerrar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={onPickBlank}
            disabled={creating}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500 disabled:opacity-50"
          >
            <span className="text-3xl">+</span>
            <span className="text-sm font-medium">Empezar en blanco</span>
          </button>
          {TEMPLATES.map((template) => {
            const { canvas, elements } = template.build()
            return (
              <button
                key={template.id}
                type="button"
                disabled={creating}
                onClick={() => onPickTemplate(template)}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 p-1.5 text-left hover:border-orange-300 disabled:opacity-50"
              >
                <TemplatePreview canvas={canvas} elements={elements} className="rounded-lg" />
                <span className="px-1 pb-1 text-sm font-medium text-gray-700">{template.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Editor() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    apiClient
      .get('/editor')
      .then(({ data }) => setDocuments(data))
      .finally(() => setLoading(false))
  }, [])

  async function handleUseTemplate(template) {
    const { canvas, elements } = template.build()
    setCreating(true)
    try {
      const { data } = await apiClient.post('/editor/save', {
        title: template.name,
        data_json: { canvas, elements },
        html_content: documentToHtml({ canvas, elements }),
      })
      navigate(`/editor/${data.id}`)
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'No se pudo crear el diseño desde la plantilla.')
      setCreating(false)
    }
  }

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
          onClick={() => setShowTemplates(true)}
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
              <Link to={`/editor/${doc.id}`} className="block bg-gray-50">
                {doc.data_json?.canvas ? (
                  <TemplatePreview canvas={doc.data_json.canvas} elements={doc.data_json.elements ?? []} />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center text-gray-300">
                    <span className="text-3xl">🎨</span>
                  </div>
                )}
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

      {showTemplates && (
        <TemplateModal
          creating={creating}
          onClose={() => setShowTemplates(false)}
          onPickBlank={() => navigate('/editor/new')}
          onPickTemplate={handleUseTemplate}
        />
      )}
    </DashboardShell>
  )
}

export default Editor
