import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import logoMark from '../assets/logo-mark.png'
import cevichePreview from '../assets/ceviche_onboarding.jpg'
import apiClient from '../api/client'
import { useRestaurante } from '../context/RestauranteContext'

const templates = [
  { id: 'andino', name: 'Andino Clásico', desc: 'Oscuro y elegante', bg: '#0B1C30', accent: '#FD761A' },
  { id: 'calido', name: 'Cálido Minimal', desc: 'Crema y dorado', bg: '#FBEFE3', accent: '#D9A441' },
  { id: 'costero', name: 'Costero Fresco', desc: 'Claro y marino', bg: '#EEF3FF', accent: '#2F8F8A' },
]

function Onboarding() {
  const [step, setStep] = useState(1)
  const [template, setTemplate] = useState('andino')
  const navigate = useNavigate()
  const { restaurante } = useRestaurante()

  // Step 3 state
  const [dishName, setDishName] = useState('')
  const [dishDesc, setDishDesc] = useState('')
  const [dishPrice, setDishPrice] = useState('')
  const [dishImageFile, setDishImageFile] = useState(null)
  const [dishImagePreview, setDishImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const imageInputRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDishImageFile(file)
    setDishImagePreview(URL.createObjectURL(file))
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSaveDish = async () => {
    if (!dishName.trim() || !dishPrice) {
      setError('Ingresa al menos el nombre y el precio.')
      return
    }
    if (!restaurante?.id_restaurante) {
      navigate('/dashboard')
      return
    }
    setSaving(true)
    setError('')
    try {
      let urlImagen = null
      if (dishImageFile) {
        const fd = new FormData()
        fd.append('file', dishImageFile)
        const { data } = await apiClient.post(
          `/restaurantes/${restaurante.id_restaurante}/productos/upload`,
          fd,
          { headers: { 'Content-Type': undefined } }
        )
        urlImagen = data.url
      }
      await apiClient.post(`/restaurantes/${restaurante.id_restaurante}/productos`, {
        nombre: dishName.trim(),
        descripcion: dishDesc.trim() || null,
        precio: Number(dishPrice),
        id_categoria: null,
        url_imagen: urlImagen,
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar el plato.')
    } finally {
      setSaving(false)
    }
  }

  const progressPct = ((step - 1) / 2) * 100

  return (
    <div className="min-h-svh font-jakarta antialiased" style={{ background: '#FFF8EC' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 overflow-hidden rounded-full">
            <img src={logoMark} alt="Karta Kamay" className="h-full w-full object-cover" />
          </div>
          <span className="text-[15px] font-extrabold tracking-tight" style={{ color: '#4A2420' }}>
            Karta Kamay
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-[13px] font-semibold hover:opacity-70"
          style={{ color: '#5E3733' }}
        >
          Saltar configuración →
        </button>
      </header>

      {/* Progress bar */}
      <div className="px-6 sm:px-12">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3 mb-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-[5px] flex-1 rounded-full transition-all duration-500"
                style={{ background: step >= n ? '#E8702A' : '#EBD9BF' }}
              />
            ))}
          </div>
          <p className="text-[12px] font-semibold" style={{ color: '#8E2B1E' }}>
            Paso {step} de 3
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-6 pb-20 pt-8 sm:px-12">

        {/* STEP 1 — Restaurant info */}
        {step === 1 && (
          <div>
            <div className="mb-8">
              <span
                className="mb-3 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
                style={{ background: '#FFE8D6', color: '#E8702A' }}
              >
                Paso 1 · Tu restaurante
              </span>
              <h1 className="text-[28px] font-extrabold leading-tight sm:text-[32px]" style={{ color: '#4A2420' }}>
                Cuéntanos de tu restaurante
              </h1>
              <p className="mt-2 text-sm" style={{ color: '#5E3733' }}>
                Esta información aparecerá en tu menú digital. Puedes editarla después.
              </p>
            </div>

            <div
              className="rounded-2xl border p-6 sm:p-8"
              style={{ background: '#FFFDF9', borderColor: '#EBD9BF' }}
            >
              {/* Logo upload */}
              <div className="mb-6 flex items-center gap-4">
                <div
                  className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-dashed"
                  style={{ borderColor: '#EBD9BF', background: '#FFF8EC' }}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ color: '#C1622B' }}>restaurant</span>
                </div>
                <div>
                  <p className="mb-1 text-[13px] font-semibold" style={{ color: '#4A2420' }}>Logo del restaurante</p>
                  <button
                    type="button"
                    className="rounded-lg border px-4 py-2 text-[13px] font-semibold transition hover:opacity-80"
                    style={{ borderColor: '#EBD9BF', color: '#4A2420', background: 'white' }}
                  >
                    Subir imagen
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#4A2420' }}>
                    Nombre del restaurante
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: '#C1622B' }}>storefront</span>
                    <input
                      type="text"
                      placeholder="Bistro Andino"
                      className="h-11 w-full rounded-xl border pl-10 pr-4 text-sm outline-none transition focus:ring-2"
                      style={{ borderColor: '#EBD9BF', background: 'white', color: '#4A2420' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#4A2420' }}>
                      Tipo de cocina
                    </label>
                    <div
                      className="flex h-11 items-center justify-between rounded-xl border px-3.5 text-sm"
                      style={{ borderColor: '#EBD9BF', background: 'white', color: '#5E3733' }}
                    >
                      Cocina Peruana
                      <span className="material-symbols-outlined text-[18px]" style={{ color: '#C1622B' }}>expand_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#4A2420' }}>
                      Horario de atención
                    </label>
                    <div
                      className="flex items-center gap-2 rounded-xl border px-3 py-2"
                      style={{ borderColor: '#EBD9BF', background: 'white' }}
                    >
                      <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: '#C1622B' }}>schedule</span>
                      <input
                        type="time"
                        defaultValue="12:00"
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: '#4A2420' }}
                      />
                      <span className="text-xs font-semibold select-none" style={{ color: '#C1622B' }}>–</span>
                      <input
                        type="time"
                        defaultValue="22:00"
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: '#4A2420' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-sm font-semibold hover:opacity-70"
                style={{ color: '#5E3733' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: '#E8702A' }}
              >
                Continuar
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Template */}
        {step === 2 && (
          <div>
            <div className="mb-8">
              <span
                className="mb-3 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
                style={{ background: '#FFE8D6', color: '#E8702A' }}
              >
                Paso 2 · Plantilla
              </span>
              <h1 className="text-[28px] font-extrabold leading-tight sm:text-[32px]" style={{ color: '#4A2420' }}>
                Elige una plantilla inicial
              </h1>
              <p className="mt-2 text-sm" style={{ color: '#5E3733' }}>
                Podrás personalizar colores, tipografía y secciones más adelante.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplate(tpl.id)}
                  className="group relative rounded-2xl border-2 p-4 text-left transition-all"
                  style={{
                    borderColor: template === tpl.id ? '#E8702A' : '#EBD9BF',
                    background: template === tpl.id ? '#FFE8D6' : '#FFFDF9',
                  }}
                >
                  {template === tpl.id && (
                    <span
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-white"
                      style={{ background: '#E8702A' }}
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </span>
                  )}
                  <div
                    className="mb-3 flex h-[110px] items-center justify-center rounded-xl"
                    style={{ background: tpl.bg }}
                  >
                    <div className="space-y-1.5 px-4 w-full">
                      <div className="h-2 w-3/4 rounded-full" style={{ background: tpl.accent, opacity: 0.9 }} />
                      <div className="h-1.5 w-1/2 rounded-full bg-white opacity-40" />
                      <div className="h-1.5 w-2/3 rounded-full bg-white opacity-25" />
                    </div>
                  </div>
                  <p className="text-[13px] font-bold" style={{ color: '#4A2420' }}>{tpl.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#5E3733' }}>{tpl.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-sm font-semibold hover:opacity-70"
                style={{ color: '#5E3733' }}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Atrás
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: '#E8702A' }}
              >
                Continuar
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — First dish */}
        {step === 3 && (
          <div>
            <div className="mb-8">
              <span
                className="mb-3 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
                style={{ background: '#FFE8D6', color: '#E8702A' }}
              >
                Paso 3 · Primer plato
              </span>
              <h1 className="text-[28px] font-extrabold leading-tight sm:text-[32px]" style={{ color: '#4A2420' }}>
                Agrega tu primer plato
              </h1>
              <p className="mt-2 text-sm" style={{ color: '#5E3733' }}>
                Opcional — puedes agregar más desde el panel cuando quieras.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* Form */}
              <div className="lg:col-span-3">
                <div
                  className="rounded-2xl border p-6"
                  style={{ background: '#FFFDF9', borderColor: '#EBD9BF' }}
                >
                  {error && (
                    <div
                      className="mb-4 rounded-full px-4 py-2 text-center text-sm font-semibold"
                      style={{ background: '#FFE8D6', color: '#8E2B1E' }}
                    >
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#4A2420' }}>
                        Nombre del plato <span style={{ color: '#E8702A' }}>*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: '#C1622B' }}>restaurant_menu</span>
                        <input
                          type="text"
                          value={dishName}
                          onChange={(e) => setDishName(e.target.value)}
                          placeholder="Ceviche Clásico"
                          className="h-11 w-full rounded-xl border pl-10 pr-4 text-sm outline-none transition"
                          style={{ borderColor: '#EBD9BF', background: 'white', color: '#4A2420' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#4A2420' }}>
                        Descripción
                      </label>
                      <textarea
                        value={dishDesc}
                        onChange={(e) => setDishDesc(e.target.value)}
                        placeholder="Descripción breve del plato..."
                        rows={2}
                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition resize-none"
                        style={{ borderColor: '#EBD9BF', background: 'white', color: '#4A2420' }}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#4A2420' }}>
                        Precio <span style={{ color: '#E8702A' }}>*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: '#C1622B' }}>payments</span>
                        <input
                          type="number"
                          value={dishPrice}
                          onChange={(e) => setDishPrice(e.target.value)}
                          placeholder="18.00"
                          min="0"
                          step="0.01"
                          className="h-11 w-full rounded-xl border pl-10 pr-4 text-sm outline-none transition"
                          style={{ borderColor: '#EBD9BF', background: 'white', color: '#4A2420' }}
                        />
                      </div>
                    </div>

                    {/* Image upload */}
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: '#4A2420' }}>
                        Foto del plato
                      </label>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      {dishImagePreview ? (
                        <div className="relative overflow-hidden rounded-xl" style={{ height: 100 }}>
                          <img
                            src={dishImagePreview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => { setDishImageFile(null); setDishImagePreview(null) }}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex h-[90px] w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed text-sm font-semibold transition hover:opacity-80"
                          style={{ borderColor: '#EBD9BF', color: '#C1622B', background: '#FFF8EC' }}
                        >
                          <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                          Subir foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone mockup preview */}
              <div className="flex justify-center lg:col-span-2 lg:justify-end">
                <div
                  className="relative w-[190px] rounded-[32px] border-[5px] shadow-2xl overflow-hidden flex flex-col"
                  style={{ borderColor: '#4A2420', background: '#1a1a2e', height: 420 }}
                >
                  {/* Notch */}
                  <div
                    className="absolute left-1/2 top-2 z-10 h-2 w-14 -translate-x-1/2 rounded-full"
                    style={{ background: '#4A2420' }}
                  />
                  {/* Screen content */}
                  <div className="flex h-full flex-col pt-7">
                    <div className="px-3 pb-2.5">
                      <div className="mb-1 h-1.5 w-2/3 rounded-full bg-white/30" />
                      <div className="h-1 w-1/2 rounded-full bg-white/20" />
                    </div>
                    {/* Dish card — image fills most of the phone */}
                    <div className="relative mx-2 flex-1 overflow-hidden rounded-xl" style={{ background: '#222' }}>
                      <img
                        src={dishImagePreview || cevichePreview}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-[11px] font-bold leading-tight text-white truncate">
                          {dishName || 'Ceviche Clásico'}
                        </p>
                        {dishDesc && (
                          <p className="mt-0.5 line-clamp-2 text-[9px] text-white/70">{dishDesc}</p>
                        )}
                        <p className="mt-1.5 text-[12px] font-extrabold" style={{ color: '#E8702A' }}>
                          {dishPrice ? `S/ ${Number(dishPrice).toFixed(2)}` : 'S/ 18.00'}
                        </p>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <div className="h-1 w-full rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-sm font-semibold hover:opacity-70"
                style={{ color: '#5E3733' }}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Atrás
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="rounded-full border px-6 py-3 text-sm font-semibold transition hover:opacity-80"
                  style={{ borderColor: '#EBD9BF', color: '#5E3733', background: 'white' }}
                >
                  Hacerlo después
                </button>
                <button
                  type="button"
                  onClick={handleSaveDish}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: '#E8702A' }}
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      ¡Activar mi carta digital!
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Onboarding
