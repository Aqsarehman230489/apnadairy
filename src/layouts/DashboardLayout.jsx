import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { navFor } from '../lib/nav'
import { roleLabel } from '../lib/roles'
import Logo from '../components/Logo'
import Icon from '../components/Icon'

export default function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const items = navFor[profile.role] ?? []

  const sidebar = (
    <div className="flex h-full flex-col bg-forest-deep text-cream grid-bg">
      <div className="px-6 py-6"><Logo light /></div>
      <p className="px-6 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mint/60">{roleLabel[profile.role]}</p>
      <nav className="flex-1 px-3 space-y-0.5">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                isActive ? 'bg-mint text-forest-deep font-semibold' : 'text-cream/80 hover:bg-white/5 hover:text-cream'}`}>
            <Icon name={i.icon} />
            <span className="flex-1">{i.label}</span>
            {!i.ready && <span className="font-mono text-[9px] uppercase tracking-wider opacity-50">soon</span>}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-xl border border-white/10 p-3">
        <p className="truncate text-sm font-medium">{profile.full_name}</p>
        <p className="truncate font-mono text-[11px] text-mint/70">{profile.email}</p>
        <button onClick={signOut} className="mt-3 flex items-center gap-2 text-xs text-cream/70 hover:text-cream">
          <Icon name="logout" size={14} /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block sticky top-0 h-screen">{sidebar}</aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px]">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-cream/85 px-4 sm:px-8 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><Icon name="menu" /></button>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-2 pulse-dot" /> system online
          </div>
        </header>
        <main className="p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
