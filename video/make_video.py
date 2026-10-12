"""Build the demo video: narration, real screen recordings, burned-in captions.

  python video/make_video.py [--base http://localhost:8811] [--voice en-IN-NeerjaNeural] [--skip-record]

Output: video/out/niyam-demo.mp4 (1920x1080, 30 fps, H.264 + AAC).
Voices starting with "en-" use Microsoft neural voices through edge-tts (the script
text is sent to Microsoft's speech service); any other name uses the built-in
Windows voice. Scenes with "images" show still screenshots (for dashboards that
need a login) instead of a recording.
"""

from __future__ import annotations

import argparse
import asyncio
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


def neural_tts(audio: Path, voice: str) -> None:
    import edge_tts
    import edge_tts.communicate
    import edge_tts.constants

    # Since October 2026 the legacy speech host answers 403; Edge itself now uses this endpoint
    # with the same public token (the change proposed upstream in rany2/edge-tts PR #491).
    edge_tts.communicate.WSS_URL = ("wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"
                                    f"?Ocp-Apim-Subscription-Key={edge_tts.constants.TRUSTED_CLIENT_TOKEN}")

    async def speak() -> None:
        for s in SCENES:
            mp3, wav, said = (audio / f"{s['id']}{ext}" for ext in (".mp3", ".wav", ".txt"))
            key = f"{voice}|{s['say']}"
            if wav.exists() and said.exists() and said.read_text(encoding="utf-8") == key and duration(wav) > 1.5:
                continue  # unchanged and good: keep it
            for attempt in range(4):
                try:
                    await edge_tts.Communicate(s["say"], voice, rate="+4%").save(str(mp3))
                except Exception as e:  # the service sometimes refuses a connection; wait and retry
                    print(f"  {s['id']}: speech service error ({type(e).__name__}), retrying")
                    await asyncio.sleep(5 * (attempt + 1))
                    continue
                run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "48000", "-ac", "1", str(wav)])
                # the service sometimes returns a near-empty clip; a sentence never takes under 1.5 s
                if duration(wav) > 1.5:
                    break
                print(f"  {s['id']}: short audio, retrying")
                await asyncio.sleep(3 * (attempt + 1))
            else:
                raise SystemExit(f"narration for {s['id']} kept coming back empty")
            said.write_text(key, encoding="utf-8")
    asyncio.run(speak())


def stills(s: dict, total: float, out: Path) -> None:
    """Show each screenshot for an equal share of the scene, centred on a light background, with a slow zoom."""
    imgs = [ROOT / p for p in s["images"]]
    each = total / len(imgs)
    frames = int(each * 30)
    inputs, chains = [], []
    for i, img in enumerate(imgs):
        inputs += ["-i", str(img)]  # one frame in; zoompan emits the whole clip
        chains.append(f"[{i}:v]scale=1720:960:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf6f5f2,"
                      f"zoompan=z='1+0.04*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps=30,setsar=1[v{i}]")
    graph = ";".join(chains) + ";" + "".join(f"[v{i}]" for i in range(len(imgs))) + f"concat=n={len(imgs)}:v=1:a=0[v]"
    run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", graph, "-map", "[v]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", str(out)])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8811")
    ap.add_argument("--voice", default="en-IN-NeerjaNeural")
    ap.add_argument("--skip-record", action="store_true")
    a = ap.parse_args()
    audio, clips, scenes_dir = OUT / "audio", OUT / "clips", OUT / "scenes"
    for d in (audio, clips, scenes_dir):
        d.mkdir(parents=True, exist_ok=True)

    if a.voice.startswith("en-"):
        neural_tts(audio, a.voice)
    else:
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
        phone = s.get("viewport") == "phone"
        # Playwright records the viewport at CSS size into the top-left of the video and pads the rest with grey: crop it out.
        frame = ("crop=430:932:0:0,scale=-2:1080:flags=lanczos,pad=1920:1080:(ow-iw)/2:0:color=0x0b0f17" if phone
                 else "crop=1536:864:0:0,scale=1920:1080:flags=lanczos")
        if "images" in s:
            frame = "null"
        vf = f"{frame},fps=30,format=yuv420p,subtitles={sid}.srt:force_style='{STYLE}'"
        if "images" in s:
            stills(s, total, clips / f"{sid}.mp4")
            src = ["-i", str(clips / f"{sid}.mp4")]
        else:
            src = ["-ss", f"{offsets[sid]:.2f}", "-i", str(clips / f"{sid}.webm")]
        run(["ffmpeg", "-y", "-loglevel", "error", *src,
             "-i", str(audio / f"{sid}.wav"), "-t", f"{total:.2f}", "-vf", vf,
             "-af", "apad", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k",
             "-ar", "48000", "-shortest", f"{sid}.mp4"], cwd=scenes_dir)
        parts.append(f"file '{sid}.mp4'")
        print("composed", sid)
    (scenes_dir / "list.txt").write_text("\n".join(parts) + "\n", encoding="utf-8")
    final = OUT / "niyam-demo.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy",
         "-movflags", "+faststart", str(final)], cwd=scenes_dir)
    print(f"done: {final} ({duration(final):.1f} s)")


if __name__ == "__main__":
    main()
