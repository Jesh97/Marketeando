import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import loginScreen from '../assets/login_screen.png'
import logoMark from '../assets/logo-mark.png'
import { useAuth } from '../context/AuthContext'
import { useRestaurante } from '../context/RestauranteContext'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#1877F2" className="h-4 w-4 flex-shrink-0">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function Login() {
  const [mode, setMode] = useState('login')
  const isLogin = mode === 'login'
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const { refresh } = useRestaurante()

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setShowPassword(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        const { data } = await apiClient.post('/auth/login', { correo, contrasena })
        setToken(data.token)
        await refresh()
        navigate('/dashboard')
      } else {
        const { data } = await apiClient.post('/auth/registro', { correo, contrasena, nombre })
        setToken(data.token)
        await refresh()
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Algo salió mal, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-base font-jakarta flex flex-col justify-between text-brown-body">

      

      {/* ── Main ── */}
      <main className="w-full pt-20 flex-1 bg-cream-base">
        <div className="w-full max-w-[1200px] mx-auto px-5 md:px-6 py-10 md:py-16 flex items-center justify-center">
          <div className="w-full bg-[#FFFDF9] rounded-3xl border border-border-warm shadow-[0_12px_40px_rgba(74,36,32,0.06)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">

            {/* ── Left: atmosphere image ── */}
            <div className="relative lg:col-span-5 hidden lg:flex flex-col justify-between overflow-hidden min-h-[640px]">
              <img
                src={loginScreen}
                alt="Restaurante acogedor Karta Kamay"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brown-deep/80 via-brown-deep/30 to-brown-deep/20" />
              {/* Floating brand pill */}
              <div className="relative z-10 m-8 self-start">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream-base/90 backdrop-blur-sm border border-border-warm/60 shadow-lg">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <img src={logoMark} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[13px] font-semibold text-brown-deep">Karta Kamay</span>
                </div>
              </div>
              {/* Bottom tagline */}
              <div className="relative z-10 m-8">
                <p className="text-cream-base/90 text-[15px] font-medium leading-snug max-w-[260px]">
                  Tu carta digital siempre actualizada. Tu QR, nunca cambia.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-cream-strong/80 text-xs">Activo en restaurantes de Chiclayo</span>
                </div>
              </div>
            </div>

            {/* ── Right: form ── */}
            <div className="lg:col-span-7 p-6 sm:p-10 md:p-14 flex flex-col justify-center bg-[#FFFDF9]">

              {/* Tab switcher */}
              <div className="flex items-center justify-between mb-10">
                <div className="inline-flex p-1 bg-cream-base rounded-full border border-border-warm shadow-inner">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isLogin
                        ? 'bg-orange-action text-white shadow-sm'
                        : 'text-brown-body hover:text-brown-deep'
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      !isLogin
                        ? 'bg-orange-action text-white shadow-sm'
                        : 'text-brown-body hover:text-brown-deep'
                    }`}
                  >
                    Registrarse
                  </button>
                </div>
                
              </div>

              {/* Title */}
              <div className="mb-6">
                <h1 className="text-[28px] sm:text-[32px] font-medium text-brown-deep tracking-tight leading-snug mb-1">
                  {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
                </h1>
                <p className="text-[15px] text-brown-body leading-normal">
                  {isLogin
                    ? 'Ingresa a tu panel para gestionar tus cartas y códigos QR en vivo.'
                    : 'Empieza gratis con 14 días de prueba. Sin tarjeta de crédito.'}
                </p>
              </div>

              {/* Social buttons (deshabilitados — próximamente) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                <button
                  type="button"
                  disabled
                  title="Próximamente"
                  className="flex items-center justify-center gap-2 h-[48px] px-4 rounded-full bg-cream-base border border-border-warm text-brown-deep text-sm font-semibold cursor-not-allowed opacity-50 transition-all"
                >
                  <GoogleIcon />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  disabled
                  title="Próximamente"
                  className="flex items-center justify-center gap-2 h-[48px] px-4 rounded-full bg-cream-base border border-border-warm text-brown-deep text-sm font-semibold cursor-not-allowed opacity-50 transition-all"
                >
                  <FacebookIcon />
                  <span>Facebook</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center mb-6">
                <div className="w-full border-t border-border-warm" />
                <span className="absolute bg-[#FFFDF9] px-4 text-[11px] tracking-widest text-brown-body/60 uppercase whitespace-nowrap">
                  o continuar con correo
                </span>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>

                {/* Nombre — solo en registro */}
                {!isLogin && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-nombre" className="text-xs font-semibold text-brown-deep pl-1">
                      Nombre completo
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-brown-body/50 text-[20px] pointer-events-none">person</span>
                      <input
                        id="reg-nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        placeholder="Tu nombre completo"
                        className="w-full h-[50px] pl-11 pr-4 rounded-full bg-cream-base border border-border-warm text-brown-deep text-sm placeholder:text-brown-body/45 focus:outline-none focus:border-orange-action focus:ring-2 focus:ring-orange-action/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-email" className="text-xs font-semibold text-brown-deep pl-1">
                    Correo electrónico
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-brown-body/50 text-[20px] pointer-events-none">mail</span>
                    <input
                      id="login-email"
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      required
                      placeholder="ejemplo@turestaurante.com"
                      className="w-full h-[50px] pl-11 pr-4 rounded-full bg-cream-base border border-border-warm text-brown-deep text-sm placeholder:text-brown-body/45 focus:outline-none focus:border-orange-action focus:ring-2 focus:ring-orange-action/20 transition-all"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between pl-1">
                    <label htmlFor="login-password" className="text-xs font-semibold text-brown-deep">
                      Contraseña
                    </label>
                    {isLogin && (
                      <a href="#" className="text-xs font-medium text-orange-action hover:text-terracotta-hover transition-colors">
                        ¿Olvidaste tu contraseña?
                      </a>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-4 text-brown-body/50 text-[20px] pointer-events-none">lock</span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      required
                      minLength={isLogin ? undefined : 8}
                      placeholder="••••••••"
                      className="w-full h-[50px] pl-11 pr-12 rounded-full bg-cream-base border border-border-warm text-brown-deep text-sm placeholder:text-brown-body/45 focus:outline-none focus:border-orange-action focus:ring-2 focus:ring-orange-action/20 transition-all tracking-wider"
                    />
                    <button
                      type="button"
                      aria-label="Mostrar u ocultar contraseña"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 text-brown-body/60 hover:text-brown-deep transition-colors focus:outline-none p-1"
                    >
                      <span className="material-symbols-outlined text-[20px] align-middle">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="pl-1 text-xs text-brown-body/60">Mínimo 8 caracteres.</p>
                  )}
                </div>

                {/* Recordar sesión — solo en login */}
                {isLogin && (
                  <div className="flex items-center pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border-warm accent-orange-action cursor-pointer"
                      />
                      <span className="text-xs text-brown-body group-hover:text-brown-deep transition-colors">
                        Recordar mi sesión en este dispositivo
                      </span>
                    </label>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <p className="rounded-full bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 text-center">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[50px] rounded-full bg-orange-action hover:bg-terracotta-hover text-white text-[15px] font-semibold tracking-wide shadow-[0_4px_16px_rgba(232,112,42,0.24)] hover:shadow-[0_6px_22px_rgba(232,112,42,0.32)] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{loading ? 'Un momento...' : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</span>
                    {!loading && (
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Invitación a cambiar de modo */}
              <div className="mt-6 pt-4 border-t border-border-warm/70 text-center">
                <p className="text-sm text-brown-body">
                  {isLogin ? '¿No tienes una cuenta aún? ' : '¿Ya tienes una cuenta? '}
                  <button
                    type="button"
                    onClick={() => switchMode(isLogin ? 'register' : 'login')}
                    className="font-semibold text-orange-action hover:text-terracotta-hover underline decoration-orange-action/40 underline-offset-4 transition-colors"
                  >
                    {isLogin ? 'Crea tu carta gratis (14 días de prueba)' : 'Inicia sesión'}
                  </button>
                </p>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full bg-[#faf3e7] py-10 shadow-[0_-1px_6px_rgba(74,36,32,0.03)]">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cream-strong flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px] text-brown-deep">local_dining</span>
            </div>
            <p className="text-sm text-brown-body/80">© 2026 Karta Kamay. Experiencias gastronómicas sin fricción.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <a href="#" className="text-sm text-brown-body hover:text-orange-action transition-colors">Soporte y Ayuda</a>
            <span className="text-border-warm hidden md:inline">•</span>
            <a href="#" className="text-sm text-brown-body hover:text-orange-action transition-colors">Privacidad y Términos</a>
            <span className="text-border-warm hidden md:inline">•</span>
            <a href="#" className="text-sm text-brown-body hover:text-orange-action transition-colors">Estado del Servicio</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
