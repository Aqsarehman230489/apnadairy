import { useRef, useState } from 'react'
import Reveal from './Reveal'

export default function Journey() {
  const video = useRef(null)
  const [playing, setPlaying] = useState(true)
  const toggle = () => {
    const v = video.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  return (
    <section id="journey" className="mx-auto max-w-[1320px] px-4 py-24 sm:px-8 sm:py-32">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="display max-w-2xl text-[44px] text-forest-deep sm:text-[64px]">See the real journey.</h2>
        <p className="max-w-md text-[17px] text-muted">From milking at the farm to a chilled delivery at the door, in under a minute.</p>
      </Reveal>
      <Reveal delay={0.1}>
        <figure className="relative mt-10 overflow-hidden rounded-[32px] bg-forest-deep">
          <video ref={video} className="aspect-video w-full object-cover" src="/media/farm-journey.mp4" poster="/media/farm-journey-poster.jpg"
            autoPlay muted loop playsInline preload="metadata" aria-label="Milk travelling from a farm to a customer's door" />
          <button onClick={toggle} className="absolute bottom-5 right-5 rounded-full bg-cream/90 px-4 py-2 text-[14px] font-semibold text-forest-deep backdrop-blur transition-transform hover:scale-105 active:scale-95">
            {playing ? 'Pause' : 'Play'}
          </button>
        </figure>
      </Reveal>
    </section>
  )
}
