import { Link } from 'react-router-dom'
import Logo from './Logo'

// the route milk takes through apnadairy — a real sequence, so it is numbered
const route = [
  ['Collection', 'Farmer brings milk to a verified center'],
  ['Testing', 'Sensor readings recorded per can'],
  ['Pricing', 'Recommended rate per litre'],
  ['Inventory', 'Purchased milk becomes a traceable batch'],
  ['Supply', 'Sold to customers or bid on bulk orders'],
]

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-forest-deep p-12 text-white lg:flex">
        <Logo light />

        <div className="relative max-w-[480px]">
          <h2 className="display text-[56px] xl:text-[64px]">
            Every litre, from the farm gate to the buyer, on record.
          </h2>

          <ol className="relative mt-12">
            <svg className="absolute left-[11px] top-3 h-[calc(100%-24px)] w-[2px]" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden>
              <line x1="1" y1="0" x2="1" y2="100" stroke="#bfe1cf" strokeWidth="2" pathLength="1" className="route-draw" />
            </svg>
            {route.map(([t, d], i) => (
              <li key={t} className="relative flex gap-5 pb-5 last:pb-0">
                <span className="num relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint text-xs font-semibold text-forest-deep">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold leading-6">{t}</p>
                  <p className="text-sm text-white/65">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-sm text-white/55">
          Looking for milk in bulk? <Link to="/requests" className="text-white underline underline-offset-4">See open requests</Link>
        </p>
      </aside>

      <main className="flex flex-col px-6 py-10 sm:px-12">
        <div className="mb-10 lg:hidden"><Logo /></div>
        <div className="m-auto w-full max-w-[420px]">
          <h1 className="display text-[40px] text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
