import { Link } from 'react-router-dom'
import desktopAvif from '../../assets/hero/apnadairy-hero-desktop.avif'
import desktopAvif1200 from '../../assets/hero/apnadairy-hero-desktop-1200.avif'
import desktopWebp from '../../assets/hero/apnadairy-hero-desktop.webp'
import desktopWebp1200 from '../../assets/hero/apnadairy-hero-desktop-1200.webp'
import mobileAvif from '../../assets/hero/apnadairy-hero-mobile.avif'
import mobileWebp from '../../assets/hero/apnadairy-hero-mobile.webp'

// one masked headline line sliding up into place
const Line = ({ children, delay }) => (
  <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
    <span className="hero-line block" style={{ animationDelay: `${delay}s` }}>{children}</span>
  </span>
)

export default function Hero({ live }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section aria-label="ApnaDairy" className="px-3 pt-1 sm:px-6 lg:px-8">
      <div className="relative mx-auto min-h-[calc(100svh-80px)] max-w-[1600px] overflow-hidden rounded-[28px] bg-forest-deep sm:min-h-[calc(100svh-92px)] sm:rounded-[40px]">
        <picture className="hero-zoom absolute inset-0 block h-full w-full">
          <source media="(min-width: 768px)" type="image/avif" srcSet={`${desktopAvif1200} 1200w, ${desktopAvif} 1672w`} sizes="100vw" />
          <source media="(min-width: 768px)" type="image/webp" srcSet={`${desktopWebp1200} 1200w, ${desktopWebp} 1672w`} sizes="100vw" />
          <source type="image/avif" srcSet={mobileAvif} />
          <img src={mobileWebp} alt="An ApnaDairy area manager checking a milk collection on a tablet as fresh milk pours into a chilled tank at sunrise"
            className="h-full w-full object-cover [object-position:72%_center] md:[object-position:center]" fetchPriority="high" />
        </picture>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0e2618]/95 via-[#173a28]/55 to-transparent" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0e2618]/85 via-transparent to-[#0e2618]/25" />

        <div className="relative z-10 flex min-h-[inherit] flex-col justify-end px-6 pb-8 pt-24 sm:p-12 lg:p-16">
          <div className="max-w-3xl">
            <p className="hero-fade text-[14px] font-semibold text-haldi" style={{ animationDelay: '.05s' }}>Pakistan's connected dairy network</p>
            <h1 className="display mt-4 text-[52px] leading-[.95] text-cream sm:text-[84px] lg:text-[104px]">
              <Line delay={0.15}>Fresh milk</Line>
              <Line delay={0.27}>should never</Line>
              <Line delay={0.39}>be a <span className="text-haldi">guess.</span></Line>
            </h1>
            <p className="hero-fade mt-6 max-w-xl text-[17px] leading-relaxed text-cream/85 sm:text-[19px]" style={{ animationDelay: '.6s' }}>
              Farmers bring milk to verified collection centers. Every can is tested, priced fairly and tracked,
              then sold fresh to homes and businesses.
            </p>
            <div className="hero-fade mt-8 flex flex-wrap gap-3" style={{ animationDelay: '.72s' }}>
              <Link to="/signup" className="btn-haldi h-[52px] px-7 text-[16px]">Join ApnaDairy</Link>
              <button onClick={() => scrollTo('how')} className="btn-on-dark h-[52px] px-7 text-[16px]">See how it works</button>
            </div>

            <Link to="/requests" className="hero-fade group mt-8 flex max-w-sm items-center gap-4 rounded-2xl border border-cream/20 bg-cream/10 p-4 pr-5 backdrop-blur-md transition-colors hover:border-cream/40 hover:bg-cream/15 sm:mt-10" style={{ animationDelay: '.86s' }}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-haldi text-[22px] font-bold text-forest-deep transition-transform group-hover:rotate-[-8deg]">
                {live ? live.count : '·'}
              </span>
              <span>
                <span className="flex items-center gap-2 text-[13px] font-semibold text-haldi">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-haldi opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-haldi" /></span>
                  Live bulk requests
                </span>
                <span className="mt-0.5 block text-[15px] font-medium leading-snug text-cream">
                  {live && live.count ? `${live.litres.toLocaleString('en-PK')} litres wanted by businesses right now.` : 'See what businesses are buying today.'}
                </span>
              </span>
            </Link>
          </div>

          <button onClick={() => scrollTo('journey')} aria-label="Watch the farm-to-home film"
            className="hero-pop mt-8 flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full border border-cream/30 bg-cream/10 text-cream backdrop-blur-md transition-all hover:scale-105 hover:bg-cream/20 active:scale-95 sm:absolute sm:bottom-12 sm:right-12 sm:mt-0 sm:h-28 sm:w-28 lg:right-16"
            style={{ animationDelay: '1s' }}>
            <span className="animate-bounce text-[20px] motion-reduce:animate-none">↓</span>
            <span className="px-3 text-center text-[11px] font-semibold leading-tight">Watch the film</span>
          </button>
        </div>
      </div>
    </section>
  )
}
