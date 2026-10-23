import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'
import DisenoEscalado from '../components/DisenoEscalado'
import { useRestaurante } from '../context/RestauranteContext'
import { useLocal } from '../context/LocalContext'
import { documentToHtml } from '../lib/editorExport'
import { rellenarConPlatos } from '../lib/disenoProductos'
import { TEMPLATES } from '../lib/editorTemplates'
import { cargarFuentesDelEditor } from '../lib/fuentes'

// Las plantillas prearmadas ("bocetos") son un beneficio de Pro/Enterprise;
// el plan Básico solo puede empezar en blanco. Se resuelve en el cliente
// porque las plantillas no existen en la base de datos.
const PLANES_CON_PLANTILLAS = new Set(['Pro', 'Enterprise'])

function avisoPlatos(colocados, total) {
  if (!total) return 'Aún no tienes platos registrados: la plantilla trae platos de ejemplo.'
  if (colocados < total) {
    return `Se colocaron ${colocados} de tus ${total} platos. Agrega el resto con el botón "Insertar plato".`
  }
  return `Se colocaron tus ${total} platos en la plantilla.`
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function formatFecha(value) {
  return new Date(value).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TemplatePreview({ canvas, elements, className = '' }) {
  return (
    <DisenoEscalado html={documentToHtml({ canvas, elements })} canvas={canvas} className={`bg-[#F6F8FC] ${className}`} />
  )
}

function Modal({ children, onClose, ancho = 'max-w-sm' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        className={`max-h-[85vh] w-full ${ancho} overflow-y-auto rounded-[14px] bg-white p-6 shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function TemplateModal({ onClose, onPickBlank, onPickTemplate, onPickLocked, creating, plantillasDisponibles }) {
  return (
    <Modal onClose={onClose} ancho="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Nuevo diseño</h2>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-[#8A94A6] hover:text-navy">
          Cerrar
        </button>
      </div>
      {!plantillasDisponibles && (
        <p className="mb-4 rounded-[9px] bg-orange-light px-3 py-2 text-xs text-orange-dark">
          Las plantillas prediseñadas son un beneficio de los planes Pro y Enterprise.{' '}
          <Link to="/subscription" className="font-semibold underline">
            Mejora tu plan
          </Link>{' '}
          para desbloquearlas.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={onPickBlank}
          disabled={creating}
          className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-[#E2E8F0] text-[#8A94A6] hover:border-orange hover:text-orange disabled:opacity-50"
        >
          <PlusIcon />
          <span className="text-sm font-semibold">Empezar en blanco</span>
        </button>
        {TEMPLATES.map((template) => {
          const { canvas, elements } = template.build()
          const locked = !plantillasDisponibles
          return (
            <button
              key={template.id}
              type="button"
              disabled={creating}
              onClick={() => (locked ? onPickLocked() : onPickTemplate(template))}
              title={locked ? 'Disponible en los planes Pro y Enterprise' : undefined}
              className="group relative flex flex-col gap-2 rounded-[10px] border border-[#E2E8F0] p-1.5 text-left hover:border-orange disabled:opacity-50"
            >
              <div className="relative">
                <TemplatePreview
                  canvas={canvas}
                  elements={elements}
                  className={`rounded-[8px] ${locked ? 'opacity-50 grayscale' : ''}`}
                />
                {locked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[8px] bg-black/10 text-white">
                    <LockIcon />
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      Pro
                    </span>
                  </div>
                )}
              </div>
              <span className="px-1 pb-1 text-sm font-semibold text-navy">{template.name}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

function Editor() {
  const navigate = useNavigate()
  const { restaurante } = useRestaurante()
  const { localActivo } = useLocal()
  const idRestaurante = restaurante?.id_restaurante
  const idMenuActivo = localActivo?.id_menu
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [creating, setCreating] = useState(false)
  const [plan, setPlan] = useState(null)
  const [aEliminar, setAEliminar] = useState(null)
  const [error, setError] = useState('')

  // Las miniaturas y plantillas usan las fuentes del editor.
  useEffect(() => {
    cargarFuentesDelEditor()
  }, [])

  // Recargar documentos cuando cambia el local activo
  useEffect(() => {
    setLoading(true)
    const url = idMenuActivo ? `/editor?id_menu=${idMenuActivo}` : '/editor'
    apiClient
      .get(url)
      .then(({ data }) => setDocuments(data))
      .catch(() => setError('No se pudieron cargar tus diseños.'))
      .finally(() => setLoading(false))
  }, [idMenuActivo])

  // Determina si el restaurante activo puede usar las plantillas del editor
  // (beneficio Pro/Enterprise). Sin restaurante o sin suscripción activa se
  // trata como Básico: sin plantillas.
  useEffect(() => {
    if (!idRestaurante) return
    let cancelled = false
    apiClient
      .get(`/restaurantes/${idRestaurante}/suscripcion`)
      .then(({ data }) => {
        if (!cancelled) setPlan(data.plan)
      })
      .catch(() => {
        if (!cancelled) setPlan(null)
      })
    return () => {
      cancelled = true
    }
  }, [idRestaurante])

  const plantillasDisponibles = PLANES_CON_PLANTILLAS.has(plan)

  async function handleUseTemplate(template) {
    setCreating(true)
    setError('')
    try {
      // Los platos de ejemplo de la plantilla se reemplazan por los de
      // Gestión de Productos, vinculados para que se actualicen solos.
      const { data: productos } = await apiClient.get(`/restaurantes/${idRestaurante}/productos`)
      const { canvas, elements: base } = template.build()
      const { elements, colocados, total } = rellenarConPlatos(base, productos)
      const { data } = await apiClient.post('/editor/save', {
        title: template.name,
        id_menu: idMenuActivo ?? null,
        data_json: { canvas, elements },
        html_content: documentToHtml({ canvas, elements }),
      })
      navigate(`/editor/${data.id}`, { state: { aviso: avisoPlatos(colocados, total) } })
    } catch (err) {
      setShowTemplates(false)
      setError(err.response?.data?.error ?? 'No se pudo crear el diseño desde la plantilla.')
      setCreating(false)
    }
  }

  async function confirmarEliminar() {
    const doc = aEliminar
    setAEliminar(null)
    try {
      await apiClient.delete(`/editor/${doc.id}`)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo eliminar el diseño.')
    }
  }

  return (
    <DashboardShell>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Mis diseños</h1>
          <p className="mt-1.5 text-[14px] text-[#4A5568]">
            {localActivo
              ? <>Diseños de <span className="font-semibold text-navy">{localActivo.nombre}</span></>
              : 'Crea tu carta, promociones y piezas para redes con el editor libre.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTemplates(true)}
          className="inline-flex h-11 items-center gap-2 rounded-[9px] bg-orange px-5 text-[13.5px] font-semibold text-white hover:bg-orange-dark"
        >
          <PlusIcon /> Nuevo diseño
        </button>
      </div>

      {localActivo && !localActivo.id_menu && (
        <div className="mb-4 rounded-[9px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2.5 text-[13px] text-[#B91C1C]">
          Este local no tiene menú asignado. Ejecuta la migración <code>0014_backfill_local_menus.sql</code> en la base de datos y reinicia el servidor.
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-[9px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-[13px] text-[#B91C1C]">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-[#8A94A6]">Cargando diseños...</p>}

      {!loading && documents.length === 0 && (
        <div className="flex flex-col items-center rounded-[14px] border border-dashed border-[#E2E8F0] bg-white px-6 py-14 text-center">
          <p className="text-[15px] font-bold text-navy">Aún no tienes diseños</p>
          <p className="mt-1.5 max-w-sm text-[13.5px] text-[#4A5568]">
            Empieza con una plantilla o en blanco. Puedes insertar tus platos con su precio y se actualizan solos.
          </p>
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-[9px] bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-hover"
          >
            <PlusIcon /> Crear mi primer diseño
          </button>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group relative flex flex-col overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white transition-colors hover:border-orange"
            >
              <Link to={`/editor/${doc.id}`} className="block bg-[#F6F8FC]">
                {doc.data_json?.canvas ? (
                  <TemplatePreview canvas={doc.data_json.canvas} elements={doc.data_json.elements ?? []} />
                ) : (
                  <div className="aspect-[4/5]" />
                )}
              </Link>
              <div className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] p-3">
                <div className="min-w-0">
                  <Link
                    to={`/editor/${doc.id}`}
                    className="block truncate text-[13.5px] font-semibold text-navy hover:text-orange-dark"
                  >
                    {doc.title}
                  </Link>
                  <p className="text-xs text-[#8A94A6]">Editado el {formatFecha(doc.updated_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAEliminar(doc)}
                  className="shrink-0 rounded-[7px] p-1.5 text-[#8A94A6] hover:bg-[#FEF2F2] hover:text-[#DC2626] sm:opacity-0 sm:group-hover:opacity-100"
                  title="Eliminar"
                  aria-label={`Eliminar ${doc.title}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTemplates && (
        <TemplateModal
          creating={creating}
          plantillasDisponibles={plantillasDisponibles}
          onClose={() => setShowTemplates(false)}
          onPickBlank={() => navigate(idMenuActivo ? `/editor/new?id_menu=${idMenuActivo}` : '/editor/new')}
          onPickTemplate={handleUseTemplate}
          onPickLocked={() => navigate('/subscription')}
        />
      )}

      {aEliminar && (
        <Modal onClose={() => setAEliminar(null)}>
          <h3 className="text-base font-bold text-navy">¿Eliminar “{aEliminar.title}”?</h3>
          <p className="mt-2 text-[13.5px] text-[#4A5568]">Esta acción no se puede deshacer.</p>
          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setAEliminar(null)}
              className="h-10 rounded-[9px] px-4 text-[13px] font-semibold text-[#4A5568] hover:bg-[#F6F8FC]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarEliminar}
              className="h-10 rounded-[9px] bg-[#DC2626] px-4 text-[13px] font-semibold text-white hover:bg-[#B91C1C]"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}

export default Editor
