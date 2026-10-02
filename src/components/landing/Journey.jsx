import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'

// the illustrated farm-to-home film (source in tools/journey-animation)
// on laptops and desktops the film alone fills one screen: the 16:9 frame takes
// the full height (width follows from it, never wider than the page), with even padding.
// 40px = top + bottom padding of the section
const FILM_W = 'lg:w-[min(100%,calc((100svh-68px-40px)*16/9))]'

export default function Journey() {
  const video = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const userPaused = useRef(false)

  // plays when the film is in view, pauses once the visitor scrolls past it,
  // and starts again from the beginning when they come back to it
  useEffect(() => {
    const v = video.current
    if (!v) return
    let left = false
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.55) {
        if (left) { v.currentTime = 0; userPaused.current = false; left = false }
        if (!userPaused.current) v.play().then(() => setPlaying(true)).catch(() => {})
      } else if (e.intersectionRatio < 0.2 && !v.paused) {
        v.pause(); setPlaying(false); left = true
      } else if (e.intersectionRatio < 0.2) {
        left = true
      }
    }, { threshold: [0, 0.2, 0.55, 1] })
    io.observe(v)
    return () => io.disconnect()
  }, [])

  const togglePlay = () => {
    const v = video.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true); userPaused.current = false } else { v.pause(); setPlaying(false); userPaused.current = true }
  }
  // browsers only allow sound after a click, so the film starts muted
  const toggleSound = () => {
    const v = video.current
    if (!v) return
    v.muted = !v.muted
    if (!v.muted) { v.currentTime = 0; v.play(); setPlaying(true); userPaused.current = false }
    setMuted(v.muted)
  }

  return (
    <section id="journey" aria-label="Farm se ghar tak, a one-minute film" className="screen px-4 py-16 sm:px-6 lg:py-5">
      <Reveal className={`mx-auto w-full ${FILM_W}`}>
        <figure className="relative overflow-hidden rounded-[28px] bg-forest-deep shadow-[0_30px_70px_-45px_rgb(23_58_40/.7)]">
          <video ref={video} className="aspect-video w-full object-cover" src="/media/apnadairy-journey.mp4" poster="/media/apnadairy-journey-poster.jpg"
            muted loop playsInline preload="metadata"
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
    </section>
  )
}
