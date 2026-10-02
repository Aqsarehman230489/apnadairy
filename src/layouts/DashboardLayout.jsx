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
  const items = (navFor[profile.role] ?? []).filter((i) => i.ready)
  const later = (navFor[profile.role] ?? []).filter((i) => !i.ready)
  const initials = profile.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const link = (i) => (
    <NavLink key={i.to} to={i.to} end={i.end} onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors ${
          isActive
            ? 'bg-mint-soft font-semibold text-forest before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-forest'
            : 'text-ink/75 hover:bg-cream-2 hover:text-ink'}`}>
      <Icon name={i.icon} size={17} />
      {i.label}
    </NavLink>
  )

  const sidebar = (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      <div className="px-6 pt-6 pb-8"><Logo /></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Main">
        {items.map(link)}
        {later.length > 0 && (
          <div className="pt-6">
            <p className="px-3 pb-2 text-xs text-muted">Coming next</p>
            {later.map((i) => (
              <div key={i.to} className="flex items-center gap-3 px-3 py-2 text-[14px] text-muted/70">
                <Icon name={i.icon} size={17} /> {i.label}
              </div>
            ))}
          </div>
        )}
      </nav>
      <div className="flex items-center gap-3 border-t border-line p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-sm font-semibold text-white">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile.full_name}</p>
          <p className="truncate text-xs text-muted">{roleLabel[profile.role]}</p>
        </div>
        <button onClick={signOut} className="rounded-md p-1.5 text-muted hover:bg-cream-2 hover:text-ink" aria-label="Sign out" title="Sign out">
          <Icon name="logout" size={17} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px]">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0">
        <header className="flex h-14 items-center border-b border-line bg-surface px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="mr-3"><Icon name="menu" /></button>
          <Logo />
        </header>
        <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 lg:py-10"><Outlet /></main>
      </div>
    </div>
  )
}
