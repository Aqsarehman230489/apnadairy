import { useLocation } from 'react-router-dom'
import PageHeader from './PageHeader'

export default function ModuleSoon() {
  const { pathname } = useLocation()
  const name = pathname.split('/').pop().replace(/-/g, ' ')
  return (
    <>
      <PageHeader title={name.charAt(0).toUpperCase() + name.slice(1)} />
      <div className="panel px-6 py-12 text-center">
        <p className="font-medium text-ink">This module is not built yet.</p>
        <p className="mt-1 text-sm text-muted">It will appear here once it's added to the portal.</p>
      </div>
    </>
  )
}
