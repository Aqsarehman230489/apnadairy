# soundtrack for the apnadairy animation: sitar-like plucks + tabla + tanpura drone, plus sound effects.
# everything is synthesised here (no samples), so it is free to use.
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, lfilter

SR = 44100
DUR = 69.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
music = np.zeros(N)
sfx = np.zeros(N)

def add(buf, t0, sig, gain=1.0):
    i = int(t0 * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i] * gain

def env(n, a=0.005, r=None):
    e = np.ones(n)
    na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if r: nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e

def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)

def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)

# ---------- instruments ----------
def pluck(freq, dur=1.6, bright=0.5):
    # karplus-strong string as an iir filter, with a buzzy "jawari" touch for a sitar feel
    n = int(dur * SR); p = int(SR / freq)
    x = np.zeros(n); x[:p] = rng.uniform(-1, 1, p) * bright
    a = np.zeros(p + 2); a[0] = 1; a[p] = -0.498; a[p + 1] = -0.498
    out = lfilter([1.0], a, x)
    out = np.tanh(out * 2.2) * 0.6
    return out * env(n, 0.002, 0.3)

def tabla_dha(dur=0.5):
    t = np.arange(int(dur * SR)) / SR
    f = 95 * (1 + 0.6 * np.exp(-t * 18))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    ring = np.sin(2 * np.pi * 520 * t) * np.exp(-t * 14) * 0.4
    click = rng.normal(0, 1, len(t)) * np.exp(-t * 120) * 0.3
    return (body + ring + click) * 0.8

def tabla_na(dur=0.3):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * 640 * t) + 0.5 * np.sin(2 * np.pi * 1290 * t)) * np.exp(-t * 22) * 0.45 + rng.normal(0, 1, len(t)) * np.exp(-t * 200) * 0.15

def tanpura(t0, dur, root):
    t = np.arange(int(dur * SR)) / SR
    sig = np.zeros(len(t))
    for k, (f, g) in enumerate([(root / 2, 0.5), (root, 0.35), (root * 1.5 / 2, 0.3), (root * 1.5, 0.15), (root * 2, 0.12)]):
        sig += g * np.sin(2 * np.pi * f * t + k) * (0.7 + 0.3 * np.sin(2 * np.pi * (0.25 + k * 0.07) * t))
    return sig * env(len(t), 1.5, 2.0) * 0.12

# ---------- music ----------
root = 196.0  # G3, a calm morning key
# yaman-like scale: sa re ga ma(teevra) pa dha ni
scale = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16]
semi = lambda s: root * 2 ** (s / 12)
add(music, 0, tanpura(0, DUR, root))

bpm = 88; beat = 60 / bpm
# melody phrases (scale degree, beats), repeated with small variations
phrase_a = [(4, 1), (5, 0.5), (4, 0.5), (2, 1), (0, 1), (2, 0.5), (4, 0.5), (7, 2)]
phrase_b = [(7, 1), (8, 0.5), (7, 0.5), (5, 1), (4, 1), (5, 0.5), (4, 0.5), (2, 2)]
phrase_c = [(4, 0.5), (5, 0.5), (7, 1), (9, 1), (8, 0.5), (7, 0.5), (5, 1), (4, 2)]
t = 1.2
order = [phrase_a, phrase_b, phrase_a, phrase_c] * 6
for ph in order:
    for deg, b in ph:
        if t > DUR - 4: break
        add(music, t, pluck(semi(scale[deg]), dur=min(2.2, b * beat * 3)), 0.32)
        t += b * beat
# final cadence on the end card
for k, deg in enumerate([0, 4, 7]):
    add(music, 64.2 + k * 0.18, pluck(semi(scale[deg]), 3.5), 0.38)

# tabla keherwa from scene 2 onwards, softer at the start
pattern = ['dha', 'ge', 'na', 'ti', 'na', 'ka', 'dhi', 'na']
bt = 9.0
i = 0
while bt < 63.5:
    hit = pattern[i % 8]
    g = 0.55 if bt < 17 else 0.7
    if hit in ('dha', 'dhi', 'ge'): add(music, bt, tabla_dha(), g * (1 if hit != 'ge' else 0.6))
    else: add(music, bt, tabla_na(), g * 0.8)
    bt += beat / 2; i += 1

# ---------- sound effects ----------
def bird(t0):
    d = 0.18; tt = np.arange(int(d * SR)) / SR
    f = 3200 + 1600 * np.sin(np.linspace(0, np.pi, len(tt))) + rng.uniform(-300, 300)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, len(tt)))
    add(sfx, t0, s, 0.06)

def moo(t0):
    d = 1.6; tt = np.arange(int(d * SR)) / SR
    f = 120 - 25 * tt / d
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    s = lp(saw, 700) * np.sin(np.linspace(0, np.pi, len(tt))) ** 0.6
    add(sfx, t0, s, 0.22)

def pour(t0, d):
    s = bp(rng.normal(0, 1, int(d * SR)), 900, 3200) * env(int(d * SR), 0.3, 0.6)
    s *= 0.7 + 0.3 * np.sin(np.arange(len(s)) / SR * 2 * np.pi * 7)
    add(sfx, t0, s, 0.05)

def engine(t0, d, f0, gain):
    tt = np.arange(int(d * SR)) / SR
    f = f0 * (1 + 0.04 * np.sin(2 * np.pi * 1.3 * tt))
    ph = np.cumsum(f) / SR
    s = np.sign(np.sin(2 * np.pi * ph)) * 0.5 + np.sin(2 * np.pi * ph * 2) * 0.3
    s = lp(s, 900) + bp(rng.normal(0, 1, len(tt)), 200, 800) * 0.2
    add(sfx, t0, s * env(len(tt), 0.6, 1.0), gain)

def horn(t0):
    for k in range(2):
        d = 0.18; tt = np.arange(int(d * SR)) / SR
        s = (np.sign(np.sin(2 * np.pi * 420 * tt)) + np.sign(np.sin(2 * np.pi * 530 * tt))) * 0.3
        add(sfx, t0 + k * 0.26, lp(s, 2500) * env(len(tt), 0.01, 0.03), 0.18)

def step(t0):
    d = 0.12; tt = np.arange(int(d * SR)) / SR
    add(sfx, t0, lp(rng.normal(0, 1, len(tt)), 400) * np.exp(-tt * 40), 0.35)

def clank(t0, gain=0.25):
    d = 1.2; tt = np.arange(int(d * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * k) for f, k in [(523, 5), (1187, 7), (2240, 9), (3310, 12)])
    add(sfx, t0, s * 0.3, gain)

def beep(t0, f=1320, d=0.09, gain=0.12):
    tt = np.arange(int(d * SR)) / SR
    add(sfx, t0, np.sin(2 * np.pi * f * tt) * env(len(tt), 0.003, 0.02), gain)

def chime(t0, notes=(988, 1319), gain=0.16):
    for k, f in enumerate(notes):
        d = 1.0; tt = np.arange(int(d * SR)) / SR
        add(sfx, t0 + k * 0.12, (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2 * tt)) * np.exp(-tt * 4), gain)

def whoosh(t0, d=0.4, gain=0.1):
    n = int(d * SR); x = rng.normal(0, 1, n)
    s = bp(x, 400, 4000) * np.sin(np.linspace(0, np.pi, n)) ** 2
    add(sfx, t0, s, gain)

def pop(t0, gain=0.14):
    d = 0.12; tt = np.arange(int(d * SR)) / SR
    f = 600 + 900 * tt / d
    add(sfx, t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 30), gain)

def cash(t0):
    clank(t0, 0.18)
    for k in range(8):
        beep(t0 + 0.15 + k * 0.07, f=2600 + rng.uniform(-400, 600), d=0.05, gain=0.05)

def creak(t0):
    d = 0.8; tt = np.arange(int(d * SR)) / SR
    f = 300 + 180 * np.sin(np.linspace(0, 3, len(tt)))
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * tt))
    add(sfx, t0, bp(s, 300, 2000) * env(len(tt), 0.05, 0.2), 0.05)

# scene 1 — farm morning
for k in range(14): bird(rng.uniform(0.5, 8.5))
moo(1.4); moo(6.2)
pour(3.1, 4.3)
# scene 2 — loader on the road
engine(9.0, 8.4, 52, 0.16); horn(14.8)
# scene 3 — milk shop
for k in range(10): step(17.4 + k * 0.33)
clank(21.0); clank(21.25, 0.15)
# scene 4 — iot test
pop(25.9, 0.1)
for k in range(5): beep(27.0 + k * 0.6)
chime(31.6, (880, 1175, 1568))
# scene 5 — price and payment
whoosh(34.8); pop(38.8, 0.16); cash(39.3)
# scene 6 — listing and bids
whoosh(43.4); for_bids = [44.7, 45.6, 46.5]
for b in for_bids: pop(b)
chime(48.4, (1047, 1319, 1568), 0.14); whoosh(49.0, 0.5, 0.08); pop(49.4)
# scene 7 — delivery
engine(51.5, 4.4, 110, 0.10)
engine(51.8, 5.0, 70, 0.05)   # rickshaw passing
horn(53.2)
creak(55.9)
chime(57.2, (784, 988, 1175), 0.15)
# end card swell
whoosh(62.1, 0.8, 0.08)

# ---------- mix ----------
# duck the music a little under busy effect moments
duck = np.ones(N)
for a, b in [(3.1, 7.4), (27, 32.5), (38.8, 41), (44.6, 49.6)]:
    i, j = int(a * SR), int(b * SR)
    duck[i:j] = 0.75
duck = lp(duck, 3)
mix = music * duck + sfx
fade = np.ones(N); fi = int(1.0 * SR); fo = int(2.5 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
mix *= fade
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
# gentle stereo width: delay the right channel slightly for the music
right = np.concatenate([np.zeros(220), mix[:-220]]) * 0.6 + mix * 0.4
stereo = np.stack([mix, right], axis=1)
wavfile.write('soundtrack.wav', SR, (stereo * 32767).astype(np.int16))
print('ok', stereo.shape[0] / SR)
