"""Generate the small original music loops bundled with Tidebound.

Requires ffmpeg with libmp3lame. Run from the repository root.
"""

import math
import struct
import subprocess
from pathlib import Path


RATE = 16000
SECONDS = 12
ROOT = Path(__file__).resolve().parents[1] / "public/assets/audio"
ROOT.mkdir(parents=True, exist_ok=True)

TRACKS = {
    "menu": ([220, 261.63, 329.63, 392], 0.55),
    "exploration": ([196, 246.94, 293.66, 369.99], 0.42),
    "combat": ([164.81, 196, 246.94, 293.66], 0.92),
    "victory": ([261.63, 329.63, 392, 523.25], 0.65),
    "defeat": ([146.83, 174.61, 220, 261.63], 0.38),
    "draw": ([196, 233.08, 293.66, 349.23], 0.48),
}


def render(notes, pace):
    samples = bytearray()
    total = RATE * SECONDS
    for index in range(total):
        t = index / RATE
        step = int(t / pace)
        note = notes[step % len(notes)]
        beat = (t % pace) / pace
        envelope = (1 - math.exp(-beat * 30)) * (0.36 + 0.64 * (1 - beat) ** 2)
        bass = math.sin(2 * math.pi * notes[(step // 4) % len(notes)] * 0.5 * t) * 0.14
        melody = math.sin(2 * math.pi * note * t) * 0.13
        shimmer = math.sin(2 * math.pi * note * 2 * t) * 0.025
        slow_pad = math.sin(2 * math.pi * notes[(step // 4) % len(notes)] * t) * 0.055
        fade = min(1, t * 2, (SECONDS - t) * 2)
        value = max(-1, min(1, (bass + (melody + shimmer) * envelope + slow_pad) * fade))
        samples.extend(struct.pack("<h", int(value * 32767)))
    return bytes(samples)


for name, (notes, pace) in TRACKS.items():
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "pipe:0", "-codec:a", "libmp3lame", "-b:a", "64k", str(ROOT / f"{name}-music.mp3")],
        input=render(notes, pace),
        check=True,
    )
