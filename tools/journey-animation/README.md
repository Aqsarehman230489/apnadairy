# Farm-to-home animation

Source for `public/media/apnadairy-journey.mp4` (the homepage video).
Everything is drawn in SVG and the sound is synthesised in Python, so there are no third-party assets.

| file | what it is |
|---|---|
| `parts.js` | drawing helpers: people in shalwar kameez / dupatta, buffaloes, churns, loader, bike, captions |
| `scenes.js` | the 8 scenes and the timeline (`render(t)`) |
| `anim.html` | open in a browser to preview the animation live |
| `sound.py` | sitar-like plucks, tabla, tanpura drone and sound effects → `soundtrack.wav` |
| `capture.py` | renders every frame with Playwright and muxes the video with ffmpeg |

## Re-render

```
pip install numpy scipy playwright
python sound.py
python capture.py          # writes apnadairy-journey.mp4 (needs ffmpeg and chromium)
```

Opening title "Farm se ghar tak", then scenes: 1 farm at sunrise · 2 loader to the milk shop · 3 area manager's shop · 4 IoT test ·
5 price and payment · 6 stock, listing and bids · 7 delivery to a family · 8 end card.
