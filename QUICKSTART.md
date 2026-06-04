# ⬡ Quick Start — 30 Seconds to Evolution

## 1. Open the spreadsheet

```bash
# From this repo:
open browser/index.html

# Or just double-click it in your file manager.
```

No install. No server. No dependencies. Just a browser.

## 2. What you'll see

A dark spreadsheet grid with **20 agents** (rows) and **5 environments** (columns).
Each cell shows a fitness value between 0 and 1 — how well that agent performs.

## 3. Press ▶ Evolve

Click the green **▶ Evolve** button in the toolbar.

Watch: the weak die. The strong survive. Their children carry mutations.
Generation counter ticks up. The grid changes color.

## 4. Try a formula

Click the formula bar and type:

```
=SPECIES(B:B)
```

Press Enter. You'll get a toast showing how many unique strategy species exist,
with color-coded rows in the grid.

## 5. Open charts

Click **📊 Charts** in the toolbar. A side panel opens with 5 visualizations.
Switch between them with the tabs: Heatmap, Dendrogram, Entropy, Pareto, Species.

## 6. Keep going

- **+ Agents** to add more minds to the population
- **+ Environment** to add a new selection pressure
- `=EXHAUSTIVE(C)` to see all 81 possible strategies ranked
- `=EVOLVE(B2:B40, 500)` to really crank up the evolution

That's it. You're running evolution in a spreadsheet.

## Pre-built Demos

Want a guided experience? Open one of the examples:

- [`examples/basic-evolution.html`](examples/basic-evolution.html) — 10 agents, simple evolution
- [`examples/species-ecology.html`](examples/species-ecology.html) — all 5 species competing
- [`examples/conservation-demo.html`](examples/conservation-demo.html) — conservation law in action
