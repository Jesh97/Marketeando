// Reglas de los formularios. Deben coincidir con las del backend (tags
// `binding` de los handlers y backend/internal/validacion): el frontend
// avisa antes de enviar, el backend es el que de verdad protege los datos.
// Cada función devuelve '' si el valor es válido o el mensaje de error.

export const LIMITES = {
  nombre: 150,
  nombreCorto: 100, // categorías, menús y locales
  slogan: 150,
  direccion: 150,
  descripcion: 500,
  correo: 150,
  contrasenaMin: 8,
  contrasenaMax: 72,
  precioMin: 0.1,
  precioMax: 9999.99,
  imagenBytes: 5 * 1024 * 1024,
}

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export function validarTexto(valor, { etiqueta = 'El nombre', min = 2, max = LIMITES.nombre, obligatorio = true } = {}) {
  const v = (valor ?? '').trim()
  if (!v) return obligatorio ? `${etiqueta} es obligatorio.` : ''
  if (v.length < min) return `${etiqueta} debe tener al menos ${min} caracteres.`
  if (v.length > max) return `${etiqueta} puede tener como máximo ${max} caracteres.`
  return ''
}

export function validarCorreo(valor) {
  const v = (valor ?? '').trim()
  if (!v) return 'El correo es obligatorio.'
  if (v.length > LIMITES.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'El correo no es válido.'
  return ''
}

export function validarContrasena(valor) {
  const v = valor ?? ''
  if (v.length < LIMITES.contrasenaMin) return `La contraseña debe tener al menos ${LIMITES.contrasenaMin} caracteres.`
  if (v.length > LIMITES.contrasenaMax) return `La contraseña puede tener como máximo ${LIMITES.contrasenaMax} caracteres.`
  if (!/\p{L}/u.test(v) || !/\d/.test(v)) return 'La contraseña debe tener al menos una letra y un número.'
  return ''
}

// Celular peruano opcional: vacío es válido.
export function validarTelefono(valor) {
  const v = (valor ?? '').trim()
  if (!v) return ''
  return /^9\d{8}$/.test(v) ? '' : 'El teléfono debe tener 9 dígitos y empezar con 9.'
}

export function validarPrecio(valor) {
  const v = String(valor ?? '').trim()
  if (!v) return 'El precio es obligatorio.'
  if (!/^\d+(\.\d{1,2})?$/.test(v)) {
    return /^\d+\.\d{3,}$/.test(v) ? 'El precio puede tener como máximo 2 decimales.' : 'El precio no es válido.'
  }
  const n = Number(v)
  if (n < LIMITES.precioMin) return 'El precio debe ser al menos S/ 0.10.'
  if (n > LIMITES.precioMax) return 'El precio no puede ser mayor a S/ 9,999.99.'
  return ''
}

export function validarImagen(file) {
  if (!file) return ''
  if (!TIPOS_IMAGEN.includes(file.type)) return 'Formato no soportado. Usa PNG, JPG, WebP o GIF.'
  if (file.size > LIMITES.imagenBytes) return 'La imagen supera los 5 MB.'
  return ''
}

// Primer mensaje de error de una lista de validaciones ('' si todas pasan).
export function primerError(...errores) {
  return errores.find(Boolean) ?? ''
}
