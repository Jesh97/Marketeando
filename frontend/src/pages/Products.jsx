import { useEffect, useState } from 'react'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'
import { useRestaurante } from '../context/RestauranteContext'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#8A94A6" strokeWidth="2" className="h-4 w-4">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

const SWATCHES = ['#F2C57C', '#C97B5F', '#7AACA6', '#D9A441', '#8B6BAE', '#E4A6A0']

function swatchFor(idProducto) {
  return SWATCHES[idProducto % SWATCHES.length]
}

function statusFor(product) {
  if (product.agotado) return { label: 'Agotado', bg: '#FEE2E2', text: '#DC2626' }
  if (product.activo) return { label: 'Activo', bg: '#DCFCE7', text: '#16A34A' }
  return { label: 'Inactivo', bg: '#F1F5F9', text: '#64748B' }
}

const emptyForm = { nombre: '', descripcion: '', precio: '', id_categoria: '', url_imagen: null }

function ProductModal({ categorias, initial, idRestaurante, onClose, onSave }) {
  const [form, setForm] = useState(initial ?? emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFotoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post(
        `/restaurantes/${idRestaurante}/productos/upload`,
        formData,
        { headers: { 'Content-Type': undefined } },
      )
      setForm((prev) => ({ ...prev, url_imagen: data.url }))
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo subir la foto.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        precio: Number(form.precio),
        id_categoria: form.id_categoria ? Number(form.id_categoria) : null,
        url_imagen: form.url_imagen || null,
      })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-navy">
          {initial ? 'Editar producto' : 'Nuevo producto'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-navy">Foto</label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F6F8FC]">
                {form.url_imagen ? (
                  <img src={form.url_imagen} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-[#8A94A6]">Sin foto</span>
                )}
              </div>
              <label className="cursor-pointer rounded-[9px] border border-[#E2E8F0] px-3.5 py-2 text-[13px] font-semibold text-navy hover:bg-[#F6F8FC]">
                {uploading ? 'Subiendo...' : form.url_imagen ? 'Cambiar foto' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFotoChange}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-navy">Nombre</label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="h-11 w-full rounded-[9px] border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-navy">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              className="w-full rounded-[9px] border border-[#E2E8F0] px-3.5 py-2 text-sm outline-none focus:border-orange"
            />
          </div>
          <div className="flex gap-3.5">
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-semibold text-navy">Precio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                className="h-11 w-full rounded-[9px] border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-orange"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-semibold text-navy">Categoría</label>
              <select
                value={form.id_categoria}
                onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}
                className="h-11 w-full rounded-[9px] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-orange"
              >
                <option value="">Sin categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[9px] border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-navy hover:bg-[#F6F8FC]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-[9px] bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-dark disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CategoriaModal({ categorias, idRestaurante, onClose, onChange }) {
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')

  const crear = async (event) => {
    event.preventDefault()
    if (!nombreNuevo.trim()) return
    setError('')
    setCreando(true)
    try {
      const { data } = await apiClient.post(`/restaurantes/${idRestaurante}/categorias`, {
        nombre: nombreNuevo.trim(),
        orden: categorias.length,
      })
      onChange([...categorias, data])
      setNombreNuevo('')
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo crear la categoría.')
    } finally {
      setCreando(false)
    }
  }

  const guardarEdicion = async (cat) => {
    const nombre = editNombre.trim()
    setEditId(null)
    if (!nombre || nombre === cat.nombre) return
    setError('')
    try {
      await apiClient.put(`/restaurantes/${idRestaurante}/categorias/${cat.id_categoria}`, {
        nombre,
        orden: cat.orden,
      })
      onChange(categorias.map((c) => (c.id_categoria === cat.id_categoria ? { ...c, nombre } : c)))
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo renombrar la categoría.')
    }
  }

  const eliminar = async (cat) => {
    if (
      !window.confirm(
        `¿Eliminar la categoría "${cat.nombre}"? Los productos que la usan quedarán sin categoría.`,
      )
    )
      return
    setError('')
    try {
      await apiClient.delete(`/restaurantes/${idRestaurante}/categorias/${cat.id_categoria}`)
      onChange(categorias.filter((c) => c.id_categoria !== cat.id_categoria))
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo eliminar la categoría.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-navy">Categorías</h2>
        <p className="mt-1 text-xs text-[#8A94A6]">
          Cada negocio es distinto: arma las categorías que tengan sentido para tu menú.
        </p>

        <ul className="mt-4 max-h-64 space-y-1.5 overflow-y-auto">
          {categorias.length === 0 && (
            <li className="py-2 text-sm text-[#8A94A6]">Aún no tienes categorías.</li>
          )}
          {categorias.map((cat) => (
            <li key={cat.id_categoria} className="flex items-center gap-2">
              {editId === cat.id_categoria ? (
                <input
                  autoFocus
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  onBlur={() => guardarEdicion(cat)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className="h-9 flex-1 rounded-[9px] border border-[#E2E8F0] px-2.5 text-sm outline-none focus:border-orange"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditId(cat.id_categoria)
                    setEditNombre(cat.nombre)
                  }}
                  className="h-9 flex-1 rounded-[9px] border border-transparent px-2.5 text-left text-sm text-navy hover:border-[#E2E8F0]"
                >
                  {cat.nombre}
                </button>
              )}
              <button
                type="button"
                onClick={() => eliminar(cat)}
                title="Eliminar"
                className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[#8A94A6] hover:bg-red-50 hover:text-red-600"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={crear} className="mt-4 flex gap-2">
          <input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nueva categoría..."
            className="h-10 flex-1 rounded-[9px] border border-[#E2E8F0] px-3 text-sm outline-none focus:border-orange"
          />
          <button
            type="submit"
            disabled={creando || !nombreNuevo.trim()}
            className="rounded-[9px] bg-orange px-3.5 text-sm font-semibold text-white hover:bg-orange-dark disabled:opacity-60"
          >
            Añadir
          </button>
        </form>

        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-navy hover:bg-[#F6F8FC]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function Products() {
  const { restaurante, loading: loadingRestaurante } = useRestaurante()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | producto a editar
  const [search, setSearch] = useState('')
  const [showCategorias, setShowCategorias] = useState(false)

  const idRestaurante = restaurante?.id_restaurante

  const cargar = () => {
    if (!idRestaurante) return
    setLoading(true)
    Promise.all([
      apiClient.get(`/restaurantes/${idRestaurante}/productos`),
      apiClient.get(`/restaurantes/${idRestaurante}/categorias`),
    ])
      .then(([prodRes, catRes]) => {
        setProductos(prodRes.data)
        setCategorias(catRes.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(cargar, [idRestaurante])

  const categoriaNombre = (idCategoria) =>
    categorias.find((c) => c.id_categoria === idCategoria)?.nombre ?? 'Sin categoría'

  const toggleAgotado = async (producto) => {
    const { data } = await apiClient.patch(
      `/restaurantes/${idRestaurante}/productos/${producto.id_producto}/agotado`,
    )
    setProductos((prev) => prev.map((p) => (p.id_producto === data.id_producto ? data : p)))
  }

  const guardarProducto = async (payload) => {
    if (modal && modal !== 'create') {
      const { data } = await apiClient.put(
        `/restaurantes/${idRestaurante}/productos/${modal.id_producto}`,
        payload,
      )
      setProductos((prev) => prev.map((p) => (p.id_producto === data.id_producto ? data : p)))
    } else {
      const { data } = await apiClient.post(`/restaurantes/${idRestaurante}/productos`, payload)
      setProductos((prev) => [...prev, data])
    }
  }

  const eliminarProducto = async (producto) => {
    if (!window.confirm(`¿Eliminar "${producto.nombre}"?`)) return
    await apiClient.delete(`/restaurantes/${idRestaurante}/productos/${producto.id_producto}`)
    setProductos((prev) => prev.filter((p) => p.id_producto !== producto.id_producto))
  }

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()),
  )

  const agotadosCount = productos.filter((p) => p.agotado).length
  const activosCount = productos.filter((p) => p.activo).length

  if (loadingRestaurante || loading) {
    return (
      <DashboardShell>
        <p className="text-sm text-[#8A94A6]">Cargando...</p>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">
          Gestión de Productos
        </h1>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setShowCategorias(true)}
            className="rounded-[9px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
          >
            Categorías
          </button>
          <button
            type="button"
            onClick={() => setModal('create')}
            className="rounded-[9px] bg-orange px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-orange-dark"
          >
            + Nuevo Producto
          </button>
        </div>
      </div>
      <p className="mb-6 text-sm text-[#4A5568]">
        {agotadosCount} platos agotados hoy · {activosCount} productos activos
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex h-[42px] max-w-xs flex-1 items-center gap-2 rounded-[9px] border border-[#E2E8F0] bg-white px-3.5">
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full text-[13.5px] text-navy outline-none placeholder:text-[#8A94A6]"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="text-left text-[11.5px] font-bold uppercase tracking-wide text-[#8A94A6]">
              <th className="w-14 px-4 pb-3 pt-4" />
              <th className="px-2.5 pb-3 pt-4">Nombre</th>
              <th className="px-2.5 pb-3 pt-4">Categoría</th>
              <th className="px-2.5 pb-3 pt-4">Precio</th>
              <th className="px-2.5 pb-3 pt-4">Estado</th>
              <th className="px-2.5 pb-3 pt-4 text-center">Agotado</th>
              <th className="px-4 pb-3 pt-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#8A94A6]">
                  Aún no tienes productos. Crea el primero con "+ Nuevo Producto".
                </td>
              </tr>
            )}
            {productosFiltrados.map((product) => {
              const status = statusFor(product)
              return (
                <tr key={product.id_producto} className="border-t border-[#E2E8F0]">
                  <td className="px-4 py-3.5">
                    {product.url_imagen ? (
                      <img
                        src={product.url_imagen}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-lg"
                        style={{ background: swatchFor(product.id_producto) }}
                      />
                    )}
                  </td>
                  <td className="px-2.5 py-3.5">
                    <p className="text-sm font-bold text-navy">{product.nombre}</p>
                    <p className="text-xs text-[#8A94A6]">{product.descripcion}</p>
                  </td>
                  <td className="px-2.5 py-3.5">
                    <span className="inline-flex rounded-full bg-[#EEF3FF] px-2.5 py-1 text-xs font-bold text-navy">
                      {categoriaNombre(product.id_categoria)}
                    </span>
                  </td>
                  <td className="px-2.5 py-3.5 text-sm font-bold text-navy">
                    S/ {product.precio.toFixed(2)}
                  </td>
                  <td className="px-2.5 py-3.5">
                    <span
                      className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{ background: status.bg, color: status.text }}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-2.5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleAgotado(product)}
                      className="relative inline-block h-[22px] w-10 rounded-full transition-colors"
                      style={{ background: product.agotado ? '#DC2626' : '#CBD5E1' }}
                    >
                      <span
                        className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all"
                        style={{ left: product.agotado ? '20px' : '2px' }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-3.5 text-[#8A94A6]">
                      <button
                        type="button"
                        onClick={() =>
                          setModal({
                            ...product,
                            precio: String(product.precio),
                            id_categoria: product.id_categoria ?? '',
                            descripcion: product.descripcion ?? '',
                          })
                        }
                        className="hover:text-navy"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarProducto(product)}
                        className="hover:text-red-600"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3.5 text-xs text-[#8A94A6]">
        Toca el interruptor para marcar un plato como agotado al instante — se refleja de
        inmediato en el menú público.
      </p>

      {modal && (
        <ProductModal
          categorias={categorias}
          initial={modal === 'create' ? null : modal}
          idRestaurante={idRestaurante}
          onClose={() => setModal(null)}
          onSave={guardarProducto}
        />
      )}

      {showCategorias && (
        <CategoriaModal
          categorias={categorias}
          idRestaurante={idRestaurante}
          onClose={() => setShowCategorias(false)}
          onChange={setCategorias}
        />
      )}
    </DashboardShell>
  )
}

export default Products
