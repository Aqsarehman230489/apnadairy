import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../lib/roles'
import { milkLabel, qualityLabel } from '../lib/b2b'
import { rs, date, relative } from '../lib/format'
import Logo from '../components/Logo'
import Alert from '../components/Alert'

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
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 sm:px-8">
          <Link to="/requests" aria-label="ApnaDairy"><Logo /></Link>
          <nav className="flex items-center gap-2">
            {profile ? (
              <Link to={homeFor(profile.role)} className="btn-primary btn-sm">Go to your portal</Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary btn-sm">Sign in</Link>
                <Link to="/signup" className="btn-primary btn-sm">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-12 sm:px-8 sm:py-16">
        <div className="max-w-[720px]">
          <h1 className="display text-[44px] sm:text-[60px]">Bulk milk wanted</h1>
          <p className="mt-4 text-[17px] text-muted">
            Verified restaurants, hotels and shops post the milk they need. Approved collection centers send sealed bids, and the buyer picks one.
          </p>
          {data && data.length > 0 && (
            <p className="num mt-6 text-[17px]">
              <span className="font-semibold">{data.length} open {data.length === 1 ? 'request' : 'requests'}</span> for{' '}
              <span className="font-semibold">{totalL.toLocaleString('en-PK')} litres</span> right now.
            </p>
          )}
        </div>

        <div className="mt-10"><Alert>{error}</Alert></div>

        <ul className="mt-2 divide-y divide-line border-y border-line">
          {loading && <li className="py-10 text-center text-muted">Loading requests…</li>}
          {!loading && data?.length === 0 && (
            <li className="py-14 text-center">
              <p className="font-medium">No open requests at the moment.</p>
              <p className="mt-1 text-sm text-muted">Businesses can post one after their account is verified.</p>
            </li>
          )}
          {data?.map((r) => (
            <li key={r.id} className="grid gap-x-8 gap-y-2 py-6 sm:grid-cols-[180px_1fr_auto] sm:items-center">
              <p className="display num text-[40px] text-forest">{Number(r.quantity_l).toLocaleString('en-PK')} L</p>
              <div>
                <p className="text-[17px] font-semibold">{milkLabel[r.milk_type]}, {qualityLabel[r.quality].toLowerCase()} quality{r.min_fat ? `, ${r.min_fat}%+ fat` : ''}</p>
                <p className="mt-0.5 text-muted">
                  {article(r.business_type)} {r.business_type === 'other' ? 'business' : r.business_type} in {r.delivery_city} needs it by <span className="num">{date(r.required_date)}</span>
                  {r.target_price ? <>, target <span className="num">{rs(r.target_price)}</span> per litre</> : ''}.
                </p>
              </div>
              <div className="text-[14px] sm:text-right">
                <p className="font-medium">Bids close {relative(r.bid_deadline)}</p>
                <p className="num text-muted">{r.bid_count} {r.bid_count === 1 ? 'bid' : 'bids'} so far</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
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
    </div>
  )
}
