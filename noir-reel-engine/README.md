# Noir Reel Engine

A reproducible system for producing daily noir-aesthetic talking-head reels
without starting from scratch each time. Plug variables into a master template,
animate the still, narrate over a stoic monologue, ship.

## Structure

| File | Purpose |
| :--- | :--- |
| `master-template.md` | The fill-in-the-blank prompt template + variable menu |
| `variables.json` | Machine-readable variable library (for the generator) |
| `script-blueprints.md` | 5 daily monologue blueprints using the Stoic formula |
| `workflow.md` | 30-minute daily assembly line |
| `generate.py` | Python helper: rolls a random combo and prints a ready-to-paste prompt |

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
python3 generate.py            # roll a random prompt
python3 generate.py --count 5  # roll five for a week of variety
```
