import { useState } from 'react'

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.85-.08-1.66-.22-2.44H12v4.62h6.46c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.56-5.17 3.56-8.83z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.1-6.72-4.93H1.28v3.1C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.28a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.6l4 3.1c.95-2.83 3.6-4.95 6.72-4.95z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#1877F2" className="h-4 w-4">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  )
}

function Login() {
  const [mode, setMode] = useState('login')
  const isLogin = mode === 'login'

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-100 p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        {/* Left panel */}
        <div className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden bg-gradient-to-br from-stone-400 via-stone-500 to-stone-700 p-8 md:flex">
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/10 to-black/10" />

          <div className="relative flex items-center gap-2 text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white">
              <MenuIcon />
            </span>
            <span className="font-semibold">Kamay Menu</span>
          </div>

          <div className="relative -mr-8 grid grid-cols-2 gap-3 self-end">
            <div className="col-span-2 rounded-lg bg-white/70 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-lg font-serif text-gray-700">Menu Serif</p>
              <div className="mt-2 h-2 w-3/4 rounded bg-gray-300/70" />
              <p className="mt-3 text-sm text-gray-500">Body Sans-Serif</p>
              <div className="mt-2 h-2 w-2/3 rounded bg-gray-300/70" />
            </div>
            <div className="h-12 rounded-lg bg-rose-200/70" />
            <div className="h-12 rounded-lg bg-slate-300/70" />
          </div>

          <div className="relative">
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/90" />
          </div>

          <div className="relative">
            <h2 className="text-2xl font-bold leading-tight text-gray-900">
              Diseña menús que se venden solos.
            </h2>
            <p className="mt-3 max-w-xs text-sm text-gray-700">
              Únete a miles de restauradores que crean menús digitales e impresos
              impresionantes y de alta conversión en minutos.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-6 flex items-center gap-8 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium ${
                isLogin
                  ? 'border-orange-500 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium ${
                !isLogin
                  ? 'border-orange-500 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Registrarse
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <GoogleIcon />
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-md border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FacebookIcon />
              Facebook
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium tracking-wide text-gray-400">
              O CONTINUAR CON
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
              <input
                type="email"
                placeholder="nombre@empresa.com"
                className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Contraseña</label>
                {isLogin && (
                  <a href="#" className="text-xs font-medium text-orange-600 hover:text-orange-700">
                    ¿Olvidaste tu contraseña?
                  </a>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-orange-500 py-3 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
            >
              {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
