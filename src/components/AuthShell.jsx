import Logo from './Logo'

const pipeline = [
  { k: '01', t: 'Farmer delivers milk', s: 'collection center' },
  { k: '02', t: 'IoT sensor test', s: 'temp · pH · density' },
  { k: '03', t: 'AI price engine', s: 'recommended rate / L' },
  { k: '04', t: 'Purchase → inventory', s: 'traceable batch' },
  { k: '05', t: 'B2B bidding · B2C retail', s: 'businesses & customers' },
]

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-full grid lg:grid-cols-[1.05fr_1fr]">
      {/* brand side */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-forest-deep text-cream p-12 grid-bg">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-mint/10 blur-3xl" />
        <Logo light />

        <div className="relative max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mint mb-4">
            dairy procurement network
          </p>
          <h2 className="font-display text-4xl leading-tight font-semibold">
            From the farm gate to the market — measured, priced and traced.
          </h2>

          <ol className="mt-10 relative">
            <svg className="absolute left-[15px] top-4 h-[calc(100%-32px)] w-px overflow-visible" aria-hidden>
              <line x1="0" y1="0" x2="0" y2="100%" stroke="#a8d5ba" strokeOpacity=".5" strokeWidth="1.5" className="flow-line" />
            </svg>
            {pipeline.map((p, i) => (
              <li key={p.k} className="relative flex items-start gap-4 py-2.5 rise" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-mint/40 bg-forest-deep font-mono text-[11px] text-mint">
                  {p.k}
                </span>
                <div>
                  <p className="text-[15px] font-medium">{p.t}</p>
                  <p className="font-mono text-[11px] text-mint/70">{p.s}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-mint/70">
          <span className="h-1.5 w-1.5 rounded-full bg-mint pulse-dot" />
          secure portal · admins · area managers · business buyers
        </div>
      </aside>

      {/* form side */}
      <main className="flex flex-col px-6 py-10 sm:px-12">
        <div className="lg:hidden mb-10"><Logo /></div>
        <div className="m-auto w-full max-w-[420px] rise">
          <h1 className="font-display text-3xl font-semibold text-forest">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
