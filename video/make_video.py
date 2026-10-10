"""Build a draft demo video: narration (Windows TTS), real screen recordings, burned-in captions.

  python video/make_video.py [--base http://localhost:8811] [--voice "Microsoft Zira Desktop"] [--skip-record]

Output: video/out/niyam-demo-draft.mp4 (1920x1080, 30 fps, H.264 + AAC).
The voice is a placeholder: re-record the narration in your own voice over the
same clips for the final submission (video/out/scenes/*.mp4 are kept separately).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "video" / "out"
SCENES = json.loads((ROOT / "video" / "scenes.json").read_text(encoding="utf-8"))
STYLE = ("FontName=Segoe UI,FontSize=15,PrimaryColour=&H00FFFFFF,BackColour=&HB0101418,"
         "BorderStyle=4,Outline=1,Shadow=0,MarginV=22,MarginL=60,MarginR=60")


def run(cmd: list[str], cwd: Path | None = None) -> str:
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        raise SystemExit(f"failed: {' '.join(cmd[:6])}...\n{p.stderr[-2500:]}")
    return p.stdout


def duration(path: Path) -> float:
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).strip())


def ts(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02}:{int(m):02}:{s:06.3f}".replace(".", ",")


def srt(text: str, total: float) -> str:
    """Caption chunks of at most about 12 words, timed in proportion to their length."""
    words = text.split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 12 or (w.endswith((".", ",", ":")) and len(cur) >= 6):
            chunks.append(" ".join(cur))
            cur = []
    if cur:
        chunks.append(" ".join(cur))
    weights = [len(c) + 8 for c in chunks]
    t, out = 0.15, []
    for i, (c, w) in enumerate(zip(chunks, weights), 1):
        d = (total - 0.3) * w / sum(weights)
        out.append(f"{i}\n{ts(t)} --> {ts(t + d)}\n{c}\n")
        t += d
    return "\n".join(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8811")
    ap.add_argument("--voice", default="Microsoft Zira Desktop")
    ap.add_argument("--skip-record", action="store_true")
    a = ap.parse_args()
    audio, clips, scenes_dir = OUT / "audio", OUT / "clips", OUT / "scenes"
    for d in (audio, clips, scenes_dir):
        d.mkdir(parents=True, exist_ok=True)

    run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ROOT / "video" / "tts.ps1"),
         "-Scenes", str(ROOT / "video" / "scenes.json"), "-Out", str(audio), "-Voice", a.voice])
    durs = {s["id"]: duration(audio / f"{s['id']}.wav") for s in SCENES}
    (OUT / "durations.json").write_text(json.dumps(durs, indent=1), encoding="utf-8")
    print("narration:", round(sum(durs.values()), 1), "seconds")

    if not a.skip_record:
        print(run(["node", "video/record.mjs", a.base, str(OUT / "durations.json"), str(clips)], cwd=ROOT))
    offsets = json.loads((clips / "offsets.json").read_text(encoding="utf-8"))

    parts = []
    for s in SCENES:
        sid, total = s["id"], durs[s["id"]] + 0.8
        (scenes_dir / f"{sid}.srt").write_text(srt(s["say"], total), encoding="utf-8")
        phone = s["viewport"] == "phone"
        frame = ("scale=608:1080,pad=1920:1080:656:0:color=0x0b0f17" if phone
                 else "scale=1920:1080:flags=lanczos")
        vf = f"{frame},fps=30,format=yuv420p,subtitles={sid}.srt:force_style='{STYLE}'"
        run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{offsets[sid]:.2f}", "-i", str(clips / f"{sid}.webm"),
             "-i", str(audio / f"{sid}.wav"), "-t", f"{total:.2f}", "-vf", vf,
             "-af", "apad", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k",
             "-ar", "48000", "-shortest", f"{sid}.mp4"], cwd=scenes_dir)
        parts.append(f"file '{sid}.mp4'")
        print("composed", sid)
    (scenes_dir / "list.txt").write_text("\n".join(parts) + "\n", encoding="utf-8")
    final = OUT / "niyam-demo-draft.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy",
         "-movflags", "+faststart", str(final)], cwd=scenes_dir)
    print(f"done: {final} ({duration(final):.1f} s)")


if __name__ == "__main__":
    main()
