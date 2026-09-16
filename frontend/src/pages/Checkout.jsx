import { useState } from 'react'
import { Link } from 'react-router-dom'

const paymentMethods = ['Tarjeta', 'PayPal', 'Yape']

const included = ['Menús ilimitados', 'Subdominio personalizado', 'Panel de analíticas']

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" className="mt-0.5 h-[15px] w-[15px]">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function Field({ label, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-navy">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm outline-none focus:border-orange"
      />
    </div>
  )
}

function Checkout() {
  const [method, setMethod] = useState('Tarjeta')

  return (
    <div className="min-h-svh bg-[#F6F8FC]">
      <div className="flex h-[76px] items-center justify-between border-b border-[#E2E8F0] bg-white px-6 sm:px-14">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" fill="none" className="h-[26px] w-[26px]">
            <rect x="0" y="0" width="14" height="14" rx="4" fill="#D9A441" />
            <rect x="18" y="0" width="14" height="14" rx="4" fill="#2F8F8A" />
            <rect x="0" y="18" width="14" height="14" rx="4" fill="#0B1C30" />
            <rect x="18" y="18" width="14" height="14" rx="4" fill="#FD761A" />
          </svg>
          <span className="text-[17px] font-extrabold">
            <span className="text-navy">Karta</span> <span className="text-orange">Kamay</span>
          </span>
        </div>
        <Link to="/dashboard" className="text-[13.5px] font-semibold text-[#4A5568] hover:text-navy">
          ← Volver al panel
        </Link>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-14 sm:px-14 lg:flex-row lg:justify-center">
        <div className="w-full lg:w-[400px]">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-[#8A94A6]">
            Resumen del pedido
          </p>
          <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-navy">Plan Pro</p>
                <p className="mt-0.5 text-[12.5px] text-[#8A94A6]">Facturación mensual</p>
              </div>
              <p className="text-xl font-extrabold text-navy">$29.00</p>
            </div>
            <div className="my-5 h-px bg-[#E2E8F0]" />
            <div className="flex flex-col gap-2.5 text-[13.5px] text-[#4A5568]">
              {included.map((item) => (
                <div key={item} className="flex gap-2">
                  <CheckIcon />
                  {item}
                </div>
              ))}
            </div>
            <div className="my-5 h-px bg-[#E2E8F0]" />
            <div className="flex gap-2">
              <input
                placeholder="Código de promoción"
                className="h-10 flex-1 rounded-[9px] border border-[#E2E8F0] px-3.5 text-sm outline-none focus:border-orange"
              />
              <button
                type="button"
                className="h-10 rounded-[9px] border border-[#E2E8F0] bg-white px-4 text-[13px] font-semibold text-navy hover:bg-[#F6F8FC]"
              >
                Aplicar
              </button>
            </div>
            <div className="my-5 h-px bg-[#E2E8F0]" />
            <div className="flex justify-between text-sm text-[#4A5568]">
              <span>Subtotal</span>
              <span>$29.00</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-[#4A5568]">
              <span>Impuestos</span>
              <span>$0.00</span>
            </div>
            <div className="mt-3.5 flex justify-between text-[17px] font-extrabold text-navy">
              <span>Total hoy</span>
              <span>$29.00</span>
            </div>
          </div>
          <div className="mt-4.5 flex items-center gap-2 text-[12.5px] text-[#8A94A6]">
            <LockIcon />
            Pago seguro y cifrado — puedes cancelar cuando quieras
          </div>
        </div>

        <div className="w-full lg:w-[420px]">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-[#8A94A6]">
            Información de pago
          </p>
          <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-6">
            <div className="mb-5 flex gap-2.5">
              {paymentMethods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`h-10 flex-1 rounded-lg text-[12.5px] font-bold ${
                    method === m
                      ? 'border-[1.5px] border-navy text-navy'
                      : 'border border-[#E2E8F0] font-semibold text-[#8A94A6]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Nombre del titular" placeholder="Mariana Chávez" />
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-navy">
                  Número de tarjeta
                </label>
                <div className="relative">
                  <input
                    placeholder="1234 1234 1234 1234"
                    className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 pr-16 text-sm outline-none focus:border-orange"
                  />
                  <div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-1.5">
                    <div className="h-4 w-[26px] rounded-[3px] bg-[#1A1F71]" />
                    <div className="h-4 w-[26px] rounded-[3px] bg-[#EB001B]" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3.5">
                <div className="flex-1">
                  <Field label="Vencimiento" placeholder="MM/AA" />
                </div>
                <div className="flex-1">
                  <Field label="CVV" placeholder="123" />
                </div>
              </div>
            </div>

            <label className="mt-4.5 flex items-start gap-2 text-[12.5px] text-[#4A5568]">
              <input type="checkbox" className="mt-0.5" />
              Acepto los <a href="#" className="text-orange-dark">Términos de Servicio</a> y
              autorizo el cobro recurrente mensual.
            </label>

            <button
              type="button"
              className="mt-5 h-12 w-full rounded-[9px] bg-orange text-[14.5px] font-bold text-white hover:bg-orange-dark"
            >
              Pagar $29.00
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout
