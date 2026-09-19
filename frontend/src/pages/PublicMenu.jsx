import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import apiClient from '../api/client'

const SWATCHES = ['#F2C57C', '#C97B5F', '#7AACA6', '#D9A441', '#8B6BAE', '#E4A6A0']

function swatchFor(idProducto) {
  return SWATCHES[idProducto % SWATCHES.length]
}

const DEFAULT_TEMA = {
  color_acento: '#FD761A',
  fondo: 'claro',
  radio_borde: 16,
  mostrar_precios: true,
  mostrar_fotos: true,
  filtro_alergenos: false,
}

function DishCard({ dish, tema }) {
  return (
    <div
      className={`flex gap-3.5 border p-4 ${
        dish.agotado ? 'border-[#E2E8F0] bg-[#F3F4F6] opacity-60' : 'border-[#E2E8F0] bg-white'
      }`}
      style={{ borderRadius: `${tema.radio_borde}px` }}
    >
      {tema.mostrar_fotos && (
        <div
          className="h-[76px] w-[76px] shrink-0 rounded-[10px]"
          style={{ background: swatchFor(dish.id_producto), filter: dish.agotado ? 'grayscale(1)' : 'none' }}
        />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[15px] font-bold ${dish.agotado ? 'text-[#8A94A6]' : 'text-navy'}`}>
            {dish.nombre}
          </p>
          {dish.agotado ? (
            <span className="shrink-0 rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-bold text-[#DC2626]">
              Agotado
            </span>
          ) : (
            tema.mostrar_precios && (
              <span className="shrink-0 text-[15px] font-bold text-navy">
                S/ {dish.precio.toFixed(2)}
              </span>
            )
          )}
        </div>
        {dish.descripcion && (
          <p className={`mt-1 text-[13px] leading-relaxed ${dish.agotado ? 'text-[#8A94A6]' : 'text-[#4A5568]'}`}>
            {dish.descripcion}
          </p>
        )}
        {tema.filtro_alergenos && dish.etiquetas?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dish.etiquetas.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[10px] font-semibold text-navy"
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

function PublicMenu() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)

  useEffect(() => {
    apiClient
      .get(`/public/menu/${slug}`)
      .then(({ data }) => {
        setData(data)
        const primeraCategoria = data.productos.find((p) => p.categoria)?.categoria
        setActive(primeraCategoria ?? 'Todos')
      })
      .catch((err) => setError(err.response?.data?.error ?? 'No se pudo cargar el menú.'))
  }, [slug])

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

  const tema = { ...DEFAULT_TEMA, ...data.contenido?.tema }
  const categorias = [...new Set(data.productos.map((p) => p.categoria ?? 'Otros'))]
  const productosVisibles = data.productos.filter((p) => (p.categoria ?? 'Otros') === active)
  const iniciales = data.restaurante.nombre
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-svh bg-[#F6F8FC]">
      <div className="bg-navy px-6 py-10 text-white sm:px-14">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#C97B5F] text-xl font-extrabold">
            {iniciales}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold sm:text-[26px]">{data.restaurante.nombre}</h1>
            {data.restaurante.slogan && (
              <p className="mt-1 text-[13.5px] text-[#A9B4C8]">{data.restaurante.slogan}</p>
            )}
          </div>
        </div>
      </div>

      {categorias.length > 1 && (
        <div className="sticky top-0 z-10 flex gap-2.5 overflow-x-auto border-b border-[#E2E8F0] bg-white px-6 py-4 sm:px-14">
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              className="whitespace-nowrap rounded-full px-4.5 py-2 text-[13.5px] font-bold"
              style={
                active === cat
                  ? { backgroundColor: tema.color_acento, color: '#fff' }
                  : { color: '#4A5568' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-14">
        <p
          className="mb-4.5 text-xs font-bold uppercase tracking-wide"
          style={{ color: tema.color_acento }}
        >
          {active}
        </p>
        {productosVisibles.length === 0 ? (
          <p className="text-sm text-[#8A94A6]">Todavía no hay platos en esta categoría.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {productosVisibles.map((dish) => (
              <DishCard key={dish.id_producto} dish={dish} tema={tema} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-navy px-6 py-8 text-center text-[#A9B4C8] sm:px-14">
        <p className="text-xs">
          Menú digital creado con <span className="font-bold text-white">Karta Kamay</span>
        </p>
      </div>
    </div>
  )
}

export default PublicMenu
