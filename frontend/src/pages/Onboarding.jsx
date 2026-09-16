import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const templates = [
  { name: 'Andino Clásico', bg: '#0B1C30', swatch: '#FD761A' },
  { name: 'Cálido Minimal', bg: '#FBEFE3', swatch: '#D9A441' },
  { name: 'Costero Fresco', bg: '#EEF3FF', swatch: '#2F8F8A' },
]

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
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

function Onboarding() {
  const [step, setStep] = useState(1)
  const [template, setTemplate] = useState('Andino Clásico')
  const navigate = useNavigate()

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
    else navigate('/dashboard')
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="flex min-h-svh flex-col bg-white">
      <div className="px-6 pt-7 sm:px-16">
        <div className="mb-7 flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" fill="none" className="h-[26px] w-[26px]">
            <rect x="0" y="0" width="14" height="14" rx="4" fill="#D9A441" />
            <rect x="18" y="0" width="14" height="14" rx="4" fill="#2F8F8A" />
            <rect x="0" y="18" width="14" height="14" rx="4" fill="#0B1C30" />
            <rect x="18" y="18" width="14" height="14" rx="4" fill="#FD761A" />
          </svg>
          <span className="text-base font-extrabold">
            <span className="text-navy">Karta</span> <span className="text-orange">Kamay</span>
          </span>
        </div>
        <div className="mb-2 flex max-w-[520px] items-center gap-2.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-[5px] flex-1 rounded-full"
              style={{ background: step >= n ? '#FD761A' : '#E2E8F0' }}
            />
          ))}
        </div>
        <p className="text-[12.5px] font-semibold text-[#8A94A6]">Paso {step} de 3</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-14 pt-6 sm:px-16">
        <div className="w-full max-w-[560px]">
          {step === 1 && (
            <div>
              <h1 className="text-[26px] font-extrabold text-navy">
                Cuéntanos de tu restaurante
              </h1>
              <p className="mb-7 mt-2 text-sm text-[#4A5568]">
                Esta información aparecerá en tu menú digital.
              </p>
              <div className="mb-5 flex gap-4">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#E2E8F0] bg-[#F6F8FC] text-[#8A94A6]">
                  <UploadIcon />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-semibold text-navy">
                    Logo del restaurante
                  </label>
                  <button
                    type="button"
                    className="h-10 rounded-[9px] border border-[#E2E8F0] bg-white px-4 text-[13px] font-semibold text-navy hover:bg-[#F6F8FC]"
                  >
                    Subir imagen
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <Field label="Nombre del restaurante" placeholder="Bistro Andino" />
                <div className="flex flex-col gap-3.5 sm:flex-row">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-semibold text-navy">
                      Categoría de comida
                    </label>
                    <div className="flex h-11 items-center justify-between rounded-[9px] border border-[#E2E8F0] px-3.5 text-sm text-[#4A5568]">
                      Cocina Peruana
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <Field label="Horario de atención" placeholder="12:00 – 22:00" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-[26px] font-extrabold text-navy">Elige una plantilla inicial</h1>
              <p className="mb-7 mt-2 text-sm text-[#4A5568]">
                Podrás personalizarla por completo más adelante.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => setTemplate(tpl.name)}
                    className={`rounded-xl border-2 p-3.5 text-left ${
                      template === tpl.name ? 'border-orange bg-orange-light' : 'border-[#E2E8F0]'
                    }`}
                  >
                    <div
                      className="mb-2.5 flex h-[120px] items-center justify-center rounded-lg"
                      style={{ background: tpl.bg }}
                    >
                      <div className="h-9 w-9 rounded-md" style={{ background: tpl.swatch }} />
                    </div>
                    <p className="text-[13px] font-bold text-navy">{tpl.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-[26px] font-extrabold text-navy">Agrega tu primer producto</h1>
              <p className="mb-7 mt-2 text-sm text-[#4A5568]">
                Opcional — puedes hacerlo después desde el panel.
              </p>
              <div className="flex flex-col gap-4">
                <Field label="Nombre del plato" placeholder="Ceviche Clásico" />
                <div className="flex gap-3.5">
                  <div className="flex-1">
                    <Field label="Precio" placeholder="$18" />
                  </div>
                  <div className="flex-1">
                    <Field label="Categoría" placeholder="Entradas" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-navy">
                    Foto del plato
                  </label>
                  <div className="flex h-[90px] items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#E2E8F0] text-[12.5px] text-[#8A94A6]">
                    Arrastra una imagen o haz clic para subir
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-9 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="px-2 text-sm font-semibold text-[#4A5568] hover:text-navy"
            >
              {step === 1 ? 'Cancelar' : '← Atrás'}
            </button>
            <div className="flex gap-3">
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="h-[46px] rounded-[9px] border border-[#E2E8F0] px-6 text-sm font-bold text-navy hover:bg-[#F6F8FC]"
                >
                  Hacerlo después
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="h-[46px] rounded-[9px] bg-orange px-8 text-sm font-bold text-white hover:bg-orange-dark"
              >
                {step === 3 ? 'Ir al Panel' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
