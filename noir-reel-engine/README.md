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
| `plan.py` | Builds a 30-day CSV of dated seeds + blueprint assignments |
| `plan.csv` | The current rolling plan — `seed` column feeds `generate.py --seed` |
| `veo.py` | Renders a prompt into an mp4 via Veo 3.1 (reads `GEMINI_API_KEY`) |
| `grok.py` | Generates a still via xAI Grok-2-Image (reads `XAI_API_KEY`) |

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

# Plan a month at a time
python3 plan.py                        # rebuild plan.csv (30 days from today)
python3 plan.py --start 2026-05-01 --days 60 --base-seed 2000

# Render video via Veo 3.1 (requires GEMINI_API_KEY in env)
export GEMINI_API_KEY="your-key"
python3 generate.py --prompt-only --seed 1000 --no-aspect | python3 veo.py
python3 veo.py --prompt "Photorealistic ..." --out builds/reel-042.mp4

# Image-to-video: generate a Grok still first, then animate with Veo
# (character stays more consistent across reels this way)
export XAI_API_KEY="your-xai-key"
PROMPT=$(python3 generate.py --seed 1000 --prompt-only --no-aspect | tail -n +2)
python3 grok.py --prompt "$PROMPT" --out builds/still-042.png
python3 veo.py --prompt "$PROMPT" --image builds/still-042.png --out builds/reel-042.mp4
```
