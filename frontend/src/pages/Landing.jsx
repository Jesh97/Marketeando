import { Link } from 'react-router-dom'
import cevicheHero from '../assets/ceviche-hero.jpg'
import editorTablet from '../assets/editor-tablet.jpg'
import logoMark from '../assets/logo-mark.png'
import qrStone from '../assets/qr-stone.jpg'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M7 5.5v13l11-6.5-11-6.5z" />
    </svg>
  )
}

function CheckIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 shrink-0 ${className}`}>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
      <path
        d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 14h3v3h-3zM19 14h2v2M14 19h2v2M19 19h2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function EditorPreview() {
  return (
    <div className="h-40 overflow-hidden">
      <img
        src={editorTablet}
        alt="Editor de menús Karta Kamay en una tablet"
        className="h-full w-full object-cover"
      />
    </div>
  )
}

function QrPreview() {
  return (
    <div className="h-40 overflow-hidden">
      <img
        src={qrStone}
        alt="QR grabado en piedra sobre una mesa de restaurante"
        className="h-full w-full object-cover"
      />
    </div>
  )
}

const features = [
  {
    icon: <EditorIcon />,
    iconBg: 'bg-teal-600',
    title: 'Editor Interactivo e Intuitivo',
    description:
      'Diseña tu menú fácilmente. Arrastra y suelta elementos, ajusta precios y fotos en tiempo real sin necesidad de saber de diseño.',
    preview: <EditorPreview />,
  },
  {
    icon: <QrIcon />,
    iconBg: 'bg-orange',
    title: 'Generación de QR Automática',
    description:
      'Obtén un código QR único para tu restaurante en segundos. Colócalo en mesas, tarjetas o donde quieras y actualiza tu menú desde la nube.',
    preview: <QrPreview />,
  },
]

const plans = [
  {
    name: 'Básico',
    price: 'Gratis',
    description: 'Perfecto para empezar y probar la plataforma.',
    features: ['1 Menú Digital', 'Generación de QR Básica', 'Personalización Limitada'],
    cta: 'Registrarse',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mes',
    description: 'Para restaurantes que quieren personalización avanzada y control total.',
    features: [
      'Menús ilimitados',
      'QR Personalizado',
      'Subdominio personalizado',
      'Soporte prioritario 24/7',
    ],
    cta: 'Elegir Plan',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$49',
    period: '/mes',
    description: 'Soluciones avanzadas para cadenas y franquicias.',
    features: ['Múltiples locales', 'Soporte prioritario 24/7', 'Analíticas avanzadas'],
    cta: 'Registrarse',
    highlighted: false,
  },
]

function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-navy">
          <img src={logoMark} alt="" className="h-8 w-8" />
          <span className="font-semibold">Karta Kamay</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-gray-600 md:flex">
          <a href="#caracteristicas" className="hover:text-navy">
            Características
          </a>
          <a href="#precios" className="hover:text-navy">
            Precios
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-navy">
            Iniciar Sesión
          </Link>
          <Link
            to="/login"
            className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-dark"
          >
            Comenzar
          </Link>
        </div>
      </div>
    </header>
  )
}

// Mockup del menú digital dentro de un marco tipo tablet, con una tarjeta
// flotante de "mesa activa" — reemplaza el placeholder abstracto de bloques
// de color por algo que se lee de un vistazo como el producto real.
function HeroMockup() {
  return (
    <div className="relative mx-auto max-w-sm pb-10">
      <div className="rounded-[2.25rem] border-[6px] border-navy bg-navy p-2 shadow-2xl">
        <div className="overflow-hidden rounded-[1.75rem] bg-white">
          <div className="flex items-center justify-between bg-sky-50 px-4 py-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Cevichería Cusco
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Mesa 04
            </span>
          </div>

          <div className="relative h-40 overflow-hidden">
            <img src={cevicheHero} alt="Ceviche Clásico Andino" className="h-full w-full object-cover" />
            <span className="absolute bottom-3 left-3 rounded-md bg-orange-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
              Especialidad
            </span>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900">Ceviche Clásico Andino</p>
                <p className="mt-0.5 text-xs text-gray-500">Pesca del día, leche de tigre al ají amarillo.</p>
              </div>
              <p className="shrink-0 text-lg font-bold text-orange-600">S/ 48</p>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Estado en Carta
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                  Disponible
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Tiradito Nikkei
                </span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-600">
                  Agotado
                </span>
              </div>
            </div>

            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-[#7A2E12] px-3 py-2 text-xs font-semibold text-white"
            >
              Filtrar Alérgenos
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 -left-6 flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-xl">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy">
          <QrIcon />
        </span>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">Mesa activa</p>
          <p className="text-[13px] font-bold text-orange-600">QR Ultra Rápido</p>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-16 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-light px-3 py-1 text-xs font-semibold text-orange-dark">
            Editor visual · QR automático · Subdominio propio
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-navy md:text-5xl">
            Tus menús, ahora digitales y personalizados
          </h1>
          <p className="mt-5 max-w-lg text-gray-500">
            Crea, edita y publica tu menú interactivo en minutos. Atrae más clientes con un diseño
            moderno y sencillo de administrar desde tu smartphone o cualquier dispositivo, sin
            complicaciones técnicas.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/login"
              className="rounded-md bg-orange px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-orange-dark"
            >
              Comenzar Gratis
            </Link>
            <a
              href="/demo/bistro-andino.html"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white/70 px-6 py-3 text-sm font-medium text-gray-700 hover:border-navy/20 hover:bg-white"
            >
              <PlayIcon />
              Ver Demo
            </a>
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  )
}

function FeatureCard({ feature }) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-light hover:shadow-lg">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${feature.iconBg}`}
      >
        {feature.icon}
      </span>
      <h3 className="mt-5 text-lg font-semibold text-navy">{feature.title}</h3>
      <p className="mt-2 text-sm text-gray-500">{feature.description}</p>
      <div className="mt-6 overflow-hidden rounded-xl transition group-hover:scale-[1.02]">
        {feature.preview}
      </div>
    </div>
  )
}

function Features() {
  return (
    <section id="caracteristicas" className="bg-gradient-to-b from-orange-50/70 via-white to-white py-20">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl font-bold text-navy">
          Todo lo que necesitas para tu restaurante
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-500">
          Herramientas poderosas y fáciles de usar para ofrecer la mejor experiencia a tus
          clientes.
        </p>

        <div className="mt-12 grid gap-6 text-left md:grid-cols-2">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>

        <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-hover p-10 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <span className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
            <GlobeIcon />
          </span>
          <h3 className="relative mt-5 text-lg font-semibold">Subdominios Personalizados</h3>
          <p className="relative mx-auto mt-2 max-w-lg text-sm text-gray-300">
            Tu menú tendrá una dirección única (p. ej. tunombre.kartakamay.app) fácil de compartir
            con tus clientes. Sin necesidad de crear una app ni pagar hosting aparte.
          </p>
        </div>
      </div>
    </section>
  )
}

function PricingCard({ plan }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-8 transition hover:-translate-y-1 ${
        plan.highlighted
          ? 'border-orange shadow-xl md:-translate-y-3'
          : 'border-gray-200 shadow-sm hover:shadow-md'
      }`}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange px-3 py-1 text-xs font-semibold text-white">
          POPULAR
        </span>
      )}
      <h3 className="text-lg font-semibold text-navy">{plan.name}</h3>
      <p className="mt-4 text-4xl font-bold text-navy">
        {plan.price}
        {plan.period && <span className="text-base font-medium text-gray-400">{plan.period}</span>}
      </p>
      <p className="mt-3 text-sm text-gray-500">{plan.description}</p>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckIcon className={plan.highlighted ? 'text-orange' : 'text-gray-400'} />
            {item}
          </li>
        ))}
      </ul>

      <Link
        to="/login"
        className={`mt-8 rounded-md px-4 py-2.5 text-center text-sm font-medium ${
          plan.highlighted
            ? 'bg-orange text-white shadow-sm hover:bg-orange-dark'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  )
}

function Pricing() {
  return (
    <section id="precios" className="bg-gradient-to-b from-white via-orange-50/40 to-white py-20">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl font-bold text-navy">Planes de Precios</h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-500">
          Elige el plan que se adapte a las necesidades de tu restaurante.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-navy text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        <div className="flex items-center gap-2 text-white">
          <img src={logoMark} alt="" className="h-8 w-8" />
          <span className="font-semibold">Karta Kamay</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6 text-sm">
          <a href="#" className="hover:text-white">
            Funcionalidades
          </a>
          <a href="#" className="hover:text-white">
            Términos de servicio
          </a>
          <a href="#" className="hover:text-white">
            Privacidad
          </a>
          <a href="#" className="hover:text-white">
            Contáctanos
          </a>
        </nav>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © 2026 Karta Kamay. Todos los derechos reservados.
      </div>
    </footer>
  )
}

function Landing() {
  return (
    <div className="min-h-svh bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </div>
  )
}

export default Landing
