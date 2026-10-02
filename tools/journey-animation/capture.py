import os, subprocess, time
from playwright.sync_api import sync_playwright
FPS = 30
with sync_playwright() as p:
    br = p.chromium.launch(args=['--allow-file-access-from-files'])
    pg = br.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1.5)  # 1920x1080 output
    pg.goto('file://' + os.path.abspath('anim.html') + '#capture'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(600)
    dur = pg.evaluate('DURATION'); n = int(dur * FPS)
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
                           '-i', 'soundtrack.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                           '-c:a', 'aac', '-b:a', '128k', '-shortest', 'apnadairy-journey.mp4'], stdin=subprocess.PIPE)
    t0 = time.time()
    for i in range(n):
        pg.evaluate(f'render({i / FPS})')
        ff.stdin.write(pg.screenshot(type='jpeg', quality=95))
    ff.stdin.close(); ff.wait()
    print('frames', n, 'secs', round(time.time() - t0))
    br.close()
