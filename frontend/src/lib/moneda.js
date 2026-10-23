// Los precios de los planes viven en la base de datos (tabla plan) y están
// en soles: el frontend nunca debe escribirlos a mano.
export function formatSoles(precio) {
  const n = Number(precio ?? 0)
  return `S/ ${Number.isInteger(n) ? n : n.toFixed(2)}`
}
