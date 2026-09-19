import { useCallback, useEffect, useRef, useState } from 'react'
import Moveable from 'react-moveable'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { documentToHtml } from '../lib/editorExport'

const DEFAULT_CANVAS = { width: 800, height: 1000, background: '#ffffff' }

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
]

let idSeq = 0
function newId() {
  idSeq += 1
  return `el_${Date.now()}_${idSeq}`
}

function nextZIndex(elements) {
  return elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1
}

function createTextElement(elements) {
  return {
    id: newId(),
    type: 'text',
    x: 80,
    y: 80,
    width: 280,
    height: 60,
    rotation: 0,
    zIndex: nextZIndex(elements),
    text: 'Texto nuevo',
    fontFamily: FONT_OPTIONS[0].value,
    fontSize: 24,
    color: '#111827',
    fontWeight: '600',
    align: 'left',
  }
}

function createShapeElement(elements, type) {
  return {
    id: newId(),
    type,
    x: 100,
    y: 100,
    width: 160,
    height: 160,
    rotation: 0,
    zIndex: nextZIndex(elements),
    fill: '#FD761A',
    borderRadius: type === 'rect' ? 8 : 0,
  }
}

function createImageElement(elements, src) {
  return {
    id: newId(),
    type: 'image',
    x: 120,
    y: 120,
    width: 240,
    height: 240,
    rotation: 0,
    zIndex: nextZIndex(elements),
    src,
    borderRadius: 0,
  }
}

function IconButton({ onClick, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function EditorCanvas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [docId, setDocId] = useState(isNew ? null : Number(id))
  const [title, setTitle] = useState('Diseño sin título')
  const [canvas] = useState(DEFAULT_CANVAS)
  const [elements, setElements] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [editingTextId, setEditingTextId] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saveState, setSaveState] = useState('idle')
  const [uploading, setUploading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const targetRefs = useRef({})
  const [targetEl, setTargetEl] = useState(null)
  const liveChange = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    apiClient
      .get(`/editor/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        setDocId(data.id)
        setTitle(data.title)
        setElements(data.data_json?.elements ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  useEffect(() => {
    setTargetEl(selectedId && !editingTextId ? (targetRefs.current[selectedId] ?? null) : null)
  }, [selectedId, editingTextId, elements.length])

  const updateElement = useCallback((elId, patch) => {
    setElements((prev) => prev.map((el) => (el.id === elId ? { ...el, ...patch } : el)))
  }, [])

  const addElement = useCallback((factory) => {
    setElements((prev) => {
      const el = factory(prev)
      setSelectedId(el.id)
      return [...prev, el]
    })
  }, [])

  const selected = elements.find((el) => el.id === selectedId) || null

  const handleDeleteSelected = useCallback(() => {
    setElements((prev) => prev.filter((el) => el.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  useEffect(() => {
    function handleKeyDown(e) {
      if (!selectedId) return
      const active = document.activeElement
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.isContentEditable) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleDeleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, handleDeleteSelected])

  async function uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      const { data } = await apiClient.post('/editor/upload', formData, {
        headers: { 'Content-Type': undefined },
      })
      return data.url
    } finally {
      setUploading(false)
    }
  }

  async function insertUploadedImage(file) {
    try {
      const url = await uploadFile(file)
      addElement((prev) => createImageElement(prev, url))
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'No se pudo subir la imagen.')
    }
  }

  // Pegar una imagen copiada (Ctrl+V / Cmd+V) la sube y la inserta como capa.
  useEffect(() => {
    function handlePaste(e) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) insertUploadedImage(file)
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) insertUploadedImage(file)
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) insertUploadedImage(file)
  }

  function handleReorder(direction) {
    if (!selectedId) return
    setElements((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex)
      const idx = sorted.findIndex((el) => el.id === selectedId)
      const swapIdx = direction === 'up' ? idx + 1 : idx - 1
      if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return prev
      const zA = sorted[idx].zIndex
      const zB = sorted[swapIdx].zIndex
      return prev.map((el) => {
        if (el.id === sorted[idx].id) return { ...el, zIndex: zB }
        if (el.id === sorted[swapIdx].id) return { ...el, zIndex: zA }
        return el
      })
    })
  }

  async function handleSave() {
    setSaveState('saving')
    const doc = { canvas, elements }
    const html = documentToHtml(doc)
    try {
      const { data } = await apiClient.post('/editor/save', {
        id: docId,
        title,
        data_json: doc,
        html_content: html,
      })
      setDocId(data.id)
      setSaveState('saved')
      if (isNew) navigate(`/editor/${data.id}`, { replace: true })
      setTimeout(() => setSaveState('idle'), 1500)
    } catch (err) {
      setSaveState('idle')
      window.alert(err.response?.data?.error ?? 'No se pudo guardar el diseño.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-svh items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Cargando editor...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-3 bg-gray-50">
        <p className="text-sm text-gray-500">No se encontró ese diseño.</p>
        <Link to="/editor" className="text-sm font-medium text-orange-600">
          Volver a mis diseños
        </Link>
      </div>
    )
  }

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)

  return (
    <div className="flex h-svh flex-col bg-gray-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Link to="/editor" className="rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100">
            ← Mis diseños
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-transparent px-2 py-1 text-sm font-medium text-gray-900 hover:border-gray-200 focus:border-gray-300 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          {uploading && <span className="text-xs text-gray-400">Subiendo imagen...</span>}
          <span className="text-xs text-gray-400">
            {saveState === 'saving' && 'Guardando...'}
            {saveState === 'saved' && 'Guardado'}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="rounded-md bg-orange-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-gray-200 bg-white py-4">
          <IconButton title="Añadir texto" onClick={() => addElement(createTextElement)}>
            T
          </IconButton>
          <IconButton title="Añadir rectángulo" onClick={() => addElement((prev) => createShapeElement(prev, 'rect'))}>
            ▭
          </IconButton>
          <IconButton title="Añadir círculo" onClick={() => addElement((prev) => createShapeElement(prev, 'ellipse'))}>
            ◯
          </IconButton>
          <IconButton title="Subir imagen" onClick={() => fileInputRef.current?.click()}>
            🖼
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <div className="my-1 h-px w-8 bg-gray-100" />
          <IconButton title="Subir capa" disabled={!selectedId} onClick={() => handleReorder('up')}>
            ↑
          </IconButton>
          <IconButton title="Bajar capa" disabled={!selectedId} onClick={() => handleReorder('down')}>
            ↓
          </IconButton>
          <IconButton title="Eliminar" disabled={!selectedId} onClick={handleDeleteSelected}>
            🗑
          </IconButton>
        </aside>

        <main
          className="flex flex-1 items-start justify-center overflow-auto p-10"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div
            style={{ width: canvas.width, height: canvas.height, background: canvas.background }}
            className="relative shrink-0 shadow-lg"
            onMouseDown={() => setSelectedId(null)}
          >
            {sortedElements.map((el) => (
              <CanvasElement
                key={el.id}
                el={el}
                isSelected={el.id === selectedId}
                isEditing={el.id === editingTextId}
                registerRef={(node) => {
                  if (node) targetRefs.current[el.id] = node
                  else delete targetRefs.current[el.id]
                }}
                onSelect={() => setSelectedId(el.id)}
                onStartEditText={() => setEditingTextId(el.id)}
                onCommitText={(text) => {
                  setEditingTextId(null)
                  updateElement(el.id, { text })
                }}
              />
            ))}

            <Moveable
              target={targetEl}
              draggable
              resizable
              rotatable
              throttleDrag={0}
              throttleResize={0}
              throttleRotate={0}
              onDrag={({ target, left, top }) => {
                target.style.left = `${left}px`
                target.style.top = `${top}px`
                liveChange.current = { x: left, y: top }
              }}
              onDragEnd={() => {
                if (selectedId && liveChange.current) updateElement(selectedId, liveChange.current)
                liveChange.current = null
              }}
              onResize={({ target, width, height, drag }) => {
                target.style.width = `${width}px`
                target.style.height = `${height}px`
                target.style.left = `${drag.left}px`
                target.style.top = `${drag.top}px`
                liveChange.current = { x: drag.left, y: drag.top, width, height }
              }}
              onResizeEnd={() => {
                if (selectedId && liveChange.current) updateElement(selectedId, liveChange.current)
                liveChange.current = null
              }}
              onRotate={({ target, drag, rotation }) => {
                target.style.transform = drag.transform
                liveChange.current = { rotation }
              }}
              onRotateEnd={() => {
                if (selectedId && liveChange.current) updateElement(selectedId, liveChange.current)
                liveChange.current = null
              }}
            />
          </div>
        </main>

        <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4">
          {!selected && <p className="text-sm text-gray-400">Selecciona un elemento para editarlo.</p>}

          {selected?.type === 'text' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Texto</h3>
              <div>
                <label className="text-xs font-medium text-gray-500">Fuente</label>
                <select
                  value={selected.fontFamily}
                  onChange={(e) => updateElement(selected.id, { fontFamily: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Tamaño</label>
                <input
                  type="number"
                  min={8}
                  max={200}
                  value={selected.fontSize}
                  onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Color</label>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                  className="mt-1 h-8 w-full rounded-md border border-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Alineación</label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {['left', 'center', 'right'].map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateElement(selected.id, { align })}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                        selected.align === align
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Grosor</label>
                <select
                  value={selected.fontWeight}
                  onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                >
                  <option value="400">Normal</option>
                  <option value="600">Semi-negrita</option>
                  <option value="700">Negrita</option>
                </select>
              </div>
              <p className="text-xs text-gray-400">Doble clic sobre el texto en el lienzo para editarlo.</p>
            </div>
          )}

          {(selected?.type === 'rect' || selected?.type === 'ellipse') && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Forma</h3>
              <div>
                <label className="text-xs font-medium text-gray-500">Relleno</label>
                <input
                  type="color"
                  value={selected.fill}
                  onChange={(e) => updateElement(selected.id, { fill: e.target.value })}
                  className="mt-1 h-8 w-full rounded-md border border-gray-200"
                />
              </div>
              {selected.type === 'rect' && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Radio de bordes</label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={selected.borderRadius}
                    onChange={(e) => updateElement(selected.id, { borderRadius: Number(e.target.value) })}
                    className="mt-2 w-full accent-orange-500"
                  />
                </div>
              )}
            </div>
          )}

          {selected?.type === 'image' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Imagen</h3>
              <div>
                <label className="text-xs font-medium text-gray-500">Radio de bordes</label>
                <input
                  type="range"
                  min={0}
                  max={120}
                  value={selected.borderRadius}
                  onChange={(e) => updateElement(selected.id, { borderRadius: Number(e.target.value) })}
                  className="mt-2 w-full accent-orange-500"
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function CanvasElement({ el, isSelected, isEditing, registerRef, onSelect, onStartEditText, onCommitText }) {
  const style = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: `rotate(${el.rotation || 0}deg)`,
    zIndex: el.zIndex,
    outline: isSelected ? '2px solid #6366f1' : 'none',
    outlineOffset: 2,
    cursor: isEditing ? 'text' : 'move',
  }

  function handleMouseDown(e) {
    e.stopPropagation()
    onSelect()
  }

  if (el.type === 'text') {
    return (
      <div
        ref={registerRef}
        style={{
          ...style,
          fontFamily: el.fontFamily,
          fontSize: el.fontSize,
          color: el.color,
          fontWeight: el.fontWeight,
          textAlign: el.align,
          overflow: 'hidden',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onStartEditText()
        }}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={(e) => onCommitText(e.currentTarget.textContent)}
      >
        {el.text}
      </div>
    )
  }

  if (el.type === 'image') {
    return (
      <img
        ref={registerRef}
        src={el.src}
        alt=""
        style={{ ...style, objectFit: 'cover', borderRadius: el.borderRadius }}
        onMouseDown={handleMouseDown}
        draggable={false}
      />
    )
  }

  return (
    <div
      ref={registerRef}
      style={{
        ...style,
        backgroundColor: el.fill,
        borderRadius: el.type === 'ellipse' ? '50%' : el.borderRadius,
      }}
      onMouseDown={handleMouseDown}
    />
  )
}

export default EditorCanvas
