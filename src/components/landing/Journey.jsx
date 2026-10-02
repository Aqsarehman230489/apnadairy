import { useRef, useState } from 'react'
import Reveal from './Reveal'

// the illustrated farm-to-home film (source in tools/journey-animation)
// sized from the screen height: heading (~120px) + frame padding and controls (~80px)
// + breathing room leave the rest of the screen for the 16:9 film
const FRAME = 'max-w-[min(1180px,calc((100svh-68px-262px)*16/9+24px))]'

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
      <Reveal className={`mx-auto w-full text-center ${FRAME}`}>
        <h2 className="display text-[38px] text-forest-deep sm:text-[clamp(38px,5.6vh,52px)]">Farm se ghar tak</h2>
        <p className="mx-auto mt-2 max-w-[540px] text-[16.5px] text-muted">
          One minute with the milk: from a farm at sunrise to the area manager's shop, a fair price, and a family's door.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <figure className={`mx-auto mt-6 w-full rounded-[32px] border border-line bg-surface p-3 shadow-[0_40px_80px_-50px_rgb(23_58_40/.7)] ${FRAME}`}>
          <video ref={video} className="aspect-video w-full rounded-[22px] bg-forest-deep object-cover" src="/media/apnadairy-journey.mp4" poster="/media/apnadairy-journey-poster.jpg"
            autoPlay muted loop playsInline preload="metadata"
            aria-label="Animated film: milk travels from a Pakistani farm to the area manager's milk shop, is tested and priced, then delivered to a family" />
          <figcaption className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-3">
            <span className="text-[14px] text-muted">{muted ? 'Playing without sound' : 'Sound on'}</span>
            <span className="flex gap-2">
              <button onClick={toggleSound} className={`btn-sm ${muted ? 'btn-haldi' : 'btn-secondary'}`}>
                {muted ? 'Turn sound on' : 'Mute'}
              </button>
              <button onClick={togglePlay} className="btn-secondary btn-sm">{playing ? 'Pause' : 'Play'}</button>
            </span>
          </figcaption>
        </figure>
      </Reveal>
    </section>
  )
}
