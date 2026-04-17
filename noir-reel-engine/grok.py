#!/usr/bin/env python3
"""Generate a noir still via xAI's Grok image API.

Reads XAI_API_KEY from the environment. The still is written to builds/
and its path is printed to stdout (so it can be piped into veo.py --image).

Usage:
  python3 generate.py --prompt-only --seed 1000 --no-aspect | python3 grok.py
  python3 grok.py --prompt "Photorealistic ..." --out builds/still-042.png

Note: grok-2-image-1212 outputs 1024x768 regardless of prompt — Veo 3.1
will reframe to 9:16 during animation.
"""

import argparse
import base64
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from _lib import BUILDS_DIR, read_prompt, require_env

ENDPOINT = "https://api.x.ai/v1/images/generations"
MODEL = "grok-2-image-1212"
PROMPT_CHAR_LIMIT = 1024  # xAI Grok-2-Image hard limit


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", help="prompt text (otherwise read from stdin)")
    parser.add_argument("--out", help="output png path (default: builds/still-<ts>.png)")
    parser.add_argument("--count", type=int, default=1, help="number of stills")
    args = parser.parse_args()

    api_key = require_env("XAI_API_KEY")
    prompt = read_prompt(args)
    if len(prompt) > PROMPT_CHAR_LIMIT:
        sys.exit(
            f"error: prompt is {len(prompt)} chars, exceeds Grok-2-Image limit of {PROMPT_CHAR_LIMIT}"
        )
    print(f"prompt: {prompt[:120]}{'...' if len(prompt) > 120 else ''}", file=sys.stderr)

    body = json.dumps(
        {
            "model": MODEL,
            "prompt": prompt,
            "n": args.count,
            "response_format": "b64_json",
        }
    ).encode()

    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"error: {e.code} {e.reason} — {e.read().decode(errors='replace')}")

    images = payload.get("data", [])
    if not images:
        sys.exit(f"error: no images in response: {payload}")

    BUILDS_DIR.mkdir(exist_ok=True)
    ts = int(time.time())
    written = []
    for i, img in enumerate(images):
        b64 = img.get("b64_json")
        if not b64:
            sys.exit(f"error: missing b64_json in image {i}: {img}")
        if args.out and len(images) == 1:
            out_path = Path(args.out)
        else:
            suffix = f"-{i}" if len(images) > 1 else ""
            out_path = BUILDS_DIR / f"still-{ts}{suffix}.png"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(base64.b64decode(b64))
        written.append(out_path)
        print(f"wrote {out_path} ({out_path.stat().st_size / 1_000:.1f} KB)", file=sys.stderr)

    # Print paths to stdout so the next stage (veo.py) can consume them.
    for p in written:
        print(p)


if __name__ == "__main__":
    main()
