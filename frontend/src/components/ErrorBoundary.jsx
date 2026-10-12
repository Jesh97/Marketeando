import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="flex min-h-svh items-center justify-center bg-gray-50 px-5">
        <section className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-navy">Algo salió mal en esta pantalla</h1>
          <p className="mt-2 break-words text-xs text-gray-500">{this.state.error.message}</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link to="/editor" className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-dark">
              Volver a Mis diseños
            </Link>
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-navy hover:bg-gray-50">
              Recargar
            </button>
          </div>
        </section>
      </main>
    )
  }
}
