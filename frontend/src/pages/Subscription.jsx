import DashboardShell from '../components/DashboardShell'

const plans = [
  { name: 'Gratis', price: '$0/mes', cta: 'Bajar de Plan', current: false },
  { name: 'Pro · Plan Actual', price: '$29/mes', cta: 'Plan Actual', current: true },
  { name: 'Empresarial', price: 'Personalizado', cta: 'Contactar Ventas', current: false },
]

const invoices = [
  { date: '4 sep 2026', desc: 'Plan Pro — mensual', amount: '$29.00' },
  { date: '4 ago 2026', desc: 'Plan Pro — mensual', amount: '$29.00' },
  { date: '4 jul 2026', desc: 'Plan Pro — mensual', amount: '$29.00' },
]

function Subscription() {
  return (
    <DashboardShell>
      <h1 className="mb-7 text-[28px] font-extrabold tracking-tight text-navy">Suscripción</h1>

      <div className="mb-4 grid grid-cols-1 gap-[18px] lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-navy bg-navy p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A9B4C8]">
              Plan actual
            </p>
            <p className="mt-2 text-[28px] font-extrabold text-white">
              Pro <span className="text-[15px] font-semibold text-[#A9B4C8]">· $29/mes</span>
            </p>
            <p className="mt-2 text-[13px] text-[#A9B4C8]">
              Se renueva automáticamente el 4 de octubre, 2026
            </p>
          </div>
          <button
            type="button"
            className="rounded-[9px] bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-dark"
          >
            Cambiar de Plan
          </button>
        </div>

        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-[#8A94A6]">
            Método de pago
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <div className="h-[26px] w-10 shrink-0 rounded bg-[#1A1F71]" />
            <div>
              <p className="text-sm font-bold text-navy">•••• •••• •••• 4242</p>
              <p className="text-xs text-[#8A94A6]">Vence 08/28</p>
            </div>
          </div>
          <a href="#" className="mt-4 inline-block text-[13px] font-semibold text-orange-dark hover:underline">
            Actualizar método de pago
          </a>
        </div>
      </div>

      <h2 className="mb-3.5 mt-7 text-base font-bold text-navy">Comparar planes</h2>
      <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-[14px] border bg-white p-6 ${
              plan.current ? 'border-2 border-orange' : 'border-[#E2E8F0]'
            }`}
          >
            <p className={`text-sm font-bold ${plan.current ? 'text-orange-dark' : 'text-[#4A5568]'}`}>
              {plan.name}
            </p>
            <p className="my-1.5 text-2xl font-extrabold text-navy">{plan.price}</p>
            <button
              type="button"
              disabled={plan.current}
              className={`w-full rounded-[9px] px-4 py-2.5 text-[13.5px] font-semibold ${
                plan.current
                  ? 'cursor-default bg-[#EEF3FF] text-[#8A94A6]'
                  : 'border border-[#E2E8F0] text-navy hover:bg-[#F6F8FC]'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      <h2 className="mb-3.5 text-base font-bold text-navy">Historial de facturas</h2>
      <div className="mb-8 overflow-x-auto rounded-[14px] border border-[#E2E8F0] bg-white p-1">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#8A94A6]">
              <th className="px-4 pb-2.5 pt-4">Fecha</th>
              <th className="px-2 pb-2.5 pt-4">Descripción</th>
              <th className="px-2 pb-2.5 pt-4">Monto</th>
              <th className="px-2 pb-2.5 pt-4">Estado</th>
              <th className="px-4 pb-2.5 pt-4 text-right">Factura</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.date} className="border-t border-[#E2E8F0] text-[13.5px]">
                <td className="px-4 py-3">{inv.date}</td>
                <td className="px-2 py-3">{inv.desc}</td>
                <td className="px-2 py-3">{inv.amount}</td>
                <td className="px-2 py-3 font-bold text-[#16A34A]">Pagado</td>
                <td className="px-4 py-3 text-right">
                  <a href="#" className="font-semibold text-orange-dark hover:underline">
                    Descargar PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] p-6">
        <div>
          <p className="text-[15px] font-bold text-[#991B1B]">Cancelar suscripción</p>
          <p className="mt-1 max-w-lg text-[13px] text-[#B91C1C]">
            Perderás el subdominio personalizado, los temas premium y el panel de analíticas. Tu
            menú volverá al plan Gratis al finalizar el período actual.
          </p>
        </div>
        <button
          type="button"
          className="rounded-[8px] border border-[#FCA5A5] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
        >
          Cancelar Suscripción
        </button>
      </div>
    </DashboardShell>
  )
}

export default Subscription
