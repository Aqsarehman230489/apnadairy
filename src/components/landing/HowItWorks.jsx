import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'

// the procurement chain from the project brief — each stage is a separate record
const steps = [
  { title: 'Farmer brings milk', text: 'A registered farmer arrives at their nearby collection center. The area manager logs the quantity. It is not bought yet.', img: '/media/farm-collection.webp', alt: 'A farmer pouring milk into steel churns' },
  { title: 'The milk is tested', text: 'The testing device reads temperature, pH, density and conductivity, and the readings are saved against this delivery.', img: '/media/ai-quality-monitoring.webp', alt: 'A technician testing milk in a steel tank' },
  { title: 'A price is recommended', text: 'The pricing model suggests a rate per litre from the quality and quantity. The area manager shows it to the farmer.', img: '/media/farmer-hero.webp', alt: 'An area manager showing a farmer the price on a tablet' },
  { title: 'The farmer decides', text: 'If the farmer accepts, the center completes the purchase and the farmer’s history updates. If not, nothing is bought.', img: '/media/farmer-hero.webp', alt: 'A farmer and an area manager agreeing on a sale' },
  { title: 'Milk becomes stock', text: 'Purchased milk becomes an inventory batch, linked to its farm, its test and the time it was collected.', img: '/media/dairy-facility.webp', alt: 'A bottle of milk and a steel can in a clean dairy' },
  { title: 'Sold fresh', text: 'Homes order through the ApnaDairy app. Businesses post bulk needs and centers bid with their stock.', img: '/media/cold-chain-delivery.webp', alt: 'A chilled delivery handed to a customer at his door' },
]

export default function HowItWorks() {
  const [active, setActive] = useState(0)
  const refs = useRef([])

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.i)) })
    }, { rootMargin: '-45% 0px -45% 0px' })
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section id="how" className="bg-forest-deep text-cream">
      <div className="furrows">
        <div className="mx-auto max-w-[1320px] px-4 py-24 sm:px-8 sm:py-32">
          <Reveal className="max-w-3xl">
            <h2 className="display text-[44px] sm:text-[64px]">From the farm gate to the buyer, in six steps.</h2>
            <p className="mt-4 max-w-xl text-[18px] text-cream/70">Testing, offering, buying and stocking are kept as separate steps, so nothing is bought before the farmer agrees.</p>
          </Reveal>

          <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* sticky picture that follows the active step (desktop) */}
            <div className="hidden lg:block">
              <div className="sticky top-28 overflow-hidden rounded-[28px]">
                {steps.map((s, i) => (
                  <img key={i} src={s.img} alt={i === active ? s.alt : ''} aria-hidden={i !== active} loading="lazy"
                    className={`aspect-[4/3.4] w-full object-cover transition-all duration-700 ${i === active ? 'relative opacity-100 scale-100' : 'absolute inset-0 opacity-0 scale-105'}`} />
                ))}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-deep/90 to-transparent p-6">
                  <div className="flex gap-1.5">
                    {steps.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-10 bg-haldi' : 'w-4 bg-cream/40'}`} />)}
                  </div>
                </div>
              </div>
            </div>

            <ol>
              {steps.map((s, i) => (
                <li key={i} ref={(el) => (refs.current[i] = el)} data-i={i}
                  className={`flex gap-6 border-t border-cream/15 py-10 transition-opacity duration-500 lg:min-h-[44vh] ${i === active ? 'opacity-100' : 'lg:opacity-40'}`}>
                  <span className={`display num grid h-14 w-14 shrink-0 place-items-center rounded-full text-[22px] transition-colors duration-500 ${i === active ? 'bg-haldi text-forest-deep' : 'bg-cream/10 text-cream'}`}>{i + 1}</span>
                  <div>
                    <h3 className="display text-[30px] sm:text-[36px]">{s.title}</h3>
                    <p className="mt-3 max-w-md text-[17px] leading-relaxed text-cream/75">{s.text}</p>
                    <img src={s.img} alt={s.alt} loading="lazy" className="mt-5 aspect-[16/10] w-full rounded-2xl object-cover lg:hidden" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
