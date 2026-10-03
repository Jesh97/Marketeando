import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import escaneandoCodigo from '../assets/escaneando_codigo.png'
import restauranteLobby from '../assets/restaurante_lobby.png'
import logoMark from '../assets/logo-mark.png'

function scrollTo(e) {
  const href = e.currentTarget.getAttribute('href')
  if (href?.startsWith('#') && href.length > 1) {
    e.preventDefault()
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 pointer-events-none py-4">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 flex items-center justify-between pointer-events-auto">
        <div className="w-full flex items-center justify-between py-2.5 px-5 sm:px-8 rounded-full bg-cream-base/85 backdrop-blur-md border border-border-warm shadow-[0_8px_30px_rgba(74,36,32,0.08)]">
          <a className="flex items-center gap-2.5 group" href="#" onClick={scrollTo}>
            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm flex-shrink-0">
              <img src={logoMark} alt="Karta Kamay" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-[19px] text-brown-deep tracking-tight leading-none">Karta Kamay</span>
              <span className="text-[10px] uppercase tracking-wider text-brown-body/80 font-semibold mt-0.5">QR Permanente</span>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-brown-deep hover:text-orange-action font-medium text-[15px] transition-colors" href="#beneficios" onClick={scrollTo}>Beneficios</a>
            <a className="text-brown-deep hover:text-orange-action font-medium text-[15px] transition-colors" href="#como-funciona" onClick={scrollTo}>Cómo funciona</a>
            <a className="text-brown-deep hover:text-orange-action font-medium text-[15px] transition-colors" href="#planes" onClick={scrollTo}>Planes</a>
            <a className="text-brown-deep hover:text-orange-action font-medium text-[15px] transition-colors" href="#contacto" onClick={scrollTo}>Contacto</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link className="hidden sm:inline-block text-brown-deep hover:text-orange-action font-medium text-[15px] transition-colors" to="/login">
              Iniciar sesión
            </Link>
            <Link
              className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-orange-action hover:bg-terracotta-hover text-white font-bold text-[14px] shadow-[0_4px_14px_rgba(232,112,42,0.25)] transition-all hover:-translate-y-0.5"
              to="/login"
            >
              Prueba gratis
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative w-full min-h-[95vh] flex items-center justify-center pt-32 pb-24 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          alt="Comensal escaneando un código QR con smartphone en restaurante"
          className="w-full h-full object-cover object-center scale-105"
          src={escaneandoCodigo}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(42,21,18,0.25)] via-[rgba(42,21,18,0.65)] to-[rgba(42,21,18,0.85)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-cream-base to-transparent" />
      </div>
      <div className="relative z-10 max-w-[1100px] w-full mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
        <h1 className="text-4xl sm:text-6xl lg:text-[76px] text-cream-base font-medium leading-[1.08] tracking-tight max-w-4xl mx-auto drop-shadow-md">
          Tu carta cambia.<br />
          Tu QR, <span className="italic font-light underline decoration-peach-underline decoration-4 underline-offset-8">nunca</span>.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-cream-strong max-w-2xl mx-auto font-normal leading-relaxed drop-shadow">
          Actualiza precios, agrega especialidades del día y oculta platos agotados desde tu celular en 10 segundos. Sin reimpresiones.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <Link
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-orange-action hover:bg-terracotta-hover text-white font-bold text-[16px] shadow-[0_8px_20px_rgba(232,112,42,0.35)] transition-all hover:-translate-y-0.5"
            to="/login"
          >
            <span>Prueba gratis 14 días</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <a
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-cream-base/90 hover:bg-cream-base text-brown-deep font-semibold text-[15px] shadow-sm transition-all"
            href="#como-funciona"
            onClick={scrollTo}
          >
            <span className="material-symbols-outlined text-orange-action text-[22px]">play_circle</span>
            <span>Ver carta de muestra</span>
          </a>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-2xl w-full">
          <div className="px-5 py-2.5 rounded-full bg-cream-base border border-border-warm/70 shadow-sm flex items-center gap-2 text-brown-deep">
            <span className="material-symbols-outlined text-orange-action text-[19px]">bolt</span>
            <span className="text-sm font-semibold">Instantáneo</span>
            <span className="text-xs text-brown-body/80 font-normal">· Sincronizado al toque</span>
          </div>
          <div className="px-5 py-2.5 rounded-full bg-cream-base border border-border-warm/70 shadow-sm flex items-center gap-2 text-brown-deep">
            <span className="material-symbols-outlined text-orange-action text-[19px]">payments</span>
            <span className="text-sm font-semibold">0 reimpresiones</span>
            <span className="text-xs text-brown-body/80 font-normal">· Acrílicos eternos</span>
          </div>
          <div className="px-5 py-2.5 rounded-full bg-cream-base border border-border-warm/70 shadow-sm flex items-center gap-2 text-brown-deep">
            <span className="material-symbols-outlined text-orange-action text-[19px]">phone_android</span>
            <span className="text-sm font-semibold">100% móvil</span>
            <span className="text-xs text-brown-body/80 font-normal">· Cero apps que bajar</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Benefits() {
  return (
    <section className="w-full py-24 bg-cream-base" id="beneficios">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12">
          <div className="max-w-xl">
            <span className="text-xs uppercase font-semibold text-orange-action tracking-wider block mb-2">
              Flexibilidad Total en Cocina y Salón
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl text-brown-deep font-medium">
              Hecho para restaurantes que no se detienen.
            </h2>
          </div>
          <p className="text-brown-body max-w-md text-[16.5px]">
            El costo de los insumos y la disponibilidad del mercado cambian cada semana. Tu carta digital debe ser tan ágil como tu cocina.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Reveal delay={0}>
            <div className="flex flex-col justify-between p-8 rounded-[24px] bg-card-beige border border-border-warm shadow-sm min-h-[360px] hover:-translate-y-1 transition-transform">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base text-brown-deep font-bold tracking-widest">(01)</span>
                  <div className="w-11 h-11 rounded-full bg-cream-base/80 flex items-center justify-center text-brown-deep shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">sync_saved_locally</span>
                  </div>
                </div>
                <h3 className="mt-8 text-2xl text-brown-deep font-medium">Actualiza en segundos</h3>
                <p className="mt-3 text-brown-body text-[16px]">
                  Cambia platos, precios y disponibilidad en tiempo real sin llamar al diseñador gráfico ni esperar días por reimpresiones caras.
                </p>
              </div>
              <div className="pt-6">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cream-base text-brown-deep text-xs font-semibold">
                  <span className="material-symbols-outlined text-orange-action text-[16px]">check_circle</span>
                  Edición táctil desde el celular
                </span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-col justify-between p-8 rounded-[24px] bg-card-teal border border-border-warm shadow-sm min-h-[360px] hover:-translate-y-1 transition-transform">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base text-brown-deep font-bold tracking-widest">(02)</span>
                  <div className="w-11 h-11 rounded-full bg-cream-base/80 flex items-center justify-center text-brown-deep shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
                  </div>
                </div>
                <h3 className="mt-8 text-2xl text-brown-deep font-medium">Un QR permanente, sin reimprimir</h3>
                <p className="mt-3 text-brown-body text-[16px]">
                  Tus códigos grabados en madera, acrílico, barra o adhesivos sirven para siempre. Cambia de menú cuántas veces quieras sin mover un solo QR.
                </p>
              </div>
              <div className="pt-6">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cream-base text-brown-deep text-xs font-semibold">
                  <span className="material-symbols-outlined text-orange-action text-[16px]">all_inclusive</span>
                  Enlace inteligente que nunca caduca
                </span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <div className="flex flex-col justify-between p-8 rounded-[24px] bg-card-salmon border border-border-warm shadow-sm min-h-[360px] hover:-translate-y-1 transition-transform">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base text-brown-deep font-bold tracking-widest">(03)</span>
                  <div className="w-11 h-11 rounded-full bg-cream-base/80 flex items-center justify-center text-brown-deep shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">palette</span>
                  </div>
                </div>
                <h3 className="mt-8 text-2xl text-brown-deep font-medium">Tu marca, tu carta</h3>
                <p className="mt-3 text-brown-body text-[16px]">
                  Personaliza con tu logotipo, los colores de tu identidad gastronómica, fotos en alta resolución y tu propio subdominio oficial.
                </p>
              </div>
              <div className="pt-6">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cream-base text-brown-deep text-xs font-semibold">
                  <span className="material-symbols-outlined text-orange-action text-[16px]">verified</span>
                  tunombre.kartakamay.app
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className="w-full py-24 bg-cream-strong border-y border-border-warm/60">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-semibold text-orange-action tracking-wider block mb-2">Herramientas Potentes</span>
          <h2 className="text-3xl sm:text-4xl text-brown-deep font-medium">
            Todo lo que necesitas para tu restaurante
          </h2>
          <p className="mt-3 text-brown-body text-[16.5px]">
            Herramientas poderosas y fáciles de usar para ofrecer la mejor experiencia a tus clientes.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Reveal delay={0}>
            <div className="bg-cream-base rounded-[24px] p-8 sm:p-10 border border-border-warm flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-card-teal flex items-center justify-center text-brown-deep mb-6">
                  <span className="material-symbols-outlined text-[26px]">edit_note</span>
                </div>
                <h3 className="text-2xl text-brown-deep font-medium mb-3">Editor Interactivo e Intuitivo</h3>
                <p className="text-brown-body text-[16px] leading-relaxed mb-6">
                  Diseña tu menú fácilmente. Arrastra y suelta elementos, ajusta precios y fotos en tiempo real sin necesidad de saber de diseño.
                </p>
              </div>
              <div className="w-full bg-cream-light rounded-2xl p-4 border border-border-warm/80 shadow-inner">
                <div className="flex items-center justify-between pb-3 border-b border-border-warm/50 text-xs font-semibold text-brown-deep">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-action" />
                    <span>Panel de Carta Activa</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-card-teal font-medium text-brown-deep">En Vivo</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-cream-strong/70 border border-border-warm/40">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-brown-body/50 text-[18px]">drag_indicator</span>
                      <div className="w-9 h-9 rounded-lg bg-card-beige flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] text-orange-action">restaurant</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-brown-deep leading-tight">Lomo Saltado al Wok</p>
                        <span className="text-[10px] text-brown-body">Plato fuerte</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-orange-action">S/ 46.00</span>
                      <span className="px-2 py-0.5 rounded-full bg-card-teal text-[10px] font-semibold text-brown-deep">Activo</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-cream-base border border-border-warm/40">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-brown-body/50 text-[18px]">drag_indicator</span>
                      <div className="w-9 h-9 rounded-lg bg-card-salmon flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] text-brown-deep">local_bar</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-brown-deep leading-tight">Chicha Morada Jarra</p>
                        <span className="text-[10px] text-brown-body">Bebida tradicional</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-orange-action">S/ 18.00</span>
                      <span className="px-2 py-0.5 rounded-full bg-card-salmon text-[10px] font-semibold text-brown-deep">Agotado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="bg-cream-base rounded-[24px] p-8 sm:p-10 border border-border-warm flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-card-beige flex items-center justify-center text-brown-deep mb-6">
                  <span className="material-symbols-outlined text-[26px]">qr_code_2</span>
                </div>
                <h3 className="text-2xl text-brown-deep font-medium mb-3">Generación de QR Automática</h3>
                <p className="text-brown-body text-[16px] leading-relaxed mb-6">
                  Obtén un código QR único para tu restaurante en segundos. Colócalo en peanas de madera o acrílicos y actualiza tu menú desde la nube.
                </p>
              </div>
              <div className="w-full bg-cream-light rounded-2xl p-5 border border-border-warm/80 flex items-center justify-center gap-6 shadow-inner">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-cream-base border-2 border-dashed border-brown-deep/30 p-2 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-brown-deep text-[70px] sm:text-[80px]">qr_code_2</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card-beige text-brown-deep text-xs font-semibold">
                    <span className="material-symbols-outlined text-orange-action text-[15px]">print</span>
                    Formato Vectorial (PDF)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card-teal text-brown-deep text-xs font-semibold">
                    <span className="material-symbols-outlined text-orange-action text-[15px]">table_restaurant</span>
                    Soporte de mesa 10x15cm
                  </span>
                  <p className="text-[11px] text-brown-body/80 mt-1">Listo para acrílico, grabado láser o adhesivo impermeable.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Subdomain() {
  return (
    <section className="w-full py-20 bg-navy-dark text-white">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
        <Reveal className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-5 text-cream-base">
            <span className="material-symbols-outlined text-[26px]">language</span>
          </div>
          <h2 className="text-3xl sm:text-4xl text-cream-base font-medium">Subdominios Personalizados</h2>
          <p className="mt-4 text-cream-strong/90 max-w-xl text-[17px] leading-relaxed">
            Tu menú tendrá una dirección única fácil de compartir con tus clientes. Sin crear una app ni pagar hosting aparte.
          </p>
          <div className="mt-8 px-6 sm:px-10 py-4 sm:py-5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-3 shadow-2xl">
            <span className="material-symbols-outlined text-orange-action text-[26px]">public</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-cream-base">
              tunombre<span className="text-orange-action">.kartakamay.app</span>
            </span>
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-orange-action text-white text-xs font-bold uppercase ml-2">
              Oficial
            </span>
          </div>
          <p className="mt-4 text-xs text-cream-strong/60">Disponible de inmediato en todos los planes Pro y Enterprise.</p>
        </Reveal>
      </div>
    </section>
  )
}

function WhyUs() {
  return (
    <section className="w-full py-24 bg-cream-base">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase font-semibold text-orange-action tracking-wider block mb-2">
            Rentabilidad y Experiencia Comensal
          </span>
          <h2 className="text-3xl sm:text-4xl text-brown-deep font-medium">
            Diseñado para el ritmo del salón peruano.
          </h2>
          <p className="mt-3 text-brown-body text-[16.5px]">
            La tecnología debe aliviar el trabajo en hora punta, no complicarlo. Mira por qué restaurantes en Chiclayo ya cambiaron.
          </p>
        </Reveal>
        <Reveal>
          <div className="relative w-full rounded-[32px] overflow-hidden min-h-[580px] flex items-center p-6 sm:p-12 shadow-xl border border-border-warm">
            <img
              alt="Restaurante acogedor con comensales disfrutando comida peruana"
              className="absolute inset-0 w-full h-full object-cover object-center"
              src={restauranteLobby}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(42,21,18,0.85)] via-[rgba(42,21,18,0.55)] to-transparent" />
            <div className="relative z-10 w-full max-w-md flex flex-col gap-4">
              <Reveal delay={0}>
                <div className="p-6 rounded-[24px] bg-cream-base/95 border border-border-warm shadow-lg hover:-translate-x-1 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-action/15 text-orange-action flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">savings</span>
                    </div>
                    <div>
                      <h4 className="text-lg text-brown-deep font-medium">Ahorras dinero</h4>
                      <p className="text-xs text-orange-action font-semibold">0 gastos recurrentes de imprenta</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-brown-body">
                    Elimina los presupuestos mensuales de plastificado, reimpresiones por cambio de tarifa y cartas desgastadas.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={140}>
                <div className="p-6 rounded-[24px] bg-cream-base/95 border border-border-warm shadow-lg sm:translate-x-5 hover:translate-x-4 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-action/15 text-orange-action flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">schedule</span>
                    </div>
                    <div>
                      <h4 className="text-lg text-brown-deep font-medium">Ahorras tiempo</h4>
                      <p className="text-xs text-orange-action font-semibold">Cambios reflejados al segundo</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-brown-body">
                    Se acabó avisarle a los mozos mesa por mesa que el arroz con pato se terminó. Desactívalo desde caja con un toque.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={280}>
                <div className="p-6 rounded-[24px] bg-cream-base/95 border border-border-warm shadow-lg hover:-translate-x-1 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-action/15 text-orange-action flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">eco</span>
                    </div>
                    <div>
                      <h4 className="text-lg text-brown-deep font-medium">Menos papel, más higiene</h4>
                      <p className="text-xs text-orange-action font-semibold">Experiencia moderna y limpia</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-brown-body">
                    Tus comensales disfrutan de cartas siempre limpias, legibles bajo cualquier iluminación y adaptadas a cualquier celular.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[340px] rounded-[44px] bg-[#2E1815] p-3.5 shadow-2xl border-2 border-border-warm/30">
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-navy-dark rounded-full z-30" />
      <div className="w-full rounded-[36px] bg-cream-base text-brown-deep overflow-hidden pt-8 pb-5 px-4 flex flex-col shadow-inner">
        <div className="flex items-center justify-between pb-3 border-b border-border-warm/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-action flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[17px]">restaurant_menu</span>
            </div>
            <div>
              <p className="text-xs font-bold leading-tight text-brown-deep">Cevichería Andina</p>
              <p className="text-[10px] text-brown-body/80">Mesa 04 · Chiclayo</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-card-teal text-brown-deep text-[10px] font-bold">Abierto</span>
        </div>
        <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto text-[11px] font-medium">
          <span className="px-3 py-1 rounded-full bg-orange-action text-white font-bold whitespace-nowrap">Mariscos</span>
          <span className="px-3 py-1 rounded-full bg-cream-strong text-brown-deep whitespace-nowrap">Criollos</span>
          <span className="px-3 py-1 rounded-full bg-cream-strong text-brown-deep whitespace-nowrap">Bebidas</span>
        </div>
        <button
          type="button"
          className="mb-2.5 w-full py-1.5 px-3 rounded-xl bg-brown-deep text-cream-base text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span className="material-symbols-outlined text-[15px] text-card-beige">filter_alt</span>
          <span>Filtrar Alérgenos</span>
        </button>
        <div className="space-y-2">
          <div className="p-2.5 rounded-2xl bg-cream-strong flex gap-2.5 items-center">
            <div className="w-14 h-14 rounded-xl bg-card-teal flex-shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-brown-deep">set_meal</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold truncate text-brown-deep">Ceviche Clásico</h5>
                <span className="font-bold text-xs text-orange-action ml-2">S/ 42.00</span>
              </div>
              <p className="text-[10px] text-brown-body line-clamp-1 mt-0.5">Pesca del día, camote y choclo.</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-card-teal text-[9px] font-bold text-brown-deep">Disponible</span>
                <span className="text-[9px] text-orange-action font-semibold">★ Estrella</span>
              </div>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-cream-strong flex gap-2.5 items-center">
            <div className="w-14 h-14 rounded-xl bg-card-beige flex-shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-orange-action">dinner_dining</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold truncate text-brown-deep">Seco de Cabrito</h5>
                <span className="font-bold text-xs text-orange-action ml-2">S/ 48.00</span>
              </div>
              <p className="text-[10px] text-brown-body line-clamp-1 mt-0.5">Con frijoles norteños y arroz.</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-card-teal text-[9px] font-bold text-brown-deep">Disponible</span>
              </div>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-cream-strong/70 opacity-80 flex gap-2.5 items-center">
            <div className="w-14 h-14 rounded-xl bg-card-salmon/50 flex-shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-brown-deep/70">local_bar</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold truncate text-brown-body">Pisco Sour Catedral</h5>
                <span className="font-bold text-xs text-brown-body/70 ml-2">S/ 28.00</span>
              </div>
              <p className="text-[10px] text-brown-body/80 line-clamp-1 mt-0.5">Quebranta aromático tradicional.</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-card-salmon text-[9px] font-bold text-brown-deep">Agotado por hoy</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 p-2 rounded-xl bg-card-beige text-brown-deep text-[10px] flex items-center gap-1.5 font-medium">
          <span className="material-symbols-outlined text-[14px] text-orange-action">sync</span>
          <span>Sincronizado hace 2 min desde administración</span>
        </div>
      </div>
    </div>
  )
}

const steps = [
  {
    n: 1,
    title: 'Crea tu carta en minutos',
    desc: 'Sube tus categorías (Entradas, Fondos, Cocteles), añade fotos apetitosas, descripciones y precios. Organiza tus platos arrastrando con un dedo.',
    pills: ['Carga masiva rápida', 'Precios en Soles (S/.)'],
  },
  {
    n: 2,
    title: 'Genera y descarga tu QR único',
    desc: 'Descarga tu QR vectorizado en PDF listo para imprimir en peanas de madera, acrílicos para mesa o calcomanías resistentes a líquidos.',
    pills: ['Formato vectorial ultra-nítido', 'Código permanente'],
  },
  {
    n: 3,
    title: 'Actualiza cuando quieras desde tu panel',
    desc: '¿Subió el insumo? Cambias el precio y listo. ¿Se agotó el pescado del día? Lo marcas como agotado en 1 toque para no hacer esperar al comensal.',
    pills: ['Sincronización instantánea', 'Cero fricción'],
  },
]

function HowItWorks() {
  return (
    <section className="w-full py-24 bg-navy-dark text-cream-base" id="como-funciona">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-semibold text-card-beige tracking-wider block mb-2">Simplicidad Operativa</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-cream-base font-medium">
            Cómo funciona Karta Kamay en tu salón
          </h2>
          <p className="mt-3 text-cream-strong/90 text-[16.5px]">
            Poner en marcha tu carta inteligente toma menos de lo que dura servir un café.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col gap-8">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 130}>
                <div className="flex items-start gap-5 p-6 rounded-[24px] bg-white/5 border border-white/10">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-action text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl text-cream-base font-medium">{step.title}</h3>
                    <p className="mt-2 text-cream-strong/80 text-[15.5px]">{step.desc}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-card-beige text-xs font-semibold">
                      {step.pills.map((pill) => (
                        <span key={pill} className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          {pill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200} className="lg:col-span-5 flex justify-center">
            <PhoneMockup />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

const stats = [
  { value: '0', label: 'Reimpresiones de papel', sub: 'Ahorro permanente todos los meses' },
  { value: '10 seg', label: 'Para editar cualquier plato', sub: 'Desde el celular del administrador' },
  { value: '2x', label: 'Rotación más ágil de salón', sub: 'El comensal pide sin esperar la carta física' },
]

function Stats() {
  return (
    <section className="w-full py-20 bg-cream-strong border-y border-border-warm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 110}>
              <div className="p-6 rounded-[24px] bg-cream-base border border-border-warm flex flex-col items-center shadow-sm">
                <span className="text-6xl sm:text-7xl font-semibold text-orange-action leading-none tracking-tight">{s.value}</span>
                <span className="text-lg font-medium text-brown-deep mt-3">{s.label}</span>
                <span className="text-sm text-brown-body mt-1">{s.sub}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section className="w-full py-24 bg-cream-base" id="planes">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-semibold text-orange-action tracking-wider block mb-2">Transparencia y Flexibilidad</span>
          <h2 className="text-3xl sm:text-4xl text-brown-deep font-medium">Planes de Precios</h2>
          <p className="mt-3 text-brown-body text-[16.5px]">
            Elige el plan que se adapte a las necesidades de tu restaurante.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          <Reveal delay={0}>
            <div className="flex flex-col justify-between p-8 rounded-[24px] bg-cream-base border border-border-warm shadow-sm hover:shadow-md transition-shadow h-full">
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-brown-body block">Básico</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-brown-deep">Gratis</span>
                </div>
                <p className="mt-2 text-xs text-brown-body">Perfecto para empezar y probar la plataforma.</p>
                <div className="my-6 border-t border-border-warm/60" />
                <ul className="space-y-3.5 text-sm text-brown-body">
                  {['1 Menú Digital', 'Generación de QR básica', 'Personalización limitada'].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-orange-action text-[18px]">check</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to="/login"
                className="mt-8 w-full py-3 rounded-full border-2 border-brown-deep text-brown-deep hover:bg-brown-deep hover:text-white font-semibold text-sm transition-all text-center block"
              >
                Registrarse
              </Link>
            </div>
          </Reveal>
          <Reveal delay={130}>
            <div className="relative flex flex-col justify-between p-8 rounded-[24px] bg-cream-base border-2 border-orange-action shadow-lg md:-translate-y-2 h-full">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-orange-action text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
                POPULAR
              </div>
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-orange-action block">Pro</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-brown-deep">$19</span>
                  <span className="text-sm text-brown-body font-normal">/mes (o S/ 69/mes)</span>
                </div>
                <p className="mt-2 text-xs text-brown-body">Para restaurantes que quieren control total y marca propia.</p>
                <div className="my-6 border-t border-border-warm/60" />
                <ul className="space-y-3.5 text-sm text-brown-body">
                  {[
                    { text: 'Menús ilimitados', bold: true },
                    { text: 'QR Personalizado con logo', bold: true },
                    { text: 'Subdominio personalizado', bold: true },
                    { text: 'Soporte prioritario 24/7 vía WhatsApp', bold: false },
                  ].map((item) => (
                    <li key={item.text} className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-orange-action text-[18px]">check</span>
                      <span className={item.bold ? 'font-medium text-brown-deep' : ''}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to="/login"
                className="mt-8 w-full py-3.5 rounded-full bg-orange-action hover:bg-terracotta-hover text-white font-bold text-sm shadow-[0_4px_14px_rgba(232,112,42,0.3)] transition-all text-center block"
              >
                Elegir Plan
              </Link>
            </div>
          </Reveal>
          <Reveal delay={260}>
            <div className="flex flex-col justify-between p-8 rounded-[24px] bg-cream-base border border-border-warm shadow-sm hover:shadow-md transition-shadow h-full">
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-brown-body block">Enterprise</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-brown-deep">$49</span>
                  <span className="text-sm text-brown-body font-normal">/mes</span>
                </div>
                <p className="mt-2 text-xs text-brown-body">Soluciones avanzadas para cadenas y franquicias.</p>
                <div className="my-6 border-t border-border-warm/60" />
                <ul className="space-y-3.5 text-sm text-brown-body">
                  {[
                    'Múltiples locales y sedes',
                    'Soporte prioritario 24/7',
                    'Analíticas avanzadas y rotación',
                    'Integración con punto de venta (POS)',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-orange-action text-[18px]">check</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="#contacto"
                onClick={scrollTo}
                className="mt-8 w-full py-3 rounded-full border-2 border-brown-deep text-brown-deep hover:bg-brown-deep hover:text-white font-semibold text-sm transition-all text-center block"
              >
                Contactar
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

const footerNav = [
  { label: 'Beneficios', href: '#beneficios' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Planes y tarifas', href: '#planes' },
]

function Footer() {
  return (
    <footer className="w-full bg-navy-dark text-cream-base" id="contacto">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-12 border-b border-white/10">
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                <img src={logoMark} alt="Karta Kamay" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-medium text-cream-base tracking-tight">Karta Kamay</span>
            </div>
            <p className="text-cream-strong/80 text-sm max-w-md leading-relaxed">
              La carta digital inteligente con QR permanente para restaurantes y bares en Perú. Actualiza platos, precios y alérgenos en tiempo real sin volver a imprimir jamás.
            </p>
            <div className="flex items-center gap-2 pt-2 text-card-beige text-xs font-semibold">
              <span className="material-symbols-outlined text-[18px]">public</span>
              <span>kartakamay.app</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase font-bold text-card-beige tracking-wider">Navegación</span>
            <ul className="flex flex-col gap-2 text-sm text-cream-strong/80">
              {footerNav.map((item) => (
                <li key={item.label}>
                  <a className="hover:text-orange-action transition-colors" href={item.href} onClick={scrollTo}>
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link className="hover:text-orange-action transition-colors" to="/login">
                  Empieza tu carta
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase font-bold text-card-beige tracking-wider">Contacto y Soporte</span>
            <div className="flex flex-col gap-2 text-sm text-cream-strong/80">
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-orange-action">mail</span>
                <span>hola@kartakamay.app</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-orange-action">call</span>
                <span>+51 987 654 321</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-orange-action">location_on</span>
                <span>Chiclayo, Perú</span>
              </p>
            </div>
            <div className="pt-3">
              <a
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-orange-action text-cream-base text-xs font-semibold transition-colors"
                href="https://wa.me/51987654321"
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                WhatsApp Directo
              </a>
            </div>
          </div>
        </div>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-cream-strong/60">
          <p>© 2025 Karta Kamay (kartakamay.app). Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <a className="hover:text-cream-base transition-colors" href="#">Términos de Servicio</a>
            <a className="hover:text-cream-base transition-colors" href="#">Política de Privacidad</a>
            <a className="hover:text-cream-base transition-colors" href="#">Soporte</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-svh bg-cream-base font-jakarta antialiased text-brown-body">
      <Navbar />
      <main className="w-full">
        <Hero />
        <Benefits />
        <Features />
        <Subdomain />
        <WhyUs />
        <HowItWorks />
        <Stats />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
