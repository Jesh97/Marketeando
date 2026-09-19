// Compila el estado editable del lienzo (capas con posición libre) a un
// bloque HTML/CSS autosuficiente: cada capa es un elemento absolute dentro
// de un contenedor relative del tamaño del lienzo. El backend vuelve a
// sanitizar este string antes de guardarlo, así que aquí no hace falta
// (ni conviene) intentar ser el único punto de defensa contra XSS.

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
    `z-index:${el.zIndex};` +
    (rotation ? `transform:rotate(${Math.round(rotation * 100) / 100}deg);` : '')
  )
}

function elementToHtml(el) {
  if (el.type === 'text') {
    const style =
      baseStyle(el) +
      `font-family:${el.fontFamily};font-size:${el.fontSize}px;` +
      `color:${el.color};font-weight:${el.fontWeight};text-align:${el.align};` +
      `overflow:hidden;`
    return `<div style="${style}">${escapeHtml(el.text)}</div>`
  }

  if (el.type === 'image') {
    const style = baseStyle(el) + `object-fit:cover;border-radius:${el.borderRadius || 0}px;`
    return `<img src="${el.src}" alt="" style="${style}" />`
  }

  // rect / ellipse
  const radius = el.type === 'ellipse' ? '50%' : `${el.borderRadius || 0}px`
  const style = baseStyle(el) + `background-color:${el.fill};border-radius:${radius};`
  return `<div style="${style}"></div>`
}

export function documentToHtml(doc) {
  const canvas = doc.canvas
  const layers = [...doc.elements].sort((a, b) => a.zIndex - b.zIndex).map(elementToHtml).join('\n')

  return (
    `<div style="position:relative;width:${canvas.width}px;height:${canvas.height}px;` +
    `background-color:${canvas.background};overflow:hidden;">\n${layers}\n</div>`
  )
}
