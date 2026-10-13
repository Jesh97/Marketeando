// Envuelve el Checkout hosteado de Culqi.js v4 (window.Culqi, cargado en
// index.html) en una promesa. Culqi dibuja su propio formulario de tarjeta en
// un modal encima del nuestro: el número de tarjeta nunca toca nuestro
// código ni nuestro backend, solo recibimos el token resultante (tkn_...).
//
// IMPORTANTE: verificar el nombre exacto de los callbacks/campos
// (`Culqi.token`, `Culqi.order`, `Culqi.error`) contra
// https://docs.culqi.com/es/documentacion/checkout/v4/culqi-checkout/ en
// cuanto se tengan llaves de prueba reales — no se pudo probar en vivo.
const PUBLIC_KEY = import.meta.env.VITE_CULQI_PUBLIC_KEY

export function tokenizarTarjeta({ montoCentavos, descripcion }) {
  return new Promise((resolve, reject) => {
    if (!window.Culqi) {
      reject(new Error('No se pudo cargar Culqi. Recarga la página e intenta de nuevo.'))
      return
    }
    if (!PUBLIC_KEY) {
      reject(new Error('Falta configurar VITE_CULQI_PUBLIC_KEY en el frontend.'))
      return
    }

    window.Culqi.publicKey = PUBLIC_KEY
    window.Culqi.settings({
      title: 'KartaKamay',
      currency: 'PEN',
      amount: Math.max(montoCentavos, 100),
      description: descripcion,
    })

    window.culqi = function handleCulqiCallback() {
      if (window.Culqi.token?.id) {
        resolve(window.Culqi.token.id)
      } else {
        reject(new Error(window.Culqi.error?.user_message ?? 'No se completó el pago.'))
      }
    }

    window.Culqi.open()
  })
}
