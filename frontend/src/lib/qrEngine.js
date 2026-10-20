// Motor del QR personalizado: arma la matriz con la librería `qrcode` y
// dibuja el SVG a mano (puntos, ojos, logo). Los 3 modos comparten la misma
// matriz de datos, así que la URL codificada es siempre la misma.
import QRCode from 'qrcode'
import ECCode from 'qrcode/lib/core/error-correction-code'
import jsQR from 'jsqr'
import { maskAt } from './logoMask'

export const MODOS = ['classic', 'color', 'halftone', 'logo', 'arte']
const MARGEN = 4 // zona blanca mínima exigida (en módulos)
const REGION_LOGO_FRACCION = 0.42 // modo "color": tamaño del área central reservada al logo

// Fracción de lado "de serie" para el modo "logo" (logo real sobre placa
// blanca al centro, ver construirLogoCentral): conservadora a propósito,
// el auto-ajuste del caller puede probar valores más chicos si no decodifica.
export const LOGO_CENTRAL_FRACCION_DEFAULT = 0.3

function construirQr(texto, { versionMinima } = {}) {
  let qr = QRCode.create(texto, { errorCorrectionLevel: 'H' })
  if (versionMinima && qr.version < versionMinima) {
    qr = QRCode.create(texto, { errorCorrectionLevel: 'H', version: versionMinima })
  }
  return qr
}

export function construirMatriz(texto, opciones) {
  return construirQr(texto, opciones).modules
}

function esOjo(r, c, size) {
  return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
}

function svgOjos(size, colorPuntos, colorFondo) {
  const esquinas = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ]
  return esquinas
    .map(([r, c]) => {
      const x = c + MARGEN
      const y = r + MARGEN
      return (
        `<rect x="${x}" y="${y}" width="7" height="7" rx="1.6" fill="${colorPuntos}"/>` +
        `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1.1" fill="${colorFondo}"/>` +
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.7" fill="${colorPuntos}"/>`
      )
    })
    .join('')
}

function puntoCirculo(cx, cy, color, radio = 0.42) {
  return `<circle cx="${cx}" cy="${cy}" r="${radio}" fill="${color}"/>`
}

function construirClassic({ matrix, colorPuntos }) {
  const { size } = matrix
  let cuerpo = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (esOjo(r, c, size)) continue
      if (matrix.get(r, c)) {
        cuerpo += puntoCirculo(c + MARGEN + 0.5, r + MARGEN + 0.5, colorPuntos)
      }
    }
  }
  return cuerpo
}

// Logo en el centro, a escala "clásica" de QR con logo: la silueta se
// dibuja muy clara detrás, y los módulos oscuros que caen dentro toman el
// color del logo (el resto conserva colorPuntos).
function construirColor({ matrix, colorPuntos, colorLogo, mask, maskSize }) {
  const { size } = matrix
  const lado = Math.floor(size * REGION_LOGO_FRACCION)
  const inicio = Math.floor((size - lado) / 2)
  const fin = inicio + lado

  let silueta = ''
  let puntos = ''

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (esOjo(r, c, size)) continue

      let dentroDelLogo = false
      if (mask && r >= inicio && r < fin && c >= inicio && c < fin) {
        const u = (c - inicio) / lado
        const v = (r - inicio) / lado
        dentroDelLogo = maskAt(mask, maskSize, u, v)
        if (dentroDelLogo) {
          // Opacidad baja a propósito: es solo para distinguir la silueta a
          // simple vista. Más alta empieza a correr el riesgo de que un
          // módulo "claro" del QR dentro del área del logo se oscurezca lo
          // suficiente como para que jsQR lo confunda con un módulo oscuro.
          silueta += `<rect x="${c + MARGEN}" y="${r + MARGEN}" width="1" height="1" fill="${colorLogo}" opacity="0.16"/>`
        }
      }

      if (!matrix.get(r, c)) continue
      // Dentro del logo, el punto se dibuja un poco más grande además de
      // recolorearse: así el logo se nota por los puntos reales, no solo por
      // el tinte de fondo (que debe quedarse tenue para no afectar la lectura).
      puntos += puntoCirculo(
        c + MARGEN + 0.5,
        r + MARGEN + 0.5,
        dentroDelLogo ? colorLogo : colorPuntos,
        dentroDelLogo ? 0.48 : 0.42,
      )
    }
  }

  return silueta + puntos
}

// Verdadero "halftone fotográfico": solo los módulos que YA son datos
// oscuros se dibujan (nunca se inventa un punto donde el bit es claro, así
// que decodifica igual de bien que "classic"). Lo que cambia es el tamaño:
// chico y disperso en el fondo, grande y sólido dentro del logo — eso es lo
// que hace que el dibujo se note como una imagen real, no como ruido.
const RADIO_FONDO_HALFTONE = 0.3
const RADIO_LOGO_HALFTONE = 0.7

function construirHalftone({ matrix, colorPuntos, colorLogo, mask, maskSize }) {
  const { size } = matrix
  let cuerpo = ''

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (esOjo(r, c, size)) continue
      if (!matrix.get(r, c)) continue

      const dentroDelLogo = mask && maskAt(mask, maskSize, c / size, r / size)
      cuerpo += puntoCirculo(
        c + MARGEN + 0.5,
        r + MARGEN + 0.5,
        dentroDelLogo ? colorLogo : colorPuntos,
        dentroDelLogo ? RADIO_LOGO_HALFTONE : RADIO_FONDO_HALFTONE,
      )
    }
  }
  return cuerpo
}

// El más confiable para CUALQUIER logo (y el único que sirve para
// isotipos con texto, como un nombre de marca): no intenta "dibujar" el
// logo con los puntos del QR —eso solo funciona para íconos sólidos simples,
// nunca para letras finas, que a la resolución de un QR quedan como ruido
// irreconocible—. En cambio, pone la imagen real sobre una placa blanca al
// centro, omitiendo del todo los módulos que tapa (igual que cualquier QR
// con logo "de toda la vida"): el nivel de corrección de errores H
// (~30%) tolera perder esa zona sin problema, siempre que no sea
// demasiado grande — por eso el caller puede ir probando una fracción más
// chica si validarDecodifica no pasa.
function construirLogoCentral({ matrix, colorPuntos, colorFondo, logoImagenUrl, fraccion }) {
  const { size } = matrix
  const lado = fraccion * size
  const inicio = (size - lado) / 2
  const fin = inicio + lado

  let puntos = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (esOjo(r, c, size)) continue
      const cx = c + 0.5
      const cy = r + 0.5
      if (cx >= inicio && cx < fin && cy >= inicio && cy < fin) continue
      if (matrix.get(r, c)) {
        puntos += puntoCirculo(c + MARGEN + 0.5, r + MARGEN + 0.5, colorPuntos)
      }
    }
  }

  if (!logoImagenUrl) return puntos

  const x = inicio + MARGEN
  const y = inicio + MARGEN
  const pad = lado * 0.12
  const placa =
    `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" rx="${lado * 0.16}" fill="${colorFondo}"/>` +
    `<image x="${x + pad}" y="${y + pad}" width="${lado - pad * 2}" height="${lado - pad * 2}" ` +
    `href="${logoImagenUrl}" xlink:href="${logoImagenUrl}" preserveAspectRatio="xMidYMid meet"/>`

  return puntos + placa
}

// Modo "arte" (estilo "halftone QR" de las agencias): el logo a todo color
// ocupa TODO el QR y cada módulo se dibuja como un punto encima — oscuro si
// el bit es oscuro, claro si es claro, sin importar el color del logo
// debajo. El lector solo mira el centro de cada módulo, así que el resto
// del cuadrado queda libre para la imagen. Los ojos van como anillos
// circulares sobre un halo del color de fondo (la proporción 1:1:3:1:1 que
// buscan los lectores se mantiene en cualquier línea que cruce el centro).
// Radio 0.42: probado con desenfoque + ruido (simulando una cámara), por
// debajo de ~0.4 jsQR empieza a fallar con logos oscuros o muy saturados.
export const ARTE_RADIO_DEFAULT = 0.42
export const ARTE_OPACIDAD_DEFAULT = 1
// Versión mínima: más módulos = puntos más finos y el logo se ve mejor,
// pero cada punto es más chico en el impreso. 7 (45x45) es el equilibrio.
const ARTE_VERSION_MINIMA = 7

function svgOjosCirculares(size, colorAnillo, colorFondo, colorCentro) {
  const centros = [
    [3.5, 3.5],
    [size - 3.5, 3.5],
    [3.5, size - 3.5],
  ]
  return centros.map(([cx, cy]) => {
    const x = cx + MARGEN
    const y = cy + MARGEN
    return (
      `<circle cx="${x}" cy="${y}" r="3" fill="${colorFondo}" stroke="${colorAnillo}" stroke-width="1"/>` +
      `<circle cx="${x}" cy="${y}" r="1.5" fill="${colorCentro}"/>`
    )
  })
    .join('')
}

// El halo cubre el separador (fila/columna 7) para que el anillo no se
// mezcle con el logo; con r=4.6 no llega al centro de ningún módulo de datos
// (el más cercano está a 5 módulos del centro del ojo).
function svgHalosOjos(size, colorFondo) {
  return [
    [3.5, 3.5],
    [size - 3.5, 3.5],
    [3.5, size - 3.5],
  ]
    .map(([cx, cy]) => `<circle cx="${cx + MARGEN}" cy="${cy + MARGEN}" r="4.6" fill="${colorFondo}"/>`)
    .join('')
}

// Umbrales para decidir que el logo "ya dice" el valor del módulo: zona
// claramente oscura o claramente clara en TODO el centro del módulo (no
// solo en promedio), para que un borde del logo que cruza el módulo nunca
// cuente como coincidencia. La franja intermedia siempre lleva punto.
const LUMA_OSCURO_MEDIA = 0.36
const LUMA_OSCURO_MAX = 0.48
const LUMA_CLARO_MEDIA = 0.72
const LUMA_CLARO_MIN = 0.6
const MUESTRAS_POR_LADO = 5 // grilla de muestreo dentro del 70% central del módulo

// 1 = el logo ya se ve oscuro ahí, 0 = claro, null = ambiguo (borde, gris medio).
function tonoDelLogo(lumaMap, opacidad, r, c, size) {
  const { luma, size: lado } = lumaMap
  let suma = 0
  let min = 1
  let max = 0
  for (let i = 0; i < MUESTRAS_POR_LADO; i++) {
    for (let j = 0; j < MUESTRAS_POR_LADO; j++) {
      const u = (c + 0.15 + (0.7 * (j + 0.5)) / MUESTRAS_POR_LADO) / size
      const v = (r + 0.15 + (0.7 * (i + 0.5)) / MUESTRAS_POR_LADO) / size
      const x = Math.min(lado - 1, Math.floor(u * lado))
      const y = Math.min(lado - 1, Math.floor(v * lado))
      // Con opacidad < 1 el logo se mezcla con el fondo blanco.
      const l = opacidad * luma[y * lado + x] + (1 - opacidad)
      suma += l
      if (l < min) min = l
      if (l > max) max = l
    }
  }
  const media = suma / (MUESTRAS_POR_LADO * MUESTRAS_POR_LADO)
  if (media < LUMA_OSCURO_MEDIA && max < LUMA_OSCURO_MAX) return 1
  if (media > LUMA_CLARO_MEDIA && min > LUMA_CLARO_MIN) return 0
  return null
}

// Para cada módulo de datos: a qué codeword pertenece y a qué bloque
// Reed-Solomon va ese codeword. Replica el recorrido en zigzag y el
// intercalado de bloques del estándar (igual que setupData/createCodewords
// de la librería `qrcode`). -1 = módulo de función (ojos, timing, formato),
// -2 = bit de relleno que no pertenece a ningún codeword.
function mapaDeBloques(qr) {
  const m = qr.modules
  const { size } = m
  let modulosDeDatos = 0
  for (let i = 0; i < size * size; i++) if (!m.reservedBit[i]) modulosDeDatos++
  const totalCw = Math.floor(modulosDeDatos / 8)
  const ecTotal = ECCode.getTotalCodewordsCount(qr.version, qr.errorCorrectionLevel)
  const bloques = ECCode.getBlocksCount(qr.version, qr.errorCorrectionLevel)
  const datosTotal = totalCw - ecTotal
  const bloquesGrupo1 = bloques - (totalCw % bloques)
  const datosGrupo1 = Math.floor(datosTotal / bloques)
  const ecPorBloque = Math.floor(totalCw / bloques) - datosGrupo1

  const bloqueDeCw = new Int16Array(totalCw)
  let k = 0
  for (let i = 0; i <= datosGrupo1; i++) {
    for (let b = 0; b < bloques; b++) {
      const largo = b < bloquesGrupo1 ? datosGrupo1 : datosGrupo1 + 1
      if (i < largo) bloqueDeCw[k++] = b
    }
  }
  for (let i = 0; i < ecPorBloque; i++) for (let b = 0; b < bloques; b++) bloqueDeCw[k++] = b

  const cwDeModulo = new Int32Array(size * size).fill(-1)
  let inc = -1
  let row = size - 1
  let bit = 0
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (;;) {
      for (let c = 0; c < 2; c++) {
        if (!m.isReserved(row, col - c)) {
          const cw = Math.floor(bit / 8)
          cwDeModulo[row * size + col - c] = cw < totalCw ? cw : -2
          bit++
        }
      }
      row += inc
      if (row < 0 || size <= row) {
        row -= inc
        inc = -inc
        break
      }
    }
  }

  // Un bloque con n codewords de corrección repara hasta floor(n/2) errores.
  return { cwDeModulo, bloqueDeCw, bloques, capacidadPorBloque: Math.floor(ecPorBloque / 2) }
}

// "Prioridad al logo": dentro de las zonas oscuras del logo, los datos
// claros exigen un punto blanco que "agujerea" las letras. Usando a
// propósito la corrección de errores (nivel H), se pueden omitir algunos de
// esos puntos y dejar el logo intacto. El presupuesto se lleva POR BLOQUE
// Reed-Solomon (cada bloque se repara por separado) y nunca pasa de
// `prioridad` × su capacidad, para que el resto quede de margen contra
// manchas, reflejos o desenfoque reales. Determinista: el Dashboard
// reconstruye exactamente los mismos módulos con los mismos ajustes.
export const ARTE_PRIORIDAD_DEFAULT = 0.5
export const ARTE_PRIORIDAD_MAX = 0.6

function modulosCedidosAlLogo(qr, tonos, prioridad) {
  const cedidos = new Set()
  if (!(prioridad > 0)) return cedidos
  const m = qr.modules
  const { size } = m
  const { cwDeModulo, bloqueDeCw, bloques, capacidadPorBloque } = mapaDeBloques(qr)
  const presupuesto = Math.floor(capacidadPorBloque * Math.min(prioridad, ARTE_PRIORIDAD_MAX))
  if (presupuesto <= 0) return cedidos

  // Primero los del interior de las letras (más vecinos oscuros): son los
  // que más se notan como agujeros.
  const candidatos = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = r * size + c
      if (cwDeModulo[i] === -1 || m.get(r, c) || tonos[i] !== 1) continue
      let vecinos = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr
          const cc = c + dc
          if (rr >= 0 && rr < size && cc >= 0 && cc < size && tonos[rr * size + cc] === 1) vecinos++
        }
      }
      candidatos.push({ i, vecinos })
    }
  }
  candidatos.sort((a, b) => b.vecinos - a.vecinos || a.i - b.i)

  const danados = new Set()
  const usados = new Int16Array(bloques)
  for (const { i } of candidatos) {
    const cw = cwDeModulo[i]
    if (cw === -2 || danados.has(cw)) {
      cedidos.add(i) // relleno, o codeword ya contado: no gasta presupuesto
      continue
    }
    const b = bloqueDeCw[cw]
    if (usados[b] >= presupuesto) continue
    usados[b]++
    danados.add(cw)
    cedidos.add(i)
  }
  return cedidos
}

function construirArte({ qr, colorPuntos, colorFondo, logoImagenUrl, lumaLogo, radio, opacidad, prioridad }) {
  const matrix = qr.modules
  const { size } = matrix
  let imagen = ''
  if (logoImagenUrl) {
    imagen =
      `<image x="${MARGEN}" y="${MARGEN}" width="${size}" height="${size}" ` +
      `href="${logoImagenUrl}" xlink:href="${logoImagenUrl}" preserveAspectRatio="xMidYMid meet" ` +
      `opacity="${opacidad}"/>`
  }

  const tonos = new Array(size * size).fill(null)
  if (lumaLogo) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!esOjo(r, c, size)) tonos[r * size + c] = tonoDelLogo(lumaLogo, opacidad, r, c, size)
      }
    }
  }
  const cedidos = lumaLogo ? modulosCedidosAlLogo(qr, tonos, prioridad) : new Set()

  let oscuros = ''
  let claros = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (esOjo(r, c, size)) continue
      const i = r * size + c
      const oscuro = Boolean(matrix.get(r, c))
      // Si el logo debajo ya tiene el tono que pide el dato (dato oscuro
      // sobre las letras rojas, dato claro sobre una zona blanca), el lector
      // lo lee igual sin punto: se omite y el logo se ve limpio. Solo se
      // dibuja punto donde el logo contradice al dato o es ambiguo (o donde
      // se cedió el módulo al logo, ver modulosCedidosAlLogo).
      if (tonos[i] === (oscuro ? 1 : 0) || cedidos.has(i)) continue
      const cx = c + MARGEN + 0.5
      const cy = r + MARGEN + 0.5
      // Sin logo, los puntos claros serían invisibles sobre el fondo: se omiten.
      if (oscuro) oscuros += `<circle cx="${cx}" cy="${cy}" r="${radio}"/>`
      else if (logoImagenUrl) claros += `<circle cx="${cx}" cy="${cy}" r="${radio}"/>`
    }
  }

  return (
    imagen +
    svgHalosOjos(size, colorFondo) +
    `<g fill="${colorFondo}">${claros}</g>` +
    `<g fill="${colorPuntos}">${oscuros}</g>`
  )
}

export function construirSvg({
  texto,
  modo,
  colorPuntos,
  colorFondo,
  colorLogo,
  mask,
  maskSize,
  logoImagenUrl,
  logoFraccion = LOGO_CENTRAL_FRACCION_DEFAULT,
  radioPunto = ARTE_RADIO_DEFAULT,
  opacidadLogo = ARTE_OPACIDAD_DEFAULT,
  prioridadLogo = ARTE_PRIORIDAD_DEFAULT,
  lumaLogo,
}) {
  const versionMinima = modo === 'halftone' ? 8 : modo === 'arte' ? ARTE_VERSION_MINIMA : undefined
  const qr = construirQr(texto, { versionMinima })
  const matrix = qr.modules
  const { size } = matrix
  const total = size + MARGEN * 2
  const logo = colorLogo || colorPuntos

  if (modo === 'arte') {
    // El centro del ojo toma el color del logo solo si contrasta lo
    // suficiente con el fondo; si no (ej. amarillo sobre blanco), el lector
    // lo vería "claro" y no reconocería el ojo.
    const colorCentro = colorLogo && contrasteRatio(colorLogo, colorFondo) >= 3 ? colorLogo : colorPuntos
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
      `viewBox="0 0 ${total} ${total}" width="${total}" height="${total}">` +
      `<rect x="0" y="0" width="${total}" height="${total}" fill="${colorFondo}"/>` +
      construirArte({
        qr,
        colorPuntos,
        colorFondo,
        logoImagenUrl,
        lumaLogo: logoImagenUrl ? lumaLogo : null,
        radio: radioPunto,
        opacidad: opacidadLogo,
        prioridad: prioridadLogo,
      }) +
      svgOjosCirculares(size, colorPuntos, colorFondo, colorCentro) +
      `</svg>`
    )
  }

  let cuerpo
  if (modo === 'logo') {
    cuerpo = construirLogoCentral({ matrix, colorPuntos, colorFondo, logoImagenUrl, fraccion: logoFraccion })
  } else if (modo === 'color') {
    cuerpo = construirColor({ matrix, colorPuntos, colorLogo: logo, mask, maskSize })
  } else if (modo === 'halftone') {
    cuerpo = construirHalftone({ matrix, colorPuntos, colorLogo: logo, mask, maskSize })
  } else {
    cuerpo = construirClassic({ matrix, colorPuntos })
  }

  const ojos = svgOjos(size, colorPuntos, colorFondo)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${total} ${total}" width="${total}" height="${total}">` +
    `<rect x="0" y="0" width="${total}" height="${total}" fill="${colorFondo}"/>` +
    cuerpo +
    ojos +
    `</svg>`
  )
}

function hexToRgb(hex) {
  const limpio = hex.replace('#', '')
  const completo = limpio.length === 3 ? limpio.split('').map((x) => x + x).join('') : limpio
  const entero = parseInt(completo, 16)
  return { r: (entero >> 16) & 255, g: (entero >> 8) & 255, b: entero & 255 }
}

function luminanciaRelativa({ r, g, b }) {
  const canal = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

// Contraste WCAG entre dos colores hex; exigimos mínimo 4.5:1.
export function contrasteRatio(hexA, hexB) {
  const la = luminanciaRelativa(hexToRgb(hexA))
  const lb = luminanciaRelativa(hexToRgb(hexB))
  const [clara, oscura] = la > lb ? [la, lb] : [lb, la]
  return (clara + 0.05) / (oscura + 0.05)
}

// El contraste por sí solo no evita "puntos claros sobre fondo oscuro"
// (ej. blanco sobre navy también da 4.5:1+): el spec lo prohíbe explícito.
export function puntosValidos(colorPuntos, colorFondo) {
  const masOscuro = luminanciaRelativa(hexToRgb(colorPuntos)) < luminanciaRelativa(hexToRgb(colorFondo))
  return masOscuro && contrasteRatio(colorPuntos, colorFondo) >= 4.5
}

// Un QR de puntos (no cuadrados sólidos) es sensible a que el rasterizado
// no caiga exacto en el grid de módulos: un tamaño "arbitrario" deja cada
// módulo a un número no entero de píxeles, y el antialiasing resultante
// puede tragarse puntos finos justo donde jsQR muestrea. Alinear el tamaño
// final a un múltiplo entero del total de unidades del viewBox (ya 100%
// determinista a partir del propio SVG) evita ese ruido.
function totalUnidadesDesdeSvg(svgMarkup) {
  const m = /viewBox="0 0 (\d+) \d+"/.exec(svgMarkup)
  return m ? parseInt(m[1], 10) : null
}

function tamanoAlineado(svgMarkup, deseado) {
  const total = totalUnidadesDesdeSvg(svgMarkup)
  if (!total) return deseado
  const porModulo = Math.max(4, Math.round(deseado / total))
  return total * porModulo
}

// Rasteriza el SVG a un tamaño fijo y decodifica con jsQR.
// PRNG con semilla (mulberry32): el "ruido de sensor" de la validación
// tiene que ser el mismo en cada intento, si no el mismo diseño pasaría o
// fallaría al azar.
function generadorConSemilla(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function decodificarAUnTamano(img, urlEsperada, tamano, desenfoque = 0, ruido = 0) {
  const canvas = document.createElement('canvas')
  canvas.width = tamano
  canvas.height = tamano
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, tamano, tamano)
  if (desenfoque) ctx.filter = `blur(${desenfoque}px)`
  ctx.drawImage(img, 0, 0, tamano, tamano)
  const { data } = ctx.getImageData(0, 0, tamano, tamano)
  if (ruido) {
    const azar = generadorConSemilla(tamano)
    for (let i = 0; i < data.length; i += 4) {
      const n = (azar() - 0.5) * ruido
      data[i] += n
      data[i + 1] += n
      data[i + 2] += n
    }
  }
  const resultado = jsQR(data, tamano, tamano)
  return Boolean(resultado && resultado.data === urlEsperada)
}

// Un teléfono real escanea a distancias/zoom variables; probar varios
// tamaños "deseados" (cada uno alineado al grid real del SVG) cubre ese
// rango sin depender de que un único número arbitrario caiga bien.
const TAMANOS_VALIDACION_DESEADOS = [300, 450, 600]

// Modo "arte": con puntos sobre una imagen, jsQR falla seguido con el
// render nítido perfecto y acierta con el desenfoque de una cámara real
// (y al revés: un render nítido puede pasar "de suerte"). Ahí se valida
// simulando la cámara —tamaños no alineados al grid + desenfoque— y se
// exige que lea en la gran mayoría de los casos, no en uno solo. El
// umbral (75%) está calibrado para aceptar diseños que en pruebas leían
// ~80% de las veces con ruido fuerte y rechazar los que leían ~30%.
// [tamaño, desenfoque, ruido]
const CAMARAS_SIMULADAS = [
  [263, 0.6, 0],
  [331, 1, 0],
  [417, 1.4, 0],
  [500, 1.8, 0],
  ...[241, 271, 299, 311, 337, 361, 389, 409, 443, 467, 499, 521].map((tamano) => [
    tamano,
    0.5 + ((tamano - 241) / 280) * 1.5,
    50,
  ]),
]
const CAMARAS_MINIMAS_OK = Math.ceil(CAMARAS_SIMULADAS.length * 0.75)

export function validarDecodifica(svgMarkup, urlEsperada, { simularCamara = false } = {}) {
  return new Promise((resolve) => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      try {
        const intentar = (tamano, desenfoque, ruido) => {
          try {
            return decodificarAUnTamano(img, urlEsperada, tamano, desenfoque, ruido)
          } catch {
            return false
          }
        }
        const ok = simularCamara
          ? CAMARAS_SIMULADAS.filter(([tamano, desenfoque, ruido]) => intentar(tamano, desenfoque, ruido))
              .length >= CAMARAS_MINIMAS_OK
          : TAMANOS_VALIDACION_DESEADOS.some((deseado) => intentar(tamanoAlineado(svgMarkup, deseado)))
        resolve(ok)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(false)
    }
    img.src = url
  })
}

export function rasterizarPng(svgMarkup, tamanoDeseado = 2000) {
  return new Promise((resolve, reject) => {
    const tamano = tamanoAlineado(svgMarkup, tamanoDeseado)
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = tamano
      canvas.height = tamano
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, tamano, tamano)
      ctx.drawImage(img, 0, 0, tamano, tamano)
      URL.revokeObjectURL(url)
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob)
        else reject(new Error('No se pudo generar el PNG'))
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo rasterizar el QR'))
    }
    img.src = url
  })
}
