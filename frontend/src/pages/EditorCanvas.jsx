import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Moveable from 'react-moveable'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { useRestaurante } from '../context/RestauranteContext'
import { datosDelBloque, formatPrecio } from '../lib/disenoProductos'
import { documentToHtml, estilosBloqueProducto } from '../lib/editorExport'
import { cargarFuentesDelEditor } from '../lib/fuentes'

const DEFAULT_CANVAS = { width: 800, height: 1000, background: '#ffffff' }
const MAX_HISTORY = 100
const CANVAS_MIN_SIZE = 100
const CANVAS_MAX_SIZE = 4000

// Tamaños rápidos para el lienzo, además de poder tipear un ancho/alto
// custom. Cubren los formatos más comunes que ya usan las plantillas.
const CANVAS_SIZE_PRESETS = [
  { label: 'Menú vertical', width: 800, height: 1000 },
  { label: 'Post cuadrado', width: 1080, height: 1080 },
  { label: 'Story', width: 1080, height: 1920 },
  { label: 'Banner horizontal', width: 1600, height: 900 },
]

function clampCanvasSize(value) {
  const n = Math.round(Number(value))
  if (Number.isNaN(n)) return CANVAS_MIN_SIZE
  return Math.min(CANVAS_MAX_SIZE, Math.max(CANVAS_MIN_SIZE, n))
}

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

// Bloque de plato vinculado (ver lib/disenoProductos.js): guarda el id del
// plato y una copia de respaldo de sus datos. Nombre, precio y "agotado" se
// leen del plato actual, tanto en el lienzo como en el menú publicado.
function createProductBlockElement(elements, producto) {
  const conDescripcion = Boolean(producto.descripcion?.trim())
  return {
    id: newId(),
    type: 'product',
    x: 80,
    y: 80,
    width: 460,
    height: conDescripcion ? 86 : 44,
    rotation: 0,
    zIndex: nextZIndex(elements),
    productoId: producto.id_producto,
    snapshot: { nombre: producto.nombre, precio: producto.precio, descripcion: producto.descripcion ?? '' },
    fontFamily: FONT_OPTIONS[0].value,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    priceColor: '#E4650E',
    showPrice: true,
    showDescription: conDescripcion,
    opacity: 100,
    shadow: 0,
  }
}

// Al guardar, la copia de respaldo de cada bloque se refresca con los datos
// actuales (la miniatura en "Mis diseños" y el HTML exportado salen al día).
function conDatosActuales(elements, productos) {
  if (!productos.length) return elements
  return elements.map((el) => {
    if (el.type !== 'product') return el
    const p = productos.find((x) => x.id_producto === el.productoId)
    return p ? { ...el, snapshot: { nombre: p.nombre, precio: p.precio, descripcion: p.descripcion ?? '' } } : el
  })
}

// Un diseño de 800px de ancho se ve a ~390px en un celular: la letra queda
// a menos de la mitad. Antes de publicar se avisa qué textos quedarían por
// debajo de un mínimo legible.
const ANCHO_CELULAR = 390
const LETRA_MINIMA_CELULAR = 11

function textosChicosEnCelular(elements, canvas) {
  const factor = ANCHO_CELULAR / canvas.width
  return elements.filter((el) => {
    if (el.hidden) return false
    if (el.type === 'text' && !el.isSticker) return el.fontSize * factor < LETRA_MINIMA_CELULAR
    if (el.type === 'product') {
      const s = estilosBloqueProducto(el)
      const menor = el.showDescription === false ? s.fila.fontSize : s.descripcion.fontSize
      return menor * factor < LETRA_MINIMA_CELULAR
    }
    return false
  })
}

const AUTOGUARDADO_MS = 2500
const ZOOM_MIN = 0.1
const ZOOM_MAX = 3

function Svg({ children, className = 'h-[18px] w-[18px]' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  )
}

const Iconos = {
  texto: () => (
    <Svg>
      <path d="M5 7V5h14v2M12 5v14M9 19h6" />
    </Svg>
  ),
  rect: () => (
    <Svg>
      <rect x="4" y="5" width="16" height="14" rx="2" />
    </Svg>
  ),
  circulo: () => (
    <Svg>
      <circle cx="12" cy="12" r="8" />
    </Svg>
  ),
  imagen: () => (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </Svg>
  ),
  plato: () => (
    <Svg>
      <path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 21V3c-2 1.2-3 4-3 7s1 4 3 4" />
    </Svg>
  ),
  sticker: () => (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
    </Svg>
  ),
  duplicar: () => (
    <Svg>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </Svg>
  ),
  deshacer: () => (
    <Svg>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </Svg>
  ),
  rehacer: () => (
    <Svg>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
    </Svg>
  ),
  subir: () => (
    <Svg>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Svg>
  ),
  bajar: () => (
    <Svg>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </Svg>
  ),
  eliminar: () => (
    <Svg>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Svg>
  ),
  ajustes: () => (
    <Svg>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </Svg>
  ),
  volver: () => (
    <Svg>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  ),
  mas: () => (
    <Svg className="h-4 w-4">
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  menos: () => (
    <Svg className="h-4 w-4">
      <path d="M5 12h14" />
    </Svg>
  ),
  cerrar: () => (
    <Svg className="h-4 w-4">
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  ),
  alinIzq: () => (
    <Svg className="h-4 w-4">
      <path d="M4 4v16M8 8h11M8 16h7" />
    </Svg>
  ),
  alinCentroH: () => (
    <Svg className="h-4 w-4">
      <path d="M12 4v16M6 8h12M8 16h8" />
    </Svg>
  ),
  alinDer: () => (
    <Svg className="h-4 w-4">
      <path d="M20 4v16M5 8h11M9 16h7" />
    </Svg>
  ),
  alinArriba: () => (
    <Svg className="h-4 w-4">
      <path d="M4 4h16M8 8v11M16 8v7" />
    </Svg>
  ),
  alinCentroV: () => (
    <Svg className="h-4 w-4">
      <path d="M4 12h16M8 6v12M16 8v8" />
    </Svg>
  ),
  alinAbajo: () => (
    <Svg className="h-4 w-4">
      <path d="M4 20h16M8 5v11M16 9v7" />
    </Svg>
  ),
}

const LAYER_ICONS = {
  text: Iconos.texto,
  image: Iconos.imagen,
  rect: Iconos.rect,
  ellipse: Iconos.circulo,
  product: Iconos.plato,
}

function layerLabel(el, productos) {
  if (el.type === 'product') return datosDelBloque(el, productos).nombre || 'Plato'
  if (el.type === 'text') return el.text?.trim() ? el.text.slice(0, 24) : 'Texto'
  if (el.type === 'image') return 'Imagen'
  if (el.type === 'rect') return 'Rectángulo'
  if (el.type === 'ellipse') return 'Círculo'
  return el.type
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

function IconButton({ onClick, disabled, title, children, activo = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border transition-colors disabled:cursor-not-allowed disabled:opacity-35 md:h-9 md:w-9 ${
        activo
          ? 'border-navy bg-navy text-white'
          : 'border-[#E2E8F0] bg-white text-navy hover:border-orange hover:text-orange-dark'
      }`}
    >
      {children}
    </button>
  )
}

function Separador() {
  return <div className="mx-0.5 h-6 w-px shrink-0 bg-[#E2E8F0] md:mx-0 md:my-1 md:h-px md:w-8" />
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onPointerDown={onClose}>
      <div
        className="max-h-[85svh] w-full max-w-md overflow-y-auto rounded-[14px] bg-white p-6 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function IconoCapa({ tipo }) {
  const Icono = LAYER_ICONS[tipo]
  return (
    <span className="flex w-5 shrink-0 justify-center text-[#8A94A6] [&>svg]:h-3.5 [&>svg]:w-3.5">
      {Icono ? <Icono /> : '•'}
    </span>
  )
}

function AvisoDesborde({ onAjustar }) {
  return (
    <div className="rounded-[9px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
      <p>El texto no entra en su cuadro y se verá cortado.</p>
      <button type="button" onClick={onAjustar} className="mt-1 font-semibold underline">
        Agrandar el cuadro
      </button>
    </div>
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

  // Historial de undo/redo: cada entrada es {elements, canvas}, así que
  // los cambios del lienzo (tamaño, fondo) también se pueden deshacer.
  // Cada acción "de commit" empuja un estado nuevo; undo/redo solo mueven
  // el índice.
  const [history, setHistoryState] = useState({ stack: [{ elements: [], canvas: DEFAULT_CANVAS }], index: 0 })
  const { elements, canvas } = history.stack[history.index]
  const canUndo = history.index > 0
  const canRedo = history.index < history.stack.length - 1

  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [editingTextId, setEditingTextId] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [publishState, setPublishState] = useState('idle')
  const [uploading, setUploading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [productos, setProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  // Guardado: la "firma" es el documento serializado; si difiere de la
  // última guardada hay cambios pendientes (autoguardado + aviso al salir).
  const [firmaGuardada, setFirmaGuardada] = useState(() =>
    JSON.stringify({ title: 'Diseño sin título', canvas: DEFAULT_CANVAS, elements: [] }),
  )
  const [estadoGuardado, setEstadoGuardado] = useState('ok') // ok | guardando | error
  const [confirmarSalir, setConfirmarSalir] = useState(false)
  const [confirmarPublicar, setConfirmarPublicar] = useState(false)
  const [aviso, setAviso] = useState(null) // { tipo: 'ok' | 'error', texto }
  const [panelAbierto, setPanelAbierto] = useState(false) // solo celular
  const [desbordes, setDesbordes] = useState({}) // id → alto necesario del texto cortado

  const [area, setArea] = useState({ w: 0, h: 0 })
  const [zoomManual, setZoomManual] = useState(null) // null = ajustar a la pantalla

  const targetRefs = useRef({})
  const [targetEls, setTargetEls] = useState([])
  const liveChange = useRef(null)
  const fileInputRef = useRef(null)
  const productPickerRef = useRef(null)
  const stickerPickerRef = useRef(null)
  const areaRef = useRef(null)
  const cargadoIdRef = useRef(null)
  const guardadoEnCursoRef = useRef(null)

  const firma = useMemo(() => JSON.stringify({ title, canvas, elements }), [title, canvas, elements])
  const hayCambios = firma !== firmaGuardada

  // Estado más reciente para callbacks estables (atajos de teclado,
  // autoguardado) que si no leerían valores viejos de su closure.
  const actualRef = useRef({})
  actualRef.current = { title, canvas, elements, docId, productos, firma, hayCambios, selectedIds }

  const mostrarAviso = useCallback((tipo, texto) => setAviso({ tipo, texto, id: Date.now() }), [])

  useEffect(() => {
    if (!aviso) return undefined
    const t = setTimeout(() => setAviso(null), 4500)
    return () => clearTimeout(t)
  }, [aviso])

  useEffect(() => {
    cargarFuentesDelEditor()
  }, [])

  const empujar = useCallback((cambio) => {
    setHistoryState((h) => {
      const actual = h.stack[h.index]
      const siguiente = cambio(actual)
      if (siguiente === actual) return h
      let stack = h.stack.slice(0, h.index + 1)
      stack.push(siguiente)
      if (stack.length > MAX_HISTORY) stack = stack.slice(stack.length - MAX_HISTORY)
      return { stack, index: stack.length - 1 }
    })
  }, [])

  const setElements = useCallback(
    (updater) =>
      empujar((actual) => {
        const next = typeof updater === 'function' ? updater(actual.elements) : updater
        return next === actual.elements ? actual : { ...actual, elements: next }
      }),
    [empujar],
  )

  const setCanvas = useCallback(
    (updater) =>
      empujar((actual) => ({
        ...actual,
        canvas: typeof updater === 'function' ? updater(actual.canvas) : updater,
      })),
    [empujar],
  )

  const resetDocumento = useCallback((initialElements, initialCanvas) => {
    setHistoryState({ stack: [{ elements: initialElements, canvas: initialCanvas }], index: 0 })
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

  // El elemento nuevo (con su id aleatorio) se crea FUERA del updater de
  // estado: React puede ejecutar un updater dos veces, y entonces la
  // selección apuntaba a un id distinto del elemento que quedaba guardado.
  const addElement = useCallback(
    (factory) => {
      const el = factory(actualRef.current.elements)
      setElements((prev) => [...prev, el])
      setSelectedIds(new Set([el.id]))
      setSelectedId(el.id)
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

  // Igual que addElement: las copias se arman fuera de los updaters.
  const duplicateSelected = useCallback(() => {
    const ids = actualRef.current.selectedIds
    if (!ids || ids.size === 0) return
    const actuales = actualRef.current.elements
    let z = nextZIndex(actuales) - 1
    const copies = actuales
      .filter((el) => ids.has(el.id))
      .map((el) => {
        z += 1
        return { ...el, id: newId(), x: el.x + 20, y: el.y + 20, zIndex: z }
      })
    setElements((prev) => [...prev, ...copies])
    setSelectedIds(new Set(copies.map((c) => c.id)))
    setSelectedId(copies.at(-1)?.id ?? null)
  }, [setElements])

  const reportarDesborde = useCallback((elId, altura) => {
    setDesbordes((d) => {
      if ((d[elId] ?? null) === altura) return d
      const n = { ...d }
      if (altura == null) delete n[elId]
      else n[elId] = altura
      return n
    })
  }, [])

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
    if (isNew) return undefined
    // Tras crear un diseño nuevo se navega a /editor/<id>: ya está cargado
    // en memoria, no hay que volver a pedirlo (pisaría lo que se editó).
    if (cargadoIdRef.current === Number(id)) return undefined
    let cancelled = false
    apiClient
      .get(`/editor/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        const canvasInicial = data.data_json?.canvas ?? DEFAULT_CANVAS
        const elementosIniciales = data.data_json?.elements ?? []
        cargadoIdRef.current = data.id
        setDocId(data.id)
        setTitle(data.title)
        resetDocumento(elementosIniciales, canvasInicial)
        setFirmaGuardada(JSON.stringify({ title: data.title, canvas: canvasInicial, elements: elementosIniciales }))
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
  }, [id, isNew, resetDocumento])

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

  // Platos ya registrados en Gestión de Productos: se insertan como bloques
  // vinculados (nombre + precio) y alimentan su vista en el lienzo.
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
    window.addEventListener('pointerdown', handleClickOutside)
    return () => window.removeEventListener('pointerdown', handleClickOutside)
  }, [showProductPicker, showStickerPicker])

  // Guarda el documento tal como está AHORA (lee actualRef, no el closure)
  // y devuelve su id. Si ya hay un guardado en curso espera a que termine,
  // para no crear dos documentos al guardar por primera vez.
  const guardar = useCallback(async () => {
    if (guardadoEnCursoRef.current) await guardadoEnCursoRef.current.catch(() => {})
    const actual = actualRef.current
    if (!actual.hayCambios && actual.docId) return actual.docId

    const tarea = (async () => {
      setEstadoGuardado('guardando')
      const doc = { canvas: actual.canvas, elements: conDatosActuales(actual.elements, actual.productos) }
      const { data } = await apiClient.post('/editor/save', {
        id: actual.docId,
        title: actual.title,
        data_json: doc,
        html_content: documentToHtml(doc),
      })
      actualRef.current.docId = data.id
      setDocId(data.id)
      setFirmaGuardada(actual.firma)
      setEstadoGuardado('ok')
      if (!actual.docId) {
        cargadoIdRef.current = data.id
        navigate(`/editor/${data.id}`, { replace: true })
      }
      return data.id
    })()

    guardadoEnCursoRef.current = tarea
    try {
      return await tarea
    } catch (err) {
      setEstadoGuardado('error')
      throw err
    } finally {
      if (guardadoEnCursoRef.current === tarea) guardadoEnCursoRef.current = null
    }
  }, [navigate])

  const guardarAMano = useCallback(async () => {
    try {
      await guardar()
    } catch (err) {
      mostrarAviso('error', err.response?.data?.error ?? 'No se pudo guardar el diseño.')
    }
  }, [guardar, mostrarAviso])

  // Autoguardado: unos segundos después del último cambio. Un diseño nuevo
  // y vacío no se guarda (evita llenar "Mis diseños" de borradores en blanco).
  useEffect(() => {
    if (loading || notFound || !hayCambios) return undefined
    if (!docId && elements.length === 0) return undefined
    const t = setTimeout(() => {
      guardar().catch(() => {})
    }, AUTOGUARDADO_MS)
    return () => clearTimeout(t)
  }, [firma, hayCambios, loading, notFound, docId, elements.length, guardar])

  // Cerrar la pestaña o recargar con cambios sin guardar: aviso del navegador.
  useEffect(() => {
    if (!hayCambios) return undefined
    const avisar = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  async function volverAMisDisenos() {
    if (hayCambios && (docId || elements.length > 0)) {
      try {
        await guardar()
      } catch {
        setConfirmarSalir(true)
        return
      }
    }
    navigate('/editor')
  }

  useEffect(() => {
    function handleKeyDown(e) {
      const active = document.activeElement
      const isTyping = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.isContentEditable
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod && key === 's') {
        e.preventDefault()
        guardarAMano()
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
      if (mod && key === '0') {
        e.preventDefault()
        setZoomManual(null)
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
  }, [selectedIds, undo, redo, duplicateSelected, deleteSelected, setElements, guardarAMano])

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
      mostrarAviso('error', err.response?.data?.error ?? 'No se pudo subir la imagen.')
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

  // Usa este diseño (ya guardado y saneado por el backend) como el menú
  // público del restaurante: lo mete en el borrador del menú principal y lo
  // publica de una — así el link/QR redirige directo a este diseño. Se
  // llama solo después de confirmar en el modal (ver confirmarPublicar).
  async function handlePublicarComoMenu() {
    setConfirmarPublicar(false)
    if (!idRestaurante) {
      mostrarAviso('error', 'Necesitas un restaurante activo para publicar un menú.')
      return
    }
    setPublishState('publishing')
    try {
      const savedId = await guardar()
      const { data: menus } = await apiClient.get(`/restaurantes/${idRestaurante}/menus`)
      const principal = menus.find((m) => m.es_principal)
      if (!principal) {
        mostrarAviso('error', 'Este restaurante todavía no tiene un menú principal.')
        setPublishState('idle')
        return
      }
      await apiClient.post(`/restaurantes/${idRestaurante}/menus/${principal.id_menu}/publicar-diseno`, {
        id_documento: savedId,
      })
      setPublishState('idle')
      mostrarAviso('ok', '¡Listo! Tu menú público ya muestra este diseño.')
    } catch (err) {
      setPublishState('idle')
      mostrarAviso('error', err.response?.data?.error ?? 'No se pudo publicar el menú.')
    }
  }

  // Tamaño disponible para el lienzo, para "ajustar a la pantalla".
  useLayoutEffect(() => {
    const nodo = areaRef.current
    if (!nodo) return undefined
    const medir = () => setArea({ w: nodo.clientWidth, h: nodo.clientHeight })
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(nodo)
    return () => observer.disconnect()
  }, [loading, notFound])

  const margenArea = area.w && area.w < 640 ? 12 : 40
  const zoomAjuste = area.w
    ? Math.max(
        ZOOM_MIN,
        Math.min((area.w - margenArea * 2) / canvas.width, (area.h - margenArea * 2) / canvas.height, 1),
      )
    : 1
  const zoom = zoomManual ?? zoomAjuste
  const cambiarZoom = (factor) =>
    setZoomManual((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (z ?? zoomAjuste) * factor)))

  if (loading) {
    return (
      <div className="flex h-svh items-center justify-center bg-[#F6F8FC]">
        <p className="text-sm text-[#8A94A6]">Cargando editor...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-3 bg-[#F6F8FC]">
        <p className="text-sm text-[#4A5568]">No se encontró ese diseño.</p>
        <Link to="/editor" className="text-sm font-semibold text-orange-dark">
          Volver a mis diseños
        </Link>
      </div>
    )
  }

  const sortedElements = [...elements].filter((el) => !el.hidden).sort((a, b) => a.zIndex - b.zIndex)
  const layerRows = [...elements].sort((a, b) => b.zIndex - a.zIndex)
  const moveableTarget = targetEls.length > 1 ? targetEls : (targetEls[0] ?? null)
  const isGroupSelection = targetEls.length > 1
  const textosChicos = confirmarPublicar ? textosChicosEnCelular(elements, canvas) : []
  const textosCortados = Object.keys(desbordes).filter((elId) => elements.some((el) => el.id === elId && !el.hidden))
  const datosSeleccionado = selected?.type === 'product' ? datosDelBloque(selected, productos) : null

  const textoGuardado =
    estadoGuardado === 'guardando'
      ? 'Guardando...'
      : estadoGuardado === 'error'
        ? 'No se pudo guardar'
        : hayCambios
          ? 'Cambios sin guardar'
          : docId
            ? 'Guardado'
            : ''

  return (
    <div className="flex h-svh flex-col bg-[#F6F8FC]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={volverAMisDisenos}
            className="flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-1.5 text-[13px] font-semibold text-[#4A5568] hover:bg-[#F6F8FC] hover:text-navy"
          >
            <Iconos.volver />
            <span className="hidden sm:inline">Mis diseños</span>
          </button>
          <div className="hidden h-5 w-px bg-[#E2E8F0] sm:block" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Nombre del diseño"
            className="w-28 min-w-0 rounded-[8px] border border-transparent px-2 py-1 text-[13.5px] font-semibold text-navy hover:border-[#E2E8F0] focus:border-orange focus:outline-none sm:w-56"
          />
          <span
            className={`hidden whitespace-nowrap text-xs md:inline ${
              estadoGuardado === 'error' ? 'font-semibold text-[#DC2626]' : 'text-[#8A94A6]'
            }`}
          >
            {uploading ? 'Subiendo imagen...' : textoGuardado}
          </span>
          {estadoGuardado === 'error' && (
            <button
              type="button"
              onClick={guardarAMano}
              className="hidden text-xs font-semibold text-orange-dark underline md:inline"
            >
              Reintentar
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmarPublicar(true)}
            disabled={publishState === 'publishing' || !idRestaurante}
            title={
              idRestaurante
                ? 'Usa este diseño como tu menú público: el link y el QR mostrarán este diseño'
                : 'Necesitas un restaurante activo para publicar'
            }
            className="h-9 rounded-[9px] border border-orange px-3 text-[13px] font-semibold text-orange-dark hover:bg-orange-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
          >
            {publishState === 'publishing' ? 'Publicando...' : (
              <>
                Publicar<span className="hidden sm:inline"> como menú</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={guardarAMano}
            disabled={estadoGuardado === 'guardando'}
            title="Guardar (Ctrl+S). También se guarda solo mientras editas."
            className="h-9 rounded-[9px] bg-orange px-3 text-[13px] font-semibold text-white hover:bg-orange-dark disabled:opacity-60 sm:px-4"
          >
            Guardar
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="order-last flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-[#E2E8F0] bg-white px-2 py-2 md:order-none md:w-16 md:flex-col md:gap-2 md:overflow-visible md:border-r md:border-t-0 md:px-0 md:py-4">
          <IconButton title="Añadir texto" onClick={() => addElement(createTextElement)}>
            <Iconos.texto />
          </IconButton>
          <div ref={productPickerRef} className="md:relative">
            <IconButton
              title="Insertar plato con su precio"
              disabled={!idRestaurante}
              activo={showProductPicker}
              onClick={() => setShowProductPicker((v) => !v)}
            >
              <Iconos.plato />
            </IconButton>
            {showProductPicker && (
              <div className="fixed inset-x-2 bottom-[68px] z-40 rounded-[12px] border border-[#E2E8F0] bg-white p-2 shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:left-full md:top-0 md:ml-2 md:w-80">
                <p className="px-1.5 pt-1 text-[13px] font-bold text-navy">Tus platos</p>
                <p className="mb-2 px-1.5 text-[11.5px] leading-snug text-[#8A94A6]">
                  Se insertan con nombre y precio, y se actualizan solos si los cambias en Gestión de Productos.
                </p>
                {loadingProductos && <p className="px-1.5 text-xs text-[#8A94A6]">Cargando...</p>}
                {!loadingProductos && productos.length === 0 && (
                  <p className="px-1.5 pb-1.5 text-xs text-[#8A94A6]">
                    No tienes platos registrados.{' '}
                    <Link to="/products" className="font-semibold text-orange-dark underline">
                      Agrégalos aquí
                    </Link>
                    .
                  </p>
                )}
                <ul className="max-h-[45svh] space-y-0.5 overflow-y-auto md:max-h-72">
                  {productos.map((p) => (
                    <li key={p.id_producto} className="flex items-center gap-1 rounded-[8px] hover:bg-[#F6F8FC]">
                      <button
                        type="button"
                        title="Insertar plato con su precio"
                        onClick={() => {
                          addElement((prev) => createProductBlockElement(prev, p))
                          setShowProductPicker(false)
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] p-1.5 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-[#F6F8FC] text-[#8A94A6]">
                          {p.url_imagen ? <img src={p.url_imagen} alt="" className="h-full w-full object-cover" /> : <Iconos.plato />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-[13px] font-semibold ${p.agotado ? 'text-[#8A94A6]' : 'text-navy'}`}
                          >
                            {p.nombre}
                          </span>
                          <span className="text-[11.5px] text-[#8A94A6]">
                            {formatPrecio(p.precio)}
                            {p.agotado && <span className="font-semibold text-[#DC2626]"> · agotado</span>}
                          </span>
                        </span>
                      </button>
                      {p.url_imagen && (
                        <button
                          type="button"
                          title="Insertar solo la foto"
                          aria-label={`Insertar foto de ${p.nombre}`}
                          onClick={() => {
                            addElement((prev) => createImageElement(prev, p.url_imagen))
                            setShowProductPicker(false)
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[#8A94A6] hover:bg-white hover:text-navy"
                        >
                          <Iconos.imagen />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <IconButton title="Subir imagen" onClick={() => fileInputRef.current?.click()}>
            <Iconos.imagen />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <IconButton title="Añadir rectángulo" onClick={() => addElement((prev) => createShapeElement(prev, 'rect'))}>
            <Iconos.rect />
          </IconButton>
          <IconButton title="Añadir círculo" onClick={() => addElement((prev) => createShapeElement(prev, 'ellipse'))}>
            <Iconos.circulo />
          </IconButton>
          <div ref={stickerPickerRef} className="md:relative">
            <IconButton title="Insertar sticker" activo={showStickerPicker} onClick={() => setShowStickerPicker((v) => !v)}>
              <Iconos.sticker />
            </IconButton>
            {showStickerPicker && (
              <div className="fixed inset-x-2 bottom-[68px] z-40 rounded-[12px] border border-[#E2E8F0] bg-white p-2 shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:left-full md:top-0 md:ml-2 md:w-60">
                <p className="mb-2 px-1 text-[13px] font-bold text-navy">Stickers</p>
                <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto md:grid-cols-6">
                  {STICKERS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        addElement((prev) => createStickerElement(prev, emoji))
                        setShowStickerPicker(false)
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-[7px] text-lg hover:bg-[#F6F8FC]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Separador />
          <IconButton title="Deshacer (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
            <Iconos.deshacer />
          </IconButton>
          <IconButton title="Rehacer (Ctrl+Y)" disabled={!canRedo} onClick={redo}>
            <Iconos.rehacer />
          </IconButton>
          <Separador />
          <IconButton title="Duplicar (Ctrl+D)" disabled={selectedIds.size === 0} onClick={duplicateSelected}>
            <Iconos.duplicar />
          </IconButton>
          <IconButton title="Traer al frente" disabled={!selectedId} onClick={() => handleReorder('up')}>
            <Iconos.subir />
          </IconButton>
          <IconButton title="Enviar atrás" disabled={!selectedId} onClick={() => handleReorder('down')}>
            <Iconos.bajar />
          </IconButton>
          <IconButton title="Eliminar (Supr)" disabled={selectedIds.size === 0} onClick={deleteSelected}>
            <Iconos.eliminar />
          </IconButton>
          <div className="md:hidden">
            <Separador />
          </div>
          <div className="md:hidden">
            <IconButton title="Propiedades y capas" activo={panelAbierto} onClick={() => setPanelAbierto((v) => !v)}>
              <Iconos.ajustes />
            </IconButton>
          </div>
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <main
            ref={areaRef}
            className="min-h-0 flex-1 overflow-auto"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget || e.target.dataset.fondoArea) clearSelection()
            }}
          >
            <div
              data-fondo-area="1"
              className="flex min-h-full min-w-full items-center justify-center"
              style={{ padding: margenArea, width: 'max-content' }}
            >
              <div
                className="relative shrink-0 shadow-lg"
                style={{ width: canvas.width * zoom, height: canvas.height * zoom }}
              >
                <div
                  style={{
                    width: canvas.width,
                    height: canvas.height,
                    background: canvasBackgroundStyle(canvas),
                    overflow: 'hidden',
                    transform: `scale(${zoom})`,
                    transformOrigin: '0 0',
                  }}
                  className="absolute left-0 top-0"
                  onPointerDown={clearSelection}
                >
                  {sortedElements.map((el) => (
                    <CanvasElement
                      key={el.id}
                      el={el}
                      productos={productos}
                      zoom={zoom}
                      isSelected={selectedIds.has(el.id)}
                      isEditing={el.id === editingTextId}
                      desborda={Boolean(desbordes[el.id])}
                      onDesborde={reportarDesborde}
                      registerRef={(node) => {
                        if (node) targetRefs.current[el.id] = node
                        else delete targetRefs.current[el.id]
                      }}
                      onSelect={(shiftKey) => selectElement(el.id, shiftKey)}
                      onStartEditText={() => setEditingTextId(el.id)}
                      onCommitText={(text, alturaNecesaria) => {
                        setEditingTextId(null)
                        // El cuadro crece solo si el texto nuevo no entra.
                        updateElement(el.id, alturaNecesaria ? { text, height: alturaNecesaria } : { text })
                      }}
                    />
                  ))}

                  <Moveable
                    target={moveableTarget}
                    zoom={1 / zoom}
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
              </div>
            </div>
          </main>

          {elements.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-xs rounded-[14px] border border-[#E2E8F0] bg-white/95 px-5 py-4 text-center shadow-lg">
                <p className="text-[14px] font-bold text-navy">Empieza tu diseño</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#4A5568]">
                  Agrega textos, imágenes o <span className="font-semibold">tus platos con su precio</span> desde la
                  barra de herramientas. También puedes arrastrar una foto aquí.
                </p>
              </div>
            </div>
          )}

          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-[10px] border border-[#E2E8F0] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => cambiarZoom(1 / 1.25)}
              title="Alejar"
              aria-label="Alejar"
              className="flex h-8 w-8 items-center justify-center rounded-[7px] text-navy hover:bg-[#F6F8FC]"
            >
              <Iconos.menos />
            </button>
            <button
              type="button"
              onClick={() => setZoomManual(null)}
              title="Ajustar a la pantalla (Ctrl+0)"
              className={`h-8 min-w-14 rounded-[7px] px-2 text-[12px] font-semibold hover:bg-[#F6F8FC] ${
                zoomManual === null ? 'text-orange-dark' : 'text-navy'
              }`}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => cambiarZoom(1.25)}
              title="Acercar"
              aria-label="Acercar"
              className="flex h-8 w-8 items-center justify-center rounded-[7px] text-navy hover:bg-[#F6F8FC]"
            >
              <Iconos.mas />
            </button>
          </div>
        </div>

        <aside
          className={`${
            panelAbierto ? 'block' : 'hidden'
          } fixed inset-x-0 bottom-0 z-40 max-h-[62svh] overflow-y-auto rounded-t-2xl border-t border-[#E2E8F0] bg-white p-4 shadow-2xl md:static md:block md:max-h-none md:w-72 md:shrink-0 md:rounded-none md:border-l md:border-t-0 md:shadow-none`}
        >
          <div className="mb-3 flex items-center justify-between md:hidden">
            <span className="text-sm font-bold text-navy">Propiedades</span>
            <button
              type="button"
              onClick={() => setPanelAbierto(false)}
              aria-label="Cerrar panel"
              className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#4A5568] hover:bg-[#F6F8FC]"
            >
              <Iconos.cerrar />
            </button>
          </div>
          <div className="mb-4 border-b border-[#E2E8F0] pb-4">
            <h3 className="mb-1 text-sm font-bold text-navy">Capas</h3>
            <p className="hidden md:block mb-2 text-xs text-[#8A94A6]">Shift+clic para seleccionar varios.</p>
            {layerRows.length === 0 && <p className="text-xs text-[#8A94A6]">Todavía no hay elementos.</p>}
            <ul className="max-h-48 space-y-0.5 overflow-y-auto">
              {layerRows.map((el) => (
                <li
                  key={el.id}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    selectElement(el.id, e.shiftKey)
                  }}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs ${
                    selectedIds.has(el.id) ? 'bg-orange-light text-navy' : 'text-[#4A5568] hover:bg-[#F6F8FC]'
                  }`}
                >
                  <IconoCapa tipo={el.type} />
                  <span className={`flex-1 truncate ${el.hidden ? 'italic text-gray-300' : ''}`}>
                    {layerLabel(el, productos)}
                  </span>
                  <button
                    type="button"
                    title={el.hidden ? 'Mostrar' : 'Ocultar'}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => updateElement(el.id, { hidden: !el.hidden })}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  >
                    {el.hidden ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  <button
                    type="button"
                    title={el.locked ? 'Desbloquear' : 'Bloquear'}
                    onPointerDown={(e) => e.stopPropagation()}
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
              <h3 className="text-sm font-bold text-navy">Lienzo</h3>
              <p className="text-xs text-[#8A94A6]">
                Selecciona un elemento para editarlo, o ajusta el fondo y el tamaño del diseño aquí.
              </p>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Tamaño del lienzo</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">Ancho</label>
                    <input
                      type="number"
                      min={CANVAS_MIN_SIZE}
                      max={CANVAS_MAX_SIZE}
                      value={Math.round(canvas.width)}
                      onChange={(e) => setCanvas((c) => ({ ...c, width: Number(e.target.value) }))}
                      onBlur={(e) => setCanvas((c) => ({ ...c, width: clampCanvasSize(e.target.value) }))}
                      className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Alto</label>
                    <input
                      type="number"
                      min={CANVAS_MIN_SIZE}
                      max={CANVAS_MAX_SIZE}
                      value={Math.round(canvas.height)}
                      onChange={(e) => setCanvas((c) => ({ ...c, height: Number(e.target.value) }))}
                      onBlur={(e) => setCanvas((c) => ({ ...c, height: clampCanvasSize(e.target.value) }))}
                      className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {CANVAS_SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCanvas((c) => ({ ...c, width: preset.width, height: preset.height }))}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                        canvas.width === preset.width && canvas.height === preset.height
                          ? 'border-navy bg-navy text-white'
                          : 'border-gray-200 text-[#4A5568] hover:bg-[#F6F8FC]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Relleno</label>
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
                          ? 'border-navy bg-navy text-white'
                          : 'border-gray-200 text-[#4A5568] hover:bg-[#F6F8FC]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Color</label>
                  <input
                    type="color"
                    value={canvas.background}
                    onChange={(e) => setCanvas((c) => ({ ...c, background: e.target.value }))}
                    className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                  />
                </div>
                {(canvas.fillType ?? 'solid') === 'gradient' && (
                  <div>
                    <label className="text-xs font-semibold text-[#4A5568]">Color 2</label>
                    <input
                      type="color"
                      value={canvas.backgroundTo ?? '#FD761A'}
                      onChange={(e) => setCanvas((c) => ({ ...c, backgroundTo: e.target.value }))}
                      className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                    />
                  </div>
                )}
              </div>
              {(canvas.fillType ?? 'solid') === 'gradient' && (
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Ángulo</label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={canvas.gradientAngle ?? 90}
                    onChange={(e) => setCanvas((c) => ({ ...c, gradientAngle: Number(e.target.value) }))}
                    className="mt-2 w-full accent-orange"
                  />
                </div>
              )}
              {canvas.fillType === 'grid' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#4A5568]">Color de líneas</label>
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
                      className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#4A5568]">Intensidad</label>
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
                      className="mt-2 w-full accent-orange"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#4A5568]">Tamaño de celda</label>
                    <input
                      type="range"
                      min={8}
                      max={80}
                      value={canvas.gridSize ?? 32}
                      onChange={(e) => setCanvas((c) => ({ ...c, gridSize: Number(e.target.value) }))}
                      className="mt-2 w-full accent-orange"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {selectedIds.size > 1 && (
            <div className="mb-6 space-y-3 border-b border-[#E2E8F0] pb-4">
              <h3 className="text-sm font-bold text-navy">{selectedIds.size} elementos seleccionados</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#4A5568] hover:bg-[#F6F8FC]"
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
              <p className="text-xs text-[#8A94A6]">
                Arrastrá para mover el grupo. Para cambiar tamaño, color o rotación, seleccioná uno solo.
              </p>
            </div>
          )}

          {selectedIds.size === 1 && selected && (
            <div className="mb-6 space-y-3 border-b border-[#E2E8F0] pb-4">
              <h3 className="text-sm font-bold text-navy">Posición</h3>
              <div className="grid grid-cols-3 gap-1.5">
                <IconButton title="Alinear a la izquierda" onClick={() => alignSelected('left')}>
                  <Iconos.alinIzq />
                </IconButton>
                <IconButton title="Centrar horizontal" onClick={() => alignSelected('center-h')}>
                  <Iconos.alinCentroH />
                </IconButton>
                <IconButton title="Alinear a la derecha" onClick={() => alignSelected('right')}>
                  <Iconos.alinDer />
                </IconButton>
                <IconButton title="Alinear arriba" onClick={() => alignSelected('top')}>
                  <Iconos.alinArriba />
                </IconButton>
                <IconButton title="Centrar vertical" onClick={() => alignSelected('center-v')}>
                  <Iconos.alinCentroV />
                </IconButton>
                <IconButton title="Alinear abajo" onClick={() => alignSelected('bottom')}>
                  <Iconos.alinAbajo />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">X</label>
                  <input
                    type="number"
                    value={Math.round(selected.x)}
                    onChange={(e) => updateElement(selected.id, { x: Number(e.target.value) })}
                    className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Y</label>
                  <input
                    type="number"
                    value={Math.round(selected.y)}
                    onChange={(e) => updateElement(selected.id, { y: Number(e.target.value) })}
                    className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Ancho</label>
                  <input
                    type="number"
                    min={1}
                    value={Math.round(selected.width)}
                    onChange={(e) => updateElement(selected.id, { width: Number(e.target.value) })}
                    className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Alto</label>
                  <input
                    type="number"
                    min={1}
                    value={Math.round(selected.height)}
                    onChange={(e) => updateElement(selected.id, { height: Number(e.target.value) })}
                    className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-[#4A5568]">Rotación</label>
                  <input
                    type="number"
                    value={Math.round(selected.rotation || 0)}
                    onChange={(e) => updateElement(selected.id, { rotation: Number(e.target.value) })}
                    className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedIds.size === 1 && selected?.type === 'product' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-navy">Plato</h3>
              <p className="rounded-[9px] bg-[#EEF3FF] px-3 py-2 text-xs leading-relaxed text-navy">
                Nombre, precio y descripción vienen de Gestión de Productos: si los cambias allá, tu menú publicado
                se actualiza solo. Si marcas el plato como agotado, se verá atenuado con “Agotado”.
              </p>
              {datosSeleccionado && !datosSeleccionado.existe && (
                <p className="rounded-[9px] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                  Este plato ya no existe: el bloque no se mostrará en tu menú. Elige otro o elimínalo.
                </p>
              )}
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Plato vinculado</label>
                <select
                  value={selected.productoId}
                  onChange={(e) => {
                    const p = productos.find((x) => x.id_producto === Number(e.target.value))
                    if (!p) return
                    updateElement(selected.id, {
                      productoId: p.id_producto,
                      snapshot: { nombre: p.nombre, precio: p.precio, descripcion: p.descripcion ?? '' },
                    })
                  }}
                  className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                >
                  {!productos.some((p) => p.id_producto === selected.productoId) && (
                    <option value={selected.productoId}>{selected.snapshot?.nombre ?? 'Plato eliminado'}</option>
                  )}
                  {productos.map((p) => (
                    <option key={p.id_producto} value={p.id_producto}>
                      {p.nombre} — {formatPrecio(p.precio)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Fuente</label>
                <select
                  value={selected.fontFamily}
                  onChange={(e) => updateElement(selected.id, { fontFamily: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Tamaño</label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={selected.fontSize}
                    onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                    className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Grosor</label>
                  <select
                    value={selected.fontWeight}
                    onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                  >
                    <option value="400">Normal</option>
                    <option value="600">Semi-negrita</option>
                    <option value="700">Negrita</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Color del texto</label>
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                    className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Color del precio</label>
                  <input
                    type="color"
                    value={selected.priceColor ?? selected.color}
                    onChange={(e) => updateElement(selected.id, { priceColor: e.target.value })}
                    className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[13px] text-navy">
                  <input
                    type="checkbox"
                    checked={selected.showPrice !== false}
                    onChange={(e) => updateElement(selected.id, { showPrice: e.target.checked })}
                    className="h-4 w-4 accent-orange"
                  />
                  Mostrar precio
                </label>
                <label className="flex items-center gap-2 text-[13px] text-navy">
                  <input
                    type="checkbox"
                    checked={selected.showDescription !== false}
                    onChange={(e) => updateElement(selected.id, { showDescription: e.target.checked })}
                    className="h-4 w-4 accent-orange"
                  />
                  Mostrar descripción
                </label>
              </div>
              {desbordes[selected.id] && (
                <AvisoDesborde onAjustar={() => updateElement(selected.id, { height: desbordes[selected.id] })} />
              )}
            </div>
          )}

          {selectedIds.size === 1 && selected?.type === 'text' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-navy">Texto</h3>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Fuente</label>
                <select
                  value={selected.fontFamily}
                  onChange={(e) => updateElement(selected.id, { fontFamily: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
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
                <p className="text-xs text-[#8A94A6]">
                  El tamaño del sticker sigue al del cuadro: arrastrá una esquina para agrandarlo o achicarlo.
                </p>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Tamaño</label>
                  <input
                    type="number"
                    min={8}
                    max={200}
                    value={selected.fontSize}
                    onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                    className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Color</label>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                  className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Alineación</label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {['left', 'center', 'right'].map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateElement(selected.id, { align })}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                        selected.align === align
                          ? 'border-navy bg-navy text-white'
                          : 'border-gray-200 text-[#4A5568] hover:bg-[#F6F8FC]'
                      }`}
                    >
                      {{ left: 'Izquierda', center: 'Centro', right: 'Derecha' }[align]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Grosor</label>
                <select
                  value={selected.fontWeight}
                  onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-[#E2E8F0] px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                >
                  <option value="400">Normal</option>
                  <option value="600">Semi-negrita</option>
                  <option value="700">Negrita</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Espaciado de letras</label>
                <input
                  type="range"
                  min={-2}
                  max={16}
                  step={0.5}
                  value={selected.letterSpacing ?? 0}
                  onChange={(e) => updateElement(selected.id, { letterSpacing: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Interlineado</label>
                <input
                  type="range"
                  min={0.8}
                  max={2.5}
                  step={0.1}
                  value={selected.lineHeight ?? 1.2}
                  onChange={(e) => updateElement(selected.id, { lineHeight: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange"
                />
              </div>
              {desbordes[selected.id] && (
                <AvisoDesborde onAjustar={() => updateElement(selected.id, { height: desbordes[selected.id] })} />
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingTextId(selected.id)
                  setPanelAbierto(false)
                }}
                className="w-full rounded-[9px] border border-[#E2E8F0] px-3 py-2 text-[13px] font-semibold text-navy hover:bg-[#F6F8FC]"
              >
                Editar texto
              </button>
              <p className="text-xs text-[#8A94A6]">También puedes hacer doble clic sobre el texto en el lienzo.</p>
            </div>
          )}

          {selectedIds.size === 1 && (selected?.type === 'rect' || selected?.type === 'ellipse') && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-navy">Forma</h3>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Relleno</label>
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
                          ? 'border-navy bg-navy text-white'
                          : 'border-gray-200 text-[#4A5568] hover:bg-[#F6F8FC]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Color</label>
                  <input
                    type="color"
                    value={selected.fill}
                    onChange={(e) => updateElement(selected.id, { fill: e.target.value })}
                    className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                  />
                </div>
                {selected.fillType === 'gradient' && (
                  <div>
                    <label className="text-xs font-semibold text-[#4A5568]">Color 2</label>
                    <input
                      type="color"
                      value={selected.fillTo ?? '#FFE8D6'}
                      onChange={(e) => updateElement(selected.id, { fillTo: e.target.value })}
                      className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                    />
                  </div>
                )}
              </div>
              {selected.fillType === 'gradient' && (
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Ángulo</label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selected.gradientAngle ?? 90}
                    onChange={(e) => updateElement(selected.id, { gradientAngle: Number(e.target.value) })}
                    className="mt-2 w-full accent-orange"
                  />
                </div>
              )}
              {selected.type === 'rect' && (
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Radio de bordes</label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={selected.borderRadius}
                    onChange={(e) => updateElement(selected.id, { borderRadius: Number(e.target.value) })}
                    className="mt-2 w-full accent-orange"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Color de borde</label>
                  <input
                    type="color"
                    value={selected.strokeColor ?? '#111827'}
                    onChange={(e) => updateElement(selected.id, { strokeColor: e.target.value })}
                    className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Grosor de borde</label>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={selected.strokeWidth ?? 0}
                    onChange={(e) => updateElement(selected.id, { strokeWidth: Number(e.target.value) })}
                    className="mt-3 w-full accent-orange"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Desenfoque</label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={selected.blur ?? 0}
                  onChange={(e) => updateElement(selected.id, { blur: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange"
                />
                <p className="mt-1 text-xs text-[#8A94A6]">Útil para manchas de luz ambiental detrás de otros elementos.</p>
              </div>
            </div>
          )}

          {selectedIds.size === 1 && selected?.type === 'image' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-navy">Imagen</h3>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Forma</label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {IMAGE_SHAPES.map((shape) => (
                    <button
                      key={shape.value}
                      type="button"
                      title={shape.label}
                      onClick={() => updateElement(selected.id, { shape: shape.value })}
                      className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs ${
                        (selected.shape ?? 'rect') === shape.value
                          ? 'border-navy bg-navy text-white'
                          : 'border-gray-200 text-[#4A5568] hover:bg-[#F6F8FC]'
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
                  <label className="text-xs font-semibold text-[#4A5568]">Radio de bordes</label>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={selected.borderRadius}
                    onChange={(e) => updateElement(selected.id, { borderRadius: Number(e.target.value) })}
                    className="mt-2 w-full accent-orange"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Brillo</label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={selected.brightness ?? 100}
                  onChange={(e) => updateElement(selected.id, { brightness: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Contraste</label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={selected.contrast ?? 100}
                  onChange={(e) => updateElement(selected.id, { contrast: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Blanco y negro</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selected.grayscale ?? 0}
                  onChange={(e) => updateElement(selected.id, { grayscale: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange"
                />
              </div>
            </div>
          )}

          {selectedIds.size === 1 && selected && (
            <div className="mt-6 space-y-4 border-t border-[#E2E8F0] pt-4">
              <h3 className="text-sm font-bold text-navy">Efectos</h3>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Opacidad</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={selected.opacity ?? 100}
                  onChange={(e) => updateElement(selected.id, { opacity: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A5568]">Sombra</label>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={selected.shadow ?? 0}
                  onChange={(e) => updateElement(selected.id, { shadow: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Color de sombra</label>
                  <input
                    type="color"
                    value={selected.shadowColorHex ?? '#000000'}
                    onChange={(e) =>
                      updateElement(selected.id, {
                        shadowColorHex: e.target.value,
                        shadowColor: hexToRgba(e.target.value, selected.shadowOpacity ?? 35),
                      })
                    }
                    className="mt-1 h-8 w-full rounded-[8px] border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4A5568]">Intensidad</label>
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
                    className="mt-3 w-full accent-orange"
                  />
                </div>
              </div>
              <p className="text-xs text-[#8A94A6]">
                Usa un color de marca para un brillo (glow) en vez de una sombra realista negra.
              </p>
            </div>
          )}
        </aside>
      </div>

      {confirmarPublicar && (
        <Modal onClose={() => setConfirmarPublicar(false)}>
          <h3 className="text-base font-bold text-navy">¿Publicar este diseño como tu menú?</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#4A5568]">
            Tu enlace y tu código QR mostrarán este diseño en lugar de la lista de platos. Puedes volver a la lista
            cuando quieras desde el Dashboard.
          </p>
          {(textosChicos.length > 0 || textosCortados.length > 0) && (
            <div className="mt-4 space-y-2 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[12.5px] leading-relaxed text-[#92400E]">
              {textosChicos.length > 0 && (
                <p>
                  <span className="font-bold">
                    {textosChicos.length} {textosChicos.length === 1 ? 'texto se verá' : 'textos se verán'} muy
                    pequeño{textosChicos.length === 1 ? '' : 's'} en celular.
                  </span>{' '}
                  En un teléfono este diseño se reduce al {Math.round((ANCHO_CELULAR / canvas.width) * 100)}% de su
                  tamaño. Agranda la letra o usa el formato Story.
                </p>
              )}
              {textosCortados.length > 0 && (
                <p>
                  <span className="font-bold">
                    {textosCortados.length} {textosCortados.length === 1 ? 'texto está cortado' : 'textos están cortados'}
                  </span>{' '}
                  (marcados en rojo en el lienzo). Agranda su cuadro para que se lean completos.
                </p>
              )}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmarPublicar(false)}
              className="h-10 rounded-[9px] px-4 text-[13px] font-semibold text-[#4A5568] hover:bg-[#F6F8FC]"
            >
              {textosChicos.length > 0 || textosCortados.length > 0 ? 'Revisar' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={handlePublicarComoMenu}
              className="h-10 rounded-[9px] bg-orange px-4 text-[13px] font-semibold text-white hover:bg-orange-dark"
            >
              Publicar
            </button>
          </div>
        </Modal>
      )}

      {confirmarSalir && (
        <Modal onClose={() => setConfirmarSalir(false)}>
          <h3 className="text-base font-bold text-navy">No se pudieron guardar tus cambios</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#4A5568]">
            Revisa tu conexión. Si sales ahora, perderás lo que hiciste desde el último guardado.
          </p>
          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/editor')}
              className="h-10 rounded-[9px] px-4 text-[13px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
            >
              Salir sin guardar
            </button>
            <button
              type="button"
              onClick={() => setConfirmarSalir(false)}
              className="h-10 rounded-[9px] bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-hover"
            >
              Quedarme
            </button>
          </div>
        </Modal>
      )}

      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex justify-center px-4 md:bottom-6">
          <div
            role="status"
            className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-[10px] px-4 py-3 text-[13px] font-semibold shadow-lg ${
              aviso.tipo === 'error' ? 'bg-[#DC2626] text-white' : 'bg-navy text-white'
            }`}
          >
            <span>{aviso.texto}</span>
            <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="opacity-80 hover:opacity-100">
              <Iconos.cerrar />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CanvasElement({
  el,
  productos,
  zoom,
  isSelected,
  isEditing,
  desborda,
  onDesborde,
  registerRef,
  onSelect,
  onStartEditText,
  onCommitText,
}) {
  const nodoRef = useRef(null)
  const midible = el.type === 'text' || el.type === 'product'

  // Texto que no entra en su cuadro: se avisa (borde rojo + panel) en vez de
  // cortarlo en silencio. Se mide después de cada render.
  useLayoutEffect(() => {
    if (!midible || isEditing || el.isSticker) return
    const nodo = nodoRef.current
    if (!nodo) return
    const necesaria = nodo.scrollHeight
    onDesborde(el.id, necesaria > nodo.clientHeight + 1 ? Math.ceil(necesaria) : null)
  })

  useEffect(() => () => onDesborde(el.id, null), [el.id, onDesborde])

  // Al entrar a editar un texto (doble clic o botón "Editar texto"), el
  // cursor queda listo y el texto seleccionado, también en celular.
  useEffect(() => {
    if (!isEditing || !nodoRef.current) return
    const nodo = nodoRef.current
    nodo.focus()
    const rango = document.createRange()
    rango.selectNodeContents(nodo)
    const seleccion = window.getSelection()
    seleccion.removeAllRanges()
    seleccion.addRange(rango)
  }, [isEditing])

  const ref = (node) => {
    nodoRef.current = node
    registerRef(node)
  }

  const contorno = desborda ? `${2 / zoom}px dashed #DC2626` : isSelected ? `${2 / zoom}px solid #FD761A` : 'none'
  const style = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: `rotate(${el.rotation || 0}deg)`,
    zIndex: el.zIndex,
    outline: contorno,
    outlineOffset: 2 / zoom,
    cursor: el.locked ? 'default' : isEditing ? 'text' : 'move',
    opacity: (el.opacity ?? 100) / 100,
    boxSizing: 'border-box',
    touchAction: 'none',
  }

  function handlePointerDown(e) {
    e.stopPropagation()
    onSelect(e.shiftKey)
  }

  if (el.type === 'product') {
    const datos = datosDelBloque(el, productos)
    const s = estilosBloqueProducto(el)
    return (
      <div
        ref={ref}
        data-el-id={el.id}
        title={datos.existe ? undefined : 'Este plato ya no existe: no se mostrará en tu menú'}
        style={{
          ...style,
          fontFamily: el.fontFamily,
          color: el.color,
          display: 'flex',
          flexDirection: 'column',
          gap: Math.round(s.fila.gap / 2),
          overflow: 'hidden',
          textShadow: el.shadow ? `0 0 ${el.shadow}px ${el.shadowColor ?? 'rgba(0,0,0,0.35)'}` : undefined,
          opacity: style.opacity * (datos.agotado ? 0.45 : 1),
          outline: datos.existe ? contorno : `${2 / zoom}px dashed #DC2626`,
        }}
        onPointerDown={handlePointerDown}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: s.fila.gap,
            fontSize: s.fila.fontSize,
            fontWeight: s.fila.fontWeight,
            lineHeight: 1.2,
          }}
        >
          <span>{datos.nombre}</span>
          {el.showPrice !== false && (
            <span style={{ color: s.precio.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {datos.agotado ? 'Agotado' : formatPrecio(datos.precio)}
            </span>
          )}
        </div>
        {el.showDescription !== false && (
          <div
            style={{
              fontSize: s.descripcion.fontSize,
              lineHeight: s.descripcion.lineHeight,
              opacity: s.descripcion.opacity,
              fontWeight: 400,
            }}
          >
            {datos.descripcion}
          </div>
        )}
      </div>
    )
  }

  if (el.type === 'text') {
    const fontSize = el.isSticker ? Math.min(el.width, el.height) * 0.8 : el.fontSize
    return (
      <div
        ref={ref}
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
          overflow: isEditing ? 'visible' : 'hidden',
          touchAction: isEditing ? 'auto' : 'none',
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onStartEditText()
        }}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={(e) => {
          if (!isEditing) return
          const nodo = e.currentTarget
          const necesaria = el.isSticker ? 0 : Math.ceil(nodo.scrollHeight)
          onCommitText(nodo.textContent, necesaria > el.height ? necesaria : null)
        }}
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
        ref={ref}
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
        onPointerDown={handlePointerDown}
        draggable={false}
      />
    )
  }

  return (
    <div
      ref={ref}
      data-el-id={el.id}
      style={{
        ...style,
        background: shapeBackgroundStyle(el),
        borderRadius: el.type === 'ellipse' ? '50%' : el.borderRadius,
        border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor ?? '#111827'}` : undefined,
        boxShadow: el.shadow ? `0 0 ${el.shadow}px ${el.shadowColor ?? 'rgba(0,0,0,0.35)'}` : undefined,
        filter: el.blur ? `blur(${el.blur}px)` : undefined,
      }}
      onPointerDown={handlePointerDown}
    />
  )
}

export default EditorCanvas
