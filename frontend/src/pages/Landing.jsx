import { Link } from 'react-router-dom'

function MenuIcon() {
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

const features = [
  {
    icon: <EditorIcon />,
    iconBg: 'bg-sky-500',
    title: 'Editor Interactivo e Intuitivo',
    description:
      'Diseña tu menú fácilmente. Arrastra y suelta elementos, ajusta precios y fotos en tiempo real sin necesidad de saber de diseño.',
    preview: 'from-sky-100 to-sky-50',
  },
  {
    icon: <QrIcon />,
    iconBg: 'bg-orange-500',
    title: 'Generación de QR Automática',
    description:
      'Obtén un código QR único para tu restaurante en segundos. Colócalo en mesas, tarjetas o donde quieras y actualiza tu menú desde la nube.',
    preview: 'from-slate-100 to-slate-50',
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
        <div className="flex items-center gap-2 text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white">
            <MenuIcon />
          </span>
          <span className="font-semibold">Kamay Menu</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-gray-600 md:flex">
          <a href="#caracteristicas" className="hover:text-gray-900">
            Características
          </a>
          <a href="#precios" className="hover:text-gray-900">
            Precios
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Iniciar Sesión
          </Link>
          <Link
            to="/login"
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            Comenzar
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
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
            className="rounded-md bg-orange-500 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            Comenzar Gratis
          </Link>
          <a
            href="#"
            className="flex items-center gap-2 rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <PlayIcon />
            Ver Demo
          </a>
        </div>
      </div>

      <div className="relative">
        <div className="aspect-4/3 rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-100 via-white to-orange-50 p-6 shadow-lg">
          <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div className="rounded-lg bg-gradient-to-br from-orange-100 to-orange-50" />
              <div className="rounded-lg bg-gradient-to-br from-sky-100 to-sky-50" />
              <div className="rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50" />
              <div className="rounded-lg bg-gradient-to-br from-rose-100 to-rose-50" />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-xl border border-gray-200 bg-gradient-to-br from-rose-200 to-orange-100 shadow-md md:h-28 md:w-28" />
      </div>
    </section>
  )
}

function FeatureCard({ feature }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${feature.iconBg}`}
      >
        {feature.icon}
      </span>
      <h3 className="mt-5 text-lg font-semibold text-gray-900">{feature.title}</h3>
      <p className="mt-2 text-sm text-gray-500">{feature.description}</p>
      <div className={`mt-6 h-32 rounded-xl bg-gradient-to-br ${feature.preview}`} />
    </div>
  )
}

function Features() {
  return (
    <section id="caracteristicas" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900">
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

        <div className="mt-6 rounded-2xl bg-gray-900 p-10 text-white">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
            <GlobeIcon />
          </span>
          <h3 className="mt-5 text-lg font-semibold">Subdominios Personalizados</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-300">
            Tu menú tendrá una dirección única (p. ej. tunombre.kamaymenu.com) fácil de compartir
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
      className={`relative flex flex-col rounded-2xl border bg-white p-8 ${
        plan.highlighted
          ? 'border-orange-400 shadow-lg md:-translate-y-3'
          : 'border-gray-200 shadow-sm'
      }`}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
          POPULAR
        </span>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
      <p className="mt-4 text-4xl font-bold text-gray-900">
        {plan.price}
        {plan.period && <span className="text-base font-medium text-gray-400">{plan.period}</span>}
      </p>
      <p className="mt-3 text-sm text-gray-500">{plan.description}</p>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckIcon className={plan.highlighted ? 'text-orange-500' : 'text-gray-400'} />
            {item}
          </li>
        ))}
      </ul>

      <a
        href="#"
        className={`mt-8 rounded-md px-4 py-2.5 text-center text-sm font-medium ${
          plan.highlighted
            ? 'bg-orange-500 text-white shadow-sm hover:bg-orange-600'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {plan.cta}
      </a>
    </div>
  )
}

function Pricing() {
  return (
    <section id="precios" className="py-20">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900">Planes de Precios</h2>
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
    <footer className="bg-gray-950 text-gray-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        <div className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <MenuIcon />
          </span>
          <span className="font-semibold">Kamay Menu</span>
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
      <div className="border-t border-white/10 py-6 text-center text-xs text-gray-500">
        © 2024 Kamay Menu. Todos los derechos reservados.
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
