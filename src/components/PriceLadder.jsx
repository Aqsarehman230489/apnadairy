import { rs } from '../lib/format'

// every bid as a dot on one shared price scale; the buyer's target is the yellow line.
// filled dot = meets all requirements, hollow = falls short somewhere.
export default function PriceLadder({ rows, target, acceptedId }) {
  if (!rows.length) return null
  const prices = rows.map((r) => Number(r.price))
  if (target) prices.push(Number(target))
  const lo = Math.min(...prices), hi = Math.max(...prices)
  const pad = Math.max((hi - lo) * 0.12, hi * 0.02)
  const min = lo - pad, max = hi + pad
  const x = (p) => ((Number(p) - min) / (max - min)) * 100

  return (
    <figure className="panel p-5 sm:p-6" aria-label="Bids compared by price per litre">
      <figcaption className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">Price per litre</span>
        <span className="flex items-center gap-4 text-[13px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-forest" />Meets your needs</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-muted" />Falls short</span>
        </span>
      </figcaption>

      <div className="relative">
        {/* target line spans every row */}
        {target && (
          <div className="pointer-events-none absolute inset-y-0 z-10 left-[120px] right-[68px] sm:left-[180px]">
            <div className="absolute -top-1 bottom-0 w-[2px] bg-butter" style={{ left: `${x(target)}%` }}>
              <span className="num absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded bg-butter px-1.5 py-0.5 text-xs font-semibold text-ink">
                Target {rs(target)}
              </span>
            </div>
          </div>
        )}

        <ul className="space-y-1 pt-6">
          {rows.map((r) => {
            const ok = r.ok
            const accepted = r.id === acceptedId
            return (
              <li key={r.id} className="flex h-9 items-center gap-3">
                <span className={`w-[108px] shrink-0 truncate text-[13px] sm:w-[168px] ${accepted ? 'font-semibold text-forest' : 'text-ink'}`} title={r.label}>
                  {r.label}
                </span>
                <div className="relative h-full flex-1">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
                  <span
                    className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      ok ? 'bg-forest' : 'border-2 border-muted bg-surface'} ${accepted ? 'ring-4 ring-mint' : ''}`}
                    style={{ left: `${x(r.price)}%` }}
                  />
                </div>
                <span className={`num w-14 shrink-0 text-right text-[13px] ${ok ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {Number(r.price).toFixed(0)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </figure>
  )
}
