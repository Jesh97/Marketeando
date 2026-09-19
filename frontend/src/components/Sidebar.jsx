import { Link, useLocation } from 'react-router-dom'

function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-[26px] w-[26px] shrink-0">
      <rect x="0" y="0" width="14" height="14" rx="4" fill="#D9A441" />
      <rect x="18" y="0" width="14" height="14" rx="4" fill="#2F8F8A" />
      <rect x="0" y="18" width="14" height="14" rx="4" fill="#fff" />
      <rect x="18" y="18" width="14" height="14" rx="4" fill="#FD761A" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] shrink-0">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function ProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] shrink-0">
      <path d="M3 2v7c0 1 1 2 2 2s2-1 2-2V2M5 11v11M11 2v20M16 2c-2 3-2 6 0 9 1 1 1 2 1 3v8" />
    </svg>
  )
}

function MenuDigitalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] shrink-0">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  )
}

function SubscriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] shrink-0">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] shrink-0">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] shrink-0">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/products', label: 'Gestión de Productos', Icon: ProductsIcon },
  { to: '/editor', label: 'Editor de Diseño', Icon: MenuDigitalIcon },
  { to: '/subscription', label: 'Suscripción', Icon: SubscriptionIcon },
  { to: '/settings', label: 'Configuración', Icon: SettingsIcon },
]

function Sidebar() {
  const location = useLocation()

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-navy p-4">
      <div className="flex items-center gap-2.5 px-2.5 pb-7 pt-2">
        <LogoMark />
        <span className="text-base font-extrabold text-white">Karta Kamay</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ to, label, Icon }) => {
          const active =
            location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`))
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold ${
                active ? 'bg-orange text-white' : 'text-[#A9B4C8] hover:bg-white/5'
              }`}
            >
              <Icon />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
        <a
          href="#"
          className="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-[#A9B4C8] hover:bg-white/5"
        >
          <HelpIcon />
          Ayuda
        </a>
        <Link
          to="/"
          className="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold text-[#A9B4C8] hover:bg-white/5"
        >
          <LogoutIcon />
          Salir
        </Link>
      </div>
    </aside>
  )
}

export default Sidebar
