import { useState } from 'react'
import DashboardShell from '../components/DashboardShell'

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Ceviche Clásico', desc: 'Pesca fresca, leche de tigre', category: 'Entradas', price: '$18', imgBg: '#F2C57C', active: true, agotado: false },
  { id: 2, name: 'Anticuchos', desc: 'Brochetas a la parrilla', category: 'Entradas', price: '$14', imgBg: '#C97B5F', active: true, agotado: true },
  { id: 3, name: 'Lomo Saltado', desc: 'Res, papas fritas, arroz', category: 'Fuertes', price: '$26', imgBg: '#7AACA6', active: true, agotado: false },
  { id: 4, name: 'Ají de Gallina', desc: 'Crema de ají amarillo', category: 'Fuertes', price: '$22', imgBg: '#D9A441', active: false, agotado: false },
  { id: 5, name: 'Chicha Morada', desc: 'Bebida de maíz morado', category: 'Bebidas', price: '$6', imgBg: '#8B6BAE', active: true, agotado: false },
  { id: 6, name: 'Suspiro Limeño', desc: 'Postre tradicional limeño', category: 'Postres', price: '$9', imgBg: '#E4A6A0', active: true, agotado: false },
]

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#8A94A6" strokeWidth="2" className="h-4 w-4">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <polyline points="6 9 12 15 18 9" />
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

function statusFor(product) {
  if (product.agotado) return { label: 'Agotado', bg: '#FEE2E2', text: '#DC2626' }
  if (product.active) return { label: 'Activo', bg: '#DCFCE7', text: '#16A34A' }
  return { label: 'Inactivo', bg: '#F1F5F9', text: '#64748B' }
}

function Products() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS)

  const toggleAgotado = (id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, agotado: !p.agotado } : p)),
    )
  }

  const agotadosCount = products.filter((p) => p.agotado).length
  const activosCount = products.filter((p) => p.active).length

  return (
    <DashboardShell>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">
          Gestión de Productos
        </h1>
        <button
          type="button"
          className="rounded-[9px] bg-orange px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-orange-dark"
        >
          + Nuevo Producto
        </button>
      </div>
      <p className="mb-6 text-sm text-[#4A5568]">
        {agotadosCount} platos agotados hoy · {activosCount} productos activos
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex h-[42px] max-w-xs flex-1 items-center gap-2 rounded-[9px] border border-[#E2E8F0] bg-white px-3.5">
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar producto..."
            className="w-full text-[13.5px] text-navy outline-none placeholder:text-[#8A94A6]"
          />
        </div>
        <button
          type="button"
          className="flex h-[42px] items-center gap-2 rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-[13.5px] font-semibold text-navy"
        >
          Todas las categorías
          <ChevronDown />
        </button>
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
            {products.map((product) => {
              const status = statusFor(product)
              return (
                <tr key={product.id} className="border-t border-[#E2E8F0]">
                  <td className="px-4 py-3.5">
                    <div
                      className="h-10 w-10 rounded-lg"
                      style={{ background: product.imgBg }}
                    />
                  </td>
                  <td className="px-2.5 py-3.5">
                    <p className="text-sm font-bold text-navy">{product.name}</p>
                    <p className="text-xs text-[#8A94A6]">{product.desc}</p>
                  </td>
                  <td className="px-2.5 py-3.5">
                    <span className="inline-flex rounded-full bg-[#EEF3FF] px-2.5 py-1 text-xs font-bold text-navy">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-2.5 py-3.5 text-sm font-bold text-navy">{product.price}</td>
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
                      onClick={() => toggleAgotado(product.id)}
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
                      <button type="button" className="hover:text-navy">
                        <EditIcon />
                      </button>
                      <button type="button" className="hover:text-navy">
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
    </DashboardShell>
  )
}

export default Products
