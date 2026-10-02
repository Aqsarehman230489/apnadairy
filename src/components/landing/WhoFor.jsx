import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const doors = [
  { title: 'Collection centers', who: 'Area managers', text: 'Register your center, test and buy milk from farmers, and bid on bulk orders from businesses.', cta: 'Register your center', to: '/signup', img: '/media/farmer-hero.webp' },
  { title: 'Businesses', who: 'Restaurants, hotels, shops', text: 'Post how much milk you need and pick the best of the sealed bids from verified centers.', cta: 'Create a business account', to: '/signup', img: '/media/cold-chain-delivery.webp' },
  { title: 'Farmers', who: 'Dairy farmers', text: 'Sell at your nearest center and see every test, price and payment in the ApnaDairy app.', cta: 'Coming to the app', img: '/media/farm-collection.webp' },
  { title: 'Homes', who: 'Customers', text: 'Order fresh milk from centers near you and track it to your door in the ApnaDairy app.', cta: 'Coming to the app', img: '/media/dairy-facility.webp' },
]

export default function WhoFor() {
  return (
    <section id="who" className="mx-auto max-w-[1320px] px-4 py-24 sm:px-8 sm:py-32">
      <Reveal className="max-w-3xl">
        <h2 className="display text-[44px] text-forest-deep sm:text-[64px]">Built for everyone who touches the milk.</h2>
        <p className="mt-4 max-w-xl text-[18px] text-muted">Centers and businesses use this website. Farmers and families use the ApnaDairy app.</p>
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {doors.map((d, i) => {
          const Wrap = d.to ? Link : 'div'
          return (
            <Reveal key={d.title} delay={(i % 2) * 0.08}>
              <Wrap to={d.to} className={`group relative block h-full overflow-hidden rounded-[28px] bg-forest-deep text-cream ${d.to ? 'cursor-pointer' : ''}`}>
                <img src={d.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/70 to-forest-deep/10" />
                <div className="relative flex min-h-[340px] flex-col justify-end p-7 sm:p-8">
                  <p className="text-[14px] font-semibold text-haldi">{d.who}</p>
                  <h3 className="display mt-1 text-[34px]">{d.title}</h3>
                  <p className="mt-2 max-w-md text-[16px] text-cream/80">{d.text}</p>
                  <span className={`mt-6 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-[14.5px] font-semibold transition-all ${
                    d.to ? 'bg-cream text-forest-deep group-hover:bg-haldi' : 'border border-cream/30 text-cream/80'}`}>
                    {d.cta}
                    {d.to && <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>}
                  </span>
                </div>
              </Wrap>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
