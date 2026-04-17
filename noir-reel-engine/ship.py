#!/usr/bin/env python3
"""One-command noir reel: roll a prompt, optionally render a Grok still,
render a Veo 3.1 mp4, and print the paths.

Text-to-video only (default):
  python3 ship.py --seed 1000
  # needs: GEMINI_API_KEY

Image-to-video (character consistency across reels):
  python3 ship.py --seed 1000 --with-still
  # needs: GEMINI_API_KEY + XAI_API_KEY (+ xAI credits)

The monologue is printed to stderr so you can capture the mp4 path from stdout.
"""

import argparse
import random
import sys
import time
from pathlib import Path

from _lib import BUILDS_DIR, load_json, require_env

# Import peers as modules so we can reuse their logic without spawning subprocesses.
from generate import PROMPT_TEMPLATE, roll_monologue, roll_prompt


def print_monologue(mono: dict) -> None:
    print("", file=sys.stderr)
    print("[MONOLOGUE]", file=sys.stderr)
    print(f"  Cold Truth.  {mono['cold_truth']}", file=sys.stderr)
    print(f"  Silent War.  {mono['silent_war']}", file=sys.stderr)
    print(f"  Dominance.   {mono['dominance']}", file=sys.stderr)
    print("", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, help="reproducible RNG seed")
    parser.add_argument(
        "--with-still",
        action="store_true",
        help="render a Grok still and feed it to Veo (image-to-video)",
    )
    parser.add_argument("--duration", type=int, default=8, choices=(4, 6, 8))
    parser.add_argument("--resolution", default="1080p", choices=("720p", "1080p", "4k"))
    parser.add_argument("--aspect", default="9:16", choices=("9:16", "16:9"))
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    vars_data = load_json("variables.json")
    mono_data = load_json("monologues.json")

    prompt = roll_prompt(vars_data)
    monologue = roll_monologue(mono_data)

    print(f"[PROMPT] {prompt}", file=sys.stderr)
    print_monologue(monologue)

    # Validate keys up front so we fail fast before the long-running Veo call.
    require_env("GEMINI_API_KEY")
    if args.with_still:
        require_env("XAI_API_KEY")

    ts = int(time.time())
    BUILDS_DIR.mkdir(exist_ok=True)

    still_path: Path | None = None
    if args.with_still:
        print("[STAGE 1/2] rendering still via Grok...", file=sys.stderr)
        import grok

        still_path = BUILDS_DIR / f"still-{ts}.png"
        sys.argv = ["grok.py", "--prompt", prompt, "--out", str(still_path)]
        grok.main()

    print(
        f"[STAGE {'2/2' if args.with_still else '1/1'}] rendering video via Veo 3.1 "
        f"(duration={args.duration}s, {args.resolution}, {args.aspect})...",
        file=sys.stderr,
    )
    import veo

    video_path = BUILDS_DIR / f"reel-{ts}.mp4"
    veo_args = [
        "veo.py",
        "--prompt",
        prompt,
        "--out",
        str(video_path),
        "--duration",
        str(args.duration),
        "--resolution",
        args.resolution,
        "--aspect",
        args.aspect,
    ]
    if still_path is not None:
        veo_args += ["--image", str(still_path)]
    sys.argv = veo_args
    veo.main()

    # stdout: machine-readable paths. stderr: everything else.
    if still_path is not None:
        print(still_path)
    print(video_path)


if __name__ == "__main__":
    main()
