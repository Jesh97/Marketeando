import { Fragment } from 'react'

const TOKENS = { nombre: 'nombre', slogan: 'slogan', telefono: 'telefono' }

export default function TokenizedText({ text, restaurante = {}, missing = 'literal' }) {
  const parts = String(text ?? '').split(/(\{\{(?:nombre|slogan|telefono)\}\})/g)
  return parts.map((part, index) => {
    const key = TOKENS[part.slice(2, -2)]
    if (!key) return <Fragment key={`text-${index}`}>{part}</Fragment>
    const value = restaurante[key]
    if (value) return value
    return missing === 'literal' ? <span key={`${part}-${index}`} style={{ opacity: 0.45 }}>{part}</span> : null
  })
}
