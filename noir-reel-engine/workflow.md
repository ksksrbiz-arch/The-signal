# Daily Workflow — 30-Minute Assembly Line

One reel per day. Same pipeline, different variables.

## Stage 1 — Generate (5 min)

1. Roll a row from `master-template.md` (or run `python3 generate.py`).
2. Append your **Visual Anchor** (hex glow / black turtleneck / cyan flash).
3. Generate 3–4 candidate stills in your image tool of choice
   (Midjourney v6, Flux, DALL·E 3, SDXL).
4. Pick the strongest. Discard the rest.

**Character consistency:** lock the face on day one with Midjourney `--cref`
or an IP-Adapter reference. Reuse across all subsequent reels so the
"entrepreneur" is recognizably the same person.

## Stage 2 — Animate (10 min)

Upload the still to **Luma Dream Machine**, **Runway Gen-3**, or **Kling**.

Use the motion brush to animate **only one or two elements**:

- Rain falling in the background
- Neon flicker on a sign
- Slow zoom into the eyes
- Mist drifting across frame
- Subtle blink or head tilt

Export 4–6 second clips. Avoid full-body motion — it usually breaks the face.
The cinemagraph effect is what reads as "high-end" instead of "AI slop."

## Stage 3 — Voice (5 min)

1. Pick a blueprint from `script-blueprints.md` (or write a new one using the
   Stoic Formula: Cold Truth → Silent War → Dominance).
2. Run through ElevenLabs with the voice settings in `script-blueprints.md`.
3. Export as WAV.

## Stage 4 — Assemble (10 min) — CapCut or Premiere

1. Drop the animated clip on the timeline.
2. Layer voiceover.
3. Add audio bed: dark synth + city foley.
4. **Cut audio to silence** for 0.5–1.0s before the Dominance line.
5. Apply a low-pass / cold filter pass (slight teal lift, crushed blacks).
6. Add typography: clean spaced sans-serif (Montserrat, Inter), all caps,
   sparingly — usually only the Dominance line.
7. End on the **Visual Anchor** (hex glow or cyan flash).
8. Export 9:16, 1080×1920, ~24fps.

## Publishing Cadence

| Platform | Time (local) | Caption strategy |
| :--- | :--- | :--- |
| Instagram Reels | 7:30 AM | Cold Truth as the hook line. Three lines max. |
| TikTok | 8:00 PM | Same cut. Different opening text overlay. |
| YouTube Shorts | 9:00 AM | Add a one-line description. No hashtags in body. |
| LinkedIn | 7:00 AM Tue/Thu | Strip music. Caption-driven. The Stoic line in plain text. |

## Quality Gates (don't ship if any fail)

- [ ] Face is recognizable as your locked character
- [ ] Visual Anchor is present
- [ ] Audio cuts to silence at least once
- [ ] Final frame holds for ≥ 1.5s
- [ ] No floating limbs, broken hands, or warped neon text
- [ ] Captions burned in (most viewers watch muted)
