import { useCallback, useEffect, useMemo, useState } from 'react'
import MenuListBlock from './MenuListBlock'
import TokenizedText from './TokenizedText'
import { applyFlow } from '../lib/flowLayout'

const KNOWN = new Set(['text', 'rect', 'ellipse', 'image', 'menu_list'])
const safeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(-4000, Math.min(4000, Number(value))) : fallback
const dimension = (value, fallback = 800) => Math.max(100, Math.min(4000, Number.isFinite(Number(value)) ? Number(value) : fallback))
const safeColor = (value, fallback = '#111827') => typeof value === 'string' && /^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(value) ? value : fallback
const safeFont = (value) => typeof value === 'string' && /^[\w\s,"'-]{1,80}$/.test(value) ? value : 'Inter, sans-serif'

function background(canvas) {
  if (canvas.fillType === 'gradient') return `linear-gradient(${safeNumber(canvas.gradientAngle, 90)}deg, ${safeColor(canvas.background, '#fff')}, ${safeColor(canvas.backgroundTo, '#FD761A')})`
  if (canvas.fillType === 'grid') {
    const line = safeColor(canvas.gridColor, 'rgba(255,255,255,0.08)')
    const size = Math.max(8, Math.min(128, safeNumber(canvas.gridSize, 32)))
    return `linear-gradient(${line} 1px, transparent 1px) 0 0 / ${size}px ${size}px, linear-gradient(90deg, ${line} 1px, transparent 1px) 0 0 / ${size}px ${size}px, ${safeColor(canvas.background, '#fff')}`
  }
  return safeColor(canvas.background, '#fff')
}

export default function DesignRenderer({ design, productos = [], categorias = [], restaurante = {}, className = '', onCanvasHeight, scale = 1 }) {
  const [heights, setHeights] = useState({})
  const onHeight = useCallback((id, height) => setHeights((prev) => prev[id] === height ? prev : { ...prev, [id]: height }), [])
  const canvas = design?.canvas || { width: 800, height: 1000, background: '#fff' }
  const raw = Array.isArray(design?.elements) ? design.elements : []
  const layout = useMemo(() => applyFlow(raw.filter((el) => el && KNOWN.has(el.type)), heights, canvas.height), [raw, heights, canvas.height])
  const height = Math.max(dimension(canvas.height, 1000), layout.height)
  const safeScale = Math.max(0.05, Math.min(1, safeNumber(scale, 1)))
  useEffect(() => { onCanvasHeight?.(height) }, [height, onCanvasHeight])
  return <div className={className} style={{ position: 'relative', width: dimension(canvas.width), height, overflow: 'hidden', background: background(canvas) }}>
    {layout.elements.filter((el) => !el.hidden && KNOWN.has(el.type)).sort((a, b) => safeNumber(a.zIndex) - safeNumber(b.zIndex)).map((el) => {
      const style = { position: 'absolute', left: safeNumber(el.x), top: safeNumber(el.y), width: Math.max(0, Math.min(4000, safeNumber(el.width))), height: el.type === 'menu_list' ? 'auto' : Math.max(0, Math.min(4000, safeNumber(el.height))), minHeight: undefined, boxSizing: 'border-box', opacity: Math.max(0, Math.min(1, safeNumber(el.opacity, 100) / 100)), zIndex: safeNumber(el.zIndex), transform: `rotate(${safeNumber(el.rotation)}deg)` }
      if (el.type === 'menu_list') return <div key={el.id} style={style}><MenuListBlock element={el} productos={productos} categorias={categorias} onHeight={onHeight} scale={safeScale} showExample={false} /></div>
      if (el.type === 'text') return <div key={el.id} style={{ ...style, fontFamily: safeFont(el.fontFamily), fontSize: Math.max(safeNumber(el.fontSize, 16), 12 / safeScale), color: safeColor(el.color), fontWeight: safeNumber(el.fontWeight, 400), textAlign: ['left', 'center', 'right'].includes(el.align) ? el.align : 'left', letterSpacing: safeNumber(el.letterSpacing), lineHeight: safeNumber(el.lineHeight, 1.2), overflow: 'hidden' }}><TokenizedText text={el.text} restaurante={restaurante} missing="empty" /></div>
      if (el.type === 'image') {
        const src = typeof el.src === 'string' && /^\/uploads\/[\w./-]+$/.test(el.src) && !el.src.includes('..') ? el.src : null
        const clips = { circle: 'circle(50% at 50% 50%)', ellipse: 'ellipse(50% 50% at 50% 50%)', triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)', hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }
        const clipPath = clips[el.shape]
        const filters = [`brightness(${Math.max(0, Math.min(200, safeNumber(el.brightness, 100)))}%)`, `contrast(${Math.max(0, Math.min(200, safeNumber(el.contrast, 100)))}%)`, `grayscale(${Math.max(0, Math.min(100, safeNumber(el.grayscale)))}%)`]
        if (el.shadow) filters.push(`drop-shadow(0 0 ${Math.max(0, Math.min(80, safeNumber(el.shadow)))}px ${safeColor(el.shadowColor, 'rgba(0,0,0,0.35)')})`)
        return src ? <img key={el.id} src={src} alt="" style={{ ...style, objectFit: 'cover', borderRadius: clipPath ? 0 : safeNumber(el.borderRadius), clipPath, filter: filters.join(' ') }} /> : null
      }
      const radius = el.type === 'ellipse' ? '50%' : safeNumber(el.borderRadius)
      const fill = el.fillType === 'gradient' ? `linear-gradient(${safeNumber(el.gradientAngle, 90)}deg, ${safeColor(el.fill)}, ${safeColor(el.fillTo, '#fff')})` : safeColor(el.fill, 'transparent')
      return <div key={el.id} style={{ ...style, background: fill, borderRadius: radius, border: safeNumber(el.strokeWidth) ? `${safeNumber(el.strokeWidth)}px solid ${safeColor(el.strokeColor)}` : undefined, boxShadow: el.shadow ? `0 0 ${Math.max(0, Math.min(80, safeNumber(el.shadow)))}px ${safeColor(el.shadowColor, 'rgba(0,0,0,0.35)')}` : undefined, filter: el.blur ? `blur(${Math.max(0, Math.min(80, safeNumber(el.blur)))}px)` : undefined }} />
    })}
  </div>
}
