import { useState } from 'react'
import DashboardShell from '../components/DashboardShell'

const tabs = [
  { id: 'profile', label: 'Perfil del Restaurante' },
  { id: 'team', label: 'Equipo' },
  { id: 'notif', label: 'Notificaciones' },
]

const team = [
  { name: 'Mariana Chávez', email: 'mariana@bistroandino.com', color: '#C97B5F', role: 'Propietaria', roleBg: '#FFE8D6', roleText: '#E4650E' },
  { name: 'Renzo Ibáñez', email: 'renzo@bistroandino.com', color: '#7AACA6', role: 'Editor', roleBg: '#EEF3FF', roleText: '#0B1C30' },
  { name: 'Lucía Fernández', email: 'lucia@bistroandino.com', color: '#D9A441', role: 'Solo lectura', roleBg: '#F1F5F9', roleText: '#64748B' },
]

const notifPrefs = [
  { title: 'Productos agotados', description: 'Recibe un aviso cuando marques un plato como agotado.', on: true },
  { title: 'Renovación de plan', description: 'Avísame 3 días antes de renovar mi suscripción.', on: true },
  { title: 'Resumen semanal de visitas', description: 'Un correo cada lunes con las estadísticas de tu menú.', on: false },
]

function Field({ label, defaultValue, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-navy">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 w-full rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 text-sm outline-none focus:border-orange"
      />
    </div>
  )
}

function Toggle({ on }) {
  return (
    <div
      className="relative h-[22px] w-10 shrink-0 rounded-full"
      style={{ background: on ? '#FD761A' : '#CBD5E1' }}
    >
      <span
        className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white"
        style={{ left: on ? '20px' : '2px' }}
      />
    </div>
  )
}

function ProfilePanel() {
  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-6">
      <h2 className="mb-5 text-base font-bold text-navy">Perfil del restaurante</h2>
      <div className="mb-5 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-[#C97B5F]" />
        <button
          type="button"
          className="rounded-[9px] border border-[#E2E8F0] bg-white px-4 py-2 text-[13.5px] font-semibold text-navy hover:bg-[#F6F8FC]"
        >
          Cambiar logo
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <Field label="Nombre del restaurante" defaultValue="Bistro Andino" />
        <Field label="Dirección" defaultValue="Av. Los Incas 482, Cusco" />
        <div className="flex flex-col gap-3.5 sm:flex-row">
          <div className="flex-1">
            <Field label="Horario de atención" defaultValue="12:00 – 22:00" />
          </div>
          <div className="flex-1">
            <Field label="Teléfono" defaultValue="+51 987 654 321" />
          </div>
        </div>
        <Field label="Instagram / Redes sociales" defaultValue="@bistroandino" />
      </div>
      <button
        type="button"
        className="mt-5 rounded-[9px] bg-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-dark"
      >
        Guardar Cambios
      </button>
    </div>
  )
}

function TeamPanel() {
  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold text-navy">Equipo</h2>
        <button
          type="button"
          className="rounded-[9px] bg-orange px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-orange-dark"
        >
          + Invitar Usuario
        </button>
      </div>
      <div className="flex flex-col">
        {team.map((member, i) => (
          <div
            key={member.email}
            className={`flex items-center justify-between gap-3 py-3.5 ${
              i < team.length - 1 ? 'border-b border-[#E2E8F0]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 shrink-0 rounded-full"
                style={{ background: member.color }}
              />
              <div>
                <p className="text-sm font-bold text-navy">{member.name}</p>
                <p className="text-xs text-[#8A94A6]">{member.email}</p>
              </div>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ background: member.roleBg, color: member.roleText }}
            >
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotifPanel() {
  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-6">
      <h2 className="mb-5 text-base font-bold text-navy">Preferencias de notificaciones</h2>
      <div className="flex flex-col gap-5">
        {notifPrefs.map((pref, i) => (
          <div key={pref.title}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-navy">{pref.title}</p>
                <p className="mt-0.5 text-xs text-[#8A94A6]">{pref.description}</p>
              </div>
              <Toggle on={pref.on} />
            </div>
            {i < notifPrefs.length - 1 && <div className="mt-5 h-px bg-[#E2E8F0]" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function Settings() {
  const [tab, setTab] = useState('profile')

  return (
    <DashboardShell>
      <h1 className="mb-7 text-[28px] font-extrabold tracking-tight text-navy">Configuración</h1>
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-52 md:flex-col">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-[9px] px-4 py-2.5 text-left text-[13.5px] font-semibold ${
                tab === t.id ? 'bg-[#EEF3FF] text-navy' : 'text-[#4A5568] hover:bg-[#F6F8FC]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl flex-1">
          {tab === 'profile' && <ProfilePanel />}
          {tab === 'team' && <TeamPanel />}
          {tab === 'notif' && <NotifPanel />}
        </div>
      </div>
    </DashboardShell>
  )
}

export default Settings
