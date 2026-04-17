#!/usr/bin/env python3
"""Roll a noir-reel prompt by sampling one cell from each axis of variables.json."""

import argparse
import json
import random
from pathlib import Path

TEMPLATE = (
    "Photorealistic {shot} of a {character}, {action} in a {environment}, "
    "lit by {light}, {palette} palette, cinematic {lens}, ultra-sharp facial "
    "detail, 8K, dark city noir aesthetic, {texture}, {anchor}."
)

ASPECT = "--ar 9:16"


def roll(vars_data: dict, seed: int | None = None) -> str:
    if seed is not None:
        random.seed(seed)
    return TEMPLATE.format(
        shot=random.choice(vars_data["shot_types"]),
        character=random.choice(vars_data["characters"]),
        action=random.choice(vars_data["actions"]),
        environment=random.choice(vars_data["environments"]),
        light=random.choice(vars_data["lighting_sources"]),
        palette=random.choice(vars_data["color_palettes"]),
        lens=random.choice(vars_data["lenses"]),
        texture=random.choice(vars_data["textures"]),
        anchor=random.choice(vars_data["visual_anchors"]),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=1, help="how many prompts to roll")
    parser.add_argument("--seed", type=int, default=None, help="reproducible seed")
    parser.add_argument(
        "--no-aspect",
        action="store_true",
        help="omit the trailing --ar flag (useful for non-Midjourney tools)",
    )
    args = parser.parse_args()

    vars_path = Path(__file__).parent / "variables.json"
    vars_data = json.loads(vars_path.read_text())

    suffix = "" if args.no_aspect else f" {ASPECT}"
    for i in range(args.count):
        seed = None if args.seed is None else args.seed + i
        print(f"--- Prompt {i + 1} ---")
        print(roll(vars_data, seed=seed) + suffix)
        print()


if __name__ == "__main__":
    main()
