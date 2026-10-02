import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { milkLabel, qualityLabel } from '../../lib/b2b'
import { rs, date, relative } from '../../lib/format'
import { MilkChurn } from '../Farm'

// real open requests from the database — proof the marketplace is working
export default function LiveBoard({ requests }) {
  const list = (requests ?? []).slice(0, 3)
  return (
    <section className="px-3 sm:px-6 lg:px-8">
      <div className="furrows relative mx-auto max-w-[1600px] overflow-hidden rounded-[32px] bg-forest text-cream sm:rounded-[40px]">
        <div className="mx-auto max-w-[1320px] px-6 py-20 sm:px-8 sm:py-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-[14px] font-semibold text-haldi">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-haldi opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-haldi" /></span>
                Live from the bulk market
              </p>
              <h2 className="display mt-3 max-w-2xl text-[44px] sm:text-[60px]">Bulk doodh, wanted today.</h2>
            </div>
            <Link to="/requests" className="btn-haldi">See all requests</Link>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {list.length === 0 && (
              <div className="rounded-[24px] border border-cream/15 bg-cream/5 p-8 text-cream/75 md:col-span-3">
                No open requests right now. Businesses post them once their account is verified.
              </div>
            )}
            {list.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.08}>
                <article className="group relative h-full overflow-hidden rounded-[24px] bg-cream p-6 text-ink transition-transform duration-300 hover:-translate-y-1">
                  <MilkChurn size={70} className="absolute -right-3 -top-3 opacity-15 transition-transform duration-500 group-hover:rotate-12" />
                  <p className="display num text-[48px] leading-none text-forest">{Number(r.quantity_l).toLocaleString('en-PK')} L</p>
                  <p className="mt-2 font-semibold">{milkLabel[r.milk_type]}, {qualityLabel[r.quality].toLowerCase()}</p>
                  <p className="mt-3 text-[15px] text-muted">
                    For a {r.business_type === 'other' ? 'business' : r.business_type} in {r.delivery_city} by <span className="num">{date(r.required_date)}</span>
                    {r.target_price ? <>, around <span className="num">{rs(r.target_price)}</span>/L</> : ''}.
                  </p>
                  <p className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[14px]">
                    <span className="font-semibold">Closes {relative(r.bid_deadline)}</span>
                    <span className="num text-muted">{r.bid_count} {r.bid_count === 1 ? 'bid' : 'bids'}</span>
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
