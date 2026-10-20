// Bloques de plato vinculados: en el editor, un elemento `type: 'product'`
// guarda solo el id del plato (más una copia de respaldo de sus datos). El
// HTML exportado marca cada bloque con data-kk-producto, y el menú público
// reemplaza nombre/precio/descripción con los datos ACTUALES del plato al
// mostrarse: si el dueño cambia un precio o marca el plato como agotado, el
// diseño publicado lo refleja sin volver a publicar.

export function formatPrecio(precio) {
  return `S/ ${Number(precio ?? 0).toFixed(2)}`
}

// Datos a mostrar para un bloque: los del plato vivo si existe, si no la
// copia que se guardó al insertarlo (p. ej. si la lista aún no cargó).
export function datosDelBloque(el, productos) {
  const vivo = productos?.find((p) => p.id_producto === el.productoId)
  if (vivo) {
    return {
      nombre: vivo.nombre,
      precio: vivo.precio,
      descripcion: vivo.descripcion ?? '',
      agotado: Boolean(vivo.agotado),
      existe: true,
    }
  }
  return {
    ...el.snapshot,
    descripcion: el.snapshot?.descripcion ?? '',
    agotado: false,
    existe: !productos,
  }
}

// Aplica los datos actuales de los platos al HTML (ya saneado por el
// backend) de un diseño publicado. Solo toca textContent y opacidad, nunca
// inserta HTML, así que no abre ninguna puerta de XSS.
export function hidratarDiseno(html, productos) {
  if (!html.includes('data-kk-producto')) return html
  const doc = new DOMParser().parseFromString(`<div id="raiz">${html}</div>`, 'text/html')
  const raiz = doc.getElementById('raiz')
  raiz.querySelectorAll('[data-kk-producto]').forEach((bloque) => {
    const id = Number(bloque.getAttribute('data-kk-producto'))
    const plato = productos.find((p) => p.id_producto === id)
    if (!plato) {
      // Plato eliminado o desactivado: el bloque desaparece del menú.
      bloque.remove()
      return
    }
    const campo = (nombre) => bloque.querySelector(`[data-kk-campo="${nombre}"]`)
    if (campo('nombre')) campo('nombre').textContent = plato.nombre
    if (campo('precio')) campo('precio').textContent = plato.agotado ? 'Agotado' : formatPrecio(plato.precio)
    if (campo('descripcion')) campo('descripcion').textContent = plato.descripcion ?? ''
    if (plato.agotado) bloque.style.opacity = '0.45'
  })
  return raiz.innerHTML
}
