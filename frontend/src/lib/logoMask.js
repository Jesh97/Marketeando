// Convierte el logo subido (PNG/JPG/SVG) en una máscara booleana de 200x200:
// true = píxel opaco y oscuro ("es logo"). También devuelve el color
// promedio del logo, usado como colorLogo en los modos "color"/"halftone".

export const MASK_SIZE = 200

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = url
  })
}

export function urlToImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar el logo guardado'))
    img.src = url
  })
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// sensibilidad: 0-255, umbral de luminancia. Más alto = acepta tonos más
// claros como parte del logo (más "sensible").
export function imageToMask(image, sensibilidad) {
  const canvas = document.createElement('canvas')
  canvas.width = MASK_SIZE
  canvas.height = MASK_SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.clearRect(0, 0, MASK_SIZE, MASK_SIZE)

  const escala = Math.min(MASK_SIZE / image.width, MASK_SIZE / image.height)
  const w = image.width * escala
  const h = image.height * escala
  ctx.drawImage(image, (MASK_SIZE - w) / 2, (MASK_SIZE - h) / 2, w, h)

  const { data } = ctx.getImageData(0, 0, MASK_SIZE, MASK_SIZE)
  const mask = new Uint8Array(MASK_SIZE * MASK_SIZE)
  let rSum = 0
  let gSum = 0
  let bSum = 0
  let count = 0

  for (let i = 0; i < MASK_SIZE * MASK_SIZE; i++) {
    const o = i * 4
    const r = data[o]
    const g = data[o + 1]
    const b = data[o + 2]
    const a = data[o + 3]
    const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const esLogo = a > 40 && luminancia < sensibilidad
    mask[i] = esLogo ? 1 : 0
    if (esLogo) {
      rSum += r
      gSum += g
      bSum += b
      count++
    }
  }

  const colorPromedio = count
    ? rgbToHex(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count))
    : '#0B1C30'

  return { mask, size: MASK_SIZE, colorPromedio, cobertura: count / (MASK_SIZE * MASK_SIZE) }
}

// Convierte la imagen cargada (archivo nuevo o logo ya guardado) a un PNG
// embebible como data: URL. Lo usa el modo "logo" (el logo REAL sobre una
// placa blanca al centro, a diferencia de "color"/"halftone" que solo usan
// la máscara): ahí no interesa el umbral oscuro/claro, se quiere la imagen
// tal cual, recortada a un cuadrado por "contain" igual que el resto del
// pipeline, con fondo transparente para que se vea prolija sobre la placa.
// 512px: en el modo "arte" el logo ocupa todo el QR y se nota si es chico.
export function imageToDataUrl(image, size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const escala = Math.min(size / image.width, size / image.height)
  const w = image.width * escala
  const h = image.height * escala
  ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)
  return canvas.toDataURL('image/png')
}

// Mapa de luminosidad (0 = negro, 1 = blanco) del logo tal como se ve en
// el modo "arte": mismo encuadre "contain" en un cuadrado que
// imageToDataUrl, compuesto sobre blanco (las zonas transparentes cuentan
// como fondo). Usa la misma fórmula que los lectores de QR (jsQR/ZXing)
// sobre RGB sin linealizar, porque lo que importa es cómo lo ve el lector.
export const LUMA_SIZE = 360

export function imageToLumaMap(image, size = LUMA_SIZE) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  const escala = Math.min(size / image.width, size / image.height)
  const w = image.width * escala
  const h = image.height * escala
  ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)

  const { data } = ctx.getImageData(0, 0, size, size)
  const luma = new Float32Array(size * size)
  for (let i = 0; i < size * size; i++) {
    const o = i * 4
    luma[i] = (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255
  }
  return { luma, size }
}

// u, v en [0,1): posición relativa dentro del área mapeada a la máscara.
export function maskAt(mask, maskSize, u, v) {
  if (!mask) return false
  const x = Math.min(maskSize - 1, Math.max(0, Math.floor(u * maskSize)))
  const y = Math.min(maskSize - 1, Math.max(0, Math.floor(v * maskSize)))
  return mask[y * maskSize + x] === 1
}
