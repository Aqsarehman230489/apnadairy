import { useRef, useState } from 'react'
import Reveal from './Reveal'

// the illustrated farm-to-home film (source in tools/journey-animation)
// on laptops and desktops the section is one screen: a single heading row on top,
// and the 16:9 film takes all the remaining height (width follows from the height,
// and never exceeds the page width), with even padding around it.
const FILM_W = 'lg:w-[min(100%,calc((100svh-68px-150px)*16/9))]'

export default function Journey() {
  const video = useRef(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)

  const togglePlay = () => {
    const v = video.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }
  // browsers only allow sound after a click, so the film starts muted
  const toggleSound = () => {
    const v = video.current
    if (!v) return
    v.muted = !v.muted
    if (!v.muted) { v.currentTime = 0; v.play(); setPlaying(true) }
    setMuted(v.muted)
  }

  return (
    <section id="journey" className="screen px-4 py-20 sm:px-8 lg:py-6">
      <div className={`mx-auto w-full ${FILM_W}`}>
        <Reveal className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <h2 className="display text-[38px] leading-none text-forest-deep sm:text-[48px]">Farm se ghar tak</h2>
          <p className="max-w-[460px] text-[16px] text-muted lg:text-right">
            One minute with the milk: from a farm at sunrise to the area manager's shop, a fair price, and a family's door.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <figure className="relative mt-5 overflow-hidden rounded-[28px] bg-forest-deep shadow-[0_30px_70px_-45px_rgb(23_58_40/.7)]">
            <video ref={video} className="aspect-video w-full object-cover" src="/media/apnadairy-journey.mp4" poster="/media/apnadairy-journey-poster.jpg"
              autoPlay muted loop playsInline preload="metadata"
              aria-label="Animated film: milk travels from a Pakistani farm to the area manager's milk shop, is tested and priced, then delivered to a family" />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button onClick={toggleSound} className="rounded-full bg-cream/90 px-4 py-2 text-[14px] font-semibold text-forest-deep backdrop-blur transition-colors hover:bg-cream">
                {muted ? 'Sound on' : 'Mute'}
              </button>
              <button onClick={togglePlay} className="rounded-full bg-cream/90 px-4 py-2 text-[14px] font-semibold text-forest-deep backdrop-blur transition-colors hover:bg-cream">
                {playing ? 'Pause' : 'Play'}
              </button>
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}
