#!/usr/bin/env python3
"""Generate a noir reel video via Veo 3.1 from a text prompt.

Reads GEMINI_API_KEY from the environment. Never hard-code keys.

Usage:
  # Roll a prompt and render it:
  python3 generate.py --prompt-only --seed 1000 | python3 veo.py

  # Or pass a prompt directly:
  python3 veo.py --prompt "Photorealistic medium shot of ..."

  # Custom output path:
  python3 veo.py --prompt "..." --out builds/reel-042.mp4
"""

import argparse
import os
import sys
import time
from pathlib import Path

from google import genai
from google.genai import types

HERE = Path(__file__).parent
DEFAULT_OUT_DIR = HERE / "builds"
MODEL = "veo-3.1-generate-preview"
POLL_SECONDS = 10
MAX_POLLS = 60  # ~10 minutes


def read_prompt(args) -> str:
    if args.prompt:
        return args.prompt.strip()
    data = sys.stdin.read().strip()
    if not data:
        sys.exit("error: no prompt provided via --prompt or stdin")
    # Strip the "--- Prompt N ---" header that generate.py emits.
    lines = [ln for ln in data.splitlines() if not ln.startswith("--- ")]
    return " ".join(ln.strip() for ln in lines if ln.strip())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", help="prompt text (otherwise read from stdin)")
    parser.add_argument("--out", help="output mp4 path (default: builds/reel-<ts>.mp4)")
    parser.add_argument("--aspect", default="9:16", choices=["9:16", "16:9"])
    parser.add_argument("--duration", type=int, default=8, help="seconds (4-8)")
    parser.add_argument("--resolution", default="1080p", choices=["720p", "1080p", "4k"])
    parser.add_argument("--count", type=int, default=1, help="number of videos")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        sys.exit("error: GEMINI_API_KEY not set in environment")

    prompt = read_prompt(args)
    print(f"prompt: {prompt[:120]}{'...' if len(prompt) > 120 else ''}", file=sys.stderr)

    client = genai.Client(api_key=api_key)
    operation = client.models.generate_videos(
        model=MODEL,
        prompt=prompt,
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

    DEFAULT_OUT_DIR.mkdir(exist_ok=True)
    ts = int(time.time())
    for i, gv in enumerate(videos):
        if args.out and len(videos) == 1:
            out_path = Path(args.out)
        else:
            suffix = f"-{i}" if len(videos) > 1 else ""
            out_path = DEFAULT_OUT_DIR / f"reel-{ts}{suffix}.mp4"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        data = client.files.download(file=gv.video)
        out_path.write_bytes(data)
        print(f"wrote {out_path} ({len(data) / 1_000_000:.1f} MB)")


if __name__ == "__main__":
    main()
