"""Shared helpers for the noir-reel-engine CLIs."""

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
BUILDS_DIR = HERE / "builds"


def read_prompt(args: argparse.Namespace) -> str:
    """Return the prompt from --prompt or stdin, stripping generate.py headers."""
    if getattr(args, "prompt", None):
        return args.prompt.strip()
    if sys.stdin.isatty():
        sys.exit("error: no prompt provided via --prompt or stdin")
    data = sys.stdin.read().strip()
    if not data:
        sys.exit("error: empty prompt on stdin")
    lines = [ln for ln in data.splitlines() if not ln.startswith("--- ")]
    return " ".join(ln.strip() for ln in lines if ln.strip())


def load_json(name: str) -> dict:
    return json.loads((HERE / name).read_text())


def require_env(var: str) -> str:
    import os

    val = os.environ.get(var)
    if not val:
        sys.exit(f"error: {var} not set in environment")
    return val
