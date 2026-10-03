// Plantillas iniciales del editor: mismo formato {canvas, elements} que
// produce el propio editor (ver EditorCanvas.jsx), para que abrir una
// plantilla sea indistinguible de abrir un diseño ya empezado. El usuario
// solo reemplaza los textos (y agrega sus fotos con el selector de platos)
// en vez de armar el layout desde cero.
//
// No usan imágenes externas a propósito (no tenemos assets propios que
// alojar): los "huecos" para fotos se resuelven con el picker de platos que
// ya existe en el editor.

function freshId() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Menú elegante: layout más elaborado (fondo oscuro, título script dorado,
// secciones con línea divisoria, ítems con iconos de alérgenos), armado con
// funciones ayudantes en vez de a mano para no desalinear las docenas de
// elementos que necesita.
function buildMenuElegante() {
  const GOLD = '#D4AF37'
  const GOLD_LIGHT = '#F2C57C'
  const TEXT_LIGHT = '#F5F5F5'
  const TEXT_MUTED = '#9CA3AF'
  const PANEL = '#1C1E24'

  const elements = []
  let z = 0
  function push(el) {
    z += 1
    elements.push({ ...el, zIndex: z })
  }
  function sticker(emoji, x, y, size, opacity) {
    push({
      type: 'text',
      text: emoji,
      isSticker: true,
      fontFamily: 'Inter, sans-serif',
      color: TEXT_LIGHT,
      fontWeight: '400',
      x,
      y,
      width: size,
      height: size,
      align: 'center',
      opacity: opacity ?? 100,
    })
  }
  function section(y, title) {
    push({
      type: 'text',
      text: title,
      x: 60,
      y,
      width: 220,
      height: 34,
      fontFamily: '"Playfair Display", serif',
      fontSize: 23,
      fontWeight: '700',
      color: GOLD,
      align: 'left',
    })
    push({ type: 'rect', x: 260, y: y + 16, width: 480, height: 2, fill: GOLD, opacity: 55 })
  }
  function dish(y, name, desc, tags) {
    push({
      type: 'text',
      text: name,
      x: 60,
      y,
      width: 540,
      height: 26,
      fontFamily: '"Playfair Display", serif',
      fontSize: 17,
      fontWeight: '700',
      color: TEXT_LIGHT,
      align: 'left',
    })
    tags.forEach((emoji, i) => sticker(emoji, 620 + i * 34, y - 2, 30))
    push({
      type: 'text',
      text: desc,
      x: 60,
      y: y + 28,
      width: 670,
      height: 40,
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      fontWeight: '400',
      color: TEXT_MUTED,
      align: 'left',
    })
  }

  // Franja superior: acá el usuario reemplaza con sus propias fotos (con el
  // selector de platos del editor) — no hay imágenes de stock que insertar.
  push({ type: 'rect', x: 0, y: 0, width: 800, height: 190, fill: PANEL })
  sticker('📷', 350, 40, 100, 35)
  push({
    type: 'text',
    text: 'Reemplazá esta franja con tus fotos',
    x: 200,
    y: 140,
    width: 400,
    height: 28,
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: TEXT_MUTED,
    align: 'center',
  })

  // Título
  push({
    type: 'text',
    text: 'Menú',
    x: 230,
    y: 210,
    width: 340,
    height: 100,
    fontFamily: '"Dancing Script", cursive',
    fontSize: 72,
    fontWeight: '700',
    color: GOLD,
    align: 'center',
  })

  // Medallón de precio
  push({
    type: 'ellipse',
    x: 600,
    y: 185,
    width: 130,
    height: 130,
    fill: GOLD_LIGHT,
    fillType: 'gradient',
    fillTo: '#C9971F',
    gradientAngle: 135,
    shadow: 18,
  })
  push({
    type: 'text',
    text: 'S/ 15',
    x: 600,
    y: 232,
    width: 130,
    height: 40,
    fontFamily: 'Inter, sans-serif',
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    align: 'center',
  })

  section(360, 'Entradas')
  dish(
    410,
    'Ensalada fusión mediterránea',
    'Lechuga, tomate, bonito, espárragos, brotes de soja, aceitunas negras y salsa rosa',
    ['🌾', '🥛', '🥜'],
  )
  dish(
    490,
    'Tostaditas de palta y langostinos',
    'Palta picada, langostinos a la plancha, tomate cherry, crema agria y mayonesa de chipotle',
    ['🦐', '🥑'],
  )

  section(580, 'Platos principales')
  dish(630, 'Salmón a la mantequilla de limón', 'Con papas asadas y brócoli salteado con panceta ahumada', [
    '🐟',
    '🧈',
  ])
  dish(710, 'Pizza marinera', 'Tomate, mozzarella, langostinos, calamares, anchoas y orégano', ['🌾', '🥛', '🦐'])

  section(800, 'Postres')
  dish(850, 'Duraznos al almíbar', 'Duraznos en almíbar con chocolate caliente', ['🥛', '🍫'])
  dish(930, 'Brownie', 'Con frutos rojos y chocolate blanco', ['🌾', '🥛'])

  // Footer
  push({ type: 'rect', x: 60, y: 1020, width: 680, height: 1, fill: GOLD, opacity: 40 })
  push({
    type: 'text',
    text: 'Nombre del local, dirección y ciudad · nombre@tunegocio.com',
    x: 60,
    y: 1035,
    width: 480,
    height: 20,
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: '400',
    color: TEXT_MUTED,
    align: 'left',
  })
  sticker('📞', 60, 1060, 24)
  push({
    type: 'text',
    text: '+51 234 567 890',
    x: 92,
    y: 1063,
    width: 200,
    height: 20,
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_MUTED,
    align: 'left',
  })
  sticker('📸', 260, 1060, 24)
  push({
    type: 'text',
    text: '@tunegocio',
    x: 292,
    y: 1063,
    width: 200,
    height: 20,
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_MUTED,
    align: 'left',
  })
  push({ type: 'rect', x: 680, y: 1015, width: 60, height: 60, fill: PANEL, strokeColor: GOLD, strokeWidth: 1 })
  push({
    type: 'text',
    text: 'TU LOGO',
    x: 680,
    y: 1038,
    width: 60,
    height: 20,
    fontFamily: 'Inter, sans-serif',
    fontSize: 8,
    fontWeight: '700',
    color: GOLD,
    align: 'center',
  })

  return {
    id: 'menu-elegante',
    name: 'Menú elegante',
    canvas: {
      width: 800,
      height: 1100,
      background: '#0D0E12',
      fillType: 'gradient',
      backgroundTo: '#000000',
      gradientAngle: 160,
    },
    elements,
  }
}

// Menú neón: tablero horizontal de 3 columnas, mucho más fiel a la
// estructura real del boceto "NEON NOODLE" (header + ticker en vivo + tres
// secciones con marca de agua tipo kanji, ítem estrella con foto e
// indicador de picante) que la versión anterior de una sola columna.
// Sigue sin JS, sin fotos externas ni reloj en vivo real — eso excede lo que
// un editor de piezas estáticas puede/debe hacer.
function buildMenuNeon() {
  const CYAN = '#00F0FF'
  const MAGENTA = '#FF2E93'
  const YELLOW = '#FFE600'
  const CARD = '#11141C'
  const CARD_LIGHT = '#181D28'
  const TEXT_MUTED = '#9CA3AF'
  const GLOW = { [CYAN]: 'rgba(0,240,255,0.45)', [MAGENTA]: 'rgba(255,46,147,0.45)', [YELLOW]: 'rgba(255,230,0,0.4)' }

  const elements = []
  let z = 0
  function push(el) {
    z += 1
    elements.push({ ...el, zIndex: z })
  }
  function text(x, y, w, h, str, opts) {
    push({
      type: 'text',
      text: str,
      x,
      y,
      width: w,
      height: h,
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: '400',
      color: '#F5F5F5',
      align: 'left',
      ...opts,
    })
  }
  function sticker(emoji, x, y, size, opacity) {
    push({
      type: 'text',
      text: emoji,
      isSticker: true,
      fontFamily: 'Inter, sans-serif',
      color: '#FFFFFF',
      fontWeight: '400',
      x,
      y,
      width: size,
      height: size,
      align: 'center',
      opacity: opacity ?? 100,
    })
  }
  function card(x, y, w, h, accent) {
    push({
      type: 'rect',
      x,
      y,
      width: w,
      height: h,
      fill: CARD,
      borderRadius: 12,
      strokeColor: accent,
      strokeWidth: 2,
      shadow: 16,
      shadowColor: GLOW[accent],
    })
  }
  function kanji(x, y, char, accent) {
    text(x, y, 160, 110, char, {
      fontFamily: 'Inter, sans-serif',
      fontSize: 72,
      fontWeight: '700',
      color: accent,
      align: 'right',
      opacity: 12,
    })
  }
  function sectionTitle(x, y, w, title, accent) {
    text(x, y, w, 30, title, {
      fontFamily: 'Oswald, sans-serif',
      fontSize: 20,
      fontWeight: '700',
      color: accent,
      align: 'left',
      letterSpacing: 1,
      shadow: 10,
      shadowColor: GLOW[accent],
    })
    push({ type: 'rect', x, y: y + 38, width: w, height: 1, fill: accent, opacity: 35 })
  }
  function dishRow(x, y, w, name, badgeText, badgeColor, price) {
    text(x, y, w, 24, name, { fontSize: 17, fontWeight: '700', color: '#F5F5F5' })
    push({ type: 'rect', x, y: y + 28, width: 70, height: 22, fill: badgeColor, borderRadius: 11 })
    text(x, y + 33, 70, 14, badgeText, { fontSize: 10, fontWeight: '700', color: '#08090D', align: 'center', letterSpacing: 1 })
    text(x + w - 130, y + 26, 130, 26, price, { fontSize: 18, fontWeight: '700', color: badgeColor, align: 'right' })
  }
  function desc(x, y, w, str) {
    text(x, y, w, 36, str, { fontSize: 12, fontWeight: '400', color: TEXT_MUTED })
  }
  function heat(x, y, w, level, label, accent) {
    text(x, y, w, 20, `${'🔥'.repeat(level)} ${label}`, { fontSize: 11, fontWeight: '700', color: accent })
  }
  function priceRow(x, y, w, name, price, accent) {
    text(x, y, w - 100, 22, name, { fontSize: 14, fontWeight: '600', color: '#F5F5F5' })
    text(x + w - 100, y, 100, 22, price, { fontSize: 14, fontWeight: '700', color: accent, align: 'right' })
  }

  // Resplandores ambiente: blobs de color desenfocados, como los "blur-3xl"
  // de la referencia, en vez de círculos translúcidos con bordes duros.
  push({ type: 'ellipse', x: 1150, y: -150, width: 500, height: 500, fill: CYAN, opacity: 45, blur: 80 })
  push({ type: 'ellipse', x: -150, y: 550, width: 460, height: 460, fill: MAGENTA, opacity: 40, blur: 80 })

  // Encabezado
  text(50, 28, 650, 56, 'TU RESTAURANTE', {
    fontFamily: 'Oswald, sans-serif',
    fontSize: 40,
    fontWeight: '700',
    color: CYAN,
    letterSpacing: 2,
    shadow: 14,
    shadowColor: GLOW[CYAN],
  })
  text(50, 86, 650, 22, 'NEÓN NOCTURNO · COCINA FUSIÓN', {
    fontFamily: 'Oswald, sans-serif',
    fontSize: 13,
    fontWeight: '600',
    color: MAGENTA,
    letterSpacing: 3,
  })

  // Badges de estado (horno / temperatura), al estilo de la telemetría del
  // boceto — estáticos, sin datos en vivo reales.
  push({ type: 'rect', x: 1140, y: 26, width: 200, height: 56, fill: CARD, borderRadius: 8, strokeColor: YELLOW, strokeWidth: 1 })
  sticker('🔥', 1152, 38, 32)
  text(1192, 34, 136, 16, 'HORNO ENCENDIDO', { fontSize: 10, fontWeight: '700', color: YELLOW, letterSpacing: 1 })
  text(1192, 52, 136, 14, '18H ACTIVO', { fontSize: 10, color: TEXT_MUTED })

  push({ type: 'rect', x: 1360, y: 26, width: 200, height: 56, fill: CARD, borderRadius: 8, strokeColor: MAGENTA, strokeWidth: 1 })
  sticker('🌡️', 1372, 38, 32)
  text(1412, 34, 136, 16, '320°C EN WOK', { fontSize: 10, fontWeight: '700', color: MAGENTA, letterSpacing: 1 })
  text(1412, 52, 136, 14, 'TEMPERATURA ALTA', { fontSize: 9, color: TEXT_MUTED })

  push({ type: 'rect', x: 50, y: 98, width: 1500, height: 1, fill: CYAN, opacity: 30 })

  // Ticker en vivo
  push({ type: 'rect', x: 50, y: 114, width: 1500, height: 44, fill: CARD, borderRadius: 8, strokeColor: CYAN, strokeWidth: 1 })
  push({ type: 'rect', x: 66, y: 124, width: 170, height: 24, fill: MAGENTA, borderRadius: 12 })
  text(66, 129, 170, 16, '🔴 SERVICIO NOCTURNO', { fontSize: 10, fontWeight: '700', color: '#FFFFFF', align: 'center', letterSpacing: 1 })
  text(256, 126, 900, 20, 'ALTO VOLTAJE DE SABOR · MENÚ ACTUALIZADO CADA NOCHE', {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fontWeight: '600',
    color: CYAN,
    letterSpacing: 1,
  })
  text(1350, 126, 170, 20, '[ESTADO: EN LÍNEA]', { fontSize: 10, fontWeight: '600', color: TEXT_MUTED, align: 'right' })

  // Columna 1 — Ramen y sopas
  card(50, 178, 480, 660, CYAN)
  kanji(350, 190, '拉麺', CYAN)
  sectionTitle(80, 202, 300, 'RAMEN Y SOPAS', CYAN)

  dishRow(80, 260, 420, 'Ramen shoyu tonkotsu', 'CASA', CYAN, 'S/ 24.00')
  desc(80, 316, 420, 'Caldo de cerdo 18 horas, chashu, huevo marinado, cebollín')

  dishRow(80, 370, 420, 'Ramen picante de miso', '🌶️🌶️', MAGENTA, 'S/ 26.00')
  desc(80, 426, 420, 'Miso fermentado, aceite de chile habanero, cerdo desmenuzado')
  heat(80, 464, 420, 4, 'NIVEL 4 · HABANERO', MAGENTA)

  push({ type: 'rect', x: 80, y: 780, width: 420, height: 50, fill: CARD_LIGHT, borderRadius: 8, strokeColor: CYAN, strokeWidth: 1 })
  text(96, 790, 260, 16, 'EXTRA DE FIDEOS (KAEDAMA)', { fontSize: 11, fontWeight: '700', color: CYAN, letterSpacing: 1 })
  text(96, 808, 260, 14, 'Añadilo al caldo caliente', { fontSize: 10, color: TEXT_MUTED })
  text(380, 792, 110, 26, '+S/ 8.00', { fontSize: 18, fontWeight: '700', color: YELLOW, align: 'right' })

  // Columna 2 — Wok y calle, con ítem estrella con foto
  card(570, 178, 480, 660, MAGENTA)
  kanji(870, 190, '熱炒', MAGENTA)
  sectionTitle(600, 202, 300, 'WOK Y CALLE', MAGENTA)

  push({ type: 'rect', x: 600, y: 256, width: 420, height: 190, fill: '#1c1e24', borderRadius: 10 })
  sticker('📷', 770, 310, 80, 30)
  text(650, 400, 320, 22, 'Reemplazá con tu foto estrella', { fontSize: 11, color: TEXT_MUTED, align: 'center' })
  push({ type: 'rect', x: 612, y: 266, width: 170, height: 26, fill: MAGENTA, borderRadius: 6, shadow: 10, shadowColor: GLOW[MAGENTA] })
  text(612, 272, 170, 14, '★ PLATO ESTRELLA', { fontSize: 9, fontWeight: '700', color: '#FFFFFF', align: 'center', letterSpacing: 1 })
  push({ type: 'rect', x: 930, y: 414, width: 80, height: 36, fill: '#08090D', borderRadius: 6, strokeColor: YELLOW, strokeWidth: 1 })
  text(930, 422, 80, 20, 'S/ 28', { fontSize: 15, fontWeight: '700', color: YELLOW, align: 'center' })

  text(600, 460, 420, 26, 'Fideos volcán con cerdo crocante', { fontSize: 17, fontWeight: '700', color: '#F5F5F5' })
  desc(600, 488, 420, 'Fideos dorados en salsa de tamarindo picante, cerdo doble cocción, maní tostado')
  heat(600, 526, 420, 3, 'NIVEL 3 · TAMARINDO PICANTE', MAGENTA)

  dishRow(600, 570, 420, 'Pad thai de langostinos', 'NUEVO', YELLOW, 'S/ 22.00')
  desc(600, 626, 420, 'Langostinos salteados, fideos de arroz, tamarindo, tofu, limón')

  // Columna 3 — Bocaditos y bebidas
  card(1090, 178, 480, 660, YELLOW)
  kanji(1390, 190, '点心', YELLOW)
  sectionTitle(1120, 202, 340, 'BOCADITOS Y BEBIDAS', YELLOW)

  priceRow(1120, 262, 420, 'Bao de cerdo braseado', 'S/ 12.00', YELLOW)
  desc(1120, 286, 420, 'Bollo al vapor, panceta braseada, mostaza encurtida')
  priceRow(1120, 328, 420, 'Gyoza crocantes de pato', 'S/ 13.00', YELLOW)
  desc(1120, 352, 420, 'Empanadillas doradas, pato ahumado, vinagre negro')
  priceRow(1120, 394, 420, 'Karaage picante', 'S/ 11.00', YELLOW)
  desc(1120, 418, 420, 'Pollo frito doble cocción, togarashi, mayonesa de ajo')

  push({ type: 'rect', x: 1120, y: 466, width: 420, height: 1, fill: YELLOW, opacity: 20 })
  text(1120, 478, 300, 20, 'BEBIDAS Y BOBA', { fontSize: 13, fontWeight: '700', color: CYAN, letterSpacing: 1 })
  priceRow(1120, 506, 420, 'Té de leche con boba de panela', 'S/ 9.00', CYAN)
  priceRow(1120, 536, 420, 'Limonada thai con menta', 'S/ 8.00', CYAN)

  push({
    type: 'rect',
    x: 1120,
    y: 770,
    width: 420,
    height: 60,
    fill: MAGENTA,
    fillType: 'gradient',
    fillTo: CARD,
    gradientAngle: 90,
    borderRadius: 10,
    shadow: 14,
    shadowColor: GLOW[MAGENTA],
  })
  text(1136, 780, 250, 18, 'MEJORÁ TU COMBO', { fontSize: 13, fontWeight: '700', color: '#FFFFFF' })
  text(1136, 798, 250, 16, 'Sumá bao + bebida', { fontSize: 10, color: YELLOW })
  push({ type: 'rect', x: 1440, y: 776, width: 90, height: 40, fill: '#08090D', borderRadius: 8, strokeColor: YELLOW, strokeWidth: 1 })
  text(1440, 786, 90, 22, '+S/ 12', { fontSize: 16, fontWeight: '700', color: YELLOW, align: 'center' })

  // Pie
  push({ type: 'rect', x: 50, y: 860, width: 1500, height: 60, fill: CARD, borderRadius: 10, strokeColor: CYAN, strokeWidth: 1 })
  text(80, 880, 760, 24, 'Escaneá el QR en tu mesa para pedir sin esperar', { fontSize: 13, fontWeight: '600', color: CYAN })
  text(900, 880, 610, 24, 'Contiene: gluten, maní, mariscos, soja. Consultá por alergias.', {
    fontSize: 11,
    color: TEXT_MUTED,
    align: 'right',
  })

  return {
    id: 'menu-neon',
    name: 'Menú neón',
    canvas: {
      width: 1600,
      height: 950,
      background: '#08090D',
      fillType: 'grid',
      gridColor: 'rgba(0,240,255,0.05)',
      gridSize: 34,
    },
    elements,
  }
}

// Tablero ahumado: tablero horizontal cálido (ámbar sobre gris oscuro)
// inspirado en el boceto "Ironwood Smokehouse" — tarjeta hero con foto y
// combo de upsell, columna de hamburguesas y columna de guarniciones/
// bebidas, en vez de sombra negra plana como en "Menú neón" (acá la sombra
// es realista, no glow, porque el estilo cálido no la necesita).
function buildTableroAhumado() {
  const AMBER = '#FFC174'
  const AMBER_DARK = '#F59E0B'
  const CARD = '#1B1B1F'
  const CARD_HIGH = '#292A2D'
  const TEXT_LIGHT = '#E3E2E6'
  const TEXT_MUTED = '#B8ABA0'
  const SHADOW = 'rgba(0,0,0,0.5)'

  const elements = []
  let z = 0
  function push(el) {
    z += 1
    elements.push({ ...el, zIndex: z })
  }
  function text(x, y, w, h, str, opts) {
    push({
      type: 'text',
      text: str,
      x,
      y,
      width: w,
      height: h,
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: '400',
      color: TEXT_LIGHT,
      align: 'left',
      ...opts,
    })
  }
  function sticker(emoji, x, y, size, opacity) {
    push({
      type: 'text',
      text: emoji,
      isSticker: true,
      fontFamily: 'Inter, sans-serif',
      color: TEXT_LIGHT,
      fontWeight: '400',
      x,
      y,
      width: size,
      height: size,
      align: 'center',
      opacity: opacity ?? 100,
    })
  }
  function card(x, y, w, h) {
    push({ type: 'rect', x, y, width: w, height: h, fill: CARD, borderRadius: 14, shadow: 18, shadowColor: SHADOW })
  }
  function sectionTitle(x, y, w, title) {
    text(x, y, w, 28, title, { fontFamily: 'Oswald, sans-serif', fontSize: 19, fontWeight: '700', color: AMBER, letterSpacing: 1 })
    push({ type: 'rect', x, y: y + 36, width: w, height: 1, fill: AMBER, opacity: 30 })
  }
  function priceRow(x, y, w, name, price) {
    text(x, y, w - 100, 22, name, { fontSize: 15, fontWeight: '600', color: TEXT_LIGHT })
    text(x + w - 100, y, 100, 22, price, { fontSize: 15, fontWeight: '700', color: AMBER, align: 'right' })
  }
  function desc(x, y, w, str) {
    text(x, y, w, 32, str, { fontSize: 12, color: TEXT_MUTED })
  }

  // Encabezado
  text(50, 30, 600, 54, 'TU RESTAURANTE', { fontFamily: 'Oswald, sans-serif', fontSize: 38, fontWeight: '700', color: AMBER, letterSpacing: 2 })
  text(50, 88, 500, 22, 'AHUMADERO ARTESANAL', { fontFamily: 'Oswald, sans-serif', fontSize: 12, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 3 })

  push({ type: 'rect', x: 1360, y: 28, width: 190, height: 56, fill: CARD_HIGH, borderRadius: 10 })
  text(1376, 36, 160, 26, '12:48 PM', { fontSize: 20, fontWeight: '700', color: AMBER })
  text(1376, 64, 160, 14, 'COCINA ACTIVA', { fontSize: 10, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1 })

  push({ type: 'rect', x: 50, y: 100, width: 1500, height: 40, fill: CARD, borderRadius: 6 })
  push({ type: 'rect', x: 66, y: 108, width: 190, height: 24, fill: AMBER, borderRadius: 12 })
  text(66, 113, 190, 16, '🔥 AHORA AHUMANDO', { fontSize: 10, fontWeight: '700', color: '#121316', align: 'center', letterSpacing: 1 })
  text(272, 110, 900, 20, 'Especial del pitmaster: brisket doble ahumado en leña de roble · Plancha a 520°F', {
    fontSize: 12,
    fontWeight: '600',
    color: AMBER,
  })

  // Columna 1 — Hero con foto y combo
  card(50, 156, 620, 700)
  push({ type: 'rect', x: 80, y: 180, width: 190, height: 30, fill: AMBER, borderRadius: 15 })
  text(80, 187, 190, 16, '✓ CORTE DEL CHEF', { fontSize: 11, fontWeight: '700', color: '#121316', align: 'center', letterSpacing: 1 })
  push({ type: 'rect', x: 282, y: 180, width: 170, height: 30, fill: CARD_HIGH, borderRadius: 15, strokeColor: AMBER, strokeWidth: 1 })
  text(282, 187, 170, 16, '🔥 AHUMADO SUAVE', { fontSize: 10, fontWeight: '700', color: AMBER, align: 'center', letterSpacing: 1 })
  text(470, 185, 130, 20, '940 KCAL', { fontSize: 11, fontWeight: '600', color: TEXT_MUTED, align: 'right' })

  text(80, 224, 560, 60, 'LA DOBLE TRUFA', { fontFamily: 'Anton, sans-serif', fontSize: 42, fontWeight: '400', color: TEXT_LIGHT })
  desc(80, 292, 560, 'Dos medallones prensados, mantequilla de tuétano trufada, cebolla caramelizada, gouda ahumado, pan brioche de carbón.')

  push({ type: 'rect', x: 80, y: 380, width: 560, height: 260, fill: '#0D0E11', borderRadius: 10 })
  sticker('📷', 310, 460, 100, 30)
  text(180, 580, 360, 24, 'Reemplazá con tu foto del plato', { fontSize: 12, color: TEXT_MUTED, align: 'center' })
  push({ type: 'rect', x: 100, y: 596, width: 170, height: 32, fill: '#0D0E11', opacity: 85, borderRadius: 8 })
  text(100, 604, 170, 16, '⏱ Sellado: 120s', { fontSize: 10, fontWeight: '600', color: AMBER, align: 'center' })

  push({ type: 'rect', x: 80, y: 660, width: 560, height: 64, fill: CARD_HIGH, borderRadius: 10 })
  text(100, 672, 250, 16, 'PEDIDO INDIVIDUAL', { fontSize: 10, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1 })
  text(100, 690, 250, 26, 'Corte Señal', { fontSize: 20, fontWeight: '700', color: TEXT_LIGHT })
  text(480, 678, 140, 40, 'S/ 32.00', { fontFamily: 'Oswald, sans-serif', fontSize: 30, fontWeight: '700', color: AMBER, align: 'right' })

  push({ type: 'rect', x: 80, y: 736, width: 560, height: 88, fill: '#2A1C08', borderRadius: 10 })
  push({ type: 'ellipse', x: 100, y: 752, width: 48, height: 48, fill: AMBER })
  text(100, 760, 48, 32, '+', { fontSize: 24, fontWeight: '700', color: '#121316', align: 'center' })
  text(164, 750, 300, 22, 'Hacelo combo', { fontSize: 16, fontWeight: '700', color: AMBER })
  text(164, 774, 300, 20, 'Papas rústicas + bebida grande', { fontSize: 12, color: TEXT_MUTED })
  text(470, 754, 140, 32, '+S/ 9.00', { fontSize: 22, fontWeight: '700', color: AMBER, align: 'right' })

  // Columna 2 — Hamburguesas
  card(690, 156, 430, 700)
  sectionTitle(720, 180, 370, 'HAMBURGUESAS DE HIERRO')

  text(720, 236, 260, 22, 'Clásica OG', { fontSize: 16, fontWeight: '700', color: TEXT_LIGHT })
  push({ type: 'rect', x: 720, y: 262, width: 90, height: 20, fill: CARD_HIGH, borderRadius: 10 })
  text(720, 266, 90, 12, 'FAVORITA', { fontSize: 9, fontWeight: '700', color: AMBER, align: 'center' })
  text(1000, 236, 90, 24, 'S/ 11.00', { fontSize: 16, fontWeight: '700', color: AMBER, align: 'right' })
  desc(720, 290, 370, 'Carne aplastada, queso americano, cebolla encurtida, salsa especial')

  text(720, 340, 260, 22, 'Ahumada BBQ', { fontSize: 16, fontWeight: '700', color: TEXT_LIGHT })
  push({ type: 'rect', x: 720, y: 366, width: 80, height: 20, fill: AMBER, borderRadius: 10 })
  text(720, 370, 80, 12, 'NUEVO', { fontSize: 9, fontWeight: '700', color: '#121316', align: 'center' })
  text(1000, 340, 90, 24, 'S/ 13.00', { fontSize: 16, fontWeight: '700', color: AMBER, align: 'right' })
  desc(720, 394, 370, 'Doble carne, tocino ahumado, aros de cebolla, salsa BBQ casera')

  text(720, 444, 260, 22, 'Portobello vegetariana', { fontSize: 16, fontWeight: '700', color: TEXT_LIGHT })
  push({ type: 'rect', x: 720, y: 470, width: 90, height: 20, fill: CARD_HIGH, borderRadius: 10 })
  text(720, 474, 90, 12, 'VEG 🌱', { fontSize: 9, fontWeight: '700', color: AMBER, align: 'center' })
  text(1000, 444, 90, 24, 'S/ 10.00', { fontSize: 16, fontWeight: '700', color: AMBER, align: 'right' })
  desc(720, 498, 370, 'Portobello a la plancha, queso suizo, rúcula, alioli de ajo asado')

  push({ type: 'rect', x: 720, y: 780, width: 370, height: 50, fill: CARD_HIGH, borderRadius: 8 })
  text(736, 790, 220, 16, 'PAN SIN GLUTEN', { fontSize: 11, fontWeight: '700', color: AMBER, letterSpacing: 1 })
  text(736, 808, 220, 14, 'Disponible para cualquier burger', { fontSize: 10, color: TEXT_MUTED })
  text(1000, 792, 90, 26, '+S/ 3.00', { fontSize: 16, fontWeight: '700', color: AMBER, align: 'right' })

  // Columna 3 — Guarniciones y bebidas
  card(1140, 156, 410, 700)
  sectionTitle(1170, 180, 350, 'GUARNICIONES')

  priceRow(1170, 236, 350, 'Papas rústicas', 'S/ 6.00')
  priceRow(1170, 278, 350, 'Aros de cebolla crocantes', 'S/ 7.00')
  priceRow(1170, 320, 350, 'Ensalada de col', 'S/ 5.00')
  priceRow(1170, 362, 350, 'Maíz asado con chile', 'S/ 6.50')

  push({ type: 'rect', x: 1170, y: 410, width: 350, height: 1, fill: AMBER, opacity: 25 })
  text(1170, 422, 300, 20, 'BEBIDAS', { fontSize: 13, fontWeight: '700', color: AMBER, letterSpacing: 1 })
  priceRow(1170, 450, 350, 'Limonada de romero', 'S/ 7.00')
  priceRow(1170, 492, 350, 'Cerveza artesanal', 'S/ 12.00')
  priceRow(1170, 534, 350, 'Té helado de durazno', 'S/ 6.00')

  push({
    type: 'rect',
    x: 1170,
    y: 770,
    width: 350,
    height: 60,
    fill: AMBER,
    fillType: 'gradient',
    fillTo: CARD,
    gradientAngle: 90,
    borderRadius: 10,
  })
  text(1186, 780, 200, 18, 'PACK PARA COMPARTIR', { fontSize: 12, fontWeight: '700', color: '#121316' })
  text(1186, 798, 200, 16, '2 guarniciones + 2 bebidas', { fontSize: 10, fontWeight: '600', color: '#3A2A10' })
  push({ type: 'rect', x: 1440, y: 776, width: 70, height: 40, fill: '#121316', borderRadius: 8 })
  text(1440, 786, 70, 22, '+S/ 14', { fontSize: 14, fontWeight: '700', color: AMBER, align: 'center' })

  // Pie
  push({ type: 'rect', x: 50, y: 866, width: 1500, height: 54, fill: CARD, borderRadius: 10 })
  text(80, 884, 760, 22, 'Pedí en el mostrador #2 o escaneá el QR de tu mesa', { fontSize: 13, fontWeight: '600', color: AMBER })
  text(900, 884, 610, 22, 'Aviso: contiene lácteos, gluten y frutos secos según preparación', {
    fontSize: 11,
    color: TEXT_MUTED,
    align: 'right',
  })

  return {
    id: 'tablero-ahumado',
    name: 'Tablero ahumado',
    canvas: {
      width: 1600,
      height: 940,
      background: AMBER_DARK,
      fillType: 'gradient',
      backgroundTo: '#121316',
      gradientAngle: 160,
    },
    elements,
  }
}

// Pizzería a la leña: tablero horizontal cálido inspirado en un boceto de
// pizzería napolitana — comparte paleta con "Tablero ahumado" (tiene
// sentido: ambos son negocios de cocina a fuego de leña), pero con su propio
// contenido: matriz de precios por tamaño, foto hero con maridaje de vino y
// un bento de ingredientes, y una columna de antipasti/pasta/bebidas.
function buildPizzeriaLena() {
  const AMBER = '#FFC174'
  const AMBER_DARK = '#F59E0B'
  const CARD = '#1B1B1F'
  const CARD_HIGH = '#292A2D'
  const TEXT_LIGHT = '#E3E2E6'
  const TEXT_MUTED = '#B8ABA0'
  const SHADOW = 'rgba(0,0,0,0.5)'

  const elements = []
  let z = 0
  function push(el) {
    z += 1
    elements.push({ ...el, zIndex: z })
  }
  function text(x, y, w, h, str, opts) {
    push({
      type: 'text',
      text: str,
      x,
      y,
      width: w,
      height: h,
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: '400',
      color: TEXT_LIGHT,
      align: 'left',
      ...opts,
    })
  }
  function sticker(emoji, x, y, size, opacity) {
    push({
      type: 'text',
      text: emoji,
      isSticker: true,
      fontFamily: 'Inter, sans-serif',
      color: TEXT_LIGHT,
      fontWeight: '400',
      x,
      y,
      width: size,
      height: size,
      align: 'center',
      opacity: opacity ?? 100,
    })
  }
  function card(x, y, w, h) {
    push({ type: 'rect', x, y, width: w, height: h, fill: CARD, borderRadius: 14, shadow: 18, shadowColor: SHADOW })
  }
  function eyebrow(x, y, w, str) {
    text(x, y, w, 16, str, { fontSize: 10, fontWeight: '700', color: AMBER, letterSpacing: 1 })
  }
  function heading(x, y, w, str) {
    text(x, y, w, 30, str, { fontFamily: 'Oswald, sans-serif', fontSize: 20, fontWeight: '700', color: TEXT_LIGHT })
  }
  function badgeTag(x, y, label) {
    push({ type: 'rect', x, y, width: 60, height: 18, fill: CARD_HIGH, borderRadius: 4 })
    text(x, y + 2, 60, 12, label, { fontSize: 8, fontWeight: '700', color: AMBER, align: 'center', letterSpacing: 1 })
  }
  function pizzaRow(x, y, w, badgeLabel, name, desc, priceMed, priceLg) {
    badgeTag(x, y, badgeLabel)
    text(x + 68, y - 2, w - 68 - 132, 22, name, { fontSize: 15, fontWeight: '700', color: TEXT_LIGHT })
    text(x + w - 132, y - 2, 62, 22, priceMed, { fontSize: 14, fontWeight: '700', color: AMBER, align: 'center' })
    text(x + w - 66, y - 2, 66, 22, priceLg, { fontSize: 14, fontWeight: '700', color: AMBER, align: 'center' })
    text(x, y + 24, w, 18, desc, { fontSize: 11, color: TEXT_MUTED })
  }
  function listRow(x, y, w, name, price, desc) {
    text(x, y, w - 80, 20, name, { fontSize: 15, fontWeight: '700', color: TEXT_LIGHT })
    text(x + w - 80, y, 80, 20, price, { fontSize: 15, fontWeight: '700', color: AMBER, align: 'right' })
    text(x, y + 22, w, 16, desc, { fontSize: 10, color: TEXT_MUTED })
  }
  function drinkRow(x, y, w, name, subtitle, price) {
    text(x, y, w - 90, 18, name, { fontSize: 13, fontWeight: '600', color: TEXT_LIGHT })
    text(x + w - 90, y, 90, 18, price, { fontSize: 13, fontWeight: '700', color: AMBER, align: 'right' })
    text(x, y + 18, w, 14, subtitle, { fontSize: 9, color: TEXT_MUTED })
  }

  // Encabezado
  text(50, 30, 600, 54, 'TU RESTAURANTE', { fontFamily: 'Oswald, sans-serif', fontSize: 38, fontWeight: '700', color: AMBER, letterSpacing: 2 })
  text(50, 88, 500, 22, 'PIZZERÍA A LA LEÑA', { fontFamily: 'Oswald, sans-serif', fontSize: 12, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 3 })

  push({ type: 'rect', x: 1360, y: 28, width: 190, height: 56, fill: CARD_HIGH, borderRadius: 10 })
  text(1376, 36, 160, 26, '12:48 PM', { fontSize: 20, fontWeight: '700', color: AMBER })
  text(1376, 64, 160, 14, 'COCINA ACTIVA', { fontSize: 10, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 1 })

  push({ type: 'rect', x: 50, y: 100, width: 1500, height: 40, fill: CARD, borderRadius: 6 })
  sticker('🔥', 66, 108, 24)
  text(98, 110, 220, 20, 'HORNO A LEÑA: 485°C', { fontSize: 11, fontWeight: '700', color: AMBER, letterSpacing: 1 })
  text(340, 110, 500, 20, 'Fermentación 72h con masa madre natural', { fontSize: 11, fontWeight: '500', color: TEXT_MUTED })
  text(950, 110, 560, 20, 'Tomate San Marzano D.O.P. certificado', { fontSize: 11, fontWeight: '600', color: TEXT_LIGHT, align: 'right' })

  // Columna 1 — Pizzas clásicas (matriz de precios por tamaño)
  card(50, 156, 460, 700)
  push({ type: 'rect', x: 340, y: 176, width: 140, height: 24, fill: AMBER, borderRadius: 12 })
  text(340, 182, 140, 14, 'HORNEADA EN 90S', { fontSize: 9, fontWeight: '700', color: '#121316', align: 'center', letterSpacing: 1 })
  eyebrow(80, 180, 250, '01 · TRADICIÓN PURA')
  heading(80, 200, 300, 'PIZZAS CLÁSICAS')
  text(80, 238, 400, 36, 'Borde artesanal ampollado, tomate San Marzano triturado, mozzarella fresca', { fontSize: 12, color: TEXT_MUTED })

  push({ type: 'rect', x: 80, y: 284, width: 400, height: 28, fill: CARD_HIGH, borderRadius: 6 })
  text(96, 291, 180, 14, 'MATRIZ DE PRECIOS', { fontSize: 9, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 })
  text(340, 291, 140, 14, '12" / 16"', { fontSize: 9, fontWeight: '700', color: AMBER, align: 'right', letterSpacing: 1 })

  pizzaRow(80, 326, 400, 'D.O.P.', 'Margherita D.O.P.', 'San Marzano, mozzarella di bufala, albahaca fresca', '$14', '$21')
  pizzaRow(80, 404, 400, 'PICANTE', 'Diavola Rústica', 'Salame calabrés, ñduja, mozzarella, chile en hojuelas', '$16', '$23')
  pizzaRow(80, 482, 400, 'BLANCA', 'Quattro Formaggi', 'Gorgonzola, provola ahumada, pecorino, tomillo', '$17', '$24')
  pizzaRow(80, 560, 400, 'BOSQUE', 'Prosciutto e Funghi', 'Champiñones asados, jamón cocido, mantequilla de tomillo', '$16', '$23')

  push({ type: 'rect', x: 80, y: 650, width: 400, height: 70, fill: CARD_HIGH, borderRadius: 10 })
  sticker('🌾', 96, 665, 40)
  text(146, 662, 310, 16, 'HARINA TIPO 00', { fontSize: 11, fontWeight: '700', color: AMBER, letterSpacing: 1 })
  text(146, 682, 310, 30, 'Masa madre natural refrescada a diario desde 2011', { fontSize: 10, color: TEXT_MUTED })

  // Columna 2 — Hero con foto, bento de ingredientes y maridaje
  card(530, 156, 560, 700)
  push({ type: 'rect', x: 530, y: 156, width: 560, height: 280, fill: '#0D0E11', borderRadius: 12 })
  sticker('📷', 760, 250, 100, 30)
  text(630, 380, 360, 24, 'Reemplazá con tu foto del plato', { fontSize: 12, color: TEXT_MUTED, align: 'center' })

  push({ type: 'rect', x: 550, y: 176, width: 190, height: 32, fill: AMBER, borderRadius: 6 })
  text(550, 184, 190, 18, 'OBRA DEL CHEF', { fontSize: 12, fontWeight: '700', color: '#121316', align: 'center' })

  push({ type: 'rect', x: 990, y: 176, width: 90, height: 60, fill: '#0D0E11', opacity: 90, borderRadius: 10 })
  text(990, 184, 90, 12, 'DESDE', { fontSize: 8, color: TEXT_MUTED, align: 'center', letterSpacing: 1 })
  text(990, 198, 90, 32, '$23', { fontFamily: 'Oswald, sans-serif', fontSize: 26, fontWeight: '700', color: AMBER, align: 'center' })

  push({ type: 'rect', x: 550, y: 406, width: 250, height: 28, fill: '#0D0E11', opacity: 80, borderRadius: 6 })
  text(550, 412, 250, 16, '✓ Borde moteado · 90 seg', { fontSize: 10, fontWeight: '600', color: TEXT_LIGHT, align: 'center' })

  eyebrow(560, 452, 350, 'SELECCIÓN ESPECIAL DEL MES')
  text(930, 452, 140, 16, '1,120 KCAL · 14"', { fontSize: 10, color: TEXT_MUTED, align: 'right' })
  text(560, 472, 520, 50, 'LA CAPRICCIOSA ESPECIAL', { fontFamily: 'Anton, sans-serif', fontSize: 30, fontWeight: '400', color: TEXT_LIGHT })
  text(560, 526, 520, 54, 'Tomate San Marzano triturado, mozzarella de búfala, alcachofas a la parrilla, prosciutto de Parma curado 24 meses, champiñones silvestres y aceitunas kalamata.', {
    fontSize: 12,
    color: TEXT_MUTED,
  })

  const bento = [
    ['TOMATE', 'San Marzano D.O.P.'],
    ['QUESO', 'Búfala de Caserta'],
    ['FIAMBRE', 'Parma 24 meses'],
  ]
  bento.forEach(([label, value], i) => {
    const bx = 560 + i * 177
    push({ type: 'rect', x: bx, y: 592, width: 166, height: 54, fill: CARD_HIGH, borderRadius: 8 })
    text(bx + 12, 600, 142, 14, label, { fontSize: 9, fontWeight: '700', color: AMBER, letterSpacing: 1 })
    text(bx + 12, 616, 142, 24, value, { fontSize: 11, color: TEXT_LIGHT })
  })

  push({ type: 'rect', x: 560, y: 660, width: 520, height: 70, fill: '#0D0E11', borderRadius: 10 })
  sticker('🍷', 576, 676, 38)
  text(624, 670, 300, 14, 'MARIDAJE RECOMENDADO', { fontSize: 9, fontWeight: '700', color: AMBER, letterSpacing: 1 })
  text(624, 686, 300, 20, 'Chianti Classico Riserva 2019', { fontSize: 14, fontWeight: '700', color: TEXT_LIGHT })
  text(624, 706, 300, 16, 'Sangiovese toscano, notas de cereza y acidez fresca', { fontSize: 10, color: TEXT_MUTED })
  text(980, 676, 90, 28, '+$9', { fontSize: 20, fontWeight: '700', color: AMBER, align: 'right' })
  text(980, 706, 90, 14, 'Copa 150ml', { fontSize: 9, color: TEXT_MUTED, align: 'right' })

  // Columna 3 — Antipasti, pasta y bebidas
  card(1130, 156, 420, 700)
  eyebrow(1160, 180, 300, '02 · COCINA ARTESANAL')
  heading(1160, 200, 350, 'ANTIPASTI Y PASTA')
  push({ type: 'rect', x: 1160, y: 236, width: 350, height: 1, fill: AMBER, opacity: 30 })

  listRow(1160, 252, 350, 'Arancini de trufa', '$12', 'Risotto crocante, trufa negra, taleggio, alioli')
  listRow(1160, 308, 350, 'Burrata Pugliese', '$15', 'Tomates cherry confitados, aceite de albahaca, pan tostado')
  listRow(1160, 364, 350, 'Rigatoni al Ragú', '$18', 'Res braseada lenta, sangiovese, parmesano 36 meses')
  listRow(1160, 420, 350, 'Gnocchi Sorrentina', '$16', 'Ñoquis de papa, provola ahumada, albahaca')

  push({ type: 'rect', x: 1160, y: 470, width: 350, height: 1, fill: AMBER, opacity: 20 })
  text(1160, 482, 350, 18, 'VINOS Y CERVEZAS ARTESANALES', { fontSize: 12, fontWeight: '700', color: AMBER, letterSpacing: 1 })

  drinkRow(1160, 508, 350, 'Birra Moretti', 'Lager fresca · 4.8% · Pinta 470ml', '$8')
  drinkRow(1160, 548, 350, 'Vino de la casa (Montepulciano)', 'Garrafa 500ml o copa 250ml', '$14/$8')
  drinkRow(1160, 588, 350, 'San Pellegrino y limonada bio', 'Con gas o Aranciata Rossa 330ml', '$4.50')

  // Pie
  push({ type: 'rect', x: 50, y: 870, width: 1500, height: 54, fill: CARD, borderRadius: 10 })
  sticker('⏱', 66, 882, 30)
  text(106, 888, 700, 22, 'Tiempo de servicio: 6-8 minutos · Horneado a la vista', { fontSize: 13, fontWeight: '600', color: AMBER })
  text(900, 888, 610, 22, 'Avisá al mozo sobre alergias o restricciones alimentarias', { fontSize: 11, color: TEXT_MUTED, align: 'right' })

  return {
    id: 'pizzeria-lena',
    name: 'Pizzería a la leña',
    canvas: {
      width: 1600,
      height: 940,
      background: AMBER_DARK,
      fillType: 'gradient',
      backgroundTo: '#121316',
      gradientAngle: 160,
    },
    elements,
  }
}

// Menú coreano: hoja única estilo papel vintage, inspirada en un boceto de
// restaurante coreano de costa — marco navy, título grande con caracteres
// hangul y un sello estilo hanko, dos columnas con listas (Banchan/Kimchi y
// Small Plates) y un footer de bebidas en 3 categorías. Sin la ilustración
// decorativa de paisaje ni el grabado de ola del boceto (son SVG a mano, no
// algo que el editor pueda componer) y sin el "leader" punteado entre
// nombre y precio (necesitaría medir texto dinámicamente); en su lugar usa
// alineación limpia izquierda/derecha, igual que el resto de las plantillas.
function buildMenuCoreano() {
  const NAVY = '#1A3242'
  const SLATE = '#3D5C6F'
  const CRIMSON = '#B84433'
  const RUST = '#B14534'
  const SEPIA_TEXT = '#231E1A'
  const SEPIA_SUB = '#5C544C'
  const PAPER = '#F4EEE1'
  const PAPER_DARK = '#EADECB'

  const elements = []
  let z = 0
  function push(el) {
    z += 1
    elements.push({ ...el, zIndex: z })
  }
  function text(x, y, w, h, str, opts) {
    push({
      type: 'text',
      text: str,
      x,
      y,
      width: w,
      height: h,
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: '400',
      color: SEPIA_TEXT,
      align: 'left',
      ...opts,
    })
  }
  function sticker(emoji, x, y, size, opacity) {
    push({
      type: 'text',
      text: emoji,
      isSticker: true,
      fontFamily: 'Inter, sans-serif',
      color: SEPIA_TEXT,
      fontWeight: '400',
      x,
      y,
      width: size,
      height: size,
      align: 'center',
      opacity: opacity ?? 100,
    })
  }
  function listItem(x, y, w, name, price) {
    text(x, y, w - 70, 20, name, { fontSize: 13, fontWeight: '600', color: SEPIA_TEXT })
    text(x + w - 70, y, 70, 20, price, { fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: '700', color: SEPIA_TEXT, align: 'right' })
  }
  function plateItem(x, y, w, name, price, desc) {
    text(x, y, w - 80, 22, name, { fontSize: 14, fontWeight: '700', color: NAVY })
    text(x + w - 80, y, 80, 22, price, { fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: '700', color: SEPIA_TEXT, align: 'right' })
    text(x, y + 22, w, 18, desc, { fontSize: 10, fontWeight: '400', color: SEPIA_SUB })
  }
  function drinkBox(x, title, rows) {
    push({ type: 'rect', x, y: 940, width: 250, height: 170, fill: PAPER_DARK, borderRadius: 6, strokeColor: 'rgba(61,92,111,0.35)', strokeWidth: 1 })
    text(x, 948, 250, 20, title, { fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: '700', color: NAVY, align: 'center', letterSpacing: 1 })
    push({ type: 'rect', x: x + 15, y: 972, width: 220, height: 1, fill: NAVY, opacity: 40 })
    rows.forEach(([name, price], i) => {
      const ry = 984 + i * 24
      text(x + 15, ry, 155, 18, name, { fontSize: 10, fontWeight: '500', color: SEPIA_TEXT })
      text(x + 165, ry, 70, 18, price, { fontFamily: 'Oswald, sans-serif', fontSize: 11, fontWeight: '700', color: SEPIA_TEXT, align: 'right' })
    })
  }

  // Marco exterior (mismo color que el fondo, solo se ve el borde).
  push({ type: 'rect', x: 20, y: 20, width: 860, height: 1210, fill: PAPER, strokeColor: NAVY, strokeWidth: 3 })

  // Encabezado
  text(50, 50, 800, 24, 'COCINA COREANA DE COSTA', { fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: '700', color: CRIMSON, align: 'center', letterSpacing: 3 })

  text(180, 95, 540, 110, 'HAEMUL', { fontFamily: 'Oswald, sans-serif', fontSize: 76, fontWeight: '700', color: NAVY, align: 'center' })

  text(740, 95, 50, 50, '해', { fontFamily: '"Noto Serif KR", serif', fontSize: 32, fontWeight: '900', color: SLATE, align: 'center' })
  text(740, 140, 50, 50, '물', { fontFamily: '"Noto Serif KR", serif', fontSize: 32, fontWeight: '900', color: SLATE, align: 'center' })

  push({ type: 'rect', x: 800, y: 95, width: 70, height: 85, fill: 'rgba(251,246,237,0.7)', strokeColor: CRIMSON, strokeWidth: 2 })
  text(800, 112, 70, 20, '바다', { fontFamily: '"Noto Serif KR", serif', fontSize: 13, fontWeight: '700', color: CRIMSON, align: 'center' })
  text(800, 138, 70, 20, '의맛', { fontFamily: '"Noto Serif KR", serif', fontSize: 13, fontWeight: '700', color: CRIMSON, align: 'center' })

  push({ type: 'rect', x: 50, y: 225, width: 800, height: 1, fill: '#B8B0A0' })
  text(50, 235, 800, 22, '— SABORES DEL MAR Y LA MONTAÑA DE COREA —', { fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: '600', color: NAVY, align: 'center', letterSpacing: 2 })
  text(50, 260, 800, 20, 'Ingredientes de temporada, recetas transmitidas, mesas compartidas.', { fontFamily: '"PT Serif", serif', fontSize: 12, color: SEPIA_SUB, align: 'center' })
  push({ type: 'rect', x: 50, y: 290, width: 800, height: 2, fill: NAVY })

  // Columna izquierda — Banchan y Kimchi
  text(50, 310, 300, 44, 'BANCHAN', { fontFamily: 'Oswald, sans-serif', fontSize: 30, fontWeight: '700', color: SLATE })
  text(50, 352, 300, 32, 'Pequeños acompañamientos del día. Se sirven al centro para compartir.', { fontFamily: '"PT Serif", serif', fontSize: 11, color: SEPIA_SUB })
  push({ type: 'rect', x: 50, y: 386, width: 380, height: 1, fill: NAVY, opacity: 60 })

  listItem(50, 396, 380, 'Brotes de soja aliñados', '3,00 €')
  listItem(50, 423, 380, 'Espinacas con sésamo', '3,20 €')
  listItem(50, 450, 380, 'Rábano encurtido dulce', '3,00 €')
  listItem(50, 477, 380, 'Pepino picante con gochugaru', '3,20 €')
  listItem(50, 504, 380, 'Zanahoria con sésamo y miel', '3,00 €')
  listItem(50, 531, 380, 'Berenjena asada con miso', '3,40 €')

  text(50, 575, 300, 44, 'KIMCHI', { fontFamily: 'Oswald, sans-serif', fontSize: 30, fontWeight: '700', color: SLATE })
  text(50, 617, 300, 32, 'El alma de nuestra mesa. Fermentación natural en nuestra cocina.', { fontFamily: '"PT Serif", serif', fontSize: 11, color: SEPIA_SUB })
  push({ type: 'rect', x: 50, y: 651, width: 380, height: 1, fill: NAVY, opacity: 60 })

  listItem(50, 661, 380, 'Kimchi de col napa (baechu)', '4,50 €')
  listItem(50, 688, 380, 'Kimchi de rábano (kkakdugi)', '4,20 €')
  listItem(50, 715, 380, 'Kimchi de pepino (oi sobagi)', '4,50 €')
  listItem(50, 742, 380, 'Kimchi variado del día', '6,00 €')

  push({ type: 'rect', x: 50, y: 776, width: 380, height: 70, fill: PAPER_DARK, borderRadius: 6, strokeColor: 'rgba(61,92,111,0.4)', strokeWidth: 1 })
  sticker('🌊', 64, 790, 40)
  text(114, 786, 300, 54, 'La fermentación cambia con el tiempo. Pregunte por nuestras preparaciones actuales y puntos de maduración.', {
    fontFamily: '"PT Serif", serif',
    fontSize: 10,
    fontWeight: '500',
    color: SEPIA_SUB,
  })

  // Columna derecha — Small Plates
  text(460, 310, 350, 44, 'SMALL PLATES', { fontFamily: 'Oswald, sans-serif', fontSize: 30, fontWeight: '700', color: RUST })
  text(460, 352, 350, 24, 'Platos para compartir. Tradición, mar y montaña.', { fontFamily: '"PT Serif", serif', fontSize: 11, color: SEPIA_SUB })
  push({ type: 'rect', x: 460, y: 384, width: 390, height: 1, fill: NAVY, opacity: 60 })

  plateItem(460, 394, 390, '🌶 Tteokbokki de pescado', '8,50 €', 'Pastel de arroz picante con odeng y cebolleta.')
  plateItem(460, 440, 390, '🌿 Jeon de marisco', '9,50 €', 'Tortita coreana con calamar, gambas y cebolleta.')
  plateItem(460, 486, 390, '🌶 Dakgangjeong', '9,80 €', 'Pollo frito crujiente en salsa gochujang dulce-picante.')
  plateItem(460, 532, 390, 'Almejas al vapor con soju', '10,50 €', 'Almejas frescas al vapor con ajo y cebolleta.')
  plateItem(460, 578, 390, '🌶🌶🌶 Pulpo salteado picante', '12,00 €', 'Pulpo tierno salteado con verduras y gochugaru.')
  plateItem(460, 624, 390, '🌿 Japchae', '8,50 €', 'Fideos de boniato salteados con verduras y sésamo.')
  plateItem(460, 670, 390, 'Bossam', '11,50 €', 'Panceta de cerdo cocida, servida con kimchi y ssamjang.')
  plateItem(460, 716, 390, '🌶 Mejillones a la coreana', '9,50 €', 'Mejillones salteados con salsa picante y ajo.')

  text(460, 744, 390, 20, '🌶 Picante   🌶🌶 Muy picante   🌿 Vegetariano', { fontSize: 10, fontWeight: '600', color: SEPIA_SUB })

  // Footer — Bebidas
  push({ type: 'rect', x: 50, y: 870, width: 800, height: 2, fill: NAVY })
  text(50, 890, 400, 40, 'BEBIDAS DE LA CASA', { fontFamily: 'Oswald, sans-serif', fontSize: 24, fontWeight: '700', color: RUST })

  drinkBox(50, 'SOJU Y TRAGOS', [
    ['Soju suave (copa)', '3,80 €'],
    ['Soju premium (copa)', '4,80 €'],
    ['Soju cóctel yuzu y soda', '6,50 €'],
    ['Soju cóctel uva y lima', '6,50 €'],
  ])
  drinkBox(315, 'MAKGEOLLI', [
    ['Makgeolli clásico (copa)', '4,00 €'],
    ['Makgeolli arroz tostado', '4,50 €'],
    ['Makgeolli frutos rojos', '4,50 €'],
    ['Botella para compartir', '16,00 €'],
  ])
  drinkBox(580, 'SIN ALCOHOL', [
    ['Té de cebada fría', '2,80 €'],
    ['Té de maíz', '2,80 €'],
    ['Limonada de yuzu', '3,50 €'],
    ['Agua con gas', '2,20 €'],
  ])

  push({ type: 'rect', x: 50, y: 1130, width: 800, height: 2, fill: NAVY })
  text(50, 1150, 800, 24, 'Comparte, prueba, disfruta.  ◆  Gracias por ser parte de nuestra mesa.', {
    fontFamily: 'Oswald, sans-serif',
    fontSize: 13,
    fontWeight: '600',
    color: NAVY,
    align: 'center',
    letterSpacing: 1,
  })

  return {
    id: 'menu-coreano',
    name: 'Menú coreano',
    canvas: { width: 900, height: 1250, background: PAPER },
    elements,
  }
}

// Asador Criollo: hoja de papel vintage inspirada en un boceto de parrilla
// argentina — marco grabado, dos sellos de encabezado, franja de "pilares
// de la casa", 3 columnas de cortes/achuras/guarniciones, banner de salsas
// y secciones de vinos y postres. Sin los grabados SVG del asador/botella
// (son ilustraciones a mano) y con menos ítems por columna que el boceto
// original (4 en vez de 5) para que la plantilla siga siendo un punto de
// partida legible y no un muro de texto.
function buildAsadorCriollo() {
  const INK = '#1A120B'
  const RED = '#842013'
  const DARKRED = '#5C150D'
  const GOLD = '#8C6228'
  const PARCHMENT = '#F8F3E8'
  const PARCHMENT_DARK = '#EFE4CF'
  const MUTED = '#4A3B2A'

  const elements = []
  let z = 0
  function push(el) {
    z += 1
    elements.push({ ...el, zIndex: z })
  }
  function text(x, y, w, h, str, opts) {
    push({
      type: 'text',
      text: str,
      x,
      y,
      width: w,
      height: h,
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: '400',
      color: INK,
      align: 'left',
      ...opts,
    })
  }
  function sticker(emoji, x, y, size, opacity) {
    push({
      type: 'text',
      text: emoji,
      isSticker: true,
      fontFamily: 'Inter, sans-serif',
      color: INK,
      fontWeight: '400',
      x,
      y,
      width: size,
      height: size,
      align: 'center',
      opacity: opacity ?? 100,
    })
  }
  function plateItem(x, y, w, label, price, desc) {
    text(x, y, w - 64, 18, label, { fontSize: 10, fontWeight: '700', color: INK })
    text(x + w - 64, y, 64, 18, price, { fontFamily: 'Anton, sans-serif', fontSize: 11, fontWeight: '400', color: RED, align: 'right' })
    text(x, y + 20, w, 32, desc, { fontFamily: '"PT Serif", serif', fontSize: 8, color: MUTED })
  }
  function column(x, w, title, subtitle, items, note) {
    push({ type: 'rect', x, y: 445, width: w, height: 520, fill: '#FAF6EE', strokeColor: INK, strokeWidth: 2 })
    text(x, 461, w, 26, title, { fontFamily: 'Anton, sans-serif', fontSize: 16, fontWeight: '400', color: INK, align: 'center' })
    text(x, 487, w, 14, subtitle, { fontSize: 8, fontWeight: '700', color: DARKRED, align: 'center', letterSpacing: 1 })
    push({ type: 'rect', x: x + 15, y: 507, width: w - 30, height: 2, fill: INK })
    items.forEach(([label, price, desc], i) => plateItem(x + 15, 521 + i * 88, w - 30, label, price, desc))
    push({ type: 'rect', x: x + 15, y: 930, width: w - 30, height: 1, fill: GOLD, opacity: 50 })
    text(x + 15, 938, w - 30, 20, note, { fontSize: 8, fontWeight: '700', color: DARKRED, align: 'center', letterSpacing: 1 })
  }

  push({ type: 'rect', x: 15, y: 15, width: 870, height: 1470, fill: PARCHMENT, strokeColor: INK, strokeWidth: 3 })

  // Encabezado: dos sellos + emblema central
  push({ type: 'rect', x: 50, y: 50, width: 220, height: 70, fill: PARCHMENT_DARK, strokeColor: INK, strokeWidth: 2 })
  text(50, 58, 220, 14, 'TRADICIÓN CRIOLLA', { fontSize: 9, fontWeight: '700', color: RED, align: 'center', letterSpacing: 1 })
  text(50, 74, 220, 16, 'LEÑA & QUEBRACHO', { fontFamily: 'Anton, sans-serif', fontSize: 13, fontWeight: '400', color: INK, align: 'center' })
  text(50, 94, 220, 14, 'Maduración 28 días', { fontFamily: '"PT Serif", serif', fontSize: 9, color: MUTED, align: 'center' })

  text(335, 54, 230, 16, 'TRADICIÓN AL ASADOR', { fontFamily: '"PT Serif", serif', fontSize: 10, fontWeight: '700', color: RED, align: 'center', letterSpacing: 2 })
  sticker('🔥', 410, 72, 60)

  push({ type: 'rect', x: 630, y: 50, width: 220, height: 70, fill: PARCHMENT_DARK, strokeColor: INK, strokeWidth: 2 })
  text(630, 58, 220, 14, 'MASA MADRE', { fontSize: 9, fontWeight: '700', color: RED, align: 'center', letterSpacing: 1 })
  text(630, 74, 220, 16, 'PAN CRIOLLO DE CAMPO', { fontFamily: 'Anton, sans-serif', fontSize: 13, fontWeight: '400', color: INK, align: 'center' })
  text(630, 94, 220, 14, 'Horno a leña diario', { fontFamily: '"PT Serif", serif', fontSize: 9, color: MUTED, align: 'center' })

  text(50, 140, 800, 80, 'TABERNA Y BRASA SAN TELMO', { fontFamily: 'Anton, sans-serif', fontSize: 44, fontWeight: '400', color: INK, align: 'center' })
  text(50, 225, 800, 26, '✦  ASADOR CRIOLLO & BODEGÓN TRADICIONAL  ✦', { fontFamily: '"PT Serif", serif', fontSize: 14, fontWeight: '700', color: INK, align: 'center', letterSpacing: 2 })
  text(50, 260, 800, 24, '➤ Cocinamos con paciencia, servimos con orgullo ➤', { fontFamily: '"PT Serif", serif', fontSize: 12, fontWeight: '700', color: DARKRED, align: 'center', letterSpacing: 1 })
  push({ type: 'rect', x: 50, y: 295, width: 800, height: 2, fill: INK })

  // Nuestro ritual
  push({ type: 'rect', x: 50, y: 315, width: 800, height: 110, fill: PARCHMENT_DARK, strokeColor: INK, strokeWidth: 2 })
  sticker('🏺', 70, 345, 50)
  text(130, 335, 180, 32, 'NUESTRO RITUAL', { fontFamily: 'Anton, sans-serif', fontSize: 19, fontWeight: '400', color: INK })
  text(130, 378, 180, 16, 'PILARES DE LA CASA', { fontSize: 9, fontWeight: '700', color: RED, letterSpacing: 1 })
  push({ type: 'rect', x: 330, y: 325, width: 2, height: 90, fill: INK, opacity: 40 })

  const pillars = [
    ['🔥', 'FUEGO A LEÑA', 'Quebracho colorado y espinillo seleccionado.'],
    ['🔪', 'CORTE MANUAL', 'Desposte criollo y salmuera de hierbas.'],
    ['🍷', 'VERMUT PROPIO', 'Macerado botánico tirado de la barrica.'],
    ['⭐', 'VINOS DE GUARDA', 'Etiquetas de pequeños viñateros históricos.'],
  ]
  pillars.forEach(([emoji, title, desc], i) => {
    const px = 350 + i * 120
    sticker(emoji, px + 44, 328, 26)
    text(px, 358, 115, 26, title, { fontSize: 9, fontWeight: '700', color: INK, align: 'center' })
    text(px, 384, 115, 32, desc, { fontFamily: '"PT Serif", serif', fontSize: 7, color: MUTED, align: 'center' })
  })

  // Tres columnas
  column(50, 254, 'CORTES A LA LEÑA', 'MADURACIÓN EN SECO • SAL GRUESA', [
    ['01. OJO DE BIFE (400G)', '18,50 €', 'Centro de bife ancho con corazón tierno y marmoleo parejo.'],
    ['02. ASADO DE TIRA', '16,90 €', 'Corte transversal crujiente con hueso dorado al rescoldo.'],
    ['03. BIFE DE CHORIZO', '17,50 €', 'Lomo bajo de 350g, sellado a fuego vivo con capa crocante.'],
    ['04. ENTRAÑA FINA', '19,00 €', 'Piel exterior dorada, ajo confitado y romero fresco.'],
  ], 'SERVIDOS CON CHIMICHURRI CASERO')

  column(323, 254, 'ACHURAS & QUESOS', 'HIERRO CALIENTE • FUEGO VIVO', [
    ['05. PROVOLETA AHUMADA', '8,50 €', 'Queso hilado fundido con orégano silvestre y ají molido.'],
    ['06. CHORIZO CRIOLLO', '4,50 €', 'Puro cerdo picado grueso con pimentón dulce y vino blanco.'],
    ['07. MORCILLA BOMBÓN', '4,00 €', 'Especiada con nuez moscada y cebollas caramelizadas.'],
    ['08. MOLLEJAS CROCANTES', '12,50 €', 'Doradas con limón fresco exprimido en la tabla.'],
  ], 'IDEALES PARA INICIAR EL BANQUETE')

  column(596, 254, 'GUARNICIÓN & BODEGÓN', 'RECETAS DE ANTAÑO • HUERTA FRESCA', [
    ['09. PAPAS PROVENZAL', '4,50 €', 'Papas bastón fritas en doble cocción con ajo y perejil.'],
    ['10. ENSALADA RUSA', '4,00 €', 'Papas, zanahorias tiernas y arvejas con mayonesa casera.'],
    ['11. EMPANADAS DE LOMO (2u)', '3,50 €', 'Cortadas a cuchillo con cebolla de verdeo y comino.'],
    ['12. HUEVOS FRITOS DE CAMPO', '3,80 €', 'Dos huevos de corral con puntilla crocante.'],
  ], 'ACOMPAÑAMIENTOS PARA COMPARTIR')

  // Banner de salsas
  push({ type: 'rect', x: 50, y: 985, width: 800, height: 80, fill: PARCHMENT_DARK, strokeColor: INK, strokeWidth: 2 })
  sticker('🍳', 70, 1005, 44)
  text(130, 1002, 450, 18, 'SALSAS CRIOLLAS EN MORTERO A LA MESA', { fontFamily: 'Anton, sans-serif', fontSize: 13, fontWeight: '400', color: INK })
  text(130, 1024, 450, 30, 'Chimichurri ancestral de la casa & salsa criolla macerada en vinagre de vino tinto.', {
    fontFamily: '"PT Serif", serif',
    fontSize: 9,
    color: MUTED,
  })
  push({ type: 'rect', x: 650, y: 1000, width: 1, height: 50, fill: INK })
  text(670, 1010, 160, 16, 'CAZUELA EXTRA:', { fontSize: 9, fontWeight: '700', color: DARKRED, letterSpacing: 1 })
  text(670, 1028, 160, 24, '1,50 €', { fontFamily: 'Anton, sans-serif', fontSize: 16, fontWeight: '400', color: RED })

  // Vinos y postres
  push({ type: 'rect', x: 50, y: 1085, width: 520, height: 260, fill: '#FAF6EE', strokeColor: INK, strokeWidth: 2 })
  text(70, 1097, 350, 22, 'VINOS DE LA CASA & VERMUTERÍA', { fontFamily: 'Anton, sans-serif', fontSize: 15, fontWeight: '400', color: INK })
  text(420, 1103, 130, 14, 'DE NUESTRA BODEGA', { fontSize: 8, fontWeight: '700', color: RED, align: 'right', letterSpacing: 1 })
  push({ type: 'rect', x: 70, y: 1122, width: 480, height: 2, fill: INK })

  text(70, 1136, 400, 18, 'VERMUT ROJO ARTESANAL (Vaso de campo)', { fontSize: 11, fontWeight: '700', color: INK })
  text(470, 1136, 80, 18, '3,50 €', { fontFamily: 'Anton, sans-serif', fontSize: 12, fontWeight: '400', color: RED, align: 'right' })
  text(70, 1156, 480, 16, 'Con rodaja de naranja, aceituna rellena y toque de sifón.', { fontFamily: '"PT Serif", serif', fontSize: 8, color: MUTED })
  text(70, 1178, 400, 18, 'MALBEC SAN TELMO (Copa bodegón)', { fontSize: 11, fontWeight: '700', color: INK })
  text(470, 1178, 80, 18, '3,80 €', { fontFamily: 'Anton, sans-serif', fontSize: 12, fontWeight: '400', color: RED, align: 'right' })
  text(70, 1206, 400, 18, 'PINGÜINO DE LA CASA (750cc Malbec Roble)', { fontSize: 11, fontWeight: '700', color: INK })
  text(470, 1206, 80, 18, '9,50 €', { fontFamily: 'Anton, sans-serif', fontSize: 12, fontWeight: '400', color: RED, align: 'right' })
  text(70, 1234, 400, 18, 'CERVEZA RUBIA TIRADA (Chopp 400cc)', { fontSize: 11, fontWeight: '700', color: INK })
  text(470, 1234, 80, 18, '3,20 €', { fontFamily: 'Anton, sans-serif', fontSize: 12, fontWeight: '400', color: RED, align: 'right' })
  text(70, 1262, 400, 18, 'AGUA CON/SIN GAS O SIFÓN DE SODA', { fontSize: 11, fontWeight: '700', color: INK })
  text(470, 1262, 80, 18, '2,20 €', { fontFamily: 'Anton, sans-serif', fontSize: 12, fontWeight: '400', color: RED, align: 'right' })

  push({ type: 'rect', x: 590, y: 1085, width: 260, height: 260, fill: '#FAF6EE', strokeColor: INK, strokeWidth: 2 })
  text(610, 1097, 220, 20, 'DULCES DE BODEGÓN', { fontFamily: 'Anton, sans-serif', fontSize: 14, fontWeight: '400', color: INK })
  push({ type: 'rect', x: 610, y: 1120, width: 220, height: 2, fill: INK })
  plateItem(610, 1134, 220, 'FLAN CASERO MIXTO', '5,50 €', 'Ocho yemas, caramelo oscuro y dulce de leche colonial.')
  plateItem(610, 1180, 220, 'PANQUEQUE DE D. DE LECHE', '6,00 €', 'Dorado a la chapa, flambeado con azúcar quemada.')
  plateItem(610, 1226, 220, 'QUESO & DULCE (VIGILANTE)', '4,80 €', 'Cuartirolo artesanal con dulce de batata o membrillo.')
  text(610, 1280, 220, 30, '☕ Café de filtro con granos seleccionados 1,60 €', { fontSize: 8, fontWeight: '600', color: MUTED, align: 'center' })

  // Pie
  push({ type: 'rect', x: 50, y: 1370, width: 800, height: 2, fill: INK })
  text(50, 1390, 260, 20, '✦ CARBÓN VEGETAL 100% PURO', { fontSize: 9, fontWeight: '700', color: INK, align: 'center' })
  text(320, 1390, 260, 20, 'ASADO CRIOLLO SIN PRISA', { fontSize: 9, fontWeight: '700', color: DARKRED, align: 'center' })
  text(590, 1390, 260, 20, 'MESAS CON HISTORIA ✦', { fontSize: 9, fontWeight: '700', color: INK, align: 'center' })
  text(50, 1420, 800, 20, 'TABERNA Y BRASA SAN TELMO — IVA INCLUIDO — ATENCIÓN AL COMENSAL CON VOCACIÓN DE ASADOR', {
    fontFamily: '"PT Serif", serif',
    fontSize: 9,
    color: '#5C544C',
    align: 'center',
    letterSpacing: 1,
  })

  return {
    id: 'asador-criollo',
    name: 'Asador Criollo',
    canvas: { width: 900, height: 1500, background: PARCHMENT },
    elements,
  }
}

// Fonda Oaxaqueña: hoja cálida (amarillo/terracota) inspirada en un boceto
// de fonda mexicana — marco redondeado, dos huecos de foto arriba y dos
// abajo (el usuario los reemplaza con sus platos), título arqueado "NUESTRO
// MENÚ", grilla de 6 platos a dos columnas y una tarjeta de contacto para
// delivery. Sin el patrón de papel picado ni las flores de esquina del
// boceto (son patrones/SVG decorativos, no algo que el editor componga).
function buildFondaOaxaquena() {
  const RED = '#9B1B1B'
  const TERRACOTTA = '#A83B1B'
  const DARK = '#1C130D'
  const GOLD_BORDER = '#E5B72E'

  const elements = []
  let z = 0
  function push(el) {
    z += 1
    elements.push({ ...el, zIndex: z })
  }
  function text(x, y, w, h, str, opts) {
    push({
      type: 'text',
      text: str,
      x,
      y,
      width: w,
      height: h,
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: '400',
      color: DARK,
      align: 'left',
      ...opts,
    })
  }
  function sticker(emoji, x, y, size, opacity) {
    push({
      type: 'text',
      text: emoji,
      isSticker: true,
      fontFamily: 'Inter, sans-serif',
      color: DARK,
      fontWeight: '400',
      x,
      y,
      width: size,
      height: size,
      align: 'center',
      opacity: opacity ?? 100,
    })
  }
  function photoSlot(x, y) {
    push({ type: 'rect', x, y, width: 170, height: 170, fill: '#0D0E11', borderRadius: 20, strokeColor: GOLD_BORDER, strokeWidth: 4 })
    sticker('📷', x + 55, y + 55, 60, 30)
  }
  function dish(x, y, w, name, desc, price, unit) {
    text(x, y, w, 22, name, { fontSize: 14, fontWeight: '800', color: '#291708', letterSpacing: 0.5 })
    text(x, y + 24, w - 70, 50, desc, { fontSize: 11, fontWeight: '500', color: '#4A2E16' })
    text(x + w - 70, y + 20, 70, 30, price, { fontFamily: 'Anton, sans-serif', fontSize: 22, fontWeight: '400', color: '#231206', align: 'right' })
    if (unit) text(x + w - 70, y + 50, 70, 16, unit, { fontSize: 10, fontWeight: '700', color: '#8B2B11', align: 'right' })
    push({ type: 'rect', x, y: y + 82, width: w, height: 1, fill: 'rgba(120,72,20,0.15)' })
  }

  push({
    type: 'rect',
    x: 15,
    y: 15,
    width: 830,
    height: 1270,
    fill: '#F8D34B',
    fillType: 'gradient',
    fillTo: '#EABF32',
    gradientAngle: 180,
    borderRadius: 16,
    strokeColor: 'rgba(120,72,20,0.5)',
    strokeWidth: 6,
  })

  photoSlot(40, 40)
  photoSlot(650, 40)

  sticker('🔥', 395, 45, 60)
  text(250, 130, 360, 50, 'ANTORCHA & BARRO', { fontFamily: 'Anton, sans-serif', fontSize: 32, fontWeight: '400', color: DARK, align: 'center' })
  text(250, 182, 360, 20, 'TAQUERÍA & FONDA OAXAQUEÑA', { fontSize: 11, fontWeight: '700', color: TERRACOTTA, align: 'center', letterSpacing: 3 })

  text(230, 228, 400, 50, 'NUESTRO MENÚ', { fontFamily: 'Anton, sans-serif', fontSize: 30, fontWeight: '400', color: RED, align: 'center', letterSpacing: 2 })
  push({ type: 'rect', x: 330, y: 280, width: 200, height: 4, fill: TERRACOTTA, borderRadius: 2 })

  dish(60, 320, 350, 'TLAYUDAS DE TASAJO Y CECINA', 'Tortilla de maíz criollo de 30cm, asiento de leña, frijol negro, quesillo y col fresca.', '$160')
  dish(60, 420, 350, 'ENMOLADAS OAXAQUEÑAS', '3 tortillas bañadas en mole negro tradicional, pollo deshebrado, quesillo y ajonjolí.', '$85')
  dish(60, 520, 350, 'TACOS BARBACOA EN MAGUEY', '3 tacos de borrego cocido 12h en hoyo artesanal, con consomé y cilantro.', '$95')

  dish(450, 320, 350, 'CALDO DE PIEDRA COSTEÑO', 'Cocción con piedra de río, camarón, huachinango, jitomate y epazote.', '$130')
  dish(450, 420, 350, 'MEMELAS DE ASIENTO', 'Al comal de barro con manteca dorada, frijol negro y queso fresco de aro.', '$45', 'PIEZA')
  dish(450, 520, 350, 'CHILES DE AGUA RELLENOS', 'Chile endémico capeado con huevo de rancho, relleno de picadillo criollo.', '$75')

  photoSlot(40, 650)
  photoSlot(650, 650)

  text(250, 670, 360, 22, 'SERVICIO A DOMICILIO & PEDIDOS', { fontSize: 13, fontWeight: '800', color: RED, align: 'center', letterSpacing: 2 })
  sticker('☎️', 370, 698, 32)
  text(250, 738, 360, 34, '(951) 234 5678', { fontFamily: 'Anton, sans-serif', fontSize: 24, fontWeight: '400', color: DARK, align: 'center' })
  text(250, 778, 360, 36, 'ANDADOR TURÍSTICO MACEDONIO ALCALÁ 402, CENTRO HISTÓRICO, OAXACA DE JUÁREZ.', {
    fontSize: 9,
    fontWeight: '700',
    color: '#523319',
    align: 'center',
    letterSpacing: 0.5,
  })

  push({ type: 'rect', x: 60, y: 848, width: 740, height: 1, fill: 'rgba(120,72,20,0.3)' })
  text(60, 862, 740, 40, 'Cocina con maíz criollo 100% nixtamalizado  •  Martes a Domingo: 8:00 AM – 10:00 PM  •  Sabor de comal de leña', {
    fontSize: 10,
    fontWeight: '700',
    color: '#3D2810',
    align: 'center',
    letterSpacing: 0.5,
  })

  return {
    id: 'fonda-oaxaquena',
    name: 'Fonda Oaxaqueña',
    canvas: { width: 860, height: 950, background: '#F3CD48' },
    elements,
  }
}

const RAW_TEMPLATES = [
  buildMenuElegante(),
  buildMenuNeon(),
  buildTableroAhumado(),
  buildPizzeriaLena(),
  buildMenuCoreano(),
  buildAsadorCriollo(),
  buildFondaOaxaquena(),
]

// build() clona la plantilla y le da ids nuevos a cada elemento, para que
// dos diseños creados desde la misma plantilla no compartan ids.
export const TEMPLATES = RAW_TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  build: () => ({
    canvas: { ...t.canvas },
    elements: t.elements.map((el) => ({ ...el, id: freshId() })),
  }),
}))
