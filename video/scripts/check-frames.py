# Flags broken frames: a corrupted frame is a big jump in AND a big jump straight back out.
import re, subprocess, sys
path = sys.argv[1]
out = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", "select='gte(scene,0)',metadata=print:file=-", "-f", "null", "-"], capture_output=True, text=True).stdout
scores, t = [], None
for line in out.splitlines():
    m = re.search(r"pts_time:([\d.]+)", line)
    if m: t = float(m.group(1))
    m = re.search(r"scene_score=([\d.]+)", line)
    if m: scores.append((t, float(m.group(1))))
print(f"{len(scores)} frames scanned")
bad = [(scores[i][0], scores[i][1], scores[i + 1][1]) for i in range(len(scores) - 1) if scores[i][1] > 0.15 and scores[i + 1][1] > 0.15]
for t, a, b in bad: print(f"  SUSPECT at {t:6.2f}s  in {a:.2f} / out {b:.2f}")
top = sorted(scores, key=lambda s: -s[1])[:8]
print("biggest single jumps (expected at hard cuts/slams):", ", ".join(f"{t:.2f}s={s:.2f}" for t, s in top))
print("RESULT:", "CLEAN" if not bad else f"{len(bad)} suspect frame pairs")
