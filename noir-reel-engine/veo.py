#!/usr/bin/env python3
"""Generate a noir reel video via Veo 3.1.

Reads GEMINI_API_KEY from the environment. Never hard-code keys.

Usage:
  # Text-to-video: roll a prompt and render it:
  python3 generate.py --prompt-only --seed 1000 | python3 veo.py

  # Or pass a prompt directly:
  python3 veo.py --prompt "Photorealistic medium shot of ..."

  # Image-to-video: animate a still (produced by grok.py or any other tool):
  python3 veo.py --prompt "..." --image builds/still-042.png

  # Chain both stages:
  python3 generate.py --prompt-only --seed 1000 --no-aspect \\
    | python3 grok.py --prompt "$(cat -)" --out builds/still.png \\
    && python3 veo.py --prompt "..." --image builds/still.png
"""

import argparse
import sys
import time
from pathlib import Path

from google import genai
from google.genai import types

from _lib import BUILDS_DIR, read_prompt, require_env

MODEL = "veo-3.1-generate-preview"
POLL_SECONDS = 10
MAX_POLLS = 60  # ~10 minutes
VALID_DURATIONS = (4, 6, 8)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", help="prompt text (otherwise read from stdin)")
    parser.add_argument(
        "--image",
        help="path to a starting still for image-to-video mode",
    )
    parser.add_argument("--out", help="output mp4 path (default: builds/reel-<ts>.mp4)")
    parser.add_argument("--aspect", default="9:16", choices=["9:16", "16:9"])
    parser.add_argument(
        "--duration",
        type=int,
        default=8,
        choices=VALID_DURATIONS,
        help="seconds (Veo 3.1 supports 4, 6, or 8)",
    )
    parser.add_argument("--resolution", default="1080p", choices=["720p", "1080p", "4k"])
    parser.add_argument("--count", type=int, default=1, help="number of videos")
    args = parser.parse_args()

    api_key = require_env("GEMINI_API_KEY")
    prompt = read_prompt(args)
    print(f"prompt: {prompt[:120]}{'...' if len(prompt) > 120 else ''}", file=sys.stderr)

    client = genai.Client(api_key=api_key)

    image = None
    if args.image:
        image_path = Path(args.image)
        if not image_path.exists():
            sys.exit(f"error: image not found: {image_path}")
        suffix = image_path.suffix.lower()
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(suffix)
        if not mime:
            sys.exit(f"error: unsupported image type {suffix} (use .png/.jpg)")
        image = types.Image(image_bytes=image_path.read_bytes(), mime_type=mime)
        print(f"mode: image-to-video (source: {image_path.name})", file=sys.stderr)
    else:
        print("mode: text-to-video", file=sys.stderr)

    operation = client.models.generate_videos(
        model=MODEL,
        prompt=prompt,
        image=image,
        config=types.GenerateVideosConfig(
            number_of_videos=args.count,
            aspect_ratio=args.aspect,
            resolution=args.resolution,
            duration_seconds=args.duration,
        ),
    )

    polls = 0
    while not operation.done:
        if polls >= MAX_POLLS:
            sys.exit(f"error: operation did not finish after {MAX_POLLS * POLL_SECONDS}s")
        print(f"  waiting... ({polls * POLL_SECONDS}s)", file=sys.stderr)
        time.sleep(POLL_SECONDS)
        operation = client.operations.get(operation)
        polls += 1

    videos = operation.response.generated_videos or []
    if not videos:
        sys.exit("error: operation finished but returned no videos")

    BUILDS_DIR.mkdir(exist_ok=True)
    ts = int(time.time())
    for i, gv in enumerate(videos):
        if args.out and len(videos) == 1:
            out_path = Path(args.out)
        else:
            suffix = f"-{i}" if len(videos) > 1 else ""
            out_path = BUILDS_DIR / f"reel-{ts}{suffix}.mp4"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        data = client.files.download(file=gv.video)
        out_path.write_bytes(data)
        print(f"wrote {out_path} ({len(data) / 1_000_000:.1f} MB)")


if __name__ == "__main__":
    main()
