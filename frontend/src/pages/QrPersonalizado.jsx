import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import DashboardShell from '../components/DashboardShell'
import { useRestaurante } from '../context/RestauranteContext'
import { fileToImage, imageToDataUrl, imageToLumaMap, imageToMask, urlToImage } from '../lib/logoMask'
import {
  ARTE_OPACIDAD_DEFAULT,
  ARTE_PRIORIDAD_DEFAULT,
  ARTE_PRIORIDAD_MAX,
  ARTE_RADIO_DEFAULT,
  construirSvg,
  contrasteRatio,
  LOGO_CENTRAL_FRACCION_DEFAULT,
  puntosValidos,
  rasterizarPng,
  validarDecodifica,
} from '../lib/qrEngine'

const MODOS = [
  { valor: 'arte', etiqueta: 'Arte' },
  { valor: 'logo', etiqueta: 'Logo' },
  { valor: 'classic', etiqueta: 'Clásico' },
  { valor: 'color', etiqueta: 'Color' },
  { valor: 'halftone', etiqueta: 'Halftone' },
]

// Al subir un logo, se prueban estas combinaciones en orden y se aplica la
// primera que jsQR confirme que decodifica: el usuario solo sube el logo, el
// programa se encarga de que el QR siga escaneando.
// Primero se intenta "arte" (ver ARTE_COMBOS_A_PROBAR). Si no decodifica,
// "logo" (la imagen real sobre una placa blanca) es el respaldo: un logotipo de
// texto/letras finas (el nombre de una marca, por ejemplo) no se puede
// "dibujar" de forma legible con los puntos del QR —a esa resolución queda
// como ruido, sobre todo en miniaturas chicas como la del Dashboard—, así
// que la opción por defecto prioriza que el logo se lea bien siempre.
// "color"/"halftone" (logo integrado con los puntos, sin placa) quedan
// disponibles a mano para quien prefiera ese estilo con íconos/símbolos
// simples, donde si funcionan bien.
const FRACCIONES_LOGO_A_PROBAR = [LOGO_CENTRAL_FRACCION_DEFAULT, 0.26, 0.22, 0.18]
// Modo "arte" (logo a todo color con los puntos encima) se prueba antes que
// todo: es el estilo más vistoso. Se va de lo más "limpio" (puntos chicos,
// logo intenso, más módulos cedidos al logo) a lo más seguro (puntos
// grandes, logo atenuado, sin ceder módulos). Cada candidato se valida
// simulando una cámara (ver validarDecodifica).
const ARTE_COMBOS_A_PROBAR = [
  { radio: ARTE_RADIO_DEFAULT, opacidad: 1, prioridad: ARTE_PRIORIDAD_DEFAULT },
  { radio: ARTE_RADIO_DEFAULT, opacidad: 0.85, prioridad: ARTE_PRIORIDAD_DEFAULT },
  { radio: ARTE_RADIO_DEFAULT, opacidad: 0.85, prioridad: 0.3 },
  { radio: ARTE_RADIO_DEFAULT, opacidad: 0.7, prioridad: 0.3 },
  { radio: 0.46, opacidad: 0.7, prioridad: 0 },
  { radio: 0.46, opacidad: 0.5, prioridad: 0 },
]
const MODOS_CON_MASCARA = ['halftone', 'color']
const SENSIBILIDADES_A_PROBAR = [128, 150, 170, 190, 110, 90, 210, 70, 230, 50]

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" className="h-4 w-4">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.5" className="h-4 w-4">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  )
}

function ModoIconClassic() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      {[4, 11, 18].flatMap((cx) => [4, 11, 18].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.1" />))}
    </svg>
  )
}

function ModoIconColor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 3C8 7 5 10.5 5 14a7 7 0 0 0 14 0c0-3.5-3-7-7-11z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}

function ModoIconHalftone() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <circle cx="5" cy="5" r="2.3" />
      <circle cx="13" cy="5" r="1.7" />
      <circle cx="19.5" cy="5" r="0.9" />
      <circle cx="5" cy="13" r="1.7" />
      <circle cx="13" cy="13" r="1.3" />
      <circle cx="5" cy="19.5" r="0.9" />
    </svg>
  )
}

function ModoIconArte() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.35" />
      {[6, 12, 18].flatMap((cx) =>
        [6, 12, 18].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill="currentColor" />),
      )}
    </svg>
  )
}

function ModoIconLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </svg>
  )
}

const MODO_ICONOS = {
  arte: ModoIconArte,
  logo: ModoIconLogo,
  classic: ModoIconClassic,
  color: ModoIconColor,
  halftone: ModoIconHalftone,
}

const MODO_DESCRIPCIONES = {
  arte: 'Tu logo a todo color, dibujado con los puntos del QR',
  logo: 'Tu logo real, nítido, al centro',
  classic: 'Puntos redondeados',
  color: 'Logo a color al centro',
  halftone: 'Logo en textura',
}

function PlanBloqueado() {
  return (
    <DashboardShell>
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-[14px] border border-[#E2E8F0] bg-white p-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F6F8FC] text-navy">
          <LockIcon />
        </div>
        <h1 className="text-lg font-bold text-navy">Personalizar QR</h1>
        <p className="mt-2 text-sm text-[#4A5568]">
          Disponible en el plan Empresarial. Diseña tu QR con tu logo y tus colores de marca.
        </p>
        <Link
          to="/subscription"
          className="mt-6 h-11 rounded-[9px] bg-orange px-6 text-sm font-semibold leading-[44px] text-white hover:bg-orange-dark"
        >
          Ver plan Empresarial
        </Link>
      </div>
    </DashboardShell>
  )
}

function QrPersonalizado() {
  const { restaurante } = useRestaurante()
  const idRestaurante = restaurante?.id_restaurante
  const navigate = useNavigate()

  const [acceso, setAcceso] = useState('cargando') // cargando | bloqueado | permitido
  const [subdominio, setSubdominio] = useState(null)

  const [modo, setModo] = useState('classic')
  const [colorPuntos, setColorPuntos] = useState('#0B1C30')
  const [colorFondo, setColorFondo] = useState('#FFFFFF')
  // El QR (SVG de cientos de elementos) se reconstruye completo en cada
  // cambio de color; mientras se arrastra el selector eso dispara decenas de
  // reconstrucciones por segundo. Estas versiones "asentadas" alimentan el
  // SVG y la validación, mientras el selector/swatch sigue el color real al
  // instante (eso sí es barato, es solo un color de fondo).
  const [colorPuntosAsentado, setColorPuntosAsentado] = useState(colorPuntos)
  const [colorFondoAsentado, setColorFondoAsentado] = useState(colorFondo)
  const [sensibilidad, setSensibilidad] = useState(128)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoImagen, setLogoImagen] = useState(null)
  const [mascara, setMascara] = useState(null)
  const [colorLogo, setColorLogo] = useState(null)
  const [logoFraccion, setLogoFraccion] = useState(LOGO_CENTRAL_FRACCION_DEFAULT)
  const [logoImagenUrl, setLogoImagenUrl] = useState(null)
  const [radioPunto, setRadioPunto] = useState(ARTE_RADIO_DEFAULT)
  const [opacidadLogo, setOpacidadLogo] = useState(ARTE_OPACIDAD_DEFAULT)
  const [prioridadLogo, setPrioridadLogo] = useState(ARTE_PRIORIDAD_DEFAULT)

  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)

  const [decodificaOk, setDecodificaOk] = useState(true)
  const [validando, setValidando] = useState(false)
  const [ajustando, setAjustando] = useState(false)

  const fileInputRef = useRef(null)

  // Misma URL pública que ya usa el Dashboard: los QR impresos no dejan de
  // funcionar porque el QR personalizado apunta exactamente a ella.
  const enlaceQr = subdominio ? `${window.location.origin}/menu/${subdominio}?origen=qr` : ''

  useEffect(() => {
    if (!idRestaurante) return
    let cancel = false

    apiClient
      .get(`/restaurantes/${idRestaurante}/dashboard`)
      .then(({ data }) => {
        if (!cancel) setSubdominio(data.subdominio)
      })
      .catch(() => {})

    apiClient
      .get(`/restaurantes/${idRestaurante}/qr-personalizacion`)
      .then(({ data }) => {
        if (cancel) return
        setAcceso('permitido')
        setModo(data.modo)
        setColorPuntos(data.colores?.puntos ?? '#0B1C30')
        setColorFondo(data.colores?.fondo ?? '#FFFFFF')
        setSensibilidad(data.sensibilidad ?? 128)
        setRadioPunto(data.ajustes?.radioPunto ?? ARTE_RADIO_DEFAULT)
        setOpacidadLogo(data.ajustes?.opacidadLogo ?? ARTE_OPACIDAD_DEFAULT)
        // Diseños guardados antes de existir este ajuste no cedían módulos:
        // 0 los reconstruye tal cual se validaron.
        setPrioridadLogo(data.ajustes?.prioridadLogo ?? 0)
        setLogoFraccion(data.ajustes?.logoFraccion ?? LOGO_CENTRAL_FRACCION_DEFAULT)
        setLogoUrl(data.logo_url)
      })
      .catch((err) => {
        if (cancel) return
        if (err.response?.status === 403) setAcceso('bloqueado')
        else setAcceso('bloqueado')
      })

    return () => {
      cancel = true
    }
  }, [idRestaurante])

  // Si ya hay un logo guardado, lo carga para recalcular la máscara con la
  // sensibilidad actual (la máscara en sí no se persiste, solo la imagen).
  useEffect(() => {
    if (!logoUrl) return
    let cancel = false
    urlToImage(logoUrl)
      .then((img) => {
        if (!cancel) setLogoImagen(img)
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [logoUrl])

  useEffect(() => {
    if (!logoImagen) {
      setMascara(null)
      setColorLogo(null)
      return
    }
    const { mask, size, colorPromedio } = imageToMask(logoImagen, sensibilidad)
    setMascara({ mask, size })
    setColorLogo(colorPromedio)
  }, [logoImagen, sensibilidad])

  // Modo "logo": no usa la máscara, necesita la imagen real re-codificada a
  // PNG (cualquiera haya sido el formato original) para poder embeberla en
  // el SVG.
  useEffect(() => {
    if (!logoImagen) {
      setLogoImagenUrl(null)
      return
    }
    try {
      setLogoImagenUrl(imageToDataUrl(logoImagen))
    } catch {
      setLogoImagenUrl(null)
    }
  }, [logoImagen])

  // Modo "arte": luminosidad del logo bajo cada módulo, para dibujar punto
  // solo donde el logo contradice al dato (ver construirArte).
  const lumaLogo = useMemo(() => {
    if (!logoImagen) return null
    try {
      return imageToLumaMap(logoImagen)
    } catch {
      return null
    }
  }, [logoImagen])

  useEffect(() => {
    const t = setTimeout(() => setColorPuntosAsentado(colorPuntos), 120)
    return () => clearTimeout(t)
  }, [colorPuntos])

  useEffect(() => {
    const t = setTimeout(() => setColorFondoAsentado(colorFondo), 120)
    return () => clearTimeout(t)
  }, [colorFondo])

  const svgMarkup = useMemo(() => {
    if (!enlaceQr) return ''
    try {
      return construirSvg({
        texto: enlaceQr,
        modo,
        colorPuntos: colorPuntosAsentado,
        colorFondo: colorFondoAsentado,
        colorLogo,
        mask: mascara?.mask,
        maskSize: mascara?.size,
        logoImagenUrl,
        logoFraccion,
        radioPunto,
        opacidadLogo,
        prioridadLogo,
        lumaLogo,
      })
    } catch {
      return ''
    }
  }, [
    enlaceQr,
    modo,
    colorPuntosAsentado,
    colorFondoAsentado,
    colorLogo,
    mascara,
    logoImagenUrl,
    logoFraccion,
    radioPunto,
    opacidadLogo,
    prioridadLogo,
    lumaLogo,
  ])

  const contraste = useMemo(() => contrasteRatio(colorPuntos, colorFondo), [colorPuntos, colorFondo])
  const contrasteOk = useMemo(() => puntosValidos(colorPuntos, colorFondo), [colorPuntos, colorFondo])

  useEffect(() => {
    if (!svgMarkup || !enlaceQr) return
    let cancel = false
    setValidando(true)
    // Arrastrar un color dispara onChange muchas veces por segundo; validar
    // (rasterizar + jsQR, 3 veces) en cada tick pondría la app muy lenta.
    // Se espera a que el usuario se detenga un momento antes de verificar.
    const timer = setTimeout(() => {
      validarDecodifica(svgMarkup, enlaceQr, { simularCamara: modo === 'arte' }).then((ok) => {
        if (!cancel) {
          setDecodificaOk(ok)
          setValidando(false)
        }
      })
    }, 400)
    return () => {
      cancel = true
      clearTimeout(timer)
    }
  }, [svgMarkup, enlaceQr, modo])

  const puedeDescargar = decodificaOk && contrasteOk && !validando && !ajustando

  // Prueba combinaciones de modo+sensibilidad con el logo recién subido y
  // aplica la primera que jsQR confirme como escaneable. Si ninguna combina
  // bien con este logo, cae a "Clásico" (sin logo) para garantizar que el
  // QR siga funcionando: nunca deja al usuario con un diseño roto.
  const autoAjustar = async (img) => {
    if (!enlaceQr || !img) return
    setAjustando(true)
    try {
      // 1) Logo real sobre placa blanca: el más confiable y el único que
      // deja CUALQUIER logo —incluyendo uno con texto/letras finas— nítido
      // y legible, en miniatura chica (como la del Dashboard) y en grande.
      // Se prueba primero, achicando la placa si no decodifica.
      let logoDataUrlCandidato
      try {
        logoDataUrlCandidato = imageToDataUrl(img)
      } catch {
        logoDataUrlCandidato = null
      }
      // 0) Modo "arte": el logo completo a todo color bajo los puntos.
      if (logoDataUrlCandidato) {
        const { colorPromedio } = imageToMask(img, sensibilidad)
        let lumaCandidato = null
        try {
          lumaCandidato = imageToLumaMap(img)
        } catch {
          // Sin mapa de luminosidad se dibujan todos los puntos (más seguro).
        }
        for (const { radio, opacidad, prioridad } of ARTE_COMBOS_A_PROBAR) {
          let svg
          try {
            svg = construirSvg({
              texto: enlaceQr,
              modo: 'arte',
              colorPuntos,
              colorFondo,
              colorLogo: colorPromedio,
              logoImagenUrl: logoDataUrlCandidato,
              radioPunto: radio,
              opacidadLogo: opacidad,
              prioridadLogo: prioridad,
              lumaLogo: lumaCandidato,
            })
          } catch {
            continue
          }
          // eslint-disable-next-line no-await-in-loop
          const ok = await validarDecodifica(svg, enlaceQr, { simularCamara: true })
          if (ok) {
            setModo('arte')
            setLogoImagenUrl(logoDataUrlCandidato)
            setRadioPunto(radio)
            setOpacidadLogo(opacidad)
            setPrioridadLogo(prioridad)
            setError('')
            return
          }
        }
      }

      if (logoDataUrlCandidato) {
        for (const fraccion of FRACCIONES_LOGO_A_PROBAR) {
          let svg
          try {
            svg = construirSvg({
              texto: enlaceQr,
              modo: 'logo',
              colorPuntos,
              colorFondo,
              logoImagenUrl: logoDataUrlCandidato,
              logoFraccion: fraccion,
            })
          } catch {
            continue
          }
          // eslint-disable-next-line no-await-in-loop
          const ok = await validarDecodifica(svg, enlaceQr)
          if (ok) {
            setModo('logo')
            setLogoImagenUrl(logoDataUrlCandidato)
            setLogoFraccion(fraccion)
            setError('')
            return
          }
        }
      }

      // 2) Si por algún motivo el logo real no entró (muy raro), se
      // intenta integrarlo con los puntos del QR ("halftone"/"color"):
      // funciona bien para íconos/símbolos simples, no para texto.
      for (const s of SENSIBILIDADES_A_PROBAR) {
        const { mask, size, colorPromedio, cobertura } = imageToMask(img, s)
        // Una máscara casi vacía "decodifica" porque no hay nada que
        // mostrar, no porque el ajuste sea bueno: la saltamos para no
        // quedarnos con un QR que técnicamente funciona pero sin logo.
        if (cobertura < 0.01) continue
        for (const modoCandidato of MODOS_CON_MASCARA) {
          let svg
          try {
            svg = construirSvg({
              texto: enlaceQr,
              modo: modoCandidato,
              colorPuntos,
              colorFondo,
              colorLogo: colorPromedio,
              mask,
              maskSize: size,
            })
          } catch {
            continue
          }
          // eslint-disable-next-line no-await-in-loop
          const ok = await validarDecodifica(svg, enlaceQr)
          if (ok) {
            setModo(modoCandidato)
            setSensibilidad(s)
            setError('')
            return
          }
        }
      }

      setModo('classic')
      setError(
        'Este logo no se pudo combinar con el QR sin afectar la lectura, así que se usó el modo Clásico (sin logo) para garantizar que siga escaneando.',
      )
    } finally {
      setAjustando(false)
    }
  }

  const elegirLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    if (file.size > 2 * 1024 * 1024) {
      setError('El logo supera los 2MB.')
      return
    }

    let img
    try {
      img = await fileToImage(file)
      setLogoImagen(img)
    } catch {
      setError('No se pudo leer la imagen seleccionada.')
      return
    }

    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await apiClient.post(
        `/restaurantes/${idRestaurante}/qr-personalizacion/logo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setLogoUrl(data.logo_url)
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo subir el logo.')
      return
    } finally {
      setSubiendo(false)
    }

    await autoAjustar(img)
  }

  const guardarConfig = async () => {
    if (!puedeDescargar) {
      setError('Ajusta el diseño hasta que el indicador diga "Escanea correctamente" antes de guardar.')
      return
    }
    setGuardando(true)
    setError('')
    setGuardado(false)
    try {
      await apiClient.put(`/restaurantes/${idRestaurante}/qr-personalizacion`, {
        modo,
        colores: { puntos: colorPuntos, fondo: colorFondo },
        sensibilidad,
        ajustes: { radioPunto, opacidadLogo, prioridadLogo, logoFraccion },
      })
      setGuardado(true)
      setTimeout(() => navigate('/dashboard'), 700)
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo guardar la configuración.')
    } finally {
      setGuardando(false)
    }
  }

  const descargarSvg = () => {
    if (!svgMarkup || !puedeDescargar) return
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-personalizado-${subdominio ?? 'menu'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const descargarPng = async () => {
    if (!svgMarkup || !puedeDescargar) return
    try {
      const blob = await rasterizarPng(svgMarkup, 2000)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-personalizado-${subdominio ?? 'menu'}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el PNG.')
    }
  }

  if (acceso === 'cargando') {
    return (
      <DashboardShell>
        <p className="text-sm text-[#8A94A6]">Cargando...</p>
      </DashboardShell>
    )
  }

  if (acceso === 'bloqueado') {
    return <PlanBloqueado />
  }

  return (
    <DashboardShell>
      <div className="mb-7">
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Personalizar QR</h1>
        <p className="mt-1.5 text-[14px] text-[#4A5568]">
          Diseña el QR de tu menú con tu logo y tus colores. Sigue apuntando al mismo enlace de
          siempre, así que tus QR ya impresos no dejan de funcionar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1fr_1fr]">
        {/* Columna izquierda: controles */}
        <div className="space-y-5 rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
          <div>
            <span className="text-[13.5px] font-bold text-navy">Logo</span>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[9px] border border-[#E2E8F0] bg-[#F6F8FC]">
                {logoImagen ? (
                  <img src={logoImagen.src} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-[#8A94A6]">Sin logo</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={subiendo || ajustando}
                className="h-9 rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-[12.5px] font-semibold text-navy hover:bg-[#F6F8FC] disabled:opacity-60"
              >
                {subiendo ? 'Subiendo...' : ajustando ? 'Ajustando...' : 'Subir logo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={elegirLogo}
                className="hidden"
              />
            </div>
            {ajustando && (
              <p className="mt-2 text-xs text-[#8A94A6]">
                Probando el logo con el QR para asegurarnos de que siga escaneando...
              </p>
            )}
          </div>

          <div>
            <span className="text-[13.5px] font-bold text-navy">Modo</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {MODOS.map((m) => {
                const Icono = MODO_ICONOS[m.valor]
                const activo = modo === m.valor
                return (
                  <button
                    key={m.valor}
                    type="button"
                    onClick={() => setModo(m.valor)}
                    disabled={ajustando}
                    title={MODO_DESCRIPCIONES[m.valor]}
                    className={`flex flex-col items-center gap-1.5 rounded-[11px] py-3 text-[12.5px] font-semibold transition-colors disabled:opacity-60 ${
                      activo
                        ? 'bg-navy text-white shadow-sm'
                        : 'border border-[#E2E8F0] bg-white text-[#4A5568] hover:border-navy/30 hover:bg-[#F6F8FC]'
                    }`}
                  >
                    <Icono />
                    {m.etiqueta}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-[#8A94A6]">{MODO_DESCRIPCIONES[modo]}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[13.5px] font-bold text-navy">Color de puntos</span>
              <label className="mt-2 flex h-11 cursor-pointer items-center gap-2.5 rounded-[9px] border border-[#E2E8F0] bg-white pl-1.5 pr-3 hover:border-navy/30">
                <span
                  className="h-7 w-7 shrink-0 rounded-full border border-black/10 shadow-sm"
                  style={{ background: colorPuntos }}
                />
                <span className="text-[12.5px] font-semibold uppercase tracking-wide text-navy">
                  {colorPuntos}
                </span>
                <input
                  type="color"
                  value={colorPuntos}
                  onChange={(e) => setColorPuntos(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
            <div>
              <span className="text-[13.5px] font-bold text-navy">Color de fondo</span>
              <label className="mt-2 flex h-11 cursor-pointer items-center gap-2.5 rounded-[9px] border border-[#E2E8F0] bg-white pl-1.5 pr-3 hover:border-navy/30">
                <span
                  className="h-7 w-7 shrink-0 rounded-full border border-black/10 shadow-sm"
                  style={{ background: colorFondo }}
                />
                <span className="text-[12.5px] font-semibold uppercase tracking-wide text-navy">
                  {colorFondo}
                </span>
                <input
                  type="color"
                  value={colorFondo}
                  onChange={(e) => setColorFondo(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          {!contrasteOk && (
            <p className="text-xs text-[#DC2626]">
              {contraste < 4.5
                ? `El contraste entre puntos y fondo es muy bajo (${contraste.toFixed(1)}:1). Se requiere al menos 4.5:1.`
                : 'Los puntos deben ser más oscuros que el fondo.'}
            </p>
          )}

          {modo === 'arte' && (
            <>
              <label className="block">
                <span className="flex items-center justify-between text-[13.5px] font-bold text-navy">
                  Tamaño de puntos
                  <span className="rounded-full bg-[#F6F8FC] px-2 py-0.5 text-[11px] font-bold text-[#4A5568]">
                    {Math.round(radioPunto * 200)}%
                  </span>
                </span>
                <input
                  type="range"
                  min="0.34"
                  max="0.5"
                  step="0.02"
                  value={radioPunto}
                  onChange={(e) => setRadioPunto(Number(e.target.value))}
                  className="mt-2.5 w-full accent-orange"
                />
                <p className="mt-1 text-xs text-[#8A94A6]">
                  Puntos más grandes escanean mejor; más chicos dejan ver más el logo.
                </p>
              </label>
              <label className="block">
                <span className="flex items-center justify-between text-[13.5px] font-bold text-navy">
                  Intensidad del logo
                  <span className="rounded-full bg-[#F6F8FC] px-2 py-0.5 text-[11px] font-bold text-[#4A5568]">
                    {Math.round(opacidadLogo * 100)}%
                  </span>
                </span>
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.05"
                  value={opacidadLogo}
                  onChange={(e) => setOpacidadLogo(Number(e.target.value))}
                  className="mt-2.5 w-full accent-orange"
                />
                <p className="mt-1 text-xs text-[#8A94A6]">
                  Si el QR no escanea, baja la intensidad o agranda los puntos.
                </p>
              </label>
              <label className="block">
                <span className="flex items-center justify-between text-[13.5px] font-bold text-navy">
                  Prioridad al logo
                  <span className="rounded-full bg-[#F6F8FC] px-2 py-0.5 text-[11px] font-bold text-[#4A5568]">
                    {Math.round(prioridadLogo * 100)}%
                  </span>
                </span>
                <input
                  type="range"
                  min="0"
                  max={ARTE_PRIORIDAD_MAX}
                  step="0.1"
                  value={prioridadLogo}
                  onChange={(e) => setPrioridadLogo(Number(e.target.value))}
                  className="mt-2.5 w-full accent-orange"
                />
                <p className="mt-1 text-xs text-[#8A94A6]">
                  Usa parte de la corrección de errores del QR para no agujerear tu logo. Más
                  alto = logo más limpio, pero menos margen ante manchas o reflejos.
                </p>
              </label>
            </>
          )}

          {modo !== 'logo' && modo !== 'arte' && (
            <label className="block">
              <span className="flex items-center justify-between text-[13.5px] font-bold text-navy">
                Sensibilidad del logo
                <span className="rounded-full bg-[#F6F8FC] px-2 py-0.5 text-[11px] font-bold text-[#4A5568]">
                  {sensibilidad}
                </span>
              </span>
              <input
                type="range"
                min="0"
                max="255"
                value={sensibilidad}
                onChange={(e) => setSensibilidad(Number(e.target.value))}
                className="mt-2.5 w-full accent-orange"
              />
              <p className="mt-1 text-xs text-[#8A94A6]">
                Ajusta qué tan claros/oscuros del logo se consideran parte del diseño.
              </p>
            </label>
          )}

          {error && <p className="text-xs text-[#DC2626]">{error}</p>}

          <button
            type="button"
            onClick={guardarConfig}
            disabled={guardando}
            className="h-11 w-full rounded-[9px] bg-orange text-[13.5px] font-semibold text-white hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : guardado ? '¡Guardado!' : 'Guardar configuración'}
          </button>
        </div>

        {/* Columna derecha: vista previa */}
        <div className="flex flex-col items-center rounded-[14px] border border-[#E2E8F0] bg-white p-[22px]">
          <span className="self-start text-sm font-bold text-navy">Vista previa</span>

          <div className="flex w-full flex-1 flex-col items-center justify-center">
            <div className="mt-4 w-full max-w-[400px] rounded-[14px] border border-[#E2E8F0] bg-[#F6F8FC] p-5 text-center">
              <p className="text-sm font-bold text-navy">{restaurante?.nombre ?? 'Tu restaurante'}</p>
              <p className="mt-0.5 text-xs text-[#4A5568]">Escanea para ver la carta</p>
              <div className="mx-auto mt-4 flex aspect-square w-full max-w-[340px] items-center justify-center overflow-hidden rounded-[10px] bg-white p-2">
                {svgMarkup ? (
                  <div
                    className="flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: svgMarkup }}
                  />
                ) : (
                  <span className="text-xs text-[#8A94A6]">Generando...</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold">
                {ajustando ? (
                  <span className="text-[#8A94A6]">Ajustando el logo automáticamente...</span>
                ) : validando ? (
                  <span className="text-[#8A94A6]">Verificando...</span>
                ) : decodificaOk && contrasteOk ? (
                  <>
                    <CheckIcon />
                    <span className="text-[#16A34A]">Escanea correctamente</span>
                  </>
                ) : (
                  <>
                    <WarnIcon />
                    <span className="text-[#B45309]">
                      {decodificaOk ? 'Revisar contraste' : 'Este diseño podría no escanearse'}
                    </span>
                  </>
                )}
              </div>
            </div>
  
            <div className="mt-5 grid w-full max-w-[400px] grid-cols-2 gap-3">
              <button
                type="button"
                onClick={descargarPng}
                disabled={!puedeDescargar}
                className="h-10 rounded-[9px] bg-navy text-[12.5px] font-semibold text-white hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Descargar PNG
              </button>
              <button
                type="button"
                onClick={descargarSvg}
                disabled={!puedeDescargar}
                className="h-10 rounded-[9px] border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-navy hover:bg-[#F6F8FC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Descargar SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

export default QrPersonalizado
