#!/usr/bin/env python3
"""Roll a noir-reel prompt and matching Stoic monologue."""

import argparse
import json
import random
from pathlib import Path

HERE = Path(__file__).parent

PROMPT_TEMPLATE = (
    "Photorealistic {shot} of a {character}, {action} in a {environment}, "
    "lit by {light}, {palette} palette, cinematic {lens}, ultra-sharp facial "
    "detail, 8K, dark city noir aesthetic, {texture}, {anchor}."
)

ASPECT = "--ar 9:16"


def roll_prompt(vars_data: dict) -> str:
    return PROMPT_TEMPLATE.format(
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


def roll_monologue(mono_data: dict) -> dict:
    return {
        "cold_truth": random.choice(mono_data["cold_truth"]),
        "silent_war": random.choice(mono_data["silent_war"]),
        "dominance": random.choice(mono_data["dominance"]),
    }


def render(index: int, prompt: str, monologue: dict, suffix: str) -> str:
    return (
        f"--- Reel {index} ---\n"
        f"\n[VISUAL PROMPT]\n{prompt}{suffix}\n"
        f"\n[MONOLOGUE]\n"
        f"  Cold Truth.  {monologue['cold_truth']}\n"
        f"  Silent War.  {monologue['silent_war']}\n"
        f"  Dominance.   {monologue['dominance']}\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=1, help="how many reels to roll")
    parser.add_argument("--seed", type=int, default=None, help="reproducible seed")
    parser.add_argument(
        "--no-aspect",
        action="store_true",
        help="omit the trailing --ar flag (useful for non-Midjourney tools)",
    )
    parser.add_argument(
        "--prompt-only",
        action="store_true",
        help="skip the monologue and only print the visual prompt",
    )
    parser.add_argument(
        "--monologue-only",
        action="store_true",
        help="skip the visual prompt and only print the monologue",
    )
    args = parser.parse_args()

    vars_data = json.loads((HERE / "variables.json").read_text())
    mono_data = json.loads((HERE / "monologues.json").read_text())
    suffix = "" if args.no_aspect else f" {ASPECT}"

    for i in range(args.count):
        if args.seed is not None:
            random.seed(args.seed + i)

        if args.monologue_only:
            m = roll_monologue(mono_data)
            print(f"--- Monologue {i + 1} ---")
            print(f"  Cold Truth.  {m['cold_truth']}")
            print(f"  Silent War.  {m['silent_war']}")
            print(f"  Dominance.   {m['dominance']}\n")
        elif args.prompt_only:
            print(f"--- Prompt {i + 1} ---")
            print(roll_prompt(vars_data) + suffix + "\n")
        else:
            prompt = roll_prompt(vars_data)
            monologue = roll_monologue(mono_data)
            print(render(i + 1, prompt, monologue, suffix))


if __name__ == "__main__":
    main()
