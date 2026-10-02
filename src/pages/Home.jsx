import { supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import PublicHeader from '../components/landing/PublicHeader'
import Hero from '../components/landing/Hero'
import Marquee from '../components/landing/Marquee'
import ModuleDial from '../components/landing/ModuleDial'
import Problem from '../components/landing/Problem'
import HowItWorks from '../components/landing/HowItWorks'
import Journey from '../components/landing/Journey'
import LiveBoard from '../components/landing/LiveBoard'
import WhoFor from '../components/landing/WhoFor'
import CtaBand from '../components/landing/CtaBand'
import Footer from '../components/landing/Footer'

// the public homepage: hero → marquee → modules → problem → six steps → video
// → live bulk market → who it's for → call to action
export default function Home() {
  const { data: requests } = useLoad(async () => {
    const { data, error } = await supabase.from('public_requests').select('*').order('bid_deadline')
    if (error) return [] // homepage still renders if the board can't load
    return data
  })
  const live = requests && { count: requests.length, litres: requests.reduce((n, r) => n + Number(r.quantity_l), 0) }

  return (
    <div className="min-h-full bg-cream">
      <PublicHeader />
      <main>
        <Hero live={live} />
        <Marquee />
        <ModuleDial />
        <Problem />
        <HowItWorks />
        <Journey />
        <LiveBoard requests={requests} />
        <WhoFor />
        <CtaBand />
      </main>
      <Footer />
    </div>
  )
}
