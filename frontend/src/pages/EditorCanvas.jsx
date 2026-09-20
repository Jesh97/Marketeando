import { useCallback, useEffect, useRef, useState } from 'react'
import Moveable from 'react-moveable'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { useRestaurante } from '../context/RestauranteContext'
import { documentToHtml } from '../lib/editorExport'

const DEFAULT_CANVAS = { width: 800, height: 1000, background: '#ffffff' }
const MAX_HISTORY = 100

// Agrupadas por categoría para el selector. La primera fuente de la
// primera categoría (Inter) es la que se usa por defecto en texto nuevo.
const FONT_CATEGORIES = [
  {
    label: 'Sans serif',
    fonts: [
      { label: 'Inter', value: 'Inter, sans-serif' },
      { label: 'Roboto', value: 'Roboto, sans-serif' },
      { label: 'Montserrat', value: 'Montserrat, sans-serif' },
      { label: 'Poppins', value: 'Poppins, sans-serif' },
      { label: 'Nunito', value: 'Nunito, sans-serif' },
      { label: 'Work Sans', value: '"Work Sans", sans-serif' },
      { label: 'Raleway', value: 'Raleway, sans-serif' },
    ],
  },
  {
    label: 'Serif',
    fonts: [
      { label: 'Georgia', value: 'Georgia, serif' },
      { label: 'Playfair Display', value: '"Playfair Display", serif' },
      { label: 'Merriweather', value: 'Merriweather, serif' },
      { label: 'Lora', value: 'Lora, serif' },
      { label: 'PT Serif', value: '"PT Serif", serif' },
    ],
  },
  {
    label: 'Display',
    fonts: [
      { label: 'Oswald', value: 'Oswald, sans-serif' },
      { label: 'Bebas Neue', value: '"Bebas Neue", sans-serif' },
      { label: 'Anton', value: 'Anton, sans-serif' },
      { label: 'Abril Fatface', value: '"Abril Fatface", serif' },
    ],
  },
  {
    label: 'Manuscrita',
    fonts: [
      { label: 'Pacifico', value: 'Pacifico, cursive' },
      { label: 'Dancing Script', value: '"Dancing Script", cursive' },
      { label: 'Caveat', value: 'Caveat, cursive' },
      { label: 'Lobster', value: 'Lobster, cursive' },
    ],
  },
  {
    label: 'Monoespaciada',
    fonts: [{ label: 'Courier New', value: '"Courier New", monospace' }],
  },
]

const FONT_OPTIONS = FONT_CATEGORIES.flatMap((c) => c.fonts)

// Recortes disponibles para imágenes (clip-path CSS), al estilo "imagen
// dentro de una forma" de Canva. 'rect' es el default y usa borderRadius
// en vez de clip-path, para poder seguir dando esquinas redondeadas.
const IMAGE_SHAPES = [
  { label: 'Rectángulo', value: 'rect', clipPath: null, icon: '▭' },
  { label: 'Círculo', value: 'circle', clipPath: 'circle(50% at 50% 50%)', icon: '◯' },
  { label: 'Óvalo', value: 'ellipse', clipPath: 'ellipse(50% 50% at 50% 50%)', icon: '⬭' },
  { label: 'Triángulo', value: 'triangle', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', icon: '▲' },
  {
    label: 'Hexágono',
    value: 'hexagon',
    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    icon: '⬡',
  },
  {
    label: 'Estrella',
    value: 'star',
    clipPath:
      'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    icon: '★',
  },
]

function clipPathFor(shape) {
  return IMAGE_SHAPES.find((s) => s.value === shape)?.clipPath ?? null
}

// Stickers listos para insertar (son elementos de texto normales con un
// emoji grande): no requieren subir ningún archivo ni librería de íconos.
const STICKERS = [
  '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥗', '🍜', '🍝', '🍣', '🍱',
  '🍤', '🍗', '🥩', '🍳', '🥞', '🧇', '🥐', '🧀', '🍰', '🧁', '🍩', '🍪',
  '🍦', '🍫', '🍺', '🍷', '🥤', '☕', '🍵', '🍹', '🌶️', '🥑', '🍋', '🍓',
  '⭐', '🔥', '✨', '❤️',
]

const LAYER_ICONS = { text: 'T', image: '🖼', rect: '▭', ellipse: '◯' }

function layerLabel(el) {
  if (el.type === 'text') return el.text?.trim() ? el.text.slice(0, 24) : 'Texto'
  if (el.type === 'image') return 'Imagen'
  if (el.type === 'rect') return 'Rectángulo'
  if (el.type === 'ellipse') return 'Círculo'
  return el.type
}

// Fondo con degradado o grilla opcional, compartido entre el lienzo
// (background/backgroundTo) y las formas (fill/fillTo) — misma fórmula,
// campos distintos. La grilla se logra apilando dos fondos CSS repetidos en
// vez de docenas de líneas sueltas como elementos.
function canvasBackgroundStyle(canvas) {
  const fillType = canvas.fillType ?? 'solid'
  if (fillType === 'gradient') {
    return `linear-gradient(${canvas.gradientAngle ?? 90}deg, ${canvas.background}, ${canvas.backgroundTo ?? '#FD761A'})`
  }
  if (fillType === 'grid') {
    const line = canvas.gridColor ?? 'rgba(255,255,255,0.08)'
    const size = canvas.gridSize ?? 32
    return (
      `linear-gradient(${line} 1px, transparent 1px) 0 0 / ${size}px ${size}px, ` +
      `linear-gradient(90deg, ${line} 1px, transparent 1px) 0 0 / ${size}px ${size}px, ` +
      canvas.background
    )
  }
  return canvas.background
}

// Convierte un color hex + porcentaje de opacidad (0-100) a "rgba(...)",
// usado por el color de líneas de la grilla y el color de sombra/glow.
function hexToRgba(hex, opacityPercent) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${(opacityPercent ?? 100) / 100})`
}

function shapeBackgroundStyle(el) {
  if (el.fillType === 'gradient') {
    return `linear-gradient(${el.gradientAngle ?? 90}deg, ${el.fill}, ${el.fillTo ?? '#FFFFFF'})`
  }
  return el.fill
}

let idSeq = 0
function newId() {
  idSeq += 1
  return `el_${Date.now()}_${idSeq}`
}

function nextZIndex(elements) {
  return elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1
}

function createTextElement(elements) {
  return {
    id: newId(),
    type: 'text',
    x: 80,
    y: 80,
    width: 280,
    height: 60,
    rotation: 0,
    zIndex: nextZIndex(elements),
    text: 'Texto nuevo',
    fontFamily: FONT_OPTIONS[0].value,
    fontSize: 24,
    color: '#111827',
    fontWeight: '600',
    align: 'left',
    letterSpacing: 0,
    lineHeight: 1.2,
    opacity: 100,
    shadow: 0,
  }
}

function createShapeElement(elements, type) {
  return {
    id: newId(),
    type,
    x: 100,
    y: 100,
    width: 160,
    height: 160,
    rotation: 0,
    zIndex: nextZIndex(elements),
    fill: '#FD761A',
    fillType: 'solid',
    fillTo: '#FFE8D6',
    gradientAngle: 90,
    borderRadius: type === 'rect' ? 8 : 0,
    strokeColor: '#111827',
    strokeWidth: 0,
    opacity: 100,
    shadow: 0,
  }
}

// Sticker = un elemento de texto normal con un emoji grande: reutiliza
// todo el render/export de 'text' sin necesitar un tipo ni assets nuevos.
// isSticker hace que el tamaño de fuente se calcule a partir del ancho/alto
// del cuadro (ver CanvasElement y elementToHtml) en vez de quedar fijo, para
// que el emoji se achique/agrande junto con el cuadro al redimensionar.
function createStickerElement(elements, emoji) {
  return {
    ...createTextElement(elements),
    text: emoji,
    isSticker: true,
    fontWeight: '400',
    align: 'center',
    width: 90,
    height: 90,
  }
}

// Texto pre-cargado con el nombre de un plato ya registrado (pestaña
// Platos), para que el usuario no tenga que volver a escribirlo a mano.
function createProductTextElement(elements, producto) {
  return {
    ...createTextElement(elements),
    text: producto.nombre,
    productoId: producto.id_producto,
  }
}

function createImageElement(elements, src) {
  return {
    id: newId(),
    type: 'image',
    x: 120,
    y: 120,
    width: 240,
    height: 240,
    rotation: 0,
    zIndex: nextZIndex(elements),
    src,
    borderRadius: 0,
    shape: 'rect',
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    opacity: 100,
    shadow: 0,
  }
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.4 19.4 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.6-1.8" />
    </svg>
  )
}

function IconButton({ onClick, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function EditorCanvas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const { restaurante } = useRestaurante()
  const idRestaurante = restaurante?.id_restaurante

  const [docId, setDocId] = useState(isNew ? null : Number(id))
  const [title, setTitle] = useState('Diseño sin título')
  const [canvas, setCanvas] = useState(DEFAULT_CANVAS)

  // Historial de undo/redo: el lienzo de elementos es siempre
  // history.stack[history.index]. Cada acción "de commit" (agregar, borrar,
  // soltar un drag/resize/rotate, tipear un valor) empuja un nuevo estado;
  // undo/redo solo mueven el índice.
  const [history, setHistoryState] = useState({ stack: [[]], index: 0 })
  const elements = history.stack[history.index]
  const canUndo = history.index > 0
  const canRedo = history.index < history.stack.length - 1

  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [editingTextId, setEditingTextId] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saveState, setSaveState] = useState('idle')
  const [publishState, setPublishState] = useState('idle')
  const [uploading, setUploading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [productos, setProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const targetRefs = useRef({})
  const [targetEls, setTargetEls] = useState([])
  const liveChange = useRef(null)
  const fileInputRef = useRef(null)
  const productPickerRef = useRef(null)
  const stickerPickerRef = useRef(null)

  const setElements = useCallback((updater) => {
    setHistoryState((h) => {
      const current = h.stack[h.index]
      const nextElements = typeof updater === 'function' ? updater(current) : updater
      let stack = h.stack.slice(0, h.index + 1)
      stack.push(nextElements)
      if (stack.length > MAX_HISTORY) stack = stack.slice(stack.length - MAX_HISTORY)
      return { stack, index: stack.length - 1 }
    })
  }, [])

  const resetElements = useCallback((initialElements) => {
    setHistoryState({ stack: [initialElements], index: 0 })
  }, [])

  const undo = useCallback(() => {
    setHistoryState((h) => (h.index > 0 ? { ...h, index: h.index - 1 } : h))
  }, [])

  const redo = useCallback(() => {
    setHistoryState((h) => (h.index < h.stack.length - 1 ? { ...h, index: h.index + 1 } : h))
  }, [])

  const updateElement = useCallback(
    (elId, patch) => {
      setElements((prev) => prev.map((el) => (el.id === elId ? { ...el, ...patch } : el)))
    },
    [setElements],
  )

  const addElement = useCallback(
    (factory) => {
      setElements((prev) => {
        const el = factory(prev)
        setSelectedIds(new Set([el.id]))
        setSelectedId(el.id)
        return [...prev, el]
      })
    },
    [setElements],
  )

  const selectElement = useCallback((elId, shiftKey) => {
    setSelectedIds((prev) => {
      const next = new Set(shiftKey ? prev : [])
      if (shiftKey && prev.has(elId)) next.delete(elId)
      else next.add(elId)
      const primary = next.has(elId) ? elId : [...next].at(-1) ?? null
      setSelectedId(primary)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectedId(null)
  }, [])

  const deleteSelected = useCallback(() => {
    setSelectedIds((ids) => {
      if (ids.size === 0) return ids
      setElements((prev) => prev.filter((el) => !ids.has(el.id)))
      setSelectedId(null)
      return new Set()
    })
  }, [setElements])

  const duplicateSelected = useCallback(() => {
    setSelectedIds((ids) => {
      if (ids.size === 0) return ids
      setElements((prev) => {
        let z = nextZIndex(prev) - 1
        const copies = prev
          .filter((el) => ids.has(el.id))
          .map((el) => {
            z += 1
            return { ...el, id: newId(), x: el.x + 20, y: el.y + 20, zIndex: z }
          })
        const newIds = new Set(copies.map((c) => c.id))
        setSelectedIds(newIds)
        setSelectedId(copies.at(-1)?.id ?? null)
        return [...prev, ...copies]
      })
      return ids
    })
  }, [setElements])

  const selected = elements.find((el) => el.id === selectedId) || null

  function alignSelected(mode) {
    if (!selected) return
    const patch = {}
    if (mode === 'left') patch.x = 0
    if (mode === 'right') patch.x = canvas.width - selected.width
    if (mode === 'center-h') patch.x = (canvas.width - selected.width) / 2
    if (mode === 'top') patch.y = 0
    if (mode === 'bottom') patch.y = canvas.height - selected.height
    if (mode === 'center-v') patch.y = (canvas.height - selected.height) / 2
    updateElement(selected.id, patch)
  }

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    apiClient
      .get(`/editor/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        setDocId(data.id)
        setTitle(data.title)
        setCanvas(data.data_json?.canvas ?? DEFAULT_CANVAS)
        resetElements(data.data_json?.elements ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew, resetElements])

  // Nodos que Moveable puede arrastrar/redimensionar/rotar: excluye lo
  // bloqueado u oculto, y espera a que el DOM tenga los refs registrados.
  useEffect(() => {
    if (editingTextId) {
      setTargetEls([])
      return
    }
    const nodes = []
    selectedIds.forEach((elId) => {
      const el = elements.find((e) => e.id === elId)
      if (!el || el.locked || el.hidden) return
      const node = targetRefs.current[elId]
      if (node) nodes.push(node)
    })
    setTargetEls(nodes)
  }, [selectedIds, editingTextId, elements])

  // Platos ya registrados en la pestaña Productos, para insertarlos como
  // texto sin tener que volver a escribirlos.
  useEffect(() => {
    if (!idRestaurante) return
    let cancelled = false
    setLoadingProductos(true)
    apiClient
      .get(`/restaurantes/${idRestaurante}/productos`)
      .then(({ data }) => {
        if (!cancelled) setProductos(data)
      })
      .finally(() => {
        if (!cancelled) setLoadingProductos(false)
      })
    return () => {
      cancelled = true
    }
  }, [idRestaurante])

  useEffect(() => {
    if (!showProductPicker && !showStickerPicker) return
    function handleClickOutside(e) {
      if (showProductPicker && !productPickerRef.current?.contains(e.target)) setShowProductPicker(false)
      if (showStickerPicker && !stickerPickerRef.current?.contains(e.target)) setShowStickerPicker(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [showProductPicker, showStickerPicker])

  useEffect(() => {
    function handleKeyDown(e) {
      const active = document.activeElement
      const isTyping = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.isContentEditable
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod && key === 's') {
        e.preventDefault()
        handleSave()
        return
      }
      if (isTyping) return

      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (selectedIds.size === 0) return
      if (mod && key === 'd') {
        e.preventDefault()
        duplicateSelected()
        return
      }
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        deleteSelected()
        return
      }
      const step = e.shiftKey ? 10 : 1
      let dx = 0
      let dy = 0
      if (key === 'arrowleft') dx = -step
      else if (key === 'arrowright') dx = step
      else if (key === 'arrowup') dy = -step
      else if (key === 'arrowdown') dy = step
      else return
      e.preventDefault()
      setElements((prev) =>
        prev.map((el) => (selectedIds.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el)),
      )
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, undo, redo, duplicateSelected, deleteSelected, setElements])

  async function uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      const { data } = await apiClient.post('/editor/upload', formData, {
        headers: { 'Content-Type': undefined },
      })
      return data.url
    } finally {
      setUploading(false)
    }
  }

  async function insertUploadedImage(file) {
    try {
      const url = await uploadFile(file)
      addElement((prev) => createImageElement(prev, url))
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'No se pudo subir la imagen.')
    }
  }

  // Pegar una imagen copiada (Ctrl+V / Cmd+V) la sube y la inserta como capa.
  useEffect(() => {
    function handlePaste(e) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) insertUploadedImage(file)
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) insertUploadedImage(file)
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) insertUploadedImage(file)
  }

  function handleReorder(direction) {
    if (!selectedId) return
    setElements((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex)
      const idx = sorted.findIndex((el) => el.id === selectedId)
      const swapIdx = direction === 'up' ? idx + 1 : idx - 1
      if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return prev
      const zA = sorted[idx].zIndex
      const zB = sorted[swapIdx].zIndex
      return prev.map((el) => {
        if (el.id === sorted[idx].id) return { ...el, zIndex: zB }
        if (el.id === sorted[swapIdx].id) return { ...el, zIndex: zA }
        return el
      })
    })
  }

  // Devuelve el id del documento guardado, para que handlePublicarComoMenu
  // pueda encadenar la publicación sobre la versión recién guardada.
  async function guardarDocumento() {
    const doc = { canvas, elements }
    const html = documentToHtml(doc)
    const { data } = await apiClient.post('/editor/save', {
      id: docId,
      title,
      data_json: doc,
      html_content: html,
    })
    setDocId(data.id)
    return data.id
  }

  async function handleSave() {
    setSaveState('saving')
    try {
      const savedId = await guardarDocumento()
      setSaveState('saved')
      if (isNew) navigate(`/editor/${savedId}`, { replace: true })
      setTimeout(() => setSaveState('idle'), 1500)
    } catch (err) {
      setSaveState('idle')
      window.alert(err.response?.data?.error ?? 'No se pudo guardar el diseño.')
    }
  }

  // Usa este diseño (ya guardado y saneado por el backend) como el menú
  // público del restaurante: lo mete en el borrador del menú principal y lo
  // publica de una — así el link/QR redirige directo a este diseño.
  async function handlePublicarComoMenu() {
    if (!idRestaurante) {
      window.alert('Necesitas un restaurante activo para publicar un menú.')
      return
    }
    setPublishState('publishing')
    try {
      const savedId = await guardarDocumento()
      if (isNew) navigate(`/editor/${savedId}`, { replace: true })

      const { data: menus } = await apiClient.get(`/restaurantes/${idRestaurante}/menus`)
      const principal = menus.find((m) => m.es_principal)
      if (!principal) {
        window.alert('Este restaurante todavía no tiene un menú principal.')
        setPublishState('idle')
        return
      }

      await apiClient.post(`/restaurantes/${idRestaurante}/menus/${principal.id_menu}/publicar-diseno`, {
        id_documento: savedId,
      })
      setPublishState('published')
      setTimeout(() => setPublishState('idle'), 2000)
    } catch (err) {
      setPublishState('idle')
      window.alert(err.response?.data?.error ?? 'No se pudo publicar el menú.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-svh items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Cargando editor...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-3 bg-gray-50">
        <p className="text-sm text-gray-500">No se encontró ese diseño.</p>
        <Link to="/editor" className="text-sm font-medium text-orange-600">
          Volver a mis diseños
        </Link>
      </div>
    )
  }

  const sortedElements = [...elements].filter((el) => !el.hidden).sort((a, b) => a.zIndex - b.zIndex)
  const layerRows = [...elements].sort((a, b) => b.zIndex - a.zIndex)
  const moveableTarget = targetEls.length > 1 ? targetEls : (targetEls[0] ?? null)
  const isGroupSelection = targetEls.length > 1

  return (
    <div className="flex h-svh flex-col bg-gray-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Link to="/editor" className="rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100">
            ← Mis diseños
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-transparent px-2 py-1 text-sm font-medium text-gray-900 hover:border-gray-200 focus:border-gray-300 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          {uploading && <span className="text-xs text-gray-400">Subiendo imagen...</span>}
          <span className="text-xs text-gray-400">
            {saveState === 'saving' && 'Guardando...'}
            {saveState === 'saved' && 'Guardado'}
            {publishState === 'publishing' && 'Publicando...'}
            {publishState === 'published' && 'Publicado ✓'}
          </span>
          <button
            type="button"
            onClick={handlePublicarComoMenu}
            disabled={publishState === 'publishing' || !idRestaurante}
            title={
              idRestaurante
                ? 'Usa este diseño como tu menú público: el link y el QR redirigirán acá'
                : 'Necesitas un restaurante activo para publicar'
            }
            className="rounded-md border border-orange-500 px-4 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Publicar como menú
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === 'saving'}
            title="Guardar (Ctrl+S)"
            className="rounded-md bg-orange-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-gray-200 bg-white py-4">
          <IconButton title="Añadir texto" onClick={() => addElement(createTextElement)}>
            T
          </IconButton>
          <IconButton title="Añadir rectángulo" onClick={() => addElement((prev) => createShapeElement(prev, 'rect'))}>
            ▭
          </IconButton>
          <IconButton title="Añadir círculo" onClick={() => addElement((prev) => createShapeElement(prev, 'ellipse'))}>
            ◯
          </IconButton>
          <IconButton title="Subir imagen" onClick={() => fileInputRef.current?.click()}>
            🖼
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <div ref={productPickerRef} className="relative">
            <IconButton
              title="Insertar plato"
              disabled={!idRestaurante}
              onClick={() => setShowProductPicker((v) => !v)}
            >
              🍽
            </IconButton>
            {showProductPicker && (
              <div className="absolute left-full top-0 z-20 ml-2 w-72 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                <p className="mb-2 px-1 text-xs font-semibold text-gray-500">Tus platos</p>
                {loadingProductos && <p className="px-1 text-xs text-gray-400">Cargando...</p>}
                {!loadingProductos && productos.length === 0 && (
                  <p className="px-1 text-xs text-gray-400">
                    No tienes platos registrados. Agrégalos en la pestaña de Platos.
                  </p>
                )}
                <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                  {productos.map((p) => (
                    <li key={p.id_producto} className="flex items-center gap-1.5 rounded-md hover:bg-gray-50">
                      <button
                        type="button"
                        title={p.url_imagen ? 'Insertar foto' : 'Este plato no tiene foto'}
                        disabled={!p.url_imagen}
                        onClick={() => {
                          addElement((prev) => createImageElement(prev, p.url_imagen))
                          setShowProductPicker(false)
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {p.url_imagen ? (
                          <img src={p.url_imagen} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-300">🖼</span>
                        )}
                      </button>
                      <button
                        type="button"
                        title="Insertar nombre"
                        onClick={() => {
                          addElement((prev) => createProductTextElement(prev, p))
                          setShowProductPicker(false)
                        }}
                        className="flex flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                      >
                        <span className={p.agotado ? 'text-gray-400 line-through' : 'text-gray-800'}>
                          {p.nombre}
                        </span>
                        {p.agotado && <span className="text-[10px] font-medium text-red-500">agotado</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div ref={stickerPickerRef} className="relative">
            <IconButton title="Insertar sticker" onClick={() => setShowStickerPicker((v) => !v)}>
              😀
            </IconButton>
            {showStickerPicker && (
              <div className="absolute left-full top-0 z-20 ml-2 w-56 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                <p className="mb-2 px-1 text-xs font-semibold text-gray-500">Stickers</p>
                <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
                  {STICKERS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        addElement((prev) => createStickerElement(prev, emoji))
                        setShowStickerPicker(false)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-gray-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="my-1 h-px w-8 bg-gray-100" />
          <IconButton title="Duplicar (Ctrl+D)" disabled={selectedIds.size === 0} onClick={duplicateSelected}>
            ⧉
          </IconButton>
          <div className="my-1 h-px w-8 bg-gray-100" />
          <IconButton title="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
            ↶
          </IconButton>
          <IconButton title="Rehacer (Ctrl+Y)" disabled={!canRedo} onClick={redo}>
            ↷
          </IconButton>
          <div className="my-1 h-px w-8 bg-gray-100" />
          <IconButton title="Subir capa" disabled={!selectedId} onClick={() => handleReorder('up')}>
            ↑
          </IconButton>
          <IconButton title="Bajar capa" disabled={!selectedId} onClick={() => handleReorder('down')}>
            ↓
          </IconButton>
          <IconButton title="Eliminar" disabled={selectedIds.size === 0} onClick={deleteSelected}>
            🗑
          </IconButton>
        </aside>

        <main
          className="flex flex-1 items-start justify-center overflow-auto p-10"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div
            style={{
              width: canvas.width,
              height: canvas.height,
              background: canvasBackgroundStyle(canvas),
              overflow: 'hidden',
            }}
            className="relative shrink-0 shadow-lg"
            onMouseDown={clearSelection}
          >
            {sortedElements.map((el) => (
              <CanvasElement
                key={el.id}
                el={el}
                isSelected={selectedIds.has(el.id)}
                isEditing={el.id === editingTextId}
                registerRef={(node) => {
                  if (node) targetRefs.current[el.id] = node
                  else delete targetRefs.current[el.id]
                }}
                onSelect={(shiftKey) => selectElement(el.id, shiftKey)}
                onStartEditText={() => setEditingTextId(el.id)}
                onCommitText={(text) => {
                  setEditingTextId(null)
                  updateElement(el.id, { text })
                }}
              />
            ))}

            <Moveable
              target={moveableTarget}
              draggable
              resizable={!isGroupSelection}
              rotatable={!isGroupSelection}
              throttleDrag={0}
              throttleResize={0}
              throttleRotate={0}
              onDrag={({ target, left, top }) => {
                target.style.left = `${left}px`
                target.style.top = `${top}px`
                liveChange.current = { x: left, y: top }
              }}
              onDragEnd={() => {
                if (selectedId && liveChange.current) updateElement(selectedId, liveChange.current)
                liveChange.current = null
              }}
              onDragGroup={({ events }) => {
                events.forEach(({ target, left, top }) => {
                  target.style.left = `${left}px`
                  target.style.top = `${top}px`
                })
              }}
              onDragGroupEnd={({ events }) => {
                setElements((prev) => {
                  let next = prev
                  events.forEach(({ target, left, top }) => {
                    const elId = target.dataset.elId
                    next = next.map((el) => (el.id === elId ? { ...el, x: left, y: top } : el))
                  })
                  return next
                })
              }}
              onResize={({ target, width, height, drag }) => {
                target.style.width = `${width}px`
                target.style.height = `${height}px`
                target.style.left = `${drag.left}px`
                target.style.top = `${drag.top}px`
                if (selected?.isSticker) target.style.fontSize = `${Math.min(width, height) * 0.8}px`
                liveChange.current = { x: drag.left, y: drag.top, width, height }
              }}
              onResizeEnd={() => {
                if (selectedId && liveChange.current) updateElement(selectedId, liveChange.current)
                liveChange.current = null
              }}
              onRotate={({ target, drag, rotation }) => {
                target.style.transform = drag.transform
                liveChange.current = { rotation }
              }}
              onRotateEnd={() => {
                if (selectedId && liveChange.current) updateElement(selectedId, liveChange.current)
                liveChange.current = null
              }}
            />
          </div>
        </main>

        <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4">
          <div className="mb-4 border-b border-gray-100 pb-4">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Capas</h3>
            <p className="mb-2 text-xs text-gray-400">Shift+clic para seleccionar varios.</p>
            {layerRows.length === 0 && <p className="text-xs text-gray-400">Todavía no hay elementos.</p>}
            <ul className="max-h-48 space-y-0.5 overflow-y-auto">
              {layerRows.map((el) => (
                <li
                  key={el.id}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    selectElement(el.id, e.shiftKey)
                  }}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs ${
                    selectedIds.has(el.id) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-5 shrink-0 text-center">{LAYER_ICONS[el.type] ?? '●'}</span>
                  <span className={`flex-1 truncate ${el.hidden ? 'italic text-gray-300' : ''}`}>
                    {layerLabel(el)}
                  </span>
                  <button
                    type="button"
                    title={el.hidden ? 'Mostrar' : 'Ocultar'}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => updateElement(el.id, { hidden: !el.hidden })}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  >
                    {el.hidden ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  <button
                    type="button"
                    title={el.locked ? 'Desbloquear' : 'Bloquear'}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => updateElement(el.id, { locked: !el.locked })}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  >
                    {el.locked ? <LockIcon /> : <UnlockIcon />}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {!selected && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Lienzo</h3>
              <p className="text-xs text-gray-400">
                Selecciona un elemento para editarlo, o ajusta el fondo del diseño aquí.
              </p>
              <div>
                <label className="text-xs font-medium text-gray-500">Relleno</label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {[
                    { value: 'solid', label: 'Sólido' },
                    { value: 'gradient', label: 'Degradado' },
                    { value: 'grid', label: 'Grilla' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCanvas((c) => ({ ...c, fillType: opt.value }))}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                        (canvas.fillType ?? 'solid') === opt.value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Color</label>
                  <input
                    type="color"
                    value={canvas.background}
                    onChange={(e) => setCanvas((c) => ({ ...c, background: e.target.value }))}
                    className="mt-1 h-8 w-full rounded-md border border-gray-200"
                  />
                </div>
                {(canvas.fillType ?? 'solid') === 'gradient' && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Color 2</label>
                    <input
                      type="color"
                      value={canvas.backgroundTo ?? '#FD761A'}
                      onChange={(e) => setCanvas((c) => ({ ...c, backgroundTo: e.target.value }))}
                      className="mt-1 h-8 w-full rounded-md border border-gray-200"
                    />
                  </div>
                )}
              </div>
              {(canvas.fillType ?? 'solid') === 'gradient' && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Ángulo</label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={canvas.gradientAngle ?? 90}
                    onChange={(e) => setCanvas((c) => ({ ...c, gradientAngle: Number(e.target.value) }))}
                    className="mt-2 w-full accent-orange-500"
                  />
                </div>
              )}
              {canvas.fillType === 'grid' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Color de líneas</label>
                    <input
                      type="color"
                      value={canvas.gridColorHex ?? '#FFFFFF'}
                      onChange={(e) =>
                        setCanvas((c) => ({
                          ...c,
                          gridColorHex: e.target.value,
                          gridColor: hexToRgba(e.target.value, c.gridOpacity ?? 8),
                        }))
                      }
                      className="mt-1 h-8 w-full rounded-md border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Intensidad</label>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      value={canvas.gridOpacity ?? 8}
                      onChange={(e) => {
                        const gridOpacity = Number(e.target.value)
                        setCanvas((c) => ({
                          ...c,
                          gridOpacity,
                          gridColor: hexToRgba(c.gridColorHex ?? '#FFFFFF', gridOpacity),
                        }))
                      }}
                      className="mt-2 w-full accent-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Tamaño de celda</label>
                    <input
                      type="range"
                      min={8}
                      max={80}
                      value={canvas.gridSize ?? 32}
                      onChange={(e) => setCanvas((c) => ({ ...c, gridSize: Number(e.target.value) }))}
                      className="mt-2 w-full accent-orange-500"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {selectedIds.size > 1 && (
            <div className="mb-6 space-y-3 border-b border-gray-100 pb-4">
              <h3 className="text-sm font-semibold text-gray-900">{selectedIds.size} elementos seleccionados</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Arrastrá para mover el grupo. Para cambiar tamaño, color o rotación, seleccioná uno solo.
              </p>
            </div>
          )}

          {selectedIds.size === 1 && selected && (
            <div className="mb-6 space-y-3 border-b border-gray-100 pb-4">
              <h3 className="text-sm font-semibold text-gray-900">Posición</h3>
              <div className="grid grid-cols-3 gap-1.5">
                <IconButton title="Alinear a la izquierda" onClick={() => alignSelected('left')}>
                  ⇤
                </IconButton>
                <IconButton title="Centrar horizontal" onClick={() => alignSelected('center-h')}>
                  ↔
                </IconButton>
                <IconButton title="Alinear a la derecha" onClick={() => alignSelected('right')}>
                  ⇥
                </IconButton>
                <IconButton title="Alinear arriba" onClick={() => alignSelected('top')}>
                  ⇧
                </IconButton>
                <IconButton title="Centrar vertical" onClick={() => alignSelected('center-v')}>
                  ↕
                </IconButton>
                <IconButton title="Alinear abajo" onClick={() => alignSelected('bottom')}>
                  ⇩
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">X</label>
                  <input
                    type="number"
                    value={Math.round(selected.x)}
                    onChange={(e) => updateElement(selected.id, { x: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Y</label>
                  <input
                    type="number"
                    value={Math.round(selected.y)}
                    onChange={(e) => updateElement(selected.id, { y: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Ancho</label>
                  <input
                    type="number"
                    min={1}
                    value={Math.round(selected.width)}
                    onChange={(e) => updateElement(selected.id, { width: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Alto</label>
                  <input
                    type="number"
                    min={1}
                    value={Math.round(selected.height)}
                    onChange={(e) => updateElement(selected.id, { height: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Rotación</label>
                  <input
                    type="number"
                    value={Math.round(selected.rotation || 0)}
                    onChange={(e) => updateElement(selected.id, { rotation: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedIds.size === 1 && selected?.type === 'text' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Texto</h3>
              <div>
                <label className="text-xs font-medium text-gray-500">Fuente</label>
                <select
                  value={selected.fontFamily}
                  onChange={(e) => updateElement(selected.id, { fontFamily: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                >
                  {FONT_CATEGORIES.map((category) => (
                    <optgroup key={category.label} label={category.label}>
                      {category.fonts.map((f) => (
                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {selected.isSticker ? (
                <p className="text-xs text-gray-400">
                  El tamaño del sticker sigue al del cuadro: arrastrá una esquina para agrandarlo o achicarlo.
                </p>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-500">Tamaño</label>
                  <input
                    type="number"
                    min={8}
                    max={200}
                    value={selected.fontSize}
                    onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500">Color</label>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                  className="mt-1 h-8 w-full rounded-md border border-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Alineación</label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {['left', 'center', 'right'].map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateElement(selected.id, { align })}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                        selected.align === align
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Grosor</label>
                <select
                  value={selected.fontWeight}
                  onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                >
                  <option value="400">Normal</option>
                  <option value="600">Semi-negrita</option>
                  <option value="700">Negrita</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Espaciado de letras</label>
                <input
                  type="range"
                  min={-2}
                  max={16}
                  step={0.5}
                  value={selected.letterSpacing ?? 0}
                  onChange={(e) => updateElement(selected.id, { letterSpacing: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Interlineado</label>
                <input
                  type="range"
                  min={0.8}
                  max={2.5}
                  step={0.1}
                  value={selected.lineHeight ?? 1.2}
                  onChange={(e) => updateElement(selected.id, { lineHeight: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
              </div>
              <p className="text-xs text-gray-400">Doble clic sobre el texto en el lienzo para editarlo.</p>
            </div>
          )}

          {selectedIds.size === 1 && (selected?.type === 'rect' || selected?.type === 'ellipse') && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Forma</h3>
              <div>
                <label className="text-xs font-medium text-gray-500">Relleno</label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {[
                    { value: 'solid', label: 'Sólido' },
                    { value: 'gradient', label: 'Degradado' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateElement(selected.id, { fillType: opt.value })}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                        (selected.fillType ?? 'solid') === opt.value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Color</label>
                  <input
                    type="color"
                    value={selected.fill}
                    onChange={(e) => updateElement(selected.id, { fill: e.target.value })}
                    className="mt-1 h-8 w-full rounded-md border border-gray-200"
                  />
                </div>
                {selected.fillType === 'gradient' && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Color 2</label>
                    <input
                      type="color"
                      value={selected.fillTo ?? '#FFE8D6'}
                      onChange={(e) => updateElement(selected.id, { fillTo: e.target.value })}
                      className="mt-1 h-8 w-full rounded-md border border-gray-200"
                    />
                  </div>
                )}
              </div>
              {selected.fillType === 'gradient' && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Ángulo</label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selected.gradientAngle ?? 90}
                    onChange={(e) => updateElement(selected.id, { gradientAngle: Number(e.target.value) })}
                    className="mt-2 w-full accent-orange-500"
                  />
                </div>
              )}
              {selected.type === 'rect' && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Radio de bordes</label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={selected.borderRadius}
                    onChange={(e) => updateElement(selected.id, { borderRadius: Number(e.target.value) })}
                    className="mt-2 w-full accent-orange-500"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Color de borde</label>
                  <input
                    type="color"
                    value={selected.strokeColor ?? '#111827'}
                    onChange={(e) => updateElement(selected.id, { strokeColor: e.target.value })}
                    className="mt-1 h-8 w-full rounded-md border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Grosor de borde</label>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={selected.strokeWidth ?? 0}
                    onChange={(e) => updateElement(selected.id, { strokeWidth: Number(e.target.value) })}
                    className="mt-3 w-full accent-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Desenfoque</label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={selected.blur ?? 0}
                  onChange={(e) => updateElement(selected.id, { blur: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
                <p className="mt-1 text-xs text-gray-400">Útil para manchas de luz ambiental detrás de otros elementos.</p>
              </div>
            </div>
          )}

          {selectedIds.size === 1 && selected?.type === 'image' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Imagen</h3>
              <div>
                <label className="text-xs font-medium text-gray-500">Forma</label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {IMAGE_SHAPES.map((shape) => (
                    <button
                      key={shape.value}
                      type="button"
                      title={shape.label}
                      onClick={() => updateElement(selected.id, { shape: shape.value })}
                      className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs ${
                        (selected.shape ?? 'rect') === shape.value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base leading-none">{shape.icon}</span>
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>
              {(selected.shape ?? 'rect') === 'rect' && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Radio de bordes</label>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={selected.borderRadius}
                    onChange={(e) => updateElement(selected.id, { borderRadius: Number(e.target.value) })}
                    className="mt-2 w-full accent-orange-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500">Brillo</label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={selected.brightness ?? 100}
                  onChange={(e) => updateElement(selected.id, { brightness: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Contraste</label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={selected.contrast ?? 100}
                  onChange={(e) => updateElement(selected.id, { contrast: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Blanco y negro</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selected.grayscale ?? 0}
                  onChange={(e) => updateElement(selected.id, { grayscale: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
              </div>
            </div>
          )}

          {selectedIds.size === 1 && selected && (
            <div className="mt-6 space-y-4 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Efectos</h3>
              <div>
                <label className="text-xs font-medium text-gray-500">Opacidad</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={selected.opacity ?? 100}
                  onChange={(e) => updateElement(selected.id, { opacity: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Sombra</label>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={selected.shadow ?? 0}
                  onChange={(e) => updateElement(selected.id, { shadow: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Color de sombra</label>
                  <input
                    type="color"
                    value={selected.shadowColorHex ?? '#000000'}
                    onChange={(e) =>
                      updateElement(selected.id, {
                        shadowColorHex: e.target.value,
                        shadowColor: hexToRgba(e.target.value, selected.shadowOpacity ?? 35),
                      })
                    }
                    className="mt-1 h-8 w-full rounded-md border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Intensidad</label>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={selected.shadowOpacity ?? 35}
                    onChange={(e) => {
                      const shadowOpacity = Number(e.target.value)
                      updateElement(selected.id, {
                        shadowOpacity,
                        shadowColor: hexToRgba(selected.shadowColorHex ?? '#000000', shadowOpacity),
                      })
                    }}
                    className="mt-3 w-full accent-orange-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Usa un color de marca para un brillo (glow) en vez de una sombra realista negra.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function CanvasElement({ el, isSelected, isEditing, registerRef, onSelect, onStartEditText, onCommitText }) {
  const style = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: `rotate(${el.rotation || 0}deg)`,
    zIndex: el.zIndex,
    outline: isSelected ? '2px solid #6366f1' : 'none',
    outlineOffset: 2,
    cursor: el.locked ? 'default' : isEditing ? 'text' : 'move',
    opacity: (el.opacity ?? 100) / 100,
    boxSizing: 'border-box',
  }

  function handleMouseDown(e) {
    e.stopPropagation()
    onSelect(e.shiftKey)
  }

  if (el.type === 'text') {
    const fontSize = el.isSticker ? Math.min(el.width, el.height) * 0.8 : el.fontSize
    return (
      <div
        ref={registerRef}
        data-el-id={el.id}
        style={{
          ...style,
          fontFamily: el.fontFamily,
          fontSize,
          color: el.color,
          fontWeight: el.fontWeight,
          textAlign: el.align,
          letterSpacing: `${el.letterSpacing ?? 0}px`,
          lineHeight: el.lineHeight ?? 1.2,
          textShadow: el.shadow ? `0 0 ${el.shadow}px ${el.shadowColor ?? 'rgba(0,0,0,0.35)'}` : undefined,
          overflow: 'hidden',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onStartEditText()
        }}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={(e) => onCommitText(e.currentTarget.textContent)}
      >
        {el.text}
      </div>
    )
  }

  if (el.type === 'image') {
    const clipPath = clipPathFor(el.shape)
    const filters = [
      `brightness(${el.brightness ?? 100}%)`,
      `contrast(${el.contrast ?? 100}%)`,
      `grayscale(${el.grayscale ?? 0}%)`,
    ]
    if (el.shadow) filters.push(`drop-shadow(0 0 ${el.shadow}px ${el.shadowColor ?? 'rgba(0,0,0,0.35)'})`)
    return (
      <img
        ref={registerRef}
        data-el-id={el.id}
        src={el.src}
        alt=""
        style={{
          ...style,
          objectFit: 'cover',
          borderRadius: clipPath ? 0 : el.borderRadius,
          clipPath: clipPath ?? undefined,
          filter: filters.join(' '),
        }}
        onMouseDown={handleMouseDown}
        draggable={false}
      />
    )
  }

  return (
    <div
      ref={registerRef}
      data-el-id={el.id}
      style={{
        ...style,
        background: shapeBackgroundStyle(el),
        borderRadius: el.type === 'ellipse' ? '50%' : el.borderRadius,
        border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor ?? '#111827'}` : undefined,
        boxShadow: el.shadow ? `0 0 ${el.shadow}px ${el.shadowColor ?? 'rgba(0,0,0,0.35)'}` : undefined,
        filter: el.blur ? `blur(${el.blur}px)` : undefined,
      }}
      onMouseDown={handleMouseDown}
    />
  )
}

export default EditorCanvas
