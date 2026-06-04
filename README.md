# ⬡ SuperInstance Spreadsheet

**The spreadsheet that thinks.**

Every cell is a tiny intelligence. Every formula is an evolutionary strategy. Every sort is natural selection.

```
     A            B          C          D          E          F
1  Strategy      Market₁    Market₂    Negotiate  Navigate   Avg
2  [-1,0,+1,0]   0.72       0.68       0.71       0.65      0.69  ← surviving
3  [0,+1,0,-1]   0.65       0.71       0.63       0.74      0.68  ← surviving
4  [+1,+1,-1,0]  0.44       0.41       0.39       0.38      0.41  ← dying
5  [-1,-1,+1,+1] 0.78       0.75       0.80       0.82      0.79  ← dominating
```

Each row is a **ternary agent** — a mind with 4 weights in {-1, 0, +1}.
Each column is an **environment** — a decision problem to solve.
Each cell is an **outcome** — how well that mind performs in that world.
Press **▶ Evolve** and watch natural selection happen in a spreadsheet.

## 🚀 Quick Start

```bash
# No install. No server. No dependencies.
open browser/index.html
```

That's it. Opens in any browser. Works offline.

See [QUICKSTART.md](QUICKSTART.md) for the 30-second tour.

## 🧠 Formula Functions

The magic is in the formula bar. Type any of these and press Enter:

| Formula | What It Does |
|---|---|
| `=EVOLVE(B2:B50, 100)` | Run 100 generations of natural selection on those agents |
| `=BEST(C)` | Find the fittest agent in an environment |
| `=SPECIES(B:B)` | Cluster agents into strategy species, color-coded |
| `=EXHAUSTIVE(C)` | Test all 81 possible ternary strategies — ranked table |
| `=ENTROPY(B2:B50)` | Measure strategy diversity in bits |
| `=PARETO(B:B)` | Find agents on the Pareto frontier (no free lunches) |
| `=CORRELATE(C, D)` | Pearson correlation between two environments |

### Examples

```
=EVOLVE(B2:B40, 50)       → 50 generations of selection, top 50% survive
=BEST(C)                   → "Best in Market₂: Agent 5 (0.812) — [-1,-1,+1,+1]"
=SPECIES(B:B)              → "4 species found. Largest: 12 agents with [0,0,0,0]"
=EXHAUSTIVE(C)             → Modal with all 81 strategies ranked by fitness
=ENTROPY(B2:B100)          → "Entropy: 2.47 bits (18 unique / 99 agents)"
=PARETO(B:B)               → "7 Pareto-optimal agents found (out of 40)"
=CORRELATE(C, D)           → "r = -0.3423 (weak negative) between Market₂ and Negotiate"
```

## 📊 Visualizations

Toggle the **📊 Charts** panel for 5 canvas-rendered charts:

1. **Heatmap** — fitness across all agent × environment combinations
2. **Dendrogram** — strategy species sorted by similarity, sized by population
3. **Entropy** — diversity over generations (line chart with species count)
4. **Pareto** — scatter plot of fitness in two environments, front highlighted
5. **Species Pie** — proportion of each surviving strategy

## 🎮 Toolbar Controls

| Button | Action |
|---|---|
| **▶ Evolve** | Natural selection: keep top 50%, spawn mutated children |
| **⟳ Mutate** | Randomly mutate 30% of agents |
| **Sort ↑/↓** | Sort by average fitness |
| **☠ Cull Weak** | Remove the bottom 25% |
| **+ Environment** | Add a new random environment |
| **+ Agents** | Add 10 new random agents |
| **📊 Charts** | Toggle the visualization panel |

## 🧬 The Science

Each agent has 4 ternary weights: **{-1, 0, +1}** = {avoid, unknown, choose}.

There are only 3⁴ = **81 possible strategies** — small enough to enumerate, large enough to be interesting.

The five laws of negative-space intelligence govern the system:

1. **Conservation**: `{avoid} + {choose} + {neutral} = 100%` — the ternary is complete
2. **Asymmetry**: avoidance is stronger than approach (loss aversion proved)
3. **Exhaustion**: all 81 strategies are testable — no search, just evaluation
4. **Convergence**: repeated selection drives strategies toward fitness peaks
5. **Emergence**: species, diversity, and ecology arise from simple ternary rules

See [`negative-space-intelligence.json`](negative-space-intelligence.json) for the full proven profile, and [`gpu_ternary.py`](gpu_ternary.py) for the scalable GPU backend.

## 📁 Project Structure

```
browser/
  index.html          — The spreadsheet (start here)
  formulas.js         — Formula engine (EVOLVE, BEST, SPECIES, ...)
  visualizations.js   — Canvas charts (heatmap, dendrogram, entropy, Pareto, pie)
gpu_ternary.py        — GPU batch engine (scales to 750M agents)
examples/
  basic-evolution.html      — Simple 10-agent evolution demo
  species-ecology.html      — All 5 species competing
  conservation-demo.html    — Conservation law holding
```

## 🌐 Why This Works

1. **Familiar** — Everyone already knows spreadsheets
2. **Powerful** — Ternary = integer ops, no gradients, no training
3. **Instant** — Evolution happens in milliseconds
4. **Honest** — You see every weight, every outcome, no black box
5. **Alive** — Cells evolve, strategies compete, species emerge

## 📄 License

MIT
