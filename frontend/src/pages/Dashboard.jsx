import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'
import { useRestaurante } from '../context/RestauranteContext'

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

  const copiarEnlace = () => {
    if (!enlacePublico) return
    navigator.clipboard?.writeText(enlacePublico)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
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
        <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
          <h2 className="text-base font-bold text-navy">Tu subdominio en vivo</h2>
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
        </div>

        <div className="flex flex-col items-center rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
          <span className="self-start text-sm font-bold text-navy">Código QR Principal</span>
          <div className="my-3.5 flex h-[110px] w-[110px] items-center justify-center rounded-[10px] bg-navy">
            <QrCodeArt />
          </div>
          <button
            type="button"
            disabled
            className="h-9 w-full cursor-not-allowed rounded-[9px] border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-[#8A94A6]"
          >
            Descargar
          </button>
        </div>
      </div>
    </DashboardShell>
  )
}

export default Dashboard
