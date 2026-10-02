import { useRef, useState } from 'react'
import Reveal from './Reveal'

// the illustrated farm-to-home film (source in tools/journey-animation)
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
    <section id="journey" className="mx-auto max-w-[1320px] px-4 py-24 sm:px-8 sm:py-32">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="display max-w-2xl text-[44px] text-forest-deep sm:text-[64px]">Farm se ghar tak.</h2>
        <p className="max-w-md text-[17px] text-muted">
          From milking at sunrise to the area manager's shop, the sensor test, a fair price, and a family's doorstep. Turn the sound on.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        {/* width capped so the whole 16:9 film fits on screen with room around it */}
        <figure className="group relative mx-auto mt-10 w-full max-w-[min(1040px,calc((100svh-200px)*16/9))] overflow-hidden rounded-[28px] bg-forest-deep shadow-[0_40px_80px_-50px_rgb(23_58_40/.8)]">
          <video ref={video} className="aspect-video w-full object-cover" src="/media/apnadairy-journey.mp4" poster="/media/apnadairy-journey-poster.jpg"
            autoPlay muted loop playsInline preload="metadata"
            aria-label="Animated film: milk travels from a Pakistani farm to the area manager's milk shop, is tested and priced, then delivered to a family" />
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button onClick={toggleSound}
              className={`rounded-full px-4 py-2 text-[14px] font-semibold backdrop-blur transition-all hover:scale-105 active:scale-95 ${muted ? 'bg-haldi text-forest-deep' : 'bg-cream/90 text-forest-deep'}`}>
              {muted ? 'Sound on' : 'Mute'}
            </button>
            <button onClick={togglePlay} className="rounded-full bg-cream/90 px-4 py-2 text-[14px] font-semibold text-forest-deep backdrop-blur transition-transform hover:scale-105 active:scale-95">
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
        </figure>
      </Reveal>
    </section>
  )
}
