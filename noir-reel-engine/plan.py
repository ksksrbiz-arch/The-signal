#!/usr/bin/env python3
"""Build a 30-day content calendar of reel seeds + blueprint assignments.

Each day gets a deterministic seed so `generate.py --seed <N>` reproduces
the exact reel paired to that date. Run whenever you want a fresh plan.
"""

import argparse
import csv
import datetime as dt
import random
from pathlib import Path

HERE = Path(__file__).parent
BLUEPRINTS = [
    "1. The Comfortable Lie",
    "2. The City That Doesn't Care",
    "3. The Quiet Build",
    "4. The Mirror",
    "5. The Long Game",
]
DEFAULT_DAYS = 30


def build(start: dt.date, days: int, base_seed: int) -> list[dict]:
    random.seed(base_seed)
    rows = []
    for i in range(days):
        date = start + dt.timedelta(days=i)
        rows.append(
            {
                "date": date.isoformat(),
                "weekday": date.strftime("%a"),
                "seed": base_seed + i,
                "blueprint": random.choice(BLUEPRINTS),
                "status": "",
                "notes": "",
            }
        )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default=dt.date.today().isoformat(), help="YYYY-MM-DD")
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS)
    parser.add_argument("--base-seed", type=int, default=1000)
    parser.add_argument("--out", default=str(HERE / "plan.csv"))
    args = parser.parse_args()

    start = dt.date.fromisoformat(args.start)
    rows = build(start, args.days, args.base_seed)

    with open(args.out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} days to {args.out}")
    print(f"First: {rows[0]['date']} (seed {rows[0]['seed']}) -> {rows[0]['blueprint']}")
    print(f"Last:  {rows[-1]['date']} (seed {rows[-1]['seed']}) -> {rows[-1]['blueprint']}")


if __name__ == "__main__":
    main()
