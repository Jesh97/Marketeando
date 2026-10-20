// Fuentes de Google que ofrece el editor. Antes se importaban TODAS desde
// index.css, así que cualquier página —incluido el menú público que abre un
// comensal con datos móviles— descargaba ~20 familias. Ahora cada página
// pide solo las que necesita: el editor todas, el menú público solo las que
// usa el diseño publicado.
const FAMILIAS = {
  Inter: 'Inter:wght@400;500;600;700;800',
  Roboto: 'Roboto:wght@400;600;700',
  Montserrat: 'Montserrat:wght@400;600;700',
  Poppins: 'Poppins:wght@400;600;700',
  Nunito: 'Nunito:wght@400;600;700',
  'Work Sans': 'Work+Sans:wght@400;600;700',
  Raleway: 'Raleway:wght@400;600;700',
  'Playfair Display': 'Playfair+Display:wght@400;600;700',
  Merriweather: 'Merriweather:wght@400;700',
  Lora: 'Lora:wght@400;600;700',
  'PT Serif': 'PT+Serif:wght@400;700',
  Oswald: 'Oswald:wght@400;600;700',
  'Bebas Neue': 'Bebas+Neue',
  Anton: 'Anton',
  'Abril Fatface': 'Abril+Fatface',
  Pacifico: 'Pacifico',
  'Dancing Script': 'Dancing+Script:wght@400;700',
  Caveat: 'Caveat:wght@400;700',
  Lobster: 'Lobster',
  'Noto Serif KR': 'Noto+Serif+KR:wght@400;700;900',
}

const cargadas = new Set()

export function cargarFuentes(nombres) {
  const pendientes = [...new Set(nombres)].filter((n) => FAMILIAS[n] && !cargadas.has(n))
  if (pendientes.length === 0 || typeof document === 'undefined') return
  pendientes.forEach((n) => cargadas.add(n))
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?' +
    pendientes.map((n) => `family=${FAMILIAS[n]}`).join('&') +
    '&display=swap'
  document.head.appendChild(link)
}

export function cargarFuentesDelEditor() {
  cargarFuentes(Object.keys(FAMILIAS))
}

// Nombres de familia que aparecen en un font-family CSS ("Playfair
// Display", serif → Playfair Display).
function familiasDeValor(valor) {
  return String(valor)
    .split(',')
    .map((f) => f.trim().replace(/^["']|["']$/g, ''))
    .filter((f) => FAMILIAS[f])
}

export function familiasEnElementos(elements = []) {
  return elements.flatMap((el) => (el.fontFamily ? familiasDeValor(el.fontFamily) : []))
}

// Dentro de un atributo style las comillas de "Playfair Display" vienen
// escapadas como entidad (el backend re-serializa el HTML al sanearlo).
export function familiasEnHtml(html = '') {
  const plano = html.replace(/&quot;|&#34;|&#x22;/gi, "'")
  const encontradas = []
  for (const m of plano.matchAll(/font-family:\s*([^;"]+)/g)) encontradas.push(...familiasDeValor(m[1]))
  return encontradas
}
