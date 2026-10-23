import { useEffect, useRef, useState } from 'react'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'
import { useRestaurante } from '../context/RestauranteContext'
import { LIMITES, validarImagen, validarTelefono, validarTexto } from '../lib/validaciones'

const MAX_SLOGAN = LIMITES.slogan

function iniciales(nombre) {
  return (nombre || 'R')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formDesde(restaurante) {
  return {
    nombre: restaurante?.nombre ?? '',
    slogan: restaurante?.slogan ?? '',
    // telefono es char(9) en la base: puede volver con espacios de relleno.
    telefono: (restaurante?.telefono ?? '').trim(),
  }
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function Logo({ url, nombre, className }) {
  if (url) return <img src={url} alt="" className={`${className} object-cover`} />
  return (
    <div className={`${className} flex items-center justify-center bg-[#C97B5F] font-extrabold text-white`}>
      {iniciales(nombre)}
    </div>
  )
}

function Seccion({ titulo, descripcion, children }) {
  return (
    <section className="grid grid-cols-1 gap-4 border-b border-[#E2E8F0] px-6 py-6 md:grid-cols-[200px_1fr] md:gap-8">
      <div>
        <h3 className="text-sm font-bold text-navy">{titulo}</h3>
        {descripcion && <p className="mt-1 text-xs leading-relaxed text-[#8A94A6]">{descripcion}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Campo({ label, ayuda, error, contador, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="text-[13px] font-semibold text-navy">{label}</label>
        {contador && <span className="text-[11px] text-[#8A94A6]">{contador}</span>}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-[#DC2626]">{error}</p>
      ) : (
        ayuda && <p className="mt-1.5 text-xs text-[#8A94A6]">{ayuda}</p>
      )}
    </div>
  )
}

const inputClase =
  'h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm text-navy outline-none transition-colors placeholder:text-[#A0AEC0] focus:border-orange focus:ring-2 focus:ring-orange/15'

function Settings() {
  const { restaurante, setRestaurante } = useRestaurante()
  const [form, setForm] = useState(() => formDesde(restaurante))
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const fileInputRef = useRef(null)

  // El restaurante llega async desde el contexto: al cargar (o al cambiar
  // tras guardar/subir logo) el formulario se sincroniza con la base.
  useEffect(() => {
    setForm(formDesde(restaurante))
  }, [restaurante])

  const original = formDesde(restaurante)
  const hayCambios =
    form.nombre !== original.nombre || form.slogan !== original.slogan || form.telefono !== original.telefono

  const errorNombre = validarTexto(form.nombre, { etiqueta: 'El nombre' })
  const errorTelefono = validarTelefono(form.telefono)
  const puedeGuardar = Boolean(restaurante) && hayCambios && !errorNombre && !errorTelefono && !guardando

  const enlacePublico = restaurante?.subdominio ? `${window.location.origin}/menu/${restaurante.subdominio}` : ''

  const cambiar = (campo, limpiar = (v) => v) => (e) => {
    setGuardado(false)
    setForm((f) => ({ ...f, [campo]: limpiar(e.target.value) }))
  }

  const subirLogo = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !restaurante) return
    const errorImagen = validarImagen(file)
    if (errorImagen) {
      setError(errorImagen)
      return
    }
    setError('')
    setSubiendoLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post(`/restaurantes/${restaurante.id_restaurante}/logo`, formData, {
        headers: { 'Content-Type': undefined },
      })
      setRestaurante(data)
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo subir el logo.')
    } finally {
      setSubiendoLogo(false)
    }
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    setGuardando(true)
    setError('')
    try {
      const { data } = await apiClient.put(`/restaurantes/${restaurante.id_restaurante}`, {
        nombre: form.nombre.trim(),
        slogan: form.slogan.trim() || null,
        telefono: form.telefono || null,
      })
      setRestaurante(data)
      setGuardado(true)
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudieron guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  const copiarEnlace = () => {
    if (!enlacePublico) return
    navigator.clipboard?.writeText(enlacePublico)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <DashboardShell>
      <div className="mb-7">
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Configuración</h1>
        <p className="mt-1.5 text-[14px] text-[#4A5568]">
          Así se presenta tu restaurante a los comensales que abren tu menú.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={guardar} className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white">
          <div className="border-b border-[#E2E8F0] px-6 py-5">
            <h2 className="text-base font-bold text-navy">Perfil del restaurante</h2>
          </div>

          <Seccion titulo="Logo" descripcion="Se guarda al instante. PNG, JPG o WebP, cuadrado, máximo 5 MB.">
            <div className="flex items-center gap-4">
              <Logo
                url={restaurante?.url_logo}
                nombre={form.nombre}
                className="h-20 w-20 shrink-0 rounded-2xl text-2xl"
              />
              <div className="flex flex-col items-start gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendoLogo || !restaurante}
                  className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-[13px] font-semibold text-navy hover:bg-[#F6F8FC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CameraIcon />
                  {subiendoLogo ? 'Subiendo...' : restaurante?.url_logo ? 'Cambiar logo' : 'Subir logo'}
                </button>
                {!restaurante?.url_logo && (
                  <span className="text-xs text-[#8A94A6]">Sin logo se muestran tus iniciales.</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={subirLogo}
              />
            </div>
          </Seccion>

          <Seccion titulo="Información" descripcion="Aparece en la cabecera de tu menú digital.">
            <Campo label="Nombre del restaurante" error={errorNombre}>
              <input type="text" value={form.nombre} onChange={cambiar('nombre')} maxLength={150} className={inputClase} />
            </Campo>
            <Campo
              label="Eslogan"
              ayuda="Una frase corta que describa tu cocina."
              contador={`${form.slogan.length}/${MAX_SLOGAN}`}
            >
              <input
                type="text"
                value={form.slogan}
                onChange={cambiar('slogan')}
                maxLength={MAX_SLOGAN}
                placeholder="Ej. Cocina andina de autor"
                className={inputClase}
              />
            </Campo>
          </Seccion>

          <Seccion titulo="Contacto" descripcion="Para que tus clientes puedan comunicarse contigo.">
            <Campo label="Teléfono" error={errorTelefono} ayuda="Celular de 9 dígitos que empieza con 9.">
              <div className="flex">
                <span className="flex h-11 items-center rounded-l-[9px] border border-r-0 border-[#E2E8F0] bg-[#F6F8FC] px-3 text-sm font-semibold text-[#4A5568]">
                  +51
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.telefono}
                  onChange={cambiar('telefono', (v) => v.replace(/\D/g, '').slice(0, 9))}
                  placeholder="987654321"
                  className={`${inputClase} rounded-l-none`}
                />
              </div>
            </Campo>
          </Seccion>

          <div className="flex flex-wrap items-center justify-end gap-3 bg-[#F9FAFC] px-6 py-4">
            {error && <p className="mr-auto text-xs text-[#DC2626]">{error}</p>}
            {!error && guardado && !hayCambios && (
              <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
                <CheckIcon />
                Cambios guardados
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setForm(original)
                setError('')
              }}
              disabled={!hayCambios || guardando}
              className="h-10 rounded-[9px] px-4 text-[13.5px] font-semibold text-[#4A5568] hover:bg-[#EEF1F6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Descartar
            </button>
            <button
              type="submit"
              disabled={!puedeGuardar}
              className="h-10 rounded-[9px] bg-orange px-5 text-[13.5px] font-semibold text-white hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        <aside className="flex flex-col gap-[18px] xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-[14px] border border-[#E2E8F0] bg-white">
            <p className="px-5 pb-3 pt-4 text-xs font-bold uppercase tracking-wide text-[#8A94A6]">
              Vista en tu menú
            </p>
            <div className="bg-navy px-5 py-6 text-white">
              <div className="flex items-center gap-3.5">
                <Logo
                  url={restaurante?.url_logo}
                  nombre={form.nombre}
                  className="h-12 w-12 shrink-0 rounded-xl text-base"
                />
                <div className="min-w-0">
                  <p className="truncate text-lg font-extrabold">{form.nombre.trim() || 'Tu restaurante'}</p>
                  {form.slogan.trim() && (
                    <p className="mt-0.5 truncate text-[12.5px] text-[#A9B4C8]">{form.slogan}</p>
                  )}
                </div>
              </div>
            </div>
            <p className="px-5 py-3.5 text-xs text-[#8A94A6]">Se actualiza mientras escribes.</p>
          </div>

          {enlacePublico && (
            <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5">
              <p className="text-sm font-bold text-navy">Enlace de tu menú</p>
              <p className="mt-1 text-xs text-[#8A94A6]">Es el mismo al que apunta tu código QR.</p>
              <div className="mt-3 flex items-center gap-2 rounded-[9px] border border-[#E2E8F0] bg-[#F6F8FC] py-1.5 pl-3 pr-1.5">
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#4A5568]">{enlacePublico}</span>
                <button
                  type="button"
                  onClick={copiarEnlace}
                  title="Copiar enlace"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-navy hover:bg-white"
                >
                  {copiado ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
              <a
                href={enlacePublico}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-[13px] font-semibold text-orange hover:text-orange-dark"
              >
                Ver mi menú →
              </a>
            </div>
          )}
        </aside>
      </div>
    </DashboardShell>
  )
}

export default Settings
