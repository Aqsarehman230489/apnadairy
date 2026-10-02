import { Link } from 'react-router-dom'
import Logo from './Logo'
import { FarmScene } from './Farm'

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="furrows relative hidden flex-col overflow-hidden bg-forest-deep text-cream lg:flex">
        <div className="relative z-10 p-12">
          <Logo light />
          <h2 className="display mt-16 max-w-[520px] text-[52px] xl:text-[60px]">
            Khalis doodh, from the farm gate to your door.
          </h2>
          <p className="mt-5 max-w-[440px] text-[17px] text-cream/75">
            Collection centers buy milk from farmers, test it and sell it fresh to homes and businesses, all on one record.
          </p>
          <Link to="/requests" className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream/10 px-4 py-2 text-[14px] font-medium text-cream transition-colors hover:bg-cream/20">
            See what businesses need today
          </Link>
        </div>
        <FarmScene className="mt-auto h-[320px] w-full" />
      </aside>

      <main className="flex flex-col px-6 py-10 sm:px-12">
        <div className="mb-10 lg:hidden"><Logo /></div>
        <div className="m-auto w-full max-w-[440px] animate-rise">
          <h1 className="display text-[40px] text-forest-deep">{title}</h1>
          {subtitle && <p className="mt-2 text-[16px] text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
