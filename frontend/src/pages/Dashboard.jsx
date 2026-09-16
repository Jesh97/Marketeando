import { Link } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'

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

const stats = [
  { label: 'Visitas al Menú', value: '2,481', trend: '↑ 12% este mes', icon: EyeIcon },
  { label: 'Escaneos de QR (30d)', value: '1,248', trend: '↑ 8% este mes', icon: QrIcon },
]

function Dashboard() {
  return (
    <DashboardShell>
      <div className="mb-9 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-navy">
            Bienvenido de nuevo, Mariana
          </h1>
          <p className="mt-2 text-[15px] text-[#4A5568]">
            Esto es lo que está pasando con tu menú digital hoy.
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-[#E2E8F0] bg-white py-1.5 pl-1.5 pr-4">
          <div className="h-8 w-8 rounded-full bg-[#C97B5F]" />
          <span className="text-[13.5px] font-bold text-navy">Bistro Andino</span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, trend, icon: Icon }) => (
          <div key={label} className="rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-semibold text-[#4A5568]">{label}</span>
              <Icon />
            </div>
            <div className="mt-2.5 text-[34px] font-extrabold text-navy">{value}</div>
            <div className="mt-1.5 text-xs font-bold text-[#16A34A]">{trend}</div>
          </div>
        ))}

        <div className="rounded-[14px] border border-[#FCA5A5] bg-white p-[22px]">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-[#4A5568]">Platos Agotados Hoy</span>
            <AlertIcon />
          </div>
          <div className="mt-2.5 text-[34px] font-extrabold text-[#DC2626]">3</div>
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
          <div className="mt-2.5 text-2xl font-extrabold text-white">Pro</div>
          <div className="mt-1.5 text-xs font-semibold text-[#A9B4C8]">Renueva el 4 oct 2026</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <button
          type="button"
          className="h-[52px] rounded-[9px] bg-orange text-[13.5px] font-semibold text-white hover:bg-orange-dark"
        >
          + Agregar Producto
        </button>
        <Link
          to="/editor"
          className="flex h-[52px] items-center justify-center rounded-[9px] border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
        >
          Editar Menú
        </Link>
        <Link
          to="/menu/bistro-andino"
          className="flex h-[52px] items-center justify-center rounded-[9px] border border-[#E2E8F0] bg-white text-[13.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
        >
          Ver Menú Público
        </Link>
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
              bistro-andino
              <span className="text-orange-dark">.kartakamay.app</span>
            </span>
            <button
              type="button"
              className="h-[34px] rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-[12.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
            >
              Copiar Enlace
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
            className="h-9 w-full rounded-[9px] border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
          >
            Descargar
          </button>
        </div>
      </div>
    </DashboardShell>
  )
}

export default Dashboard
