import { useEffect, useRef } from 'react'

const font = (value) => typeof value === 'string' && /^[\w\s,"'-]{1,80}$/.test(value) ? value : 'Inter, sans-serif'
const color = (value, fallback = '#111827') => typeof value === 'string' && /^#[\da-f]{3,8}$/i.test(value) ? value : fallback
const size = (value, fallback = 14) => Math.max(8, Math.min(60, Number.isFinite(Number(value)) ? Number(value) : fallback))
const gap = (value) => Math.max(0, Math.min(64, Number.isFinite(Number(value)) ? Number(value) : 10))
const px = (value) => Number.isFinite(Number(value)) ? Number(value) : 0

export function applyFlow(elements, measuredHeights = {}) {
  const blocks = elements.filter((el) => el.type === 'menu_list' && !el.hidden)
  const positioned = elements.map((el) => {
    const shift = blocks.reduce((sum, block) => {
      if (el.id === block.id) return sum
      if (px(el.y) < px(block.y) + px(block.height)) return sum
      const overlaps = px(el.x) < px(block.x) + px(block.width) && px(el.x) + px(el.width) > px(block.x)
      const baseHeight = px(block.height)
      const measured = measuredHeights[block.id] == null ? baseHeight : px(measuredHeights[block.id])
      return sum + (overlaps ? measured - baseHeight : 0)
    }, 0)
    return { ...el, y: px(el.y) + shift, _flowOffset: shift, _flowHeight: el.type === 'menu_list' ? (measuredHeights[el.id] ?? px(el.height)) : px(el.height) }
  })
  const height = Math.max(0, ...positioned.filter((el) => !el.hidden).map((el) => el.y + px(el._flowHeight ?? el.height)))
  return { elements: positioned, height }
}

export default function MenuListBlock({ element, productos = [], categorias = [], onHeight, scale = 1, showExample = true }) {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!node || !onHeight || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => onHeight(element.id, entry.contentRect.height))
    observer.observe(node)
    onHeight(element.id, node.getBoundingClientRect().height)
    return () => observer.disconnect()
  }, [element.id, onHeight])

  const selected = element.categoryId == null
    ? productos
    : productos.filter((p) => Number(p.id_categoria) === Number(element.categoryId))
  const grouped = element.categoryId == null
    ? (categorias.length ? categorias.map((category) => ({ name: category.nombre, dishes: selected.filter((p) => Number(p.id_categoria) === Number(category.id_categoria)) })).filter((g) => g.dishes.length).concat(selected.some((p) => p.id_categoria == null) ? [{ name: 'Otros', dishes: selected.filter((p) => p.id_categoria == null) }] : []) : [{ name: 'Otros', dishes: selected }])
    : [{ name: '', dishes: selected }]
  const demo = ['Plato de ejemplo', 'Especial de la casa', 'Postre del día']
  return (
    <div ref={ref} style={{ width: '100%', height: 'max-content', color: color(element.nameStyle?.color, '#172033') }}>
      {selected.length === 0 ? (showExample ? (
        <div style={{ opacity: 0.45 }}>
          {demo.map((name, i) => <div key={name} style={{ padding: `${gap(element.itemGap) / 2}px 0`, borderBottom: element.showDivider ? `1px solid ${color(element.dividerColor, '#CBD5E1')}` : undefined }}><strong>{name}</strong><div>Descripción del plato</div>{i === 0 && <small>Ejemplo — agrega platos en Gestión de Productos</small>}</div>)}
        </div>
      ) : null) : grouped.map((group) => <section key={group.name || 'seleccion'}>
        {group.name && <h3 style={{ fontSize: Math.max(16, 13 / scale), fontWeight: 700, margin: '0 0 8px' }}>{group.name}</h3>}
        {group.dishes.map((dish) => <article key={dish.id_producto} style={{ padding: `${gap(element.itemGap) / 2}px 0`, borderBottom: element.showDivider ? `1px solid ${color(element.dividerColor, '#CBD5E1')}` : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontFamily: font(element.nameStyle?.fontFamily), fontSize: Math.max(size(element.nameStyle?.fontSize, 16), 13 / scale), fontWeight: ['400', '600', '700', 400, 600, 700].includes(element.nameStyle?.fontWeight) ? element.nameStyle.fontWeight : 700, color: dish.agotado ? '#8A94A6' : color(element.nameStyle?.color), textDecoration: dish.agotado ? 'line-through' : undefined }}>{dish.nombre}</span>
            {dish.agotado && element.showAgotadoBadge !== false ? <span style={{ color: '#B91C1C', fontSize: Math.max(11, 12 / scale), fontWeight: 700 }}>Agotado</span> : element.showPrice !== false && <span style={{ fontFamily: font(element.priceStyle?.fontFamily), fontSize: Math.max(size(element.priceStyle?.fontSize), 12 / scale), fontWeight: ['400', '600', '700', 400, 600, 700].includes(element.priceStyle?.fontWeight) ? element.priceStyle.fontWeight : 700, color: color(element.priceStyle?.color) }}>S/ {Number(dish.precio || 0).toFixed(2)}</span>}
          </div>
          {element.showDescription !== false && dish.descripcion && <p style={{ margin: '3px 0 0', fontFamily: font(element.descStyle?.fontFamily), fontSize: Math.max(size(element.descStyle?.fontSize, 13), 12 / scale), color: color(element.descStyle?.color, '#64748B') }}>{dish.descripcion}</p>}
          {element.showTags && dish.etiquetas?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>{dish.etiquetas.map((tag) => <span key={tag} style={{ borderRadius: 999, background: '#F1F5F9', padding: `${Math.max(2, 2 / scale)}px ${Math.max(6, 6 / scale)}px`, fontSize: Math.max(10, 11 / scale) }}>{tag}</span>)}</div>}
        </article>)}
      </section>)}
    </div>
  )
}
