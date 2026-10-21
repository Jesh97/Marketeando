import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoMark from '../assets/logo-mark.png'
import cevichePreview from '../assets/ceviche_onboarding.jpg'
import apiClient from '../api/client'
import { useRestaurante } from '../context/RestauranteContext'

function Onboarding() {
  const [step, setStep] = useState(1)
  const [template, setTemplate] = useState('costero')
  const [showSuccess, setShowSuccess] = useState(false)
  const navigate = useNavigate()

  // Step 1 state
  const [restaurantName, setRestaurantName] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  // Horario estructurado
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const HORAS = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, '0')
    return `${h}:00`
  })
  const [horarioDias, setHorarioDias] = useState(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'])
  const [horarioDesde, setHorarioDesde] = useState('12:00')
  const [horarioHasta, setHorarioHasta] = useState('22:00')

  const toggleDia = (dia) =>
    setHorarioDias(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )

  const horarioTexto = (() => {
    if (horarioDias.length === 0) return null
    const dias = DIAS.filter(d => horarioDias.includes(d)).join(', ')
    return `${dias} · ${horarioDesde} – ${horarioHasta}`
  })()

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  // Step 3 state
  const [dishName, setDishName] = useState('')
  const [dishDesc, setDishDesc] = useState('')
  const [dishPrice, setDishPrice] = useState('')
  const [dishCategory, setDishCategory] = useState('')
  const [dishImageFile, setDishImageFile] = useState(null)
  const [dishImagePreview, setDishImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savingStep1, setSavingStep1] = useState(false)
  const [error, setError] = useState('')
  const [step1Error, setStep1Error] = useState('')
  const { restaurante, refresh } = useRestaurante()

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDishImageFile(file)
    setDishImagePreview(URL.createObjectURL(file))
  }

  const subdomain = (restaurantName.trim() || 'turestaurante')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'menu'

  const getPhoneHeaderStyle = () => {
    if (template === 'andino') return { background: '#1F2740', color: '#FFF8EC' }
    if (template === 'minimal') return { background: '#F6E1B3', color: '#4A2420' }
    return { background: '#DBE9E5', color: '#1F2740' }
  }

  const getPhoneScreenStyle = () => {
    if (template === 'andino') return { background: '#F5F5F0' }
    if (template === 'minimal') return { background: '#FFFBF4' }
    return { background: '#F4F9F8' }
  }

  // Paso 1 → guarda nombre y subdominio del restaurante en la BD
  const handleSaveStep1 = async () => {
    if (!restaurantName.trim()) {
      setStep1Error('El nombre del local es obligatorio.')
      return
    }
    if (horarioDesde >= horarioHasta) {
      setStep1Error('La hora de apertura debe ser menor que la de cierre.')
      return
    }
    if (!restaurante?.id_restaurante) {
      setStep1Error('')
      setStep(2)
      return
    }
    setSavingStep1(true)
    setStep1Error('')
    try {
      await apiClient.put(`/restaurantes/${restaurante.id_restaurante}`, {
        nombre: restaurantName.trim(),
        subdominio: subdomain,
      })
      if (logoFile) {
        const fd = new FormData()
        fd.append('file', logoFile)
        await apiClient.post(
          `/restaurantes/${restaurante.id_restaurante}/logo`,
          fd,
          { headers: { 'Content-Type': undefined } }
        )
      }
      await refresh()
      setStep(2)
    } catch (err) {
      const msg = err?.response?.data?.error || ''
      setStep1Error(msg.includes('subdominio') ? 'Ese subdominio ya está en uso, prueba otro nombre.' : 'Error al guardar. Intenta de nuevo.')
    } finally {
      setSavingStep1(false)
    }
  }

  // Paso 3 → crea local (con horario) + producto estrella
  const handleSaveDish = async () => {
    if (!dishName.trim() || !dishPrice) {
      setError('Ingresa al menos el nombre y el precio.')
      return
    }
    const precioNum = parseFloat(dishPrice)
    if (isNaN(precioNum) || precioNum < 1) {
      setError('El precio debe ser al menos S/ 1.00.')
      return
    }
    if (!/^\d+(\.\d{1,2})?$/.test(dishPrice.trim())) {
      setError('El precio puede tener máximo 2 decimales.')
      return
    }
    if (!restaurante?.id_restaurante) {
      setShowSuccess(true)
      return
    }
    setSaving(true)
    setError('')
    try {
      // 1. Crear local principal con el horario ingresado en paso 1
      await apiClient.post(`/restaurantes/${restaurante.id_restaurante}/locales`, {
        nombre: restaurantName.trim() || restaurante.nombre,
        horario_dias: horarioDias,
        horario_desde: horarioDesde,
        horario_hasta: horarioHasta,
      }).catch(() => {
        // Si ya existe el límite de locales o ya hay uno, continuar sin error
      })

      // 2. Subir imagen si se eligió una
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

      // 3. Crear el producto estrella
      await apiClient.post(`/restaurantes/${restaurante.id_restaurante}/productos`, {
        nombre: dishName.trim(),
        descripcion: dishDesc.trim() || null,
        precio: Number(dishPrice),
        id_categoria: null,
        url_imagen: urlImagen,
      })

      setShowSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const StepBadge = ({ n }) => {
    if (n < step) return (
      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
        <span className="material-symbols-outlined text-[18px]">check</span>
      </div>
    )
    if (n === step) return (
      <div className="w-9 h-9 rounded-xl bg-orange-action text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
        0{n}
      </div>
    )
    return (
      <div className="w-9 h-9 rounded-xl text-brown-deep flex items-center justify-center font-semibold text-sm shrink-0" style={{ background: '#eee7dc' }}>
        0{n}
      </div>
    )
  }

  const stepLabels = [
    { title: 'Identidad del Local', sub: 'Nombre, logo & estilo' },
    { title: 'Estilo & Plantilla', sub: 'Paleta, tipografía & QR' },
    { title: 'Plato Estrella', sub: 'Precios, foto & preview' },
  ]

  return (
    <div className="min-h-screen font-jakarta antialiased bg-cream-base text-brown-deep">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-cream-base/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(74,36,32,0.04)]">
        <div className="h-20 max-w-[1200px] mx-auto px-6 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 overflow-hidden rounded-full">
              <img src={logoMark} alt="Karta Kamay" className="h-full w-full object-cover" />
            </div>
            <span className="font-semibold text-xl text-brown-deep tracking-tight leading-none">Karta Kamay</span>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col w-full pb-16 pt-4">

          {/* === Stepper Nav === */}
          {!showSuccess && (
            <div className="w-full max-w-[1020px] mx-auto mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-[32px] font-bold tracking-tight text-brown-deep">Crea tu Menú Digital Interactivo</h1>
                  <p className="text-brown-body/80 mt-0.5 text-[15px]">Configura tu identidad, elige la vibra visual y publica tu primer plato con QR de alta conversión.</p>
                </div>
              </div>

              {/* Stepper Tabs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1.5 rounded-3xl border border-border-warm/60 shadow-sm" style={{ background: '#f4ede1' }}>
                {stepLabels.map((lbl, i) => {
                  const n = i + 1
                  const isActive = n === step
                  const isDone = n < step
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        if (n > 1 && step === 1) {
                          handleSaveStep1()
                          return
                        }
                        setStep(n)
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left cursor-pointer transition-all duration-300 border ${
                        isActive
                          ? 'bg-white shadow-sm border-orange-action/30'
                          : isDone
                          ? 'bg-cream-strong/50 border-border-warm/40'
                          : 'border-transparent hover:bg-[#eee7dc]'
                      }`}
                    >
                      <StepBadge n={n} />
                      <div className="flex flex-col overflow-hidden">
                        <span className={`text-[14px] text-brown-deep truncate ${isActive ? 'font-bold' : 'font-medium'}`}>{lbl.title}</span>
                        <span className="text-[12px] text-brown-body/70 truncate">{lbl.sub}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* === Main Step Content === */}
          <div className="w-full max-w-[1020px] mx-auto">

            {/* ======== PASO 1: IDENTIDAD ======== */}
            {!showSuccess && step === 1 && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form */}
                <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-border-warm space-y-6">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-cream-strong text-orange-action font-semibold text-[11px] uppercase tracking-wider">Paso 1 de 3</span>
                    <h2 className="text-2xl font-bold text-brown-deep mt-1.5">Personaliza la esencia de tu local</h2>
                    <p className="text-brown-body/80 text-sm mt-1">Estos datos lucirán en la portada de tu QR y en la cabecera interactiva del menú.</p>
                  </div>

                  {/* Logo Selector */}
                  <div className="space-y-3">
                    <label className="block font-semibold text-brown-deep text-sm">Logo o distintivo de tu marca</label>
                    <div className="p-4 rounded-2xl bg-cream-base/80 border border-dashed border-brown-deep/20 flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-cream-strong flex items-center justify-center border border-border-warm shadow-inner shrink-0 overflow-hidden">
                        {logoPreview
                          ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                          : <span className="material-symbols-outlined text-[36px] text-orange-action">restaurant</span>
                        }
                      </div>
                      <div className="flex-1">
                        <label
                          htmlFor="logo-upload-input"
                          className="px-3.5 py-1.5 rounded-full bg-cream-strong hover:bg-card-beige text-brown-deep font-semibold text-[13px] inline-flex items-center gap-1.5 border border-border-warm cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">upload</span> Subir logo
                          <input
                            id="logo-upload-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                          />
                        </label>
                        <p className="text-[12px] text-brown-body/60 mt-1.5">PNG o JPG recomendado · fondo transparente ideal</p>
                      </div>
                    </div>
                  </div>

                  {/* Restaurant Name */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-brown-deep text-sm" htmlFor="restaurant-name">
                      Nombre comercial <span className="text-orange-action">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-brown-body/50 text-[20px]">storefront</span>
                      <input
                        id="restaurant-name"
                        type="text"
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        placeholder="Ej. La Mar Cevichería, Don Belisario"
                        className="w-full h-12 pl-12 pr-4 rounded-full bg-cream-base border border-border-warm text-brown-deep placeholder:text-brown-body/40 shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-action/30"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1 px-2 text-[12px] text-brown-body/80">
                      <span className="material-symbols-outlined text-orange-action text-[15px]">link</span>
                      <span>Tu menú vivirá en:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-cream-strong font-bold text-brown-deep border border-border-warm text-[11px]">
                        {subdomain}.kartakamay.app
                      </span>
                    </div>
                  </div>

                  {/* Horario */}
                  <div className="space-y-2.5">
                    <label className="block font-semibold text-brown-deep text-[13px]">Horario de servicio</label>

                    {/* Días */}
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS.map(dia => (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => toggleDia(dia)}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                            horarioDias.includes(dia)
                              ? 'bg-orange-action text-white border-orange-action'
                              : 'bg-cream-base text-brown-body border-border-warm hover:bg-cream-strong'
                          }`}
                        >
                          {dia}
                        </button>
                      ))}
                    </div>

                    {/* Horas */}
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-brown-body/50 text-[18px]">schedule</span>
                      <span className="text-[12px] text-brown-body/70 font-medium">Desde</span>
                      <select
                        value={horarioDesde}
                        onChange={e => setHorarioDesde(e.target.value)}
                        className="h-9 px-3 rounded-full bg-cream-base border border-border-warm text-brown-deep text-[13px] font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-action/30"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-[12px] text-brown-body/70 font-medium">Hasta</span>
                      <select
                        value={horarioHasta}
                        onChange={e => setHorarioHasta(e.target.value)}
                        className="h-9 px-3 rounded-full bg-cream-base border border-border-warm text-brown-deep text-[13px] font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-action/30"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Preview texto */}
                    {horarioTexto && (
                      <p className="text-[11px] text-brown-body/60 px-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-orange-action">check_circle</span>
                        {horarioTexto}
                      </p>
                    )}
                  </div>

                  {/* Next */}
                  <div className="pt-4 flex items-center justify-between border-t border-border-warm/60">
                    {step1Error ? (
                      <span className="text-[13px] text-red-600 font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">error</span> {step1Error}
                      </span>
                    ) : (
                      <span className="text-[13px] text-brown-body/70 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-orange-action text-[18px]">bolt</span> Configuración inmediata
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveStep1}
                      disabled={savingStep1}
                      className="px-8 py-3.5 rounded-full bg-orange-action hover:bg-terracotta-hover text-white font-bold text-[15px] shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2 group disabled:opacity-60"
                    >
                      {savingStep1 ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                          Guardando...
                        </>
                      ) : (
                        <>
                          Continuar a Plantillas
                          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white p-6 rounded-3xl border border-border-warm shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-action text-[20px]">visibility</span>
                        <h3 className="font-bold text-brown-deep text-sm">Vista previa de tu cabecera</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-card-teal text-[11px] font-bold text-brown-deep">TIEMPO REAL</span>
                    </div>
                    <div className="rounded-2xl bg-cream-base p-4 border border-border-warm shadow-inner space-y-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-cream-strong border border-border-warm flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                          {logoPreview
                            ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                            : <span className="material-symbols-outlined text-[32px] text-orange-action">restaurant</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-brown-deep text-[17px] leading-tight truncate">{restaurantName || 'Tu Restaurante'}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-brown-body/70 mt-1">
                            <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-0.5" />Abierto
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl flex items-center justify-between text-[11px] text-brown-deep font-medium" style={{ background: '#f4ede1' }}>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-brown-body/60">schedule</span>
                          {horarioTexto || 'Horario de atención'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 p-4 rounded-2xl bg-cream-strong/50 border border-border-warm flex items-start gap-3">
                      <span className="material-symbols-outlined text-orange-action text-[22px] shrink-0">qr_code_2</span>
                      <div>
                        <h5 className="text-[13px] font-bold text-brown-deep">QR Dinámico Instantáneo</h5>
                        <p className="text-[12px] text-brown-body/80 mt-0.5 leading-snug">Generamos automáticamente códigos QR descargables en PDF.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ======== PASO 2: PLANTILLA ======== */}
            {!showSuccess && step === 2 && (
              <section className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-border-warm">
                  <div className="max-w-[700px] mb-6">
                    <span className="px-2.5 py-1 rounded-full bg-cream-strong text-orange-action font-semibold text-[11px] uppercase tracking-wider">Paso 2 de 3</span>
                    <h2 className="text-2xl font-bold text-brown-deep mt-1.5">Elige la personalidad visual de tu carta</h2>
                    <p className="text-brown-body/80 text-sm mt-1">Cada plantilla está calibrada para máxima legibilidad bajo luz tenue o luz diurna en cualquier smartphone.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Andino Clásico */}
                    <div
                      onClick={() => setTemplate('andino')}
                      className={`relative p-5 rounded-3xl bg-white border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${template === 'andino' ? 'border-orange-action shadow-md' : 'border-border-warm hover:border-orange-action/60 shadow-sm'}`}
                    >
                      {template === 'andino' && (
                        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-orange-action text-white flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </div>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-cream-strong text-brown-deep font-bold text-[11px] uppercase mb-3 inline-block">⭐ Más Elegido</span>
                      <div className="w-full h-44 rounded-2xl bg-navy-dark p-3.5 flex flex-col justify-between text-white shadow-inner mb-4 overflow-hidden">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-orange-action flex items-center justify-center text-[11px] font-bold">K</div>
                            <span className="text-[11px] font-bold text-cream-base">Andino Bistro</span>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/20">Noche / Gourmet</span>
                        </div>
                        <div className="space-y-2 py-2">
                          <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                            <div className="space-y-1"><div className="h-2 w-24 bg-cream-strong rounded-full" /><div className="h-1.5 w-16 bg-white/30 rounded-full" /></div>
                            <span className="text-orange-action font-bold text-[12px]">S/ 48</span>
                          </div>
                          <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                            <div className="space-y-1"><div className="h-2 w-20 bg-cream-strong rounded-full" /><div className="h-1.5 w-12 bg-white/30 rounded-full" /></div>
                            <span className="text-orange-action font-bold text-[12px]">S/ 36</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/50 pt-1 border-t border-white/10">
                          <span>Fondo carbón premium</span>
                          <span className="text-orange-action font-bold">Acento Terracota</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-brown-deep text-[18px]">Andino Clásico</h3>
                      <p className="text-brown-body/80 text-[13px] mt-1 leading-relaxed">Fondo carbón profundo con acentos en terracota fuego. Ideal para carnes, bistrós de autor y cenas.</p>
                    </div>

                    {/* Cálido Minimal */}
                    <div
                      onClick={() => setTemplate('minimal')}
                      className={`relative p-5 rounded-3xl bg-white border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${template === 'minimal' ? 'border-orange-action shadow-md' : 'border-border-warm hover:border-orange-action/60 shadow-sm'}`}
                    >
                      {template === 'minimal' && (
                        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-orange-action text-white flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </div>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-card-beige text-brown-deep font-bold text-[11px] uppercase mb-3 inline-block">☕ Bakery & Brunch</span>
                      <div className="w-full h-44 rounded-2xl bg-card-beige p-3.5 flex flex-col justify-between text-brown-deep shadow-inner mb-4 overflow-hidden">
                        <div className="flex items-center justify-between pb-2 border-b border-brown-deep/10">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-brown-deep text-cream-base flex items-center justify-center text-[11px] font-bold">M</div>
                            <span className="text-[11px] font-bold text-brown-deep">Café Atelier</span>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-brown-deep/10">Artesanal</span>
                        </div>
                        <div className="space-y-2 py-2">
                          <div className="flex items-center justify-between bg-brown-deep/5 p-2 rounded-xl">
                            <div className="space-y-1"><div className="h-2 w-24 bg-brown-deep rounded-full" /><div className="h-1.5 w-16 bg-brown-deep/40 rounded-full" /></div>
                            <span className="text-brown-deep font-bold text-[12px]">S/ 24</span>
                          </div>
                          <div className="flex items-center justify-between bg-brown-deep/5 p-2 rounded-xl">
                            <div className="space-y-1"><div className="h-2 w-20 bg-brown-deep rounded-full" /><div className="h-1.5 w-12 bg-brown-deep/40 rounded-full" /></div>
                            <span className="text-brown-deep font-bold text-[12px]">S/ 18</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-brown-body/70 pt-1 border-t border-brown-deep/10">
                          <span>Crema suave texturado</span>
                          <span className="text-brown-deep font-bold">Mostaza Tostada</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-brown-deep text-[18px]">Cálido Minimal</h3>
                      <p className="text-brown-body/80 text-[13px] mt-1 leading-relaxed">Papel artesanal, crema suave y marrón cacao. Perfecto para cafeterías de especialidad, brunch y panaderías.</p>
                    </div>

                    {/* Costero Fresco */}
                    <div
                      onClick={() => setTemplate('costero')}
                      className={`relative p-5 rounded-3xl bg-white border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${template === 'costero' ? 'border-orange-action shadow-md' : 'border-border-warm hover:border-orange-action/60 shadow-sm'}`}
                    >
                      {template === 'E' && (
                        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-orange-action text-white flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </div>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-card-teal text-brown-deep font-bold text-[11px] uppercase mb-3 inline-block">🌊 Marino & Terraza</span>
                      <div className="w-full h-44 rounded-2xl bg-card-teal p-3.5 flex flex-col justify-between text-navy-dark shadow-inner mb-4 overflow-hidden">
                        <div className="flex items-center justify-between pb-2 border-b border-navy-dark/10">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: '#565d79' }}>C</div>
                            <span className="text-[11px] font-bold text-navy-dark">Costero Bar</span>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/40">Brisa Marina</span>
                        </div>
                        <div className="space-y-2 py-2">
                          <div className="flex items-center justify-between bg-white/40 p-2 rounded-xl">
                            <div className="space-y-1"><div className="h-2 w-24 bg-navy-dark rounded-full" /><div className="h-1.5 w-16 bg-navy-dark/50 rounded-full" /></div>
                            <span className="font-bold text-[12px]" style={{ color: '#565d79' }}>S/ 52</span>
                          </div>
                          <div className="flex items-center justify-between bg-white/40 p-2 rounded-xl">
                            <div className="space-y-1"><div className="h-2 w-20 bg-navy-dark rounded-full" /><div className="h-1.5 w-12 bg-navy-dark/50 rounded-full" /></div>
                            <span className="font-bold text-[12px]" style={{ color: '#565d79' }}>S/ 39</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-navy-dark/10" style={{ color: '#565d79' }}>
                          <span>Menta luminosa</span>
                          <span className="text-navy-dark font-bold">Índigo Marino</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-brown-deep text-[18px]">Costero Fresco</h3>
                      <p className="text-brown-body/80 text-[13px] mt-1 leading-relaxed">Tonalidades menta fresca y azul índigo profundo. Diseñado con alta vibra para cevicherías de verano y bares.</p>
                    </div>
                  </div>

                  {/* Nav */}
                  <div className="pt-8 mt-4 flex items-center justify-between border-t border-border-warm/60">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-3 rounded-full hover:bg-cream-strong text-brown-deep font-semibold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors border border-border-warm/60"
                      style={{ background: '#f4ede1' }}
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span> Atrás
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (restaurante?.id_restaurante) {
                          try {
                            await apiClient.put(`/restaurantes/${restaurante.id_restaurante}`, {
                              nombre: restaurantName.trim() || restaurante.nombre,
                              plantilla: template,
                            })
                            await refresh()
                          } catch (_) {}
                        }
                        setStep(3)
                      }}
                      className="px-8 py-3.5 rounded-full bg-orange-action hover:bg-terracotta-hover text-white font-bold text-[15px] shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2 group"
                    >
                      Continuar a Mi Plato Estrella
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ======== PASO 3: PLATO ESTRELLA ======== */}
            {!showSuccess && step === 3 && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form */}
                <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-border-warm space-y-5">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-cream-strong text-orange-action font-semibold text-[11px] uppercase tracking-wider">Paso 3 de 3</span>
                    <h2 className="text-2xl font-bold text-brown-deep mt-1.5">Publica tu plato insignia</h2>
                    <p className="text-brown-body/80 text-sm mt-1">Mira a la derecha cómo se transformará instantáneamente en la pantalla del comensal.</p>
                  </div>

                  {error && (
                    <div className="rounded-full px-4 py-2 text-center text-sm font-semibold bg-pill-warm text-terracotta-dark">
                      {error}
                    </div>
                  )}

                  {/* Nombre del Plato */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-brown-deep text-sm" htmlFor="dish-name">
                      Nombre del plato <span className="text-orange-action">*</span>
                    </label>
                    <input
                      id="dish-name"
                      type="text"
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      placeholder="Ej. Ceviche Mixto Carretillero"
                      className="w-full h-12 px-4 rounded-full bg-cream-base border border-border-warm text-brown-deep shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-action/30"
                    />
                  </div>

                  {/* Precio + Categoría */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block font-semibold text-brown-deep text-sm" htmlFor="dish-price">
                        Precio de venta (PEN) <span className="text-orange-action">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brown-deep text-sm">S/</span>
                        <input
                          id="dish-price"
                          type="text"
                          inputMode="decimal"
                          value={dishPrice}
                          onChange={(e) => {
                            const v = e.target.value
                            if (/^\d*(\.\d{0,2})?$/.test(v)) setDishPrice(v)
                          }}
                          placeholder="0.00"
                          className="w-full h-12 pl-10 pr-4 rounded-full bg-cream-base border border-border-warm text-brown-deep font-bold shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-action/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block font-semibold text-brown-deep text-sm" htmlFor="dish-category">Categoría en la carta</label>
                      <input
                        id="dish-category"
                        type="text"
                        value={dishCategory}
                        onChange={(e) => setDishCategory(e.target.value)}
                        placeholder="Ej. Platos Fuertes, Postres"
                        className="w-full h-12 px-4 rounded-full bg-cream-base border border-border-warm text-brown-deep shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-action/30"
                      />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-brown-deep text-sm" htmlFor="dish-desc">Descripción gastronómica e ingredientes</label>
                    <textarea
                      id="dish-desc"
                      value={dishDesc}
                      onChange={(e) => setDishDesc(e.target.value)}
                      placeholder="Describe el plato, texturas o acompañamientos..."
                      rows={3}
                      className="w-full p-4 rounded-2xl bg-cream-base border border-border-warm text-brown-deep text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-action/30 resize-none"
                    />
                  </div>

                  {/* Foto del Plato */}
                  <div className="space-y-2">
                    <span className="block font-semibold text-brown-deep text-[13px]">Fotografía del plato</span>
                    <div className="p-4 rounded-2xl bg-cream-base border border-dashed border-border-warm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          alt="Plato"
                          className="w-16 h-16 rounded-xl object-cover shadow-sm"
                          src={dishImagePreview || cevichePreview}
                        />
                        <div>
                          <span className="font-semibold text-brown-deep text-[13px] block">
                            {dishImagePreview ? 'Foto cargada' : 'Fotografía optimizada para web'}
                          </span>
                          <span className="text-[12px] text-brown-body/70">Resolución óptima para comensales en mesa</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dishImagePreview && (
                          <button
                            type="button"
                            onClick={() => { setDishImageFile(null); setDishImagePreview(null) }}
                            className="px-3 py-1.5 rounded-full bg-cream-strong hover:bg-card-salmon text-brown-deep text-[12px] font-semibold border border-border-warm cursor-pointer transition-colors inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        )}
                        <label
                          htmlFor="dish-upload-input"
                          className="px-3.5 py-1.5 rounded-full bg-cream-strong hover:bg-card-beige text-brown-deep text-[12px] font-semibold border border-border-warm cursor-pointer transition-colors inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span> Subir foto
                          <input
                            id="dish-upload-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 border-t border-border-warm/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full sm:w-auto px-6 py-3 rounded-full hover:bg-cream-strong text-brown-deep font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors border border-border-warm/60"
                      style={{ background: '#f4ede1' }}
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span> Atrás
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDish}
                      disabled={saving}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-orange-action hover:bg-terracotta-hover text-white font-bold text-[15px] shadow-lg transition-all duration-200 inline-flex items-center justify-center gap-2 group disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                          Guardando...
                        </>
                      ) : (
                        <>
                          ¡Lanzar mi Menú Digital!
                          <span className="material-symbols-outlined text-[20px] group-hover:scale-125 transition-transform">rocket_launch</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Phone Mockup */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[320px] rounded-[42px] bg-navy-dark p-3.5 shadow-2xl border-4 border-navy-dark/90 relative">
                    <div className="w-24 h-4 rounded-full mx-auto mb-2 flex items-center justify-center gap-2 bg-navy-dark">
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                      <div className="w-10 h-1.5 rounded-full bg-white/20" />
                    </div>
                    <div
                      className="w-full rounded-[30px] overflow-hidden flex flex-col min-h-[480px] shadow-inner border border-border-warm/30"
                      style={getPhoneScreenStyle()}
                    >
                      {/* Phone Header */}
                      <div
                        className="px-4 py-3 flex items-center justify-between transition-colors"
                        style={getPhoneHeaderStyle()}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-orange-action flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                            {(restaurantName || 'K')[0].toUpperCase()}
                          </div>
                          <span className="font-bold text-[13px] truncate">
                            {restaurantName || 'Tu Restaurante'}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-orange-action">qr_code_2</span>
                      </div>

                      {/* Dish Card */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] uppercase font-bold text-orange-action tracking-wider truncate mr-2">{dishCategory || 'Categoría'}</span>
                            <span className="px-2 py-0.5 rounded-full bg-cream-strong text-brown-deep text-[10px] font-bold whitespace-nowrap">⭐ Chef</span>
                          </div>
                          <div className="w-full h-36 rounded-2xl overflow-hidden relative mb-3 shadow-sm border border-border-warm/40" style={{ background: '#f4ede1' }}>
                            <img
                              alt="Plato en móvil"
                              className="w-full h-full object-cover"
                              src={dishImagePreview || cevichePreview}
                            />
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white font-bold text-[10px] backdrop-blur-sm">
                              Plato Estrella
                            </div>
                          </div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-bold text-[15px] leading-tight text-brown-deep">{dishName || 'Nombre del plato'}</h4>
                            <span className="font-bold text-[15px] leading-tight text-orange-action whitespace-nowrap">
                              S/ {dishPrice || '0.00'}
                            </span>
                          </div>
                          <p className="text-[12px] leading-relaxed text-brown-body/90 line-clamp-3 mb-2">
                            {dishDesc || 'Descripción del plato...'}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-border-warm/50 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-0.5" />Disponible
                          </span>
                          <div className="w-8 h-8 rounded-full bg-orange-action text-white flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom nav */}
                      <div className="px-4 py-2 flex items-center justify-around text-brown-body/70 border-t border-border-warm/40" style={{ background: '#f4ede1' }}>
                        <span className="material-symbols-outlined text-[18px] text-orange-action">restaurant_menu</span>
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        <span className="material-symbols-outlined text-[18px]">room_service</span>
                      </div>
                    </div>
                    <div className="w-20 h-1 bg-white/40 rounded-full mx-auto mt-2.5" />
                  </div>
                  <span className="text-[13px] text-brown-body/70 mt-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-orange-action">smartphone</span>
                    Vista previa de cliente en mesa
                  </span>
                </div>
              </section>
            )}

            {/* ======== SUCCESS STATE ======== */}
            {showSuccess && (
              <div className="text-center py-10">
                <div className="w-24 h-24 rounded-full bg-card-teal text-emerald-800 flex items-center justify-center mx-auto mb-6 shadow-md border-2 border-emerald-300">
                  <span className="material-symbols-outlined text-[48px]">celebration</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[12px] uppercase">¡Menú Activo con Éxito!</span>
                <h2 className="text-[32px] font-bold text-brown-deep mt-2 mb-3">¡Tu carta digital ya está lista para servir!</h2>
                <p className="text-brown-body max-w-[560px] mx-auto mb-8 leading-relaxed">
                  ¡Genial! <strong>{restaurantName}</strong> ha sido creado exitosamente. Puedes agregar todos tus platos desde el panel de control cuando estés listo.
                </p>
                <div className="p-6 max-w-lg mx-auto rounded-3xl bg-white border border-border-warm shadow-md mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-14 h-14 rounded-2xl bg-cream-strong border border-border-warm flex items-center justify-center text-orange-action shadow-inner shrink-0">
                      <span className="material-symbols-outlined text-[32px]">qr_code_scanner</span>
                    </div>
                    <div>
                      <span className="font-bold text-brown-deep text-[15px] block">QR Maestro de Mesa 2026</span>
                      <span className="text-brown-body/80 text-[13px]">{subdomain}.kartakamay.app</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(`https://${subdomain}.kartakamay.app`)}
                    className="px-4 py-2 rounded-full bg-orange-action text-white hover:bg-terracotta-hover font-bold text-[13px] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    Copiar Enlace
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => { setShowSuccess(false); setStep(1) }}
                    className="px-6 py-3 rounded-full hover:bg-cream-strong text-brown-deep font-semibold text-sm border border-border-warm/60 transition-all cursor-pointer"
                    style={{ background: '#f4ede1' }}
                  >
                    Editar configuración
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-3.5 rounded-full bg-orange-action hover:bg-terracotta-hover text-white font-bold text-[15px] shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    Ir al Panel de Administración
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}

export default Onboarding
