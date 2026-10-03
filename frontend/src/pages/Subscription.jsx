import { useCallback, useEffect, useState } from 'react'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'
import { useRestaurante } from '../context/RestauranteContext'

const TIPOS_METODO_PAGO = [
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'yape', label: 'Yape' },
]

const ESTADO_FACTURA = {
  pagada: { label: 'Pagado', className: 'text-[#16A34A]' },
  pendiente: { label: 'Pendiente', className: 'text-amber-600' },
  anulada: { label: 'Anulada', className: 'text-gray-400' },
}

function metodoPagoLabel(value) {
  return TIPOS_METODO_PAGO.find((m) => m.value === value)?.label ?? value ?? '—'
}

function precioLabel(precio) {
  return precio > 0 ? `$${precio.toFixed(2)}/mes` : 'Gratis'
}

function formatFecha(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCardNumber(raw) {
  return raw
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatVencimiento(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

function detectarMarca(numeroLimpio) {
  if (!numeroLimpio) return 'Tarjeta'
  if (numeroLimpio[0] === '4') return 'Visa'
  if (numeroLimpio[0] === '5' || numeroLimpio[0] === '2') return 'Mastercard'
  if (numeroLimpio[0] === '3') return 'American Express'
  return 'Tarjeta'
}

// Insignia visual de la marca de la tarjeta: cambia en vivo mientras se
// escribe el número (mismo detectarMarca que usa el backend para guardarla),
// y se reutiliza para mostrar el método de pago ya guardado.
function CardBrandMark({ marca, className = '' }) {
  if (marca === 'Visa') {
    return (
      <div className={`flex items-center justify-center rounded bg-white ${className}`}>
        <span className="text-[13px] font-black italic tracking-tighter text-[#1A1F71]">VISA</span>
      </div>
    )
  }
  if (marca === 'Mastercard') {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden rounded bg-white ${className}`}>
        <span
          className="absolute h-[58%] w-[36%] -translate-x-[19%] rounded-full bg-[#EB001B]"
          style={{ mixBlendMode: 'multiply' }}
        />
        <span
          className="absolute h-[58%] w-[36%] translate-x-[19%] rounded-full bg-[#F79E1B]"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>
    )
  }
  if (marca === 'American Express') {
    return (
      <div className={`flex items-center justify-center rounded bg-[#2E77BB] ${className}`}>
        <span className="text-[8px] font-bold tracking-wide text-white">AMEX</span>
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-center rounded bg-[#4A5568] ${className}`}>
      <span className="text-[8px] font-bold tracking-wide text-white">TARJETA</span>
    </div>
  )
}

// Formulario para registrar/actualizar el método de pago del restaurante.
// Cuando hay un plan pendiente de confirmar (primera suscripción, o cambio
// de plan sin un método guardado todavía), guardar el método también
// dispara ese cambio de plan.
function PaymentMethodModal({ title, pendingPlanLabel, submitting, onCancel, onSave }) {
  const [tipo, setTipo] = useState('tarjeta')
  const [titular, setTitular] = useState('')
  const [numero, setNumero] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [cvv, setCvv] = useState('')

  const numeroLimpio = numero.replace(/\D/g, '')
  const marca = detectarMarca(numeroLimpio)

  const esValido =
    tipo !== 'tarjeta'
      ? true
      : titular.trim().length > 1 &&
        numeroLimpio.length >= 13 &&
        /^\d{2}\/\d{2}$/.test(vencimiento) &&
        cvv.length >= 3

  function handleSubmit(e) {
    e.preventDefault()
    if (!esValido || submitting) return
    onSave({
      tipo,
      titular: titular.trim() || null,
      numero: tipo === 'tarjeta' ? numeroLimpio : null,
      vencimiento: tipo === 'tarjeta' ? vencimiento : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-base font-bold text-navy">{title}</h3>
        {pendingPlanLabel && (
          <p className="mb-4 text-[13px] text-[#8A94A6]">
            Se usará para confirmar el cambio a <span className="font-semibold text-navy">{pendingPlanLabel}</span>.
          </p>
        )}

        <div className={`grid grid-cols-2 gap-1.5 ${pendingPlanLabel ? '' : 'mt-4'}`}>
          {TIPOS_METODO_PAGO.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setTipo(m.value)}
              className={`rounded-md border px-2 py-2 text-xs font-semibold ${
                tipo === m.value
                  ? 'border-navy bg-navy text-white'
                  : 'border-[#E2E8F0] text-navy hover:bg-[#F6F8FC]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {tipo === 'tarjeta' ? (
          <div className="mt-5">
            {/* Vista previa en vivo de la tarjeta que se está registrando */}
            <div className="mb-5 rounded-xl bg-gradient-to-br from-navy to-[#1B3A5C] p-5 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div className="h-6 w-6 rounded-full bg-white/25" />
                {numeroLimpio && <CardBrandMark marca={marca} className="h-7 w-11" />}
              </div>
              <p className="mt-6 text-lg font-semibold tracking-[0.2em]">
                {numero ? formatCardNumber(numero) : '•••• •••• •••• ••••'}
              </p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-white/60">Titular</p>
                  <p className="text-sm font-medium uppercase">{titular || 'Nombre y apellido'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-white/60">Vence</p>
                  <p className="text-sm font-medium">{vencimiento || 'MM/AA'}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-navy">Nombre del titular</label>
                <input
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  placeholder="Mariana Chávez"
                  className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm outline-none focus:border-orange"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-navy">Número de tarjeta</label>
                <input
                  value={formatCardNumber(numero)}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="1234 1234 1234 1234"
                  inputMode="numeric"
                  className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm outline-none focus:border-orange"
                />
              </div>
              <div className="flex gap-3.5">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-semibold text-navy">Vencimiento</label>
                  <input
                    value={vencimiento}
                    onChange={(e) => setVencimiento(formatVencimiento(e.target.value))}
                    placeholder="MM/AA"
                    inputMode="numeric"
                    className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm outline-none focus:border-orange"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-semibold text-navy">CVV</label>
                  <input
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                    className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm outline-none focus:border-orange"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <label className="mb-1.5 block text-[13px] font-semibold text-navy">
              Número de Yape (opcional)
            </label>
            <input
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              placeholder="987 654 321"
              className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm outline-none focus:border-orange"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!esValido || submitting}
            className="rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Subscription() {
  const { restaurante } = useRestaurante()
  const idRestaurante = restaurante?.id_restaurante

  const [planes, setPlanes] = useState([])
  const [suscripcion, setSuscripcion] = useState(null)
  const [metodoPago, setMetodoPago] = useState(null)
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(false)

  // Plan que espera un método de pago guardado antes de confirmarse.
  const [pendingPlan, setPendingPlan] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const cargar = useCallback(async () => {
    if (!idRestaurante) return
    setLoading(true)
    setError(null)
    try {
      const [planesRes, facturasRes] = await Promise.all([
        apiClient.get('/planes'),
        apiClient.get(`/restaurantes/${idRestaurante}/suscripcion/facturas`),
      ])
      setPlanes(planesRes.data)
      setFacturas(facturasRes.data)
      try {
        const { data } = await apiClient.get(`/restaurantes/${idRestaurante}/suscripcion`)
        setSuscripcion(data)
      } catch (err) {
        if (err.response?.status === 404) setSuscripcion(null)
        else throw err
      }
      try {
        const { data } = await apiClient.get(`/restaurantes/${idRestaurante}/metodo-pago`)
        setMetodoPago(data)
      } catch (err) {
        if (err.response?.status === 404) setMetodoPago(null)
        else throw err
      }
    } catch {
      setError('No se pudo cargar tu suscripción.')
    } finally {
      setLoading(false)
    }
  }, [idRestaurante])

  useEffect(() => {
    cargar()
  }, [cargar])

  const currentPlan = planes.find((p) => p.id_plan === suscripcion?.id_plan) ?? null

  async function suscribir(idPlan, tipoMetodoPago) {
    setWorking(true)
    try {
      const { data } = await apiClient.post(`/restaurantes/${idRestaurante}/suscripcion`, {
        id_plan: idPlan,
        metodo_pago: tipoMetodoPago,
      })
      setSuscripcion(data)
      const { data: nuevasFacturas } = await apiClient.get(`/restaurantes/${idRestaurante}/suscripcion/facturas`)
      setFacturas(nuevasFacturas)
      setPendingPlan(null)
      setShowPaymentModal(false)
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'No se pudo actualizar la suscripción.')
    } finally {
      setWorking(false)
    }
  }

  async function guardarMetodoPago(payload) {
    setWorking(true)
    try {
      const { data } = await apiClient.put(`/restaurantes/${idRestaurante}/metodo-pago`, payload)
      setMetodoPago(data)
      if (pendingPlan) {
        await suscribir(pendingPlan.id_plan, data.tipo)
      } else {
        setShowPaymentModal(false)
      }
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'No se pudo guardar el método de pago.')
    } finally {
      setWorking(false)
    }
  }

  function handleElegirPlan(plan) {
    if (metodoPago) {
      const confirmado = window.confirm(
        `¿Cambiar al plan ${plan.nombre} (${precioLabel(plan.precio)})? Se cobrará con tu método de pago actual (${metodoPagoLabel(metodoPago.tipo)}).`,
      )
      if (confirmado) suscribir(plan.id_plan, metodoPago.tipo)
      return
    }
    setPendingPlan(plan)
  }

  function handleCancelar() {
    const basico = planes.find((p) => p.nombre === 'Básico')
    if (!basico) return
    if (!window.confirm('¿Cancelar tu suscripción? Tu restaurante pasará al plan Gratis de inmediato.')) return
    suscribir(basico.id_plan, metodoPago?.tipo ?? 'otro')
  }

  if (loading) {
    return (
      <DashboardShell>
        <p className="text-sm text-gray-400">Cargando suscripción...</p>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell>
        <p className="text-sm text-red-500">{error}</p>
      </DashboardShell>
    )
  }

  const modalAbierto = showPaymentModal || Boolean(pendingPlan)

  return (
    <DashboardShell>
      <h1 className="mb-7 text-[28px] font-extrabold tracking-tight text-navy">Suscripción</h1>

      <div className="mb-4 grid grid-cols-1 gap-[18px] lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-navy bg-navy p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A9B4C8]">Plan actual</p>
            {suscripcion ? (
              <>
                <p className="mt-2 text-[28px] font-extrabold text-white">
                  {suscripcion.plan}{' '}
                  <span className="text-[15px] font-semibold text-[#A9B4C8]">
                    · {precioLabel(currentPlan?.precio ?? 0)}
                  </span>
                </p>
                <p className="mt-2 text-[13px] text-[#A9B4C8]">
                  {suscripcion.renueva_en
                    ? `Se renueva automáticamente el ${formatFecha(suscripcion.renueva_en)}`
                    : `Vence el ${formatFecha(suscripcion.fecha_fin)}`}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[15px] text-[#A9B4C8]">Todavía no tienes una suscripción activa.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('comparar-planes')?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded-[9px] bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-dark"
          >
            {suscripcion ? 'Cambiar de Plan' : 'Elegir un plan'}
          </button>
        </div>

        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-[#8A94A6]">Método de pago</p>

          {metodoPago?.tipo === 'tarjeta' ? (
            <div className="mt-3.5 flex items-center gap-3">
              <CardBrandMark marca={metodoPago.marca} className="h-[26px] w-10 shrink-0 ring-1 ring-[#E2E8F0]" />
              <div>
                <p className="text-sm font-bold text-navy">•••• •••• •••• {metodoPago.ultimos4}</p>
                <p className="text-xs text-[#8A94A6]">
                  Vence {metodoPago.vencimiento}
                  {metodoPago.titular ? ` · ${metodoPago.titular}` : ''}
                </p>
              </div>
            </div>
          ) : metodoPago ? (
            <div className="mt-3.5">
              <p className="text-sm font-bold text-navy">{metodoPagoLabel(metodoPago.tipo)}</p>
              {metodoPago.titular && <p className="text-xs text-[#8A94A6]">{metodoPago.titular}</p>}
            </div>
          ) : (
            <p className="mt-3.5 text-sm text-gray-400">Sin método registrado</p>
          )}

          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            disabled={working}
            className="mt-4 text-[13px] font-semibold text-orange-dark hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {metodoPago ? 'Actualizar método de pago' : 'Agregar método de pago'}
          </button>
        </div>
      </div>

      <h2 id="comparar-planes" className="mb-3.5 mt-7 scroll-mt-6 text-base font-bold text-navy">
        Comparar planes
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {planes.map((plan) => {
          const isCurrent = suscripcion?.id_plan === plan.id_plan
          let cta = 'Elegir Plan'
          if (isCurrent) cta = 'Plan Actual'
          else if (currentPlan && plan.precio < currentPlan.precio) cta = 'Bajar de Plan'
          else if (currentPlan && plan.precio > currentPlan.precio) cta = 'Mejorar de Plan'

          return (
            <div
              key={plan.id_plan}
              className={`rounded-[14px] border bg-white p-6 ${isCurrent ? 'border-2 border-orange' : 'border-[#E2E8F0]'}`}
            >
              <p className={`text-sm font-bold ${isCurrent ? 'text-orange-dark' : 'text-[#4A5568]'}`}>
                {plan.nombre}
                {isCurrent ? ' · Plan Actual' : ''}
              </p>
              <p className="my-1.5 text-2xl font-extrabold text-navy">{precioLabel(plan.precio)}</p>
              <p className="mb-4 text-xs text-[#8A94A6]">
                Hasta {plan.max_menu} menú{plan.max_menu === 1 ? '' : 's'} · {plan.max_local} local
                {plan.max_local === 1 ? '' : 'es'}
              </p>
              <button
                type="button"
                disabled={isCurrent || working}
                onClick={() => handleElegirPlan(plan)}
                className={`w-full rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold ${
                  isCurrent
                    ? 'cursor-default bg-[#EEF3FF] text-[#8A94A6]'
                    : 'border border-[#E2E8F0] text-navy hover:bg-[#F6F8FC] disabled:cursor-not-allowed disabled:opacity-50'
                }`}
              >
                {cta}
              </button>
            </div>
          )
        })}
      </div>

      <h2 className="mb-3.5 text-base font-bold text-navy">Historial de facturas</h2>
      <div className="mb-8 overflow-x-auto rounded-[14px] border border-[#E2E8F0] bg-white p-1">
        <table className="w-full min-w-[460px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#8A94A6]">
              <th className="px-4 pb-2.5 pt-4">Fecha</th>
              <th className="px-2 pb-2.5 pt-4">Descripción</th>
              <th className="px-2 pb-2.5 pt-4">Monto</th>
              <th className="px-4 pb-2.5 pt-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                  Todavía no tienes facturas.
                </td>
              </tr>
            )}
            {facturas.map((inv) => {
              const estado = ESTADO_FACTURA[inv.estado] ?? { label: inv.estado, className: 'text-gray-500' }
              return (
                <tr key={inv.id_factura} className="border-t border-[#E2E8F0] text-[13.5px]">
                  <td className="px-4 py-3">{formatFecha(inv.fecha_emision)}</td>
                  <td className="px-2 py-3">Plan {inv.plan} — mensual</td>
                  <td className="px-2 py-3">${inv.monto.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-bold ${estado.className}`}>{estado.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] p-6">
        <div>
          <p className="text-[15px] font-bold text-[#991B1B]">Cancelar suscripción</p>
          <p className="mt-1 max-w-lg text-[13px] text-[#B91C1C]">
            Perderás el subdominio personalizado, los temas premium y el panel de analíticas. Tu
            restaurante pasará al plan Gratis de inmediato.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCancelar}
          disabled={!suscripcion || suscripcion.plan === 'Básico' || working}
          className="rounded-[8px] border border-[#FCA5A5] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar Suscripción
        </button>
      </div>

      {modalAbierto && (
        <PaymentMethodModal
          title={pendingPlan ? 'Agrega un método de pago' : metodoPago ? 'Actualizar método de pago' : 'Agregar método de pago'}
          pendingPlanLabel={pendingPlan ? `${pendingPlan.nombre} (${precioLabel(pendingPlan.precio)})` : null}
          submitting={working}
          onCancel={() => {
            setPendingPlan(null)
            setShowPaymentModal(false)
          }}
          onSave={guardarMetodoPago}
        />
      )}
    </DashboardShell>
  )
}

export default Subscription
