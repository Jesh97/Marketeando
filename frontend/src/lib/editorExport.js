// Compila el estado editable del lienzo (capas con posición libre) a un
// bloque HTML/CSS autosuficiente: cada capa es un elemento absolute dentro
// de un contenedor relative del tamaño del lienzo. El backend vuelve a
// sanitizar este string antes de guardarlo, así que aquí no hace falta
// (ni conviene) intentar ser el único punto de defensa contra XSS.

// Debe reflejar los mismos recortes que IMAGE_SHAPES en EditorCanvas.jsx,
// para que el HTML exportado se vea igual que en el lienzo.
const IMAGE_SHAPE_CLIP_PATHS = {
  circle: 'circle(50% at 50% 50%)',
  ellipse: 'ellipse(50% 50% at 50% 50%)',
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function baseStyle(el) {
  const rotation = el.rotation || 0
  return (
    `position:absolute;left:${Math.round(el.x)}px;top:${Math.round(el.y)}px;` +
    `width:${Math.round(el.width)}px;height:${Math.round(el.height)}px;` +
    `z-index:${el.zIndex};box-sizing:border-box;` +
    `opacity:${(el.opacity ?? 100) / 100};` +
    (rotation ? `transform:rotate(${Math.round(rotation * 100) / 100}deg);` : '')
  )
}

// Mismo criterio que shapeBackgroundStyle en EditorCanvas.jsx.
function fillStyle(el) {
  if (el.fillType === 'gradient') {
    return `linear-gradient(${el.gradientAngle ?? 90}deg, ${el.fill}, ${el.fillTo ?? '#FFFFFF'})`
  }
  return el.fill
}

function elementToHtml(el) {
  const shadowColor = el.shadowColor ?? 'rgba(0,0,0,0.35)'

  if (el.type === 'text') {
    const shadow = el.shadow ? `text-shadow:0 0 ${el.shadow}px ${shadowColor};` : ''
    const fontSize = el.isSticker ? Math.min(el.width, el.height) * 0.8 : el.fontSize
    const style =
      baseStyle(el) +
      `font-family:${el.fontFamily};font-size:${fontSize}px;` +
      `color:${el.color};font-weight:${el.fontWeight};text-align:${el.align};` +
      `letter-spacing:${el.letterSpacing ?? 0}px;line-height:${el.lineHeight ?? 1.2};` +
      shadow +
      `overflow:hidden;`
    return `<div style="${style}">${escapeHtml(el.text)}</div>`
  }

  if (el.type === 'image') {
    const clipPath = IMAGE_SHAPE_CLIP_PATHS[el.shape]
    const filters = [
      `brightness(${el.brightness ?? 100}%)`,
      `contrast(${el.contrast ?? 100}%)`,
      `grayscale(${el.grayscale ?? 0}%)`,
    ]
    if (el.shadow) filters.push(`drop-shadow(0 0 ${el.shadow}px ${shadowColor})`)
    const style =
      baseStyle(el) +
      `object-fit:cover;filter:${filters.join(' ')};` +
      (clipPath ? `clip-path:${clipPath};` : `border-radius:${el.borderRadius || 0}px;`)
    return `<img src="${el.src}" alt="" style="${style}" />`
  }

  // rect / ellipse
  const radius = el.type === 'ellipse' ? '50%' : `${el.borderRadius || 0}px`
  const border = el.strokeWidth ? `border:${el.strokeWidth}px solid ${el.strokeColor ?? '#111827'};` : ''
  const shadow = el.shadow ? `box-shadow:0 0 ${el.shadow}px ${shadowColor};` : ''
  const blur = el.blur ? `filter:blur(${el.blur}px);` : ''
  const style = baseStyle(el) + `background:${fillStyle(el)};border-radius:${radius};` + border + shadow + blur
  return `<div style="${style}"></div>`
}

// Mismo criterio que canvasBackgroundStyle en EditorCanvas.jsx.
function canvasBackgroundCss(canvas) {
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

export function documentToHtml(doc) {
  const canvas = doc.canvas
  const layers = doc.elements
    .filter((el) => !el.hidden)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(elementToHtml)
    .join('\n')
  const background = canvasBackgroundCss(canvas)

  return (
    `<div style="position:relative;width:${canvas.width}px;height:${canvas.height}px;` +
    `background:${background};overflow:hidden;">\n${layers}\n</div>`
  )
}
