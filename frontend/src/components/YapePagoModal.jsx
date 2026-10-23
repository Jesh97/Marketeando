import { useCallback, useEffect, useState } from 'react'
import apiClient from '../api/client'

// Cada cuánto se pregunta al backend si ya llegó el yapeo (lo confirma el
// script del celular que recibe los pagos, ver backend/scripts).
const INTERVALO_CONSULTA_MS = 3000

function formatNumero(numero) {
  return numero.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3')
}

function formatRestante(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const min = String(Math.floor(total / 60)).padStart(2, '0')
  const seg = String(total % 60).padStart(2, '0')
  return `${min}:${seg}`
}

// Pago de un plan con Yape personal: muestra QR, número y un monto con
// céntimos únicos (S/ 75.37) que es lo que permite saber de quién es cada
// yapeo. Se confirma solo cuando llega la notificación; si el yapeo llegó
// tarde, el restaurante lo reclama con el código de seguridad del comprobante.
function YapePagoModal({ idRestaurante, plan, onClose, onConfirmado }) {
  const [pago, setPago] = useState(null)
  const [error, setError] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())
  const [qrRoto, setQrRoto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [mostrarReclamo, setMostrarReclamo] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [reclamando, setReclamando] = useState(false)
  const [errorReclamo, setErrorReclamo] = useState(null)

  const base = `/restaurantes/${idRestaurante}/suscripcion/yape`

  const generarPago = useCallback(async () => {
    setGenerando(true)
    setError(null)
    setMostrarReclamo(false)
    setErrorReclamo(null)
    try {
      const { data } = await apiClient.post(base, { id_plan: plan.id_plan })
      setPago(data)
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo generar el pago con Yape.')
    } finally {
      setGenerando(false)
    }
  }, [base, plan.id_plan])

  useEffect(() => {
    generarPago()
  }, [generarPago])

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Se sigue consultando aun después de expirar: el backend acepta
  // notificaciones que llegan con un par de minutos de retraso.
  const idPago = pago?.id_pago
  const confirmado = pago?.estado === 'confirmado'
  useEffect(() => {
    if (!idPago || confirmado) return undefined
    const id = setInterval(async () => {
      try {
        const { data } = await apiClient.get(`${base}/${idPago}`)
        setPago(data)
      } catch {
        // Un fallo puntual de red no corta la espera; se reintenta solo.
      }
    }, INTERVALO_CONSULTA_MS)
    return () => clearInterval(id)
  }, [base, idPago, confirmado])

  async function copiarNumero() {
    try {
      await navigator.clipboard.writeText(pago.numero)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  async function reclamar(e) {
    e.preventDefault()
    setReclamando(true)
    setErrorReclamo(null)
    try {
      const { data } = await apiClient.post(`${base}/${idPago}/reclamar`, { codigo_seguridad: codigo.trim() })
      setPago(data)
    } catch (err) {
      setErrorReclamo(err.response?.data?.error ?? 'No se pudo verificar el pago.')
    } finally {
      setReclamando(false)
    }
  }

  const restanteMs = pago ? new Date(pago.expira_en).getTime() - ahora : 0
  const expirado = pago && !confirmado && (pago.estado !== 'esperando' || restanteMs <= 0)
  const monto = pago ? pago.monto.toFixed(2) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {confirmado ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#DCFCE7]">
              <span className="material-symbols-outlined text-[32px] text-[#16A34A]">check</span>
            </div>
            <h3 className="text-lg font-bold text-navy">¡Pago confirmado!</h3>
            <p className="mt-1 text-sm text-[#8A94A6]">
              Tu plan <span className="font-semibold text-navy">{pago.plan}</span> ya está activo.
            </p>
            <button
              type="button"
              onClick={onConfirmado}
              className="mt-6 w-full rounded-[9px] bg-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-dark"
            >
              Listo
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-navy">Pagar plan {plan.nombre} con Yape</h3>
                <p className="text-[13px] text-[#8A94A6]">Se activa automáticamente al recibir tu yapeo.</p>
              </div>
              {pago && !expirado && (
                <span className="shrink-0 rounded-md bg-[#F6F8FC] px-2 py-1 font-mono text-sm font-bold text-navy">
                  {formatRestante(restanteMs)}
                </span>
              )}
            </div>

            {error && <p className="mb-4 rounded-md bg-[#FEF2F2] p-3 text-[13px] text-[#B91C1C]">{error}</p>}
            {!pago && !error && <p className="py-10 text-center text-sm text-gray-400">Generando pago...</p>}

            {pago && !expirado && (
              <>
                <div className="rounded-xl border-2 border-[#742284] bg-[#F7EEF9] p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#742284]">Yapea exactamente</p>
                  <p className="mt-1 text-[34px] font-extrabold leading-none text-navy">S/ {monto}</p>
                  <p className="mt-2 text-[12px] text-[#5B1A68]">
                    Incluye los céntimos: así reconocemos que el pago es tuyo.
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  {!qrRoto && (
                    <img
                      src={pago.qr_url}
                      alt="QR de Yape"
                      onError={() => setQrRoto(true)}
                      className="h-32 w-32 shrink-0 rounded-lg border border-[#E2E8F0] object-contain"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#8A94A6]">Número Yape</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xl font-bold text-navy">{formatNumero(pago.numero)}</span>
                      <button
                        type="button"
                        onClick={copiarNumero}
                        className="rounded-md border border-[#E2E8F0] px-2 py-1 text-xs font-semibold text-navy hover:bg-[#F6F8FC]"
                      >
                        {copiado ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    {pago.titular && <p className="mt-1 text-[13px] text-[#4A5568]">Titular: {pago.titular}</p>}
                  </div>
                </div>

                <ol className="mt-4 list-decimal space-y-1 pl-5 text-[13px] text-[#4A5568]">
                  <li>Abre Yape y escanea el QR o yapea al número.</li>
                  <li>Ingresa el monto exacto: S/ {monto}.</li>
                  <li>Deja esta ventana abierta: se confirmará sola en unos segundos.</li>
                </ol>

                <div className="mt-4 flex items-center gap-2 text-[13px] text-[#8A94A6]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#742284]" />
                  Esperando tu yapeo...
                </div>
              </>
            )}

            {expirado && (
              <div className="rounded-xl bg-[#FFFBEB] p-4">
                <p className="text-sm font-bold text-[#92400E]">Se acabó el tiempo para este pago</p>
                <p className="mt-1 text-[13px] text-[#B45309]">
                  Si todavía no yapeaste, genera un pago nuevo. Si ya yapeaste S/ {monto}, confírmalo con el
                  código de seguridad de tu comprobante.
                </p>
              </div>
            )}

            {pago && (expirado || mostrarReclamo) && (
              <form onSubmit={reclamar} className="mt-4">
                <label className="mb-1.5 block text-[13px] font-semibold text-navy">
                  Código de seguridad de tu yapeo
                </label>
                <div className="flex gap-2">
                  <input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="Ej. 459"
                    className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm outline-none focus:border-orange"
                  />
                  <button
                    type="submit"
                    disabled={codigo.length < 3 || reclamando}
                    className="shrink-0 rounded-[9px] bg-navy px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reclamando ? 'Verificando...' : 'Confirmar'}
                  </button>
                </div>
                <p className="mt-1.5 text-[12px] text-[#8A94A6]">
                  Lo encuentras en la constancia del yapeo, en tu app de Yape.
                </p>
                {errorReclamo && <p className="mt-2 text-[12.5px] text-red-500">{errorReclamo}</p>}
              </form>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              {pago && !expirado && !mostrarReclamo ? (
                <button
                  type="button"
                  onClick={() => setMostrarReclamo(true)}
                  className="text-[13px] font-semibold text-orange-dark hover:underline"
                >
                  ¿Ya pagaste y no se confirma?
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Cerrar
                </button>
                {(expirado || error) && (
                  <button
                    type="button"
                    onClick={generarPago}
                    disabled={generando}
                    className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-dark disabled:opacity-50"
                  >
                    {generando ? 'Generando...' : 'Generar nuevo pago'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default YapePagoModal
