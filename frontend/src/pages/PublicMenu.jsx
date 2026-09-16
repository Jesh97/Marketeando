import { useState } from 'react'

const categories = ['Entradas', 'Fuertes', 'Bebidas', 'Postres']

const menu = {
  Entradas: [
    { name: 'Ceviche Clásico', desc: 'Pesca fresca, leche de tigre, camote, choclo', price: '$18', color: '#F2C57C' },
    { name: 'Anticuchos', desc: 'Brochetas de corazón a la parrilla, ají, papas', price: null, color: '#C97B5F', agotado: true },
    { name: 'Causa Limeña', desc: 'Papa amarilla, ají amarillo, palta, pollo', price: '$12', color: '#7AACA6' },
    { name: 'Choritos a la Chalaca', desc: 'Choros al vapor, salsa criolla fresca', price: '$16', color: '#D9A441' },
  ],
  Fuertes: [
    { name: 'Lomo Saltado', desc: 'Res salteada, cebolla, tomate, papas fritas, arroz', price: '$26', color: '#7AACA6' },
    { name: 'Ají de Gallina', desc: 'Crema de ají amarillo, pollo deshilachado', price: '$22', color: '#D9A441' },
  ],
  Bebidas: [{ name: 'Chicha Morada', desc: 'Bebida de maíz morado', price: '$6', color: '#8B6BAE' }],
  Postres: [{ name: 'Suspiro Limeño', desc: 'Postre tradicional limeño', price: '$9', color: '#E4A6A0' }],
}

function DishCard({ dish }) {
  return (
    <div
      className={`flex gap-3.5 rounded-2xl border p-4 ${
        dish.agotado
          ? 'border-[#E2E8F0] bg-[#F3F4F6] opacity-60'
          : 'border-[#E2E8F0] bg-white'
      }`}
    >
      <div
        className="h-[76px] w-[76px] shrink-0 rounded-[10px]"
        style={{ background: dish.color, filter: dish.agotado ? 'grayscale(1)' : 'none' }}
      />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[15px] font-bold ${dish.agotado ? 'text-[#8A94A6]' : 'text-navy'}`}>
            {dish.name}
          </p>
          {dish.agotado ? (
            <span className="shrink-0 rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-bold text-[#DC2626]">
              Agotado
            </span>
          ) : (
            <span className="shrink-0 text-[15px] font-bold text-navy">{dish.price}</span>
          )}
        </div>
        <p className={`mt-1 text-[13px] leading-relaxed ${dish.agotado ? 'text-[#8A94A6]' : 'text-[#4A5568]'}`}>
          {dish.desc}
        </p>
      </div>
    </div>
  )
}

function PublicMenu() {
  const [active, setActive] = useState('Entradas')

  return (
    <div className="min-h-svh bg-[#F6F8FC]">
      <div className="bg-navy px-6 py-10 text-white sm:px-14">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#C97B5F] text-xl font-extrabold">
            BA
          </div>
          <div>
            <h1 className="text-2xl font-extrabold sm:text-[26px]">Bistro Andino</h1>
            <p className="mt-1 text-[13.5px] text-[#A9B4C8]">
              Cocina peruana contemporánea · Av. Los Incas 482
            </p>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 flex gap-2.5 overflow-x-auto border-b border-[#E2E8F0] bg-white px-6 py-4 sm:px-14">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            className={`whitespace-nowrap rounded-full px-4.5 py-2 text-[13.5px] font-bold ${
              active === cat ? 'bg-navy text-white' : 'text-[#4A5568] hover:bg-[#F6F8FC]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-14">
        <p className="mb-4.5 text-xs font-bold uppercase tracking-wide text-orange-dark">
          {active}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {menu[active].map((dish) => (
            <DishCard key={dish.name} dish={dish} />
          ))}
        </div>
      </div>

      <div className="bg-navy px-6 py-11 text-[#A9B4C8] sm:px-14">
        <div className="mx-auto flex max-w-4xl flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="mb-2.5 text-[15px] font-bold text-white">Horario</p>
            <p className="text-[13.5px] leading-relaxed">
              Lun – Vie: 12:00 – 22:00
              <br />
              Sáb – Dom: 12:00 – 23:30
            </p>
          </div>
          <div>
            <p className="mb-2.5 text-[15px] font-bold text-white">Contacto</p>
            <p className="text-[13.5px] leading-relaxed">
              +51 987 654 321
              <br />
              Av. Los Incas 482, Cusco
            </p>
          </div>
          <div>
            <p className="mb-2.5 text-[15px] font-bold text-white">Síguenos</p>
            <div className="mt-1 flex gap-3">
              <div className="h-[34px] w-[34px] rounded-full bg-white/10" />
              <div className="h-[34px] w-[34px] rounded-full bg-white/10" />
            </div>
          </div>
        </div>
        <p className="mx-auto mt-9 max-w-4xl text-center text-xs text-[#7C89A3]">
          Menú digital creado con <span className="font-bold text-white">Karta Kamay</span>
        </p>
      </div>
    </div>
  )
}

export default PublicMenu
