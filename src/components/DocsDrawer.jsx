import { useEffect, useState } from 'react'
import { docLabel, listDocs, openDoc } from '../lib/docs'

// admin side panel: shows one applicant's documents
export default function DocsDrawer({ row, onClose }) {
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listDocs(row.user_id).then(setDocs).catch((e) => setError(e.message))
  }, [row.user_id])

  const open = (d) => openDoc(d).catch((e) => setError(e.message))

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-cream p-6 shadow-2xl rise">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-forest-2">documents</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-forest">{row.center_name ?? row.business_name}</h2>
            <p className="mt-1 text-sm text-muted">{row.profile?.full_name} · {row.profile?.phone}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-cream-2">Close</button>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {!docs && !error && <p className="mt-6 text-sm text-muted">Loading…</p>}
        {docs?.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
            No documents uploaded yet.
          </div>
        )}

        <ul className="mt-6 space-y-2">
          {docs?.map((d) => (
            <li key={d.id}>
              <button onClick={() => open(d)}
                className="w-full rounded-xl border border-line bg-white/70 p-4 text-left hover:border-forest-2">
                <p className="text-sm font-semibold text-ink">{docLabel[d.doc_type]}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">
                  {d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB · {new Date(d.uploaded_at).toLocaleDateString()}
                </p>
                <p className="mt-2 text-xs font-semibold text-forest">Open ↗</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
