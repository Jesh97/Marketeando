import { useState } from 'react'

function MenuLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M6 3v18M6 3c-1.7 0-3 1.5-3 3.4V12c0 1 .8 1.8 1.8 1.8H6M6 3v18M18 3v18M18 3c1.7 0 3 1.3 3 3v13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDown({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MobileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 19h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function DesktopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <rect x="2" y="4" width="20" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function QrDownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="15" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="15" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 15h2.5v2.5M20.5 15v2M15 20.5h2.5M20 20.5h.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-400">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2M4 4v5h5M20 20v-5h-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LightbulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-orange-500">
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9v.2h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StarIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7L6 21l1.6-7-5.4-4.7 7.1-.7L12 2z" />
    </svg>
  )
}

const blockGroups = [
  {
    title: 'Estructura de Menú',
    items: [
      {
        title: 'Categoría',
        description: 'Separador de encabezado',
        color: 'bg-orange-100 text-orange-600',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Plato / Producto',
        description: 'Tarjeta con foto, precio y notas',
        color: 'bg-sky-100 text-sky-600',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M6 3v8a3 3 0 0 0 6 0V3M9 11v10M18 3c-2 1-2 4-2 6 0 1.5 1 2 2 2s2-.5 2-2c0-2 0-5-2-6zM18 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Plato Insignia (Hero)',
        description: 'Foto más grande y destacada',
        color: 'bg-purple-100 text-purple-600',
        icon: <StarIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Promociones & Contenido',
    items: [
      {
        title: 'Banner de Cabecera',
        description: 'Foto ambientada del local',
        color: 'bg-emerald-100 text-emerald-600',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 16l5-4 4 3 4-5 5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Banner Promoción',
        description: '2x1, combo, happy hour',
        color: 'bg-rose-100 text-rose-600',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M12 3l1.8 1.8L17 4l.4 3.1L20.5 8l-1.5 2.8L20.5 14 17.4 14.5 17 18l-3.2-.8L12 19l-1.8-1.8L7 18l-.4-3.1L3.5 14l1.5-2.8L3.5 8l3.1-.9L7 4l3.2.8L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Contacto & Horario',
        description: 'Redes, WhatsApp, dirección',
        color: 'bg-amber-100 text-amber-600',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C10.5 21 3 13.5 3 6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-orange-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? 'left-4' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function LeftSidebar() {
  const [tab, setTab] = useState('bloques')

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex border-b border-gray-200 px-2 pt-2">
        <button
          type="button"
          onClick={() => setTab('bloques')}
          className={`flex-1 rounded-t-md px-3 py-2 text-sm font-medium ${
            tab === 'bloques' ? 'border-b-2 border-orange-500 text-gray-900' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Bloques de Menú
        </button>
        <button
          type="button"
          onClick={() => setTab('estructura')}
          className={`flex-1 rounded-t-md px-3 py-2 text-sm font-medium ${
            tab === 'estructura' ? 'border-b-2 border-orange-500 text-gray-900' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Estructura
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar componentes..."
            className="w-full text-sm text-gray-600 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        {blockGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {group.title}
            </p>
            <div className="space-y-2">
              {group.items.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-2.5 text-left hover:border-orange-300 hover:bg-orange-50/40"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${item.color}`}>
                    {item.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-gray-800">{item.title}</span>
                    <span className="block text-xs text-gray-400">{item.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="m-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
          <LightbulbIcon />
          Consejo
        </div>
        <p className="mt-1 text-xs text-orange-700/80">
          Arrastra cualquier bloque a la vista previa o selecciona uno desde la barra lateral.
        </p>
      </div>
    </aside>
  )
}

function TopBar() {
  const [view, setView] = useState('mobile')

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white">
            <MenuLogo />
          </span>
          <span className="text-sm font-semibold">KamayMenu</span>
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <button type="button" className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">
          Menú Principal
          <ChevronDown />
        </button>
        <button type="button" className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">
          Bistro Andino
          <ChevronDown />
        </button>
        <div className="flex items-center gap-1 text-gray-400">
          <button type="button" className="rounded p-1.5 hover:bg-gray-100 hover:text-gray-600">
            <UndoIcon />
          </button>
          <button type="button" className="rounded p-1.5 hover:bg-gray-100 hover:text-gray-600">
            <RedoIcon />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-gray-200 p-0.5 text-gray-500">
          <button
            type="button"
            onClick={() => setView('mobile')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
              view === 'mobile' ? 'bg-gray-900 text-white' : 'hover:text-gray-700'
            }`}
          >
            <MobileIcon />
            Móvil
          </button>
          <button
            type="button"
            onClick={() => setView('desktop')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
              view === 'desktop' ? 'bg-gray-900 text-white' : 'hover:text-gray-700'
            }`}
          >
            <DesktopIcon />
            Escritorio
          </button>
        </div>

        <button type="button" className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          <QrDownloadIcon />
          Descargar QR
        </button>
        <button type="button" className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          <EyeIcon />
          Vista Previa
        </button>
        <button type="button" className="rounded-md bg-orange-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600">
          Publicar Menú
        </button>
      </div>
    </header>
  )
}

const dishes = [
  {
    name: 'Ceviche de Trucha Andina',
    description: 'Leche de tigre al ají mochero y camchita.',
    price: 'S/ 45.00',
    status: 'Disponible',
    statusColor: 'text-emerald-600',
  },
  {
    name: 'Causa Limeña de Cangrejo',
    description: 'Papa amarilla sazonada con culantro.',
    price: 'S/ 42.00',
    status: 'Disponible',
    statusColor: 'text-emerald-600',
  },
  {
    name: 'Parrillada al Mercado',
    description: 'Curación de chimichurri con reducción de aguaymanto.',
    price: 'S/ 52.00',
    status: 'Agotado',
    statusColor: 'text-gray-400',
    badge: 'Agotado',
    note: 'No disponible hoy',
  },
]

function PhonePreview() {
  return (
    <div className="mx-auto w-[300px] overflow-hidden rounded-[2.5rem] border-[10px] border-gray-950 bg-gray-950 shadow-2xl">
      <div className="relative flex h-[560px] flex-col overflow-y-auto bg-white text-left">
        <div className="relative h-36 shrink-0 bg-gradient-to-br from-amber-800 via-stone-700 to-stone-900">
          <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Abierto
          </span>
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white">
            <StarIcon className="h-3 w-3 text-amber-400" />
            4.8
          </span>
          <div className="absolute bottom-2 left-3 text-white">
            <p className="text-lg font-bold leading-none">Bistro Andino</p>
            <p className="text-[11px] text-white/80">Cocina Nikkei & Sabores Tradicionales</p>
          </div>
        </div>

        <div className="flex shrink-0 gap-4 bg-gray-900 px-3 py-2 text-[11px] font-medium text-gray-300">
          <span className="rounded-full bg-orange-500 px-2.5 py-1 text-white">Destacados</span>
          <span className="px-1 py-1">Entradas</span>
          <span className="px-1 py-1">Fondos</span>
          <span className="px-1 py-1">Bebidas</span>
        </div>

        <div className="space-y-4 p-3">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <span className="absolute left-2 top-2 z-10 rounded bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              Especialidad
            </span>
            <div className="h-24 bg-gradient-to-br from-orange-200 via-amber-100 to-stone-200" />
            <div className="p-2.5">
              <p className="text-sm font-semibold text-gray-900">Lomo Saltado al Wok Nikkei</p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Lomo fino saltado al fuego vivo con camote frito, ají y fondo shoyu sobre papas nativas.
              </p>
              <p className="mt-1 text-sm font-bold text-gray-900">S/ 64.00</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Entradas & Clásicos</p>
              <span className="text-[10px] text-gray-400">3 items</span>
            </div>
            <div className="space-y-2">
              {dishes.map((dish) => (
                <div key={dish.name} className="flex gap-2.5 rounded-lg border border-gray-100 p-2">
                  <div className="h-12 w-12 shrink-0 rounded-md bg-gradient-to-br from-stone-200 to-stone-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-gray-900">{dish.name}</p>
                      {dish.badge && (
                        <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-600">
                          {dish.badge}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-gray-400">{dish.description}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{dish.price}</span>
                      <span className={`text-[10px] font-medium ${dish.statusColor}`}>
                        {dish.note ?? dish.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-orange-500 p-3 text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg">
              🍹
            </span>
            <div>
              <p className="text-xs font-bold uppercase">Happy Hour Andino</p>
              <p className="text-[11px] leading-tight">2x1 en Pisco Sour & Chicharrones</p>
              <p className="text-[10px] text-white/80">Lunes a Viernes de 17:00 a 20:00hs</p>
            </div>
          </div>
        </div>

        <p className="pb-4 text-center text-[10px] text-gray-300">Se sirvió con Kamay Menu</p>
      </div>
    </div>
  )
}

function CanvasArea() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex h-10 shrink-0 items-center justify-center gap-3 border-b border-gray-200 bg-white text-xs text-gray-500">
        <button type="button" className="h-5 w-5 rounded hover:bg-gray-100">
          −
        </button>
        <span>100%</span>
        <button type="button" className="h-5 w-5 rounded hover:bg-gray-100">
          +
        </button>
        <span className="ml-4 text-gray-300">|</span>
        <span className="ml-2">Diseño en Tiempo real</span>
      </div>
      <div className="flex-1 overflow-y-auto p-10">
        <PhonePreview />
      </div>
    </main>
  )
}

const accentColors = [
  { hex: '#F97316', class: 'bg-orange-500', selected: true },
  { hex: '#0F172A', class: 'bg-slate-900' },
  { hex: '#10B981', class: 'bg-emerald-500' },
  { hex: '#8B5CF6', class: 'bg-violet-500' },
]

function RightSidebar() {
  const [accent, setAccent] = useState('#F97316')
  const [theme, setTheme] = useState('oscuro')
  const [showPrices, setShowPrices] = useState(true)
  const [showPhotos, setShowPhotos] = useState(true)
  const [showAllergens, setShowAllergens] = useState(true)

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Propiedades del Menú</h2>
        <button type="button" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <RefreshIcon />
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-gray-500">Tipografía</label>
          <button
            type="button"
            className="mt-1.5 flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            Inter (Limpia & Seria)
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Color de Acento</label>
          <div className="mt-2 flex items-center gap-2">
            {accentColors.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => setAccent(color.hex)}
                className={`flex h-7 w-7 items-center justify-center rounded-full ${color.class} ${
                  accent === color.hex ? 'ring-2 ring-offset-2 ring-gray-300' : ''
                }`}
              >
                {accent === color.hex && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-white">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
            <span className="ml-1 text-xs font-medium text-gray-400">{accent}</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Tema de Fondo</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {[
              { id: 'claro', label: 'Claro' },
              { id: 'calido', label: 'Cálido' },
              { id: 'oscuro', label: 'Oscuro' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                  theme === option.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500">Radio de Bordes</label>
            <span className="text-xs text-gray-400">8px</span>
          </div>
          <input type="range" defaultValue={40} className="mt-2 w-full accent-orange-500" />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>Compacto</span>
            <span>Redondeado</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Opciones de Despliegue
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-800">Mostrar Precios</p>
                <p className="text-xs text-gray-400">Desactívalo para menús de degustación</p>
              </div>
              <Toggle checked={showPrices} onChange={setShowPrices} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-800">Fotografías de Platos</p>
                <p className="text-xs text-gray-400">Miniaturas visuales por ítem</p>
              </div>
              <Toggle checked={showPhotos} onChange={setShowPhotos} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-800">Filtro de Alérgenos</p>
                <p className="text-xs text-gray-400">Gluten-free, vegano, mariscos</p>
              </div>
              <Toggle checked={showAllergens} onChange={setShowAllergens} />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <label className="text-xs font-medium text-gray-500">Banner de Portada</label>
          <div className="mt-1.5 flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
            <span className="truncate text-gray-600">portadaandino.jpg</span>
            <button type="button" className="shrink-0 text-xs font-medium text-orange-600 hover:text-orange-700">
              Cambiar
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Editor() {
  return (
    <div className="flex h-svh flex-col bg-gray-50">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <CanvasArea />
        <RightSidebar />
      </div>
    </div>
  )
}

export default Editor
