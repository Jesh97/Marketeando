import test from 'node:test'
import assert from 'node:assert/strict'
import { applyFlow } from './flowLayout.js'

const layer = (id, type, x, y, width, height) => ({ id, type, x, y, width, height })
const yOf = (result, id) => result.elements.find((element) => element.id === id).y

test('tres columnas desplazan el pie por el mayor delta, no por la suma', () => {
  const elements = [
    layer('left', 'menu_list', 0, 100, 80, 100),
    layer('middle', 'menu_list', 100, 100, 80, 100),
    layer('right', 'menu_list', 200, 100, 80, 100),
    layer('left-next', 'text', 0, 250, 80, 20),
    layer('middle-next', 'text', 100, 250, 80, 20),
    layer('footer', 'text', 0, 250, 300, 20),
  ]
  const result = applyFlow(elements, { left: 150, middle: 180, right: 130 }, 400)
  assert.equal(yOf(result, 'left-next'), 300)
  assert.equal(yOf(result, 'middle-next'), 330)
  assert.equal(yOf(result, 'footer'), 330)
})

test('bloques apilados heredan el desplazamiento del bloque superior', () => {
  const elements = [
    layer('first', 'menu_list', 0, 100, 100, 100),
    layer('second', 'menu_list', 0, 220, 100, 100),
    layer('below', 'text', 0, 350, 100, 20),
  ]
  const result = applyFlow(elements, { first: 150, second: 180 })
  assert.equal(yOf(result, 'second'), 270)
  assert.equal(yOf(result, 'below'), 480)
})

test('un bloque que mide menos que su base nunca sube el contenido', () => {
  const elements = [layer('list', 'menu_list', 0, 100, 100, 100), layer('below', 'text', 0, 200, 100, 20)]
  const result = applyFlow(elements, { list: 50 })
  assert.equal(yOf(result, 'below'), 200)
  assert.equal(result.height, 220)
})

test('un contenedor no se desplaza y crece para envolver su bloque', () => {
  const elements = [layer('panel', 'rect', 0, 80, 120, 300), layer('list', 'menu_list', 10, 100, 100, 100)]
  const result = applyFlow(elements, { list: 160 })
  const panel = result.elements.find((element) => element.id === 'panel')
  assert.equal(panel.y, 80)
  assert.equal(panel.height, 360)
  assert.equal(result.height, 440)
})
