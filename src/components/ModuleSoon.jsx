import { useLocation } from 'react-router-dom'
import PageHeader from './PageHeader'

export default function ModuleSoon() {
  const { pathname } = useLocation()
  const name = pathname.split('/').pop().replace(/-/g, ' ')
  return (
    <>
      <PageHeader eyebrow="module" title={name.charAt(0).toUpperCase() + name.slice(1)} />
      <div className="rounded-2xl border border-dashed border-line bg-white/40 p-10 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">in development</p>
        <p className="mt-2 text-sm text-ink">This module is being built next.</p>
      </div>
    </>
  )
}
