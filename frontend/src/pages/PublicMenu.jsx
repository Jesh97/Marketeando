import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import logoMark from '../assets/logo-mark.png'
import DisenoEscalado from '../components/DisenoEscalado'
import { hidratarDiseno } from '../lib/disenoProductos'
import { cargarFuentes, familiasEnHtml } from '../lib/fuentes'

// Paletas por plantilla — mismos valores que el Onboarding
const TEMAS_PLANTILLA = {
  andino: {
    headerBg:    '#1F2740',
    headerText:  '#FFF8EC',
    headerSub:   '#A9B4C8',
    acento:      '#E8622A',
    logoBg:      '#E8622A',
    categoriasBg:'#1A2035',
    cardBg:      '#FFFFFF',
    cardBorder:  '#2D3A54',
    fondoPagina: '#F0F2F7',
    textoPrincipal: '#1F2740',
    textoSub:    '#4A5568',
    footer:      '#1F2740',
  },
  minimal: {
    headerBg:    '#F6E1B3',
    headerText:  '#4A2420',
    headerSub:   '#8B6B5E',
    acento:      '#8B5E3C',
    logoBg:      '#8B5E3C',
    categoriasBg:'#EDD99A',
    cardBg:      '#FFFBF4',
    cardBorder:  '#E8D5B0',
    fondoPagina: '#FAF4E8',
    textoPrincipal: '#4A2420',
    textoSub:    '#6B4E3D',
    footer:      '#4A2420',
  },
  costero: {
    headerBg:    '#DBE9E5',
    headerText:  '#1F2740',
    headerSub:   '#4A6172',
    acento:      '#565d79',
    logoBg:      '#565d79',
    categoriasBg:'#C8DEDA',
    cardBg:      '#FFFFFF',
    cardBorder:  '#C0D8D4',
    fondoPagina: '#F0F7F5',
    textoPrincipal: '#1F2740',
    textoSub:    '#4A5568',
    footer:      '#1F2740',
  },
}

const DEFAULT_TEMA_PLANTILLA = TEMAS_PLANTILLA.costero

// Colores de swatch como fallback cuando el plato no tiene imagen
const SWATCHES = ['#F2C57C', '#C97B5F', '#7AACA6', '#D9A441', '#8B6BAE', '#E4A6A0']
function swatchFor(id) { return SWATCHES[id % SWATCHES.length] }

// Formatea el horario JSONB: { dias, desde, hasta } o { texto }
function formatHorario(horario) {
  if (!horario) return null
  if (horario.texto) return horario.texto
  if (horario.dias && horario.desde && horario.hasta) {
    const dias = horario.dias.join(', ')
    return `${dias} · ${horario.desde} – ${horario.hasta}`
  }
  return null
}

function DishCard({ dish, paleta, mostrarFotos, mostrarPrecios }) {
  return (
    <div
      className="flex gap-3.5 border p-4 transition-shadow hover:shadow-sm"
      style={{
        borderRadius: 14,
        background: dish.agotado ? '#F3F4F6' : paleta.cardBg,
        borderColor: paleta.cardBorder,
        opacity: dish.agotado ? 0.65 : 1,
      }}
    >
      {mostrarFotos && (
        <div
          className="h-[76px] w-[76px] shrink-0 rounded-[10px] overflow-hidden"
          style={{
            background: swatchFor(dish.id_producto),
            filter: dish.agotado ? 'grayscale(1)' : 'none',
          }}
        >
          {dish.url_imagen && (
            <img
              src={dish.url_imagen}
              alt={dish.nombre}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-bold" style={{ color: paleta.textoPrincipal }}>
            {dish.nombre}
          </p>
          {dish.agotado ? (
            <span className="shrink-0 rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-bold text-[#DC2626]">
              Agotado
            </span>
          ) : (
            mostrarPrecios && (
              <span className="shrink-0 text-[15px] font-bold" style={{ color: paleta.acento }}>
                S/ {dish.precio.toFixed(2)}
              </span>
            )
          )}
        </div>
        {dish.descripcion && (
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: paleta.textoSub }}>
            {dish.descripcion}
          </p>
        )}
        {dish.etiquetas?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dish.etiquetas.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: paleta.acento + '18', color: paleta.acento }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Marca de agua de las cartas del plan gratuito (el backend manda
// marca_agua=true): una franja al pie de la carta que también sale al
// imprimirla o guardarla como PDF. Los planes pagados se publican sin ella.
function MarcaAgua({ paleta }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 px-6 py-4 print:py-3"
      style={{ background: paleta.footer, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      <img src={logoMark} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" />
      <p className="text-xs" style={{ color: paleta.headerSub }}>
        Carta creada con{' '}
        <Link to="/" className="font-bold hover:underline" style={{ color: paleta.headerText }}>
          Karta Kamay
        </Link>
        <span className="hidden sm:inline"> · Crea la tuya gratis en kartakamay.app</span>
      </p>
    </div>
  )
}

function PublicMenu() {
  const { slug, local_slug } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)

  useEffect(() => {
    const url = local_slug
      ? `/public/menu/${slug}/${local_slug}`
      : `/public/menu/${slug}`
    apiClient
      .get(url)
      .then(({ data }) => {
        setData(data)
        const primeraCategoria = data.productos.find((p) => p.categoria)?.categoria
        setActive(primeraCategoria ?? 'Otros')
      })
      .catch((err) => setError(err.response?.data?.error ?? 'No se pudo cargar el menú.'))
  }, [slug, local_slug])

  const disenoHtml = useMemo(() => {
    const html = data?.contenido?.diseno_html
    return html ? hidratarDiseno(html, data.productos ?? []) : ''
  }, [data])

  useEffect(() => {
    if (disenoHtml) cargarFuentes(familiasEnHtml(disenoHtml))
  }, [disenoHtml])

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F6F8FC] px-6 text-center">
        <p className="text-sm text-[#4A5568]">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F6F8FC]">
        <p className="text-sm text-[#8A94A6]">Cargando menú...</p>
      </div>
    )
  }

  // Si publicó un diseño libre desde el Editor, ese HTML manda
  if (disenoHtml) {
    const disenoCanvas = data.contenido.diseno_canvas ?? { width: 800, height: 1000 }
    const paleta = TEMAS_PLANTILLA[data.restaurante.plantilla] ?? DEFAULT_TEMA_PLANTILLA
    return (
      <div className="min-h-svh" style={{ background: paleta.fondoPagina }}>
        <div className="mx-auto w-full max-w-2xl">
          <DisenoEscalado html={disenoHtml} canvas={disenoCanvas} />
          {data.marca_agua && <MarcaAgua paleta={paleta} />}
        </div>
      </div>
    )
  }

  const paleta = TEMAS_PLANTILLA[data.restaurante.plantilla] ?? DEFAULT_TEMA_PLANTILLA
  const menuTema = { mostrar_precios: true, mostrar_fotos: true, ...data.contenido?.tema }
  const categorias = [...new Set(data.productos.map((p) => p.categoria ?? 'Otros'))]
  const productosVisibles = data.productos.filter((p) => (p.categoria ?? 'Otros') === active)
  const iniciales = data.restaurante.nombre
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const horarioTexto = formatHorario(data.restaurante.horario)

  return (
    <div className="min-h-svh" style={{ background: paleta.fondoPagina }}>

      {/* Header */}
      <div className="px-6 py-10 sm:px-14" style={{ background: paleta.headerBg }}>
        <div className="mx-auto flex max-w-4xl items-center gap-4">

          {/* Logo o iniciales */}
          <div
            className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-extrabold text-white"
            style={{ background: paleta.logoBg }}
          >
            {data.restaurante.url_logo
              ? <img src={data.restaurante.url_logo} alt="Logo" className="h-full w-full object-cover" />
              : <span>{iniciales}</span>
            }
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold sm:text-[26px] truncate" style={{ color: paleta.headerText }}>
              {data.restaurante.nombre}
            </h1>
            {data.restaurante.slogan && (
              <p className="mt-0.5 text-[13.5px]" style={{ color: paleta.headerSub }}>
                {data.restaurante.slogan}
              </p>
            )}
            {horarioTexto && (
              <p className="mt-1 text-[12px] flex items-center gap-1" style={{ color: paleta.headerSub }}>
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {horarioTexto}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Categorías */}
      {categorias.length > 1 && (
        <div
          className="sticky top-0 z-10 flex gap-2.5 overflow-x-auto border-b px-6 py-4 sm:px-14"
          style={{ background: paleta.categoriasBg, borderColor: paleta.cardBorder }}
        >
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              className="whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-bold transition-colors"
              style={
                active === cat
                  ? { background: paleta.acento, color: '#fff' }
                  : { color: paleta.textoPrincipal, background: 'transparent' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Platos */}
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-14">
        <p className="mb-4 text-xs font-bold uppercase tracking-wide" style={{ color: paleta.acento }}>
          {active}
        </p>
        {productosVisibles.length === 0 ? (
          <p className="text-sm" style={{ color: paleta.textoSub }}>
            Todavía no hay platos en esta categoría.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {productosVisibles.map((dish) => (
              <DishCard
                key={dish.id_producto}
                dish={dish}
                paleta={paleta}
                mostrarFotos={menuTema.mostrar_fotos}
                mostrarPrecios={menuTema.mostrar_precios}
              />
            ))}
          </div>
        )}
      </div>

      {data.marca_agua && <MarcaAgua paleta={paleta} />}
    </div>
  )
}

export default PublicMenu
