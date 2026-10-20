import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'
import { useRestaurante } from '../context/RestauranteContext'
import { imageToDataUrl, imageToLumaMap, imageToMask, urlToImage } from '../lib/logoMask'
import { construirSvg, rasterizarPng } from '../lib/qrEngine'

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#8A94A6" strokeWidth="2" className="h-[17px] w-[17px]">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function QrIcon({ stroke = '#8A94A6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="h-[17px] w-[17px]">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.6V4.4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.4H7.6V14h2.7v8z" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" className="h-[17px] w-[17px]">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#FD761A" strokeWidth="2" className="h-[17px] w-[17px]">
      <path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function QrCodeArt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16">
      <rect x="3" y="3" width="7" height="7" fill="#fff" />
      <rect x="14" y="3" width="7" height="7" fill="#fff" />
      <rect x="3" y="14" width="7" height="7" fill="#fff" />
      <rect x="14" y="14" width="3" height="3" fill="#fff" />
      <rect x="18" y="18" width="3" height="3" fill="#fff" />
      <rect x="14" y="18" width="3" height="3" fill="#fff" />
      <rect x="18" y="14" width="3" height="3" fill="#fff" />
    </svg>
  )
}

function Dashboard() {
  const { usuario, restaurante, loading: loadingRestaurante } = useRestaurante()
  const [stats, setStats] = useState(null)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [confirmarVolverAPlatos, setConfirmarVolverAPlatos] = useState(false)
  const [qrSvgPersonalizado, setQrSvgPersonalizado] = useState(null)

  useEffect(() => {
    if (!restaurante) return
    apiClient
      .get(`/restaurantes/${restaurante.id_restaurante}/dashboard`)
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
  }, [restaurante])

  const primerNombre = usuario?.nombre?.split(' ')[0] ?? ''
  const subdominio = stats?.subdominio ?? restaurante?.subdominio
  const enlacePublico = subdominio ? `${window.location.origin}/menu/${subdominio}` : ''
  // El QR lleva ?origen=qr para que el backend distinga escaneos de clics al
  // enlace copiado (ver visita_menu / "Escaneos de QR" arriba).
  const enlaceQr = subdominio ? `${enlacePublico}?origen=qr` : ''

  useEffect(() => {
    if (!enlaceQr) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(enlaceQr, {
      width: 480,
      margin: 1,
      color: { dark: '#0B1C30', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [enlaceQr])

  // El plan Enterprise puede tener un diseño de QR guardado (ver
  // /qr-personalizado): si existe, el dashboard muestra y descarga ESE
  // diseño en vez del QR genérico, para que se vea "cómo está" sin tener
  // que entrar a la otra pantalla. Otros planes nunca llaman este endpoint
  // (el backend lo rechazaría igual) y siguen viendo el QR de siempre.
  useEffect(() => {
    if (!restaurante || stats?.plan !== 'Enterprise' || !enlaceQr) {
      setQrSvgPersonalizado(null)
      return
    }
    let cancelled = false

    apiClient
      .get(`/restaurantes/${restaurante.id_restaurante}/qr-personalizacion`)
      .then(async ({ data }) => {
        if (cancelled) return
        let mask
        let maskSize
        let colorLogo
        let logoImagenUrl
        let lumaLogo
        if (data.logo_url) {
          try {
            const img = await urlToImage(data.logo_url)
            const { mask: m, size, colorPromedio } = imageToMask(img, data.sensibilidad ?? 128)
            mask = m
            maskSize = size
            colorLogo = colorPromedio
            logoImagenUrl = imageToDataUrl(img)
            lumaLogo = imageToLumaMap(img)
          } catch {
            // Si el logo no carga, igual mostramos el diseño con los colores
            // elegidos (sin logo) en vez de dejar el QR en blanco.
          }
        }
        if (cancelled) return
        try {
          const svg = construirSvg({
            texto: enlaceQr,
            modo: data.modo,
            colorPuntos: data.colores?.puntos ?? '#0B1C30',
            colorFondo: data.colores?.fondo ?? '#FFFFFF',
            colorLogo,
            mask,
            maskSize,
            logoImagenUrl,
            logoFraccion: data.ajustes?.logoFraccion,
            radioPunto: data.ajustes?.radioPunto,
            opacidadLogo: data.ajustes?.opacidadLogo,
            prioridadLogo: data.ajustes?.prioridadLogo ?? 0,
            lumaLogo,
          })
          setQrSvgPersonalizado(svg)
        } catch {
          setQrSvgPersonalizado(null)
        }
      })
      .catch(() => {
        if (!cancelled) setQrSvgPersonalizado(null)
      })

    return () => {
      cancelled = true
    }
  }, [restaurante, stats?.plan, enlaceQr])

  const copiarEnlace = () => {
    if (!enlacePublico) return
    navigator.clipboard?.writeText(enlacePublico)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const descargarQr = async () => {
    if (!subdominio) return
    if (qrSvgPersonalizado) {
      try {
        const blob = await rasterizarPng(qrSvgPersonalizado, 2000)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `qr-menu-${subdominio}.png`
        a.click()
        URL.revokeObjectURL(url)
        return
      } catch {
        // si falla el rasterizado del diseño personalizado, cae al QR genérico
      }
    }
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-menu-${subdominio}.png`
    a.click()
  }

  const publicarMenu = async () => {
    if (!restaurante || !stats?.id_menu_principal) return
    setPublishing(true)
    setPublishError('')
    try {
      await apiClient.post(
        `/restaurantes/${restaurante.id_restaurante}/menus/${stats.id_menu_principal}/publicar`,
      )
      setStats((prev) => (prev ? { ...prev, menu_publicado: true } : prev))
    } catch (err) {
      setPublishError(err.response?.data?.error ?? 'No se pudo publicar el menú.')
    } finally {
      setPublishing(false)
    }
  }

  // Deshace "Publicar como menú" del Editor: deja el borrador como un menú
  // de platos normal (sin diseno_html) y lo publica. El diseño no se borra,
  // sigue en "Mis diseños" para volver a publicarlo cuando se quiera.
  const volverAMenuDePlatos = async () => {
    if (!restaurante || !stats?.id_menu_principal) return
    setConfirmarVolverAPlatos(false)
    setPublishing(true)
    setPublishError('')
    const base = `/restaurantes/${restaurante.id_restaurante}/menus/${stats.id_menu_principal}`
    try {
      await apiClient.put(`${base}/borrador`, { contenido: { schema_version: 1, bloques: [], tema: {} } })
      await apiClient.post(`${base}/publicar`)
      setStats((prev) => (prev ? { ...prev, menu_publicado: true, menu_es_diseno: false } : prev))
    } catch (err) {
      setPublishError(err.response?.data?.error ?? 'No se pudo volver al menú de platos.')
    } finally {
      setPublishing(false)
    }
  }

  if (loadingRestaurante) {
    return (
      <DashboardShell>
        <p className="text-sm text-[#8A94A6]">Cargando...</p>
      </DashboardShell>
    )
  }

  if (!restaurante) {
    return (
      <DashboardShell>
        <p className="text-sm text-[#8A94A6]">
          Todavía no tienes un restaurante registrado. Termina el proceso de registro para crear
          uno.
        </p>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="mb-9 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-navy">
            Bienvenido de nuevo{primerNombre ? `, ${primerNombre}` : ''}
          </h1>
          <p className="mt-2 text-[15px] text-[#4A5568]">
            Esto es lo que está pasando con tu menú digital hoy.
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-[#E2E8F0] bg-white py-1.5 pl-1.5 pr-4">
          <div className="h-8 w-8 rounded-full bg-[#C97B5F]" />
          <span className="text-[13.5px] font-bold text-navy">{restaurante.nombre}</span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-[#4A5568]">
              Visitas al Menú (30d)
            </span>
            <EyeIcon />
          </div>
          <div className="mt-2.5 text-[34px] font-extrabold text-navy">
            {stats ? stats.visitas_30d : '—'}
          </div>
        </div>

        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-[#4A5568]">
              Escaneos de QR (30d)
            </span>
            <QrIcon />
          </div>
          <div className="mt-2.5 text-[34px] font-extrabold text-navy">
            {stats ? stats.escaneos_qr_30d : '—'}
          </div>
        </div>

        <div className="rounded-[14px] border border-[#FCA5A5] bg-white p-[22px]">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-[#4A5568]">Platos Agotados Hoy</span>
            <AlertIcon />
          </div>
          <div className="mt-2.5 text-[34px] font-extrabold text-[#DC2626]">
            {stats ? stats.productos_agotados : '—'}
          </div>
          <Link
            to="/products"
            className="mt-1.5 inline-block text-xs font-bold text-orange-dark hover:underline"
          >
            Ver productos →
          </Link>
        </div>

        <div className="rounded-[14px] border border-navy bg-navy p-[22px]">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-[#A9B4C8]">Plan Actual</span>
            <TrophyIcon />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold text-white">
            {stats?.plan ?? 'Sin plan'}
          </div>
          <Link
            to="/subscription"
            className="mt-1.5 inline-block text-xs font-semibold text-[#A9B4C8] hover:text-white"
          >
            {stats?.plan ? 'Gestionar suscripción →' : 'Elegir un plan →'}
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Link
          to="/products"
          className="flex h-[52px] items-center justify-center rounded-[9px] bg-orange text-[13.5px] font-semibold text-white hover:bg-orange-dark"
        >
          + Agregar Producto
        </Link>
        <Link
          to="/editor"
          className="flex h-[52px] items-center justify-center rounded-[9px] border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
        >
          Abrir Editor
        </Link>
        {subdominio ? (
          <Link
            to={`/menu/${subdominio}`}
            className="flex h-[52px] items-center justify-center rounded-[9px] border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
          >
            Ver Menú Público
          </Link>
        ) : (
          <span className="flex h-[52px] cursor-not-allowed items-center justify-center rounded-[9px] border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-[#8A94A6]">
            Ver Menú Público
          </span>
        )}
        <Link
          to="/subscription"
          className="flex h-[52px] items-center justify-center rounded-[9px] border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
        >
          Actualizar Plan
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-navy">Tu subdominio en vivo</h2>
            {stats && (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={
                  stats.menu_publicado
                    ? { background: '#DCFCE7', color: '#16A34A' }
                    : { background: '#FEF3C7', color: '#B45309' }
                }
              >
                {stats.menu_publicado ? 'Publicado' : 'Sin publicar'}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[13.5px] text-[#4A5568]">
            El enlace donde tus clientes ven el menú activo.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-[#EEF3FF] px-4 py-3.5">
            <span className="text-sm font-semibold text-navy">
              {subdominio}
              <span className="text-orange-dark">.kartakamay.app</span>
            </span>
            <button
              type="button"
              onClick={copiarEnlace}
              className="h-[34px] rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-[12.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
            >
              {copied ? '¡Copiado!' : 'Copiar Enlace'}
            </button>
          </div>

          <p className="mt-5 text-[12px] font-bold uppercase tracking-wide text-[#8A94A6]">Comparte tu menú</p>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <a
              href={enlacePublico ? `https://wa.me/?text=${encodeURIComponent(`Mira nuestra carta: ${enlacePublico}`)}` : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!enlacePublico}
              className="flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-navy hover:border-[#25D366] hover:text-[#128C7E] aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              <WhatsAppIcon /> WhatsApp
            </a>
            <a
              href={enlacePublico ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(enlacePublico)}` : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!enlacePublico}
              className="flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-navy hover:border-[#1877F2] hover:text-[#1877F2] aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              <FacebookIcon /> Facebook
            </a>
            <a
              href={enlacePublico || undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!enlacePublico}
              className="flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-navy hover:bg-[#F6F8FC] aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              <ExternalIcon /> Abrir menú
            </a>
          </div>

          {stats?.menu_es_diseno ? (
            <div className="mb-5 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-[#C7D7FE] bg-[#EEF3FF] px-4 py-3 text-[12.5px] leading-relaxed text-navy">
              <div className="flex flex-1 gap-2.5">
                <InfoIcon />
                <p>
                  Tu menú público muestra un <span className="font-bold">diseño del Editor</span>. Los precios de
                  los bloques de plato se actualizan solos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmarVolverAPlatos(true)}
                disabled={publishing}
                className="shrink-0 rounded-[8px] border border-[#C7D7FE] bg-white px-3 py-1.5 text-[12px] font-semibold text-navy hover:bg-[#F6F8FC] disabled:opacity-50"
              >
                Volver a la lista de platos
              </button>
            </div>
          ) : (
            <div className="mb-5 mt-5 flex gap-2.5 rounded-[10px] border border-[#FFE0C2] bg-[#FFF7EF] px-4 py-3 text-[12.5px] leading-relaxed text-[#7A4A1E]">
              <InfoIcon />
              <p>
                ¿Editaste platos, precios o el diseño? Pulsa <span className="font-bold">Publicar cambios</span> para
                que tus clientes vean la última versión. El enlace y tu QR no cambian.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={publicarMenu}
            disabled={publishing || !stats?.id_menu_principal}
            className="mt-auto h-10 w-full rounded-[9px] bg-orange text-[13px] font-semibold text-white hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publishing
              ? 'Publicando...'
              : stats?.menu_publicado
                ? 'Publicar cambios'
                : 'Publicar menú'}
          </button>
          {publishError && <p className="mt-2 text-xs text-[#DC2626]">{publishError}</p>}
          {confirmarVolverAPlatos && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-sm rounded-[14px] bg-white p-6 shadow-xl">
                <h3 className="text-base font-bold text-navy">¿Volver a la lista de platos?</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#4A5568]">
                  Tu menú público volverá a mostrar tus platos por categoría. El diseño no se borra: sigue en
                  Mis diseños y puedes volver a publicarlo cuando quieras.
                </p>
                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmarVolverAPlatos(false)}
                    className="h-10 rounded-[9px] px-4 text-[13px] font-semibold text-[#4A5568] hover:bg-[#F6F8FC]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={volverAMenuDePlatos}
                    className="h-10 rounded-[9px] bg-orange px-4 text-[13px] font-semibold text-white hover:bg-orange-dark"
                  >
                    Sí, volver y publicar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
          <span className="self-start text-sm font-bold text-navy">Código QR Principal</span>
          <div className="my-3.5 flex h-[220px] w-[220px] items-center justify-center overflow-hidden rounded-[10px] bg-navy">
            {qrSvgPersonalizado ? (
              <div
                className="flex h-full w-full items-center justify-center bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvgPersonalizado }}
              />
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="Código QR del menú" className="h-full w-full bg-white object-contain" />
            ) : (
              <QrCodeArt />
            )}
          </div>
          <button
            type="button"
            onClick={descargarQr}
            disabled={!qrDataUrl && !qrSvgPersonalizado}
            className="h-9 w-full rounded-[9px] border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-navy hover:bg-[#F6F8FC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Descargar
          </button>
          {stats?.plan === 'Enterprise' ? (
            <Link
              to="/qr-personalizado"
              className="mt-2 h-9 w-full rounded-[9px] bg-navy text-center text-[12.5px] font-semibold leading-9 text-white hover:bg-navy-hover"
            >
              Personalizar QR
            </Link>
          ) : (
            <div className="mt-2 flex w-full flex-col items-center gap-1.5 rounded-[9px] border border-dashed border-[#E2E8F0] px-3 py-2.5 text-center">
              <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#8A94A6]">
                <LockIcon /> Personalizar QR
              </span>
              <span className="text-[11px] text-[#8A94A6]">Disponible en el plan Empresarial</span>
              <Link to="/subscription" className="text-[11.5px] font-bold text-orange-dark hover:underline">
                Mejorar plan →
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}

export default Dashboard
