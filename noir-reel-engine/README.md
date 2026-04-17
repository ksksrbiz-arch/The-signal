# Noir Reel Engine

A reproducible system for producing daily noir-aesthetic talking-head reels
without starting from scratch each time. Plug variables into a master template,
animate the still, narrate over a stoic monologue, ship.

## Structure

| File | Purpose |
| :--- | :--- |
| `master-template.md` | The fill-in-the-blank prompt template + variable menu |
| `variables.json` | Machine-readable variable library (for the generator) |
| `monologues.json` | Bank of Cold Truth / Silent War / Dominance lines |
| `script-blueprints.md` | 5 daily monologue blueprints using the Stoic formula |
| `workflow.md` | 30-minute daily assembly line |
| `generate.py` | Rolls a visual prompt + matching monologue (CLI flags below) |

## The Three Architectural Pillars

1. **Variable Menu** — six axes (shot, action, environment, light, palette, texture).
   One pick from each column produces a unique-but-on-brand prompt.
2. **Visual Anchor** — a recurring signature (hexagonal light pattern, black
   turtleneck, or teal-to-cyan grade flash) appears in every reel so the work
   reads as a series, not stock clips.
3. **Stoic Scripting Formula** — every monologue follows
   *Cold Truth → Silent War → Dominance*.

## Quick Start

```bash
cd noir-reel-engine
python3 generate.py                    # one reel: visual prompt + monologue
python3 generate.py --count 5          # five reels (one work-week)
python3 generate.py --seed 42          # reproducible
python3 generate.py --prompt-only      # just the image prompt
python3 generate.py --monologue-only   # just the script
python3 generate.py --no-aspect        # drop the trailing --ar 9:16 (non-Midjourney)
```
