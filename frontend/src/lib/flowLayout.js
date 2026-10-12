const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback

// Refluye elementos por columnas: cada capa toma el mayor desplazamiento de
// las listas que la preceden y la contienen en horizontal, nunca la suma.
export function applyFlow(elements, measuredHeights = {}, originalCanvasHeight = 0) {
  const blocks = elements
    .filter((el) => el?.type === 'menu_list' && !el.hidden)
    .map((el) => ({
      ...el,
      baseX: number(el.x),
      baseY: number(el.y),
      baseWidth: Math.max(0, number(el.width)),
      baseHeight: Math.max(0, number(el.height)),
      extra: Math.max(0, number(measuredHeights[el.id]) - Math.max(0, number(el.height))),
      shift: 0,
      delta: 0,
    }))
    .sort((a, b) => a.baseY - b.baseY)

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    const above = blocks.slice(0, i).filter((candidate) =>
      block.baseY >= candidate.baseY + candidate.baseHeight &&
      block.baseX < candidate.baseX + candidate.baseWidth &&
      block.baseX + block.baseWidth > candidate.baseX,
    )
    block.shift = above.length ? Math.max(0, ...above.map((candidate) => candidate.delta)) : 0
    block.delta = block.shift + block.extra
  }

  const containers = new Map()
  for (const element of elements) {
    if (!element || element.type === 'text' || element.type === 'menu_list' || element.hidden) continue
    const contained = blocks.filter((block) =>
      number(element.x) <= block.baseX &&
      number(element.y) <= block.baseY &&
      number(element.x) + Math.max(0, number(element.width)) >= block.baseX + block.baseWidth &&
      number(element.y) + Math.max(0, number(element.height)) >= block.baseY + block.baseHeight,
    )
    if (contained.length) containers.set(element.id, Math.max(0, ...contained.map((block) => block.delta)))
  }

  const shifted = elements.map((element) => {
    if (!element) return element
    const baseX = number(element.x)
    const baseY = number(element.y)
    const baseWidth = Math.max(0, number(element.width))
    const baseHeight = Math.max(0, number(element.height))
    const block = blocks.find((item) => item.id === element.id)

    if (block) {
      return { ...element, y: baseY + block.shift, _flowOffset: block.shift, _flowDelta: block.delta, _flowHeight: baseHeight + block.extra }
    }

    const containerGrowth = containers.get(element.id)
    if (containerGrowth != null) {
      return { ...element, height: baseHeight + containerGrowth, _flowOffset: 0, _flowGrowth: containerGrowth }
    }

    const candidates = blocks.filter((candidate) =>
      baseY >= candidate.baseY + candidate.baseHeight &&
      baseX < candidate.baseX + candidate.baseWidth &&
      baseX + baseWidth > candidate.baseX,
    )
    const shift = candidates.length ? Math.max(0, ...candidates.map((candidate) => candidate.delta)) : 0
    return { ...element, y: baseY + shift, _flowOffset: shift }
  })

  const height = Math.max(
    Math.max(0, number(originalCanvasHeight)),
    ...shifted.filter((el) => el && !el.hidden).map((el) => number(el.y) + number(el._flowHeight ?? el.height)),
  )
  return { elements: shifted, height }
}
