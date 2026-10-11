"""Original score for the Feed Filter launch video, synthesised from scratch and locked to the edit.

    python scripts/score.py out/score.wav        (needs numpy)

Everything is timed in video frames (30 fps) so it lines up with src/Video.tsx:
the slams land every 26 frames, so one beat = 13 frames (~138 BPM).
"""
import sys
import wave

import numpy as np

SR = 48000
FPS = 30
TOTAL_FRAMES = 1146
N = int(TOTAL_FRAMES / FPS * SR) + SR  # one extra second for tails, trimmed at the end
BEAT = 13  # frames
rng = np.random.default_rng(7)


def f2s(frame):
    return int(round(frame / FPS * SR))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_(n):
    return np.arange(n) / SR


def add(buf, sig, frame, gain=1.0, pan=0.0):
    """Mix a mono signal into the stereo buffer at a video frame, with constant-power pan."""
    s = f2s(frame)
    if s >= N:
        return
    sig = sig[: N - s] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, s : s + len(sig)] += sig * l
    buf[1, s : s + len(sig)] += sig * r


def fft_filter(sig, lo=None, hi=None):
    """Zero-phase band filter with soft edges (frequency-domain)."""
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(spec * g, len(sig))


def saw(freq, n, harmonics=14, tilt=1.0, detune_cents=0.0):
    t = t_(n)
    fr = freq * 2 ** (detune_cents / 1200)
    out = np.zeros(n)
    for h in range(1, harmonics + 1):
        if fr * h > SR / 2.5:
            break
        out += np.sin(2 * np.pi * fr * h * t + h) / h**tilt
    return out


def env_adsr(n, a, d, s, r_start, r):
    e = np.ones(n) * s
    t = t_(n)
    e = np.where(t < a, t / max(a, 1e-4), e)
    dmask = (t >= a) & (t < a + d)
    e = np.where(dmask, 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    rel = t >= r_start
    e = np.where(rel, s * np.exp(-(t - r_start) / max(r, 1e-4)), e)
    return e


# ------------------------------------------------------------------ instruments


def kick(length=0.45, punch=1.0, low=46):
    n = int(length * SR)
    t = t_(n)
    freq = low + 95 * np.exp(-t / 0.032)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t / (0.22 * length / 0.45))
    click = fft_filter(rng.standard_normal(n) * np.exp(-t / 0.003), lo=1500) * 0.25 * punch
    return np.tanh((body + click) * 1.6)


def impact():
    n = int(2.4 * SR)
    t = t_(n)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.9)
    crack = fft_filter(rng.standard_normal(n), lo=300, hi=6000) * np.exp(-t / 0.12) * 0.6
    return np.tanh((boom * 1.3 + crack) * 1.2)


def clap():
    n = int(0.35 * SR)
    t = t_(n)
    noise = fft_filter(rng.standard_normal(n), lo=900, hi=5000)
    e = np.zeros(n)
    for off in (0.0, 0.011, 0.022):
        e += np.where(t >= off, np.exp(-(t - off) / 0.012), 0)
    e += np.where(t >= 0.03, np.exp(-(t - 0.03) / 0.11), 0) * 0.6
    return noise * e * 0.9


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = t_(n)
    return fft_filter(rng.standard_normal(n), lo=7500) * np.exp(-t / (0.09 if open_ else 0.018))


def tick():
    n = int(0.03 * SR)
    t = t_(n)
    return fft_filter(rng.standard_normal(n), lo=3000, hi=9000) * np.exp(-t / 0.006)


def pad(notes, frames, attack=0.5, release=1.2):
    dur = frames / FPS
    n = int((dur + release * 3) * SR)
    out = np.zeros(n)
    for m in notes:
        for dc in (-8, 0, 7):
            out += saw(midi(m), n, harmonics=10, tilt=1.25, detune_cents=dc)
    out = fft_filter(out, lo=90, hi=2400)
    return out * env_adsr(n, attack, 0.4, 0.8, dur, release) / (len(notes) * 3)


def pluck(m, length=0.5):
    n = int(length * SR)
    t = t_(n)
    tone = saw(midi(m), n, harmonics=9, tilt=1.5)
    return tone * np.exp(-t / 0.16) * np.minimum(1, t / 0.003)


def bass(m, frames):
    dur = frames / FPS
    n = int((dur + 0.08) * SR)
    t = t_(n)
    tone = saw(midi(m), n, harmonics=8, tilt=1.1) + np.sin(2 * np.pi * midi(m) * t) * 0.8
    e = np.minimum(1, t / 0.006) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.02)) * (0.75 + 0.25 * np.exp(-t / 0.12))
    return np.tanh(fft_filter(tone, hi=900) * 1.4) * e


def bell(m, length=2.5):
    n = int(length * SR)
    t = t_(n)
    f = midi(m)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in ((1, 1, 1.2), (2.76, 0.4, 0.5), (5.4, 0.2, 0.25))) * np.minimum(1, t / 0.002)


def riser(frames, lo=300, hi=9000):
    """Noise swept upward in overlapping band-passed chunks, plus a rising sine."""
    n = int(frames / FPS * SR)
    out = np.zeros(n)
    chunks = 48
    size = n // chunks
    win = np.hanning(size * 2)
    for i in range(chunks):
        c = lo * (hi / lo) ** (i / chunks)
        seg = fft_filter(rng.standard_normal(size * 2), lo=c * 0.7, hi=c * 1.6) * win
        s = i * size
        out[s : s + size * 2] += seg[: len(out[s : s + size * 2])]
    t = t_(n)
    sweep = np.sin(2 * np.pi * np.cumsum(120 * (8 ** (t / t[-1]))) / SR) * 0.25
    return (out * 0.8 + sweep) * np.linspace(0.05, 1, n) ** 2


def reverb(sig, seconds=2.4, damp=5000, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = t_(n)
    ir = fft_filter(r.standard_normal(n), lo=200, hi=damp) * np.exp(-t / (seconds / 5.5))
    ir /= np.sqrt(np.sum(ir**2))
    L = len(sig) + n
    size = 1 << (L - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(sig, size) * np.fft.rfft(ir, size), size)[: len(sig)]


# ------------------------------------------------------------------ arrangement

dry = np.zeros((2, N))
wet_send = np.zeros((2, N))  # goes through the reverb
duck_src = np.zeros(N)  # kick positions for sidechain
music = np.zeros((2, N))  # pads/bass/plucks: ducked by the kick


def beats(start, end, every=BEAT, offset=0):
    f = start + offset
    while f < end:
        yield f
        f += every


SLAMS = [64, 90, 116, 142]
TURN, GOAL, FILTER, PEEK, GOALS, PLATFORMS, FREE, END = 168, 250, 358, 560, 674, 818, 908, 986

# A. 0–64: build. Riser + ticks that accelerate into the cut.
add(dry, riser(64), 0, 1.3)
f = 2.0
while f < 64:
    add(dry, tick(), f, 0.45 + 0.6 * f / 64, pan=rng.uniform(-0.6, 0.6))
    f += max(1.6, 9 * (1 - f / 64) ** 1.5)

# B. 64–168: slams over a dark drone.
drone_frames = TURN - SLAMS[0] + 6
drone = sum(saw(midi(m), int(drone_frames / FPS * SR), harmonics=12, tilt=1.0, detune_cents=dc) for m in (33, 45) for dc in (-6, 6))
drone = np.tanh(fft_filter(drone, hi=700) * 0.9) * env_adsr(len(drone), 0.05, 0.2, 0.7, drone_frames / FPS - 0.45, 0.12)
add(music, drone, SLAMS[0], 0.22)
for i, s in enumerate(SLAMS):
    add(dry, impact(), s, 0.62)
    add(wet_send, impact(), s, 0.25)
    stab = pad([45 + i, 46 + i, 52 + i], 10, attack=0.005, release=0.25)
    add(music, stab, s, 0.5, pan=(-0.3, 0.3, -0.2, 0.2)[i])
    for k in beats(s + 6, s + 26, every=6):
        add(dry, hat(), k, 0.12, pan=0.4)

# Reverse swell into the turn.
sw = pad([53, 57, 60, 64], 20, attack=0.02, release=0.3)
sw = reverb(sw, 2.0)[: int(1.0 * SR)][::-1] * np.linspace(0, 1, int(1.0 * SR)) ** 2
add(dry, sw, TURN - 30, 0.35)

# C. Turn + goal: calm pad, then a pluck arpeggio.
FMAJ7, AM7, CMAJ7, G6 = [53, 57, 60, 64], [45, 48, 52, 55], [48, 52, 55, 59], [43, 47, 50, 52]
add(music, pad(FMAJ7, GOAL - TURN + 10, attack=0.35), TURN, 0.55)
add(wet_send, pad(FMAJ7, GOAL - TURN + 10, attack=0.35), TURN, 0.25)
add(music, pad(AM7, FILTER - GOAL, attack=0.4), GOAL, 0.5)
add(wet_send, pad(AM7, FILTER - GOAL, attack=0.4), GOAL, 0.22)
arp = [69, 72, 76, 79, 76, 72]
for j, k in enumerate(beats(GOAL + 8, FILTER, every=BEAT // 2 + 0)):
    add(music, pluck(arp[j % len(arp)] - (0 if k < GOAL + 60 else 0)), k, 0.16, pan=(-0.35, 0.35)[j % 2])
    add(wet_send, pluck(arp[j % len(arp)]), k, 0.1)
for k in beats(GOAL + 8, FILTER, every=BEAT):
    add(dry, hat(), k + 6, 0.06, pan=-0.3)

# D. The groove: filter on → end card.
PROG = [(FMAJ7, 41), (CMAJ7, 36), (AM7, 33), (G6, 31)]
CHORD_FRAMES = BEAT * 8
bar_starts = list(range(FILTER, END, CHORD_FRAMES))
for i, s in enumerate(bar_starts):
    notes, root = PROG[i % 4]
    length = min(CHORD_FRAMES, END - s)
    add(music, pad(notes, length, attack=0.08, release=0.5), s, 0.45)
    add(wet_send, pad(notes, length, attack=0.08, release=0.5), s, 0.2)
    for k in beats(s, s + length, every=BEAT):
        q = (k - s) // BEAT
        add(music, bass(root + (12 if q % 4 == 3 else 0), BEAT * 0.8), k, 0.42)

for k in beats(FILTER, END, every=BEAT):
    duck_src[f2s(k)] = 1
    add(dry, kick(), k, 0.8)
    q = (k - FILTER) // BEAT
    if q % 2 == 1:
        add(dry, clap(), k, 0.42)
        add(wet_send, clap(), k, 0.2)
    if not (PEEK <= k < GOALS):  # hats breathe out for the peek
        add(dry, hat(), k + BEAT // 2, 0.16, pan=0.35)
        add(dry, hat(), k + BEAT // 2 + 3, 0.06, pan=-0.35)
        if q % 8 == 7:
            add(dry, hat(True), k + BEAT // 2, 0.1, pan=0.2)

# Groove pluck line over the top from the goals section on.
line = [76, 79, 81, 79, 76, 74, 72, 74]
for j, k in enumerate(beats(GOALS, END, every=BEAT)):
    add(music, pluck(line[j % len(line)], 0.35), k + (BEAT // 2 if j % 2 else 0), 0.09, pan=0.25)
    add(wet_send, pluck(line[j % len(line)], 0.35), k, 0.06)

# Scan-line sweep and sparkle.
add(dry, riser(58, lo=800, hi=12000), 400, 0.28, pan=0)
for j, m in enumerate((84, 88, 91, 96)):
    add(wet_send, bell(m, 1.5), 458 + j * 2, 0.12)
    add(dry, bell(m, 1.5), 458 + j * 2, 0.05, pan=(-0.4, 0.4)[j % 2])

# Peek: soft bell when the blur lifts and when it returns.
add(wet_send, bell(88, 2), PEEK + 46, 0.18)
add(wet_send, bell(81, 2), PEEK + 98, 0.14)

# Platforms and Free: accents.
add(dry, impact(), PLATFORMS, 0.55)
add(wet_send, impact(), PLATFORMS, 0.25)
for j, k in enumerate(range(FREE - 12, FREE, 3)):
    add(dry, clap(), k, 0.18 + j * 0.05)
crash = fft_filter(rng.standard_normal(int(2.5 * SR)), lo=4000) * np.exp(-t_(int(2.5 * SR)) / 0.7)
add(dry, crash, FREE, 0.14)
add(wet_send, crash, FREE, 0.12)

# E. End card: drums stop, bell arpeggio with the logo, final chord rings out.
end_chord = [41, 53, 57, 60, 64, 67]
add(music, pad(end_chord, TOTAL_FRAMES - END - 30, attack=0.6, release=1.6), END, 0.55)
add(wet_send, pad(end_chord, TOTAL_FRAMES - END - 30, attack=0.6, release=1.6), END, 0.35)
add(dry, impact(), END, 0.35)
for j, m in enumerate((72, 76, 79, 84)):
    add(wet_send, bell(m), END + 6 + j * 5, 0.22)
    add(dry, bell(m), END + 6 + j * 5, 0.08, pan=(-0.3, 0.3)[j % 2])
add(wet_send, bell(88, 3), END + 64, 0.16)  # as "noise." blurs out

# ------------------------------------------------------------------ mix

# Sidechain: pads/bass dip under every kick.
ducks = np.convolve(duck_src, np.exp(-t_(int(0.25 * SR)) / 0.09))[:N]
gain = 1 - 0.5 * np.clip(ducks, 0, 1)
music *= gain

wet = np.stack([reverb(wet_send[0] + music[0] * 0.25, 2.6, seed=1), reverb(wet_send[1] + music[1] * 0.25, 2.6, seed=2)])
mix = dry + music + wet * 0.9

# Fade out the last second.
end_s = f2s(TOTAL_FRAMES)
fade = np.ones(N)
fade[end_s - SR : end_s] = np.linspace(1, 0, SR) ** 1.5
fade[end_s:] = 0
mix *= fade
mix = mix[:, :end_s]

mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.15) / np.tanh(1.15) * 0.89

out = sys.argv[1] if len(sys.argv) > 1 else "out/score.wav"
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {out}: {mix.shape[1] / SR:.2f}s stereo @ {SR} Hz")
