import { useLayoutEffect, useRef, useState } from 'react'

// Muestra el HTML de un diseño del editor (lienzo de tamaño fijo: 800x1000,
// 1080x1920, etc.) escalado al ancho disponible. Antes se usaba
// <svg><foreignObject>, que Safari/iOS dibuja con errores (capas fuera de
// lugar, fuentes que no cargan); un div con transform: scale() se ve igual
// en todos los navegadores.
function DisenoEscalado({ html, canvas, className = '' }) {
  const contenedorRef = useRef(null)
  const [escala, setEscala] = useState(0)

  useLayoutEffect(() => {
    const nodo = contenedorRef.current
    if (!nodo) return undefined
    const medir = () => setEscala(nodo.clientWidth / canvas.width)
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(nodo)
    return () => observer.disconnect()
  }, [canvas.width])

  return (
    <div
      ref={contenedorRef}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: canvas.width,
          height: canvas.height,
          transform: `scale(${escala})`,
          visibility: escala ? 'visible' : 'hidden',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

export default DisenoEscalado
