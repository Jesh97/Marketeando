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

// Textos vinculados: un texto normal de la plantilla (con su propio estilo)
// que muestra un solo campo de un plato (`productoId` + `productoCampo`).
// Si el plato no está en la lista (o aún no cargó) se deja el texto guardado.
function textoDelCampo(plato, campo) {
  if (campo === 'precio') return plato.agotado ? 'Agotado' : formatPrecio(plato.precio)
  if (campo === 'descripcion') return plato.descripcion ?? ''
  return plato.nombre
}

export function textoVinculado(el, productos) {
  const plato = productos?.find((p) => p.id_producto === el.productoId)
  return plato ? textoDelCampo(plato, el.productoCampo) : el.text
}

// Rellena una plantilla con los platos de Gestión de Productos. Las
// plantillas marcan cada plato de ejemplo con `platoSlot` (y en sus textos
// `platoCampo`: nombre, precio, descripcion, o quitar para lo que solo tiene
// sentido en el ejemplo, como "940 KCAL"; y `soloConPlato` lo que solo va con
// un plato real, como un precio que el ejemplo no muestra). El plato N va al
// hueco N; los huecos que sobran se borran para no publicar platos
// inventados. Sin platos registrados la plantilla queda con sus ejemplos.
//
// Los huecos de foto (`fotoSlot`, ver crearMarcadorDePlatos) reciben la foto
// del plato al que pertenecen o, si están sueltos, las fotos de los platos en
// orden. Sin foto disponible el hueco queda como estaba (📷).
export function rellenarConPlatos(elements, productos) {
  const huecos = new Set(elements.filter((el) => el.platoSlot !== undefined).map((el) => el.platoSlot)).size
  const hayPlatos = Boolean(productos?.length)
  const fotos = fotosPorHueco(elements, productos ?? [])
  const resultado = []
  for (const el of elements) {
    const { platoSlot, platoCampo, soloConPlato, fotoSlot, fotoMarco, ...resto } = el
    if (soloConPlato && !hayPlatos) continue
    const foto = fotos.get(fotoSlot)
    if (foto) {
      // El marco se conserva (fondo y borde) y la foto va adentro; el 📷 y
      // el "Reemplazá con tu foto" se quitan.
      if (fotoMarco) resultado.push(resto, imagenEnMarco(resto, foto))
      continue
    }
    if (platoSlot === undefined || !hayPlatos) {
      resultado.push(resto)
      continue
    }
    const plato = productos[platoSlot]
    if (!plato || platoCampo === 'quitar') continue
    if (!platoCampo) {
      resultado.push(resto)
      continue
    }
    resultado.push({
      ...resto,
      text: textoDelCampo(plato, platoCampo),
      productoId: plato.id_producto,
      productoCampo: platoCampo,
    })
  }
  // Las fotos entran con zIndex intermedio (marco + 0.5): se renumera con
  // enteros porque CSS ignora un z-index decimal.
  const ordenados = [...resultado].sort((a, b) => a.zIndex - b.zIndex)
  return {
    elements: ordenados.map((el, i) => ({ ...el, zIndex: i + 1 })),
    colocados: hayPlatos ? Math.min(huecos, productos.length) : 0,
    total: productos?.length ?? 0,
  }
}

function fotosPorHueco(elements, productos) {
  const sueltas = productos.map((p) => p.url_imagen).filter(Boolean)
  const fotos = new Map()
  let siguiente = 0
  for (const el of elements) {
    if (!el.fotoMarco || fotos.has(el.fotoSlot)) continue
    const foto = el.platoSlot !== undefined ? productos[el.platoSlot]?.url_imagen : sueltas[siguiente++]
    if (foto) fotos.set(el.fotoSlot, foto)
  }
  return fotos
}

function imagenEnMarco(marco, src) {
  const borde = marco.strokeWidth ?? 0
  return {
    id: `${marco.id}_foto`,
    type: 'image',
    x: marco.x + borde,
    y: marco.y + borde,
    width: marco.width - borde * 2,
    height: marco.height - borde * 2,
    rotation: 0,
    zIndex: marco.zIndex + 0.5,
    src,
    borderRadius: Math.max(0, (marco.borderRadius ?? 0) - borde),
    shape: 'rect',
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    opacity: 100,
    shadow: 0,
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
    // En los textos vinculados el propio bloque es el campo.
    const campo = (nombre) =>
      bloque.getAttribute('data-kk-campo') === nombre ? bloque : bloque.querySelector(`[data-kk-campo="${nombre}"]`)
    if (campo('nombre')) campo('nombre').textContent = plato.nombre
    if (campo('precio')) campo('precio').textContent = plato.agotado ? 'Agotado' : formatPrecio(plato.precio)
    if (campo('descripcion')) campo('descripcion').textContent = plato.descripcion ?? ''
    if (plato.agotado) bloque.style.opacity = '0.45'
  })
  return raiz.innerHTML
}
