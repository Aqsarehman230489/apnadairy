import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../lib/roles'
import { milkLabel, qualityLabel } from '../lib/b2b'
import { rs, date, relative } from '../lib/format'
import PublicHeader from '../components/landing/PublicHeader'
import Footer from '../components/landing/Footer'
import Alert from '../components/Alert'
import { FarmScene, MilkChurn } from '../components/Farm'

const article = (w = '') => (/^[aeiou]/i.test(w) ? 'An' : 'A')

// public page: what businesses are asking for right now (no buyer names or addresses)
export default function PublicRequests() {
  const { profile } = useAuth()
  const { data, error, loading } = useLoad(async () => {
    const { data, error } = await supabase.from('public_requests').select('*').order('bid_deadline')
    if (error) throw error
    return data
  })

  const totalL = (data ?? []).reduce((n, r) => n + Number(r.quantity_l), 0)

  return (
    <div className="min-h-full bg-cream">
      <PublicHeader />

      <section className="furrows relative mx-3 overflow-hidden rounded-[28px] bg-forest-deep text-cream sm:mx-6 sm:rounded-[40px] lg:mx-8">
        <FarmScene className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[62%] [mask-image:linear-gradient(to_right,transparent,black_30%)] md:block" />
        <div className="relative mx-auto max-w-[1100px] px-4 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
          <h1 className="display max-w-[560px] text-[46px] sm:text-[64px]">Bulk doodh, wanted today.</h1>
          <p className="mt-4 max-w-[480px] text-[17px] text-cream/75">
            Restaurants, hotels and shops post the milk they need. Verified collection centers send their price, and the buyer picks one.
          </p>
          {data && data.length > 0 && (
            <p className="num mt-7 inline-flex flex-wrap items-center gap-x-2 rounded-full bg-cream/10 px-4 py-2 text-[15px]">
              <span className="h-2 w-2 rounded-full bg-haldi" />
              <span className="font-semibold">{data.length} open {data.length === 1 ? 'request' : 'requests'}</span> for
              <span className="font-semibold text-haldi">{totalL.toLocaleString('en-PK')} litres</span>
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[1100px] px-4 py-12 sm:px-8">
        <div className="mt-10"><Alert>{error}</Alert></div>

        <ul className="grid gap-4 md:grid-cols-2">
          {loading && [0, 1].map((i) => <li key={i} className="skeleton h-[180px] rounded-[24px]" />)}
          {!loading && data?.length === 0 && (
            <li className="panel py-14 text-center md:col-span-2">
              <p className="font-medium">No open requests at the moment.</p>
              <p className="mt-1 text-sm text-muted">Businesses can post one after their account is verified.</p>
            </li>
          )}
          {data?.map((r, i) => (
            <li key={r.id} className="panel group relative animate-rise overflow-hidden p-6 transition-transform hover:-translate-y-0.5" style={{ animationDelay: `${i * 60}ms` }}>
              <MilkChurn size={64} className="absolute -right-2 -top-2 opacity-15 transition-opacity group-hover:opacity-30" />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <p className="display num text-[44px] leading-none text-forest">{Number(r.quantity_l).toLocaleString('en-PK')} L</p>
                <p className="text-[16px] font-semibold">{milkLabel[r.milk_type]}</p>
              </div>
              <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${r.quality === 'fresh' ? 'bg-mint-soft text-forest' : r.quality === 'premium' ? 'bg-haldi-soft text-amber' : 'bg-cream-2 text-muted'}`}>{qualityLabel[r.quality]}</span>
              <p className="mt-3 text-[15px] text-muted">
                {article(r.business_type)} {r.business_type === 'other' ? 'business' : r.business_type} in <span className="font-medium text-ink">{r.delivery_city}</span> needs it by <span className="num font-medium text-ink">{date(r.required_date)}</span>
                {r.target_price ? <>, around <span className="num font-medium text-ink">{rs(r.target_price)}</span> a litre</> : ''}.
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[14px]">
                <span className="font-semibold">Bids close {relative(r.bid_deadline)}</span>
                <span className="num rounded-full bg-cream-2 px-2.5 py-0.5 text-muted">{r.bid_count} {r.bid_count === 1 ? 'bid' : 'bids'}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          <div className="panel p-6">
            <h2 className="display text-[26px]">Run a milk collection center?</h2>
            <p className="mt-2 text-muted">Register your center, upload your documents and start bidding once ApnaDairy verifies you.</p>
            <Link to={profile ? homeFor(profile.role) : '/signup'} className="btn-primary mt-5">{profile ? 'Open your portal' : 'Register your center'}</Link>
          </div>
          <div className="panel p-6">
            <h2 className="display text-[26px]">Need milk for your business?</h2>
            <p className="mt-2 text-muted">Post the quantity, date and quality you need and compare bids from verified centers side by side.</p>
            <Link to={profile ? homeFor(profile.role) : '/signup'} className="btn-secondary mt-5">{profile ? 'Open your portal' : 'Create a business account'}</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
