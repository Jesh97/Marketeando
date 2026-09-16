import { Link } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'

const steps = [
  {
    number: 1,
    title: 'Agrega tu primer producto',
    description: 'Nombre, precio, foto y categoría de tu primer plato.',
    cta: 'Agregar',
    to: '/products',
    primary: true,
  },
  {
    number: 2,
    title: 'Personaliza tu menú digital',
    description: 'Elige colores, tipografía y el orden de tus categorías.',
    cta: 'Personalizar',
    to: '/editor',
    primary: false,
  },
  {
    number: 3,
    title: 'Publica y descarga tu QR',
    description: 'Imprime el código y colócalo en tus mesas.',
    cta: 'Publicar',
    to: '/dashboard',
    primary: false,
  },
]

function DashboardEmpty() {
  return (
    <DashboardShell>
      <span className="inline-flex rounded-full bg-orange-light px-3 py-1.5 text-xs font-bold text-orange-dark">
        Cuenta nueva
      </span>
      <h1 className="mt-4 text-[32px] font-extrabold tracking-tight text-navy">
        ¡Bienvenida a Karta Kamay!
      </h1>
      <p className="mt-2.5 max-w-lg text-[15.5px] text-[#4A5568]">
        Sigue estos pasos para publicar tu primer menú digital. Puedes completarlos en cualquier
        orden.
      </p>

      <div className="mt-9 flex max-w-2xl flex-col gap-3.5">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white p-[18px]"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-extrabold ${
                step.primary ? 'bg-orange text-white' : 'bg-[#EEF3FF] text-navy'
              }`}
            >
              {step.number}
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-navy">{step.title}</p>
              <p className="mt-0.5 text-[13.5px] text-[#4A5568]">{step.description}</p>
            </div>
            <Link
              to={step.to}
              className={`shrink-0 rounded-[9px] px-4 py-2 text-[13px] font-semibold ${
                step.primary
                  ? 'bg-orange text-white hover:bg-orange-dark'
                  : 'border border-[#E2E8F0] bg-white text-navy hover:bg-[#F6F8FC]'
              }`}
            >
              {step.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-11 max-w-2xl rounded-2xl border border-dashed border-[#E2E8F0] p-[26px] text-center text-[13.5px] text-[#8A94A6]">
        Aún no tienes productos ni analíticas que mostrar. Aparecerán aquí en cuanto publiques tu
        primer menú.
      </div>
    </DashboardShell>
  )
}

export default DashboardEmpty
