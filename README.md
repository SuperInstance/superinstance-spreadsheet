# SuperInstance Spreadsheet

> Excel, but alive.

Every cell is a tiny intelligence. Every formula is a strategy. Every sort is natural selection.

## The Interface You Already Know

```
     A          B          C          D          E
1  Strategy   Market₁    Market₂    Market₃    Avg
2  [-1,0,+1,0]  0.72      0.68      0.71      0.70  ← evolving
3  [0,+1,0,-1]  0.65      0.71      0.63      0.66  ← evolving
4  [+1,+1,-1,0] 0.44      0.41      0.39      0.41  ← dying
5  [-1,-1,+1,+1] 0.78     0.75      0.80      0.78  ← dominating
6  ...
7  Best:       0.78      0.75      0.80      0.78
8  Species:    5          4          6          —
```

**Row 2-5**: Each row is a ternary agent (4 weights, {-1,0,+1})
**Columns B-D**: Each column is a decision environment (market, game, negotiation)
**Cells**: Outcome when that agent plays that environment
**Row 6**: Auto-fills — the spreadsheet discovers new strategies
**Row 7**: Tracks best performer per environment
**Row 8**: Counts how many strategy species survive

## It's Just Spreadsheet Operations

| What you do in Excel | What it does here |
|---|---|
| Type a value | Set a ternary weight (-1, 0, +1) |
| Copy formula down | Clone an agent |
| Sort by column | Natural selection — weakest die |
| Conditional format | Fitness heatmap |
| Pivot table | Strategy species discovery |
| Autofill | Evolutionary mutation |
| Goal seek | Find optimal ternary policy |
| Solver | Exhaustive search of all 81 strategies |

## But Way More Useful

**Excel**: `=SUM(B2:B5)` → adds numbers
**This**: `=EVOLVE(B2:B5, 100)` → runs 100 generations of selection

**Excel**: `=VLOOKUP(...)` → finds a row
**This**: `=BEST_STRATEGY(B:B)` → finds the dominant ternary policy

**Excel**: `=IF(A1>0.5, "good", "bad")` → binary judgment
**This**: `=SPECIES(A:A)` → clusters all agents into strategy archetypes

**Excel**: Chart → shows your data
**This**: Chart → shows the fitness landscape, strategy ecology, convergence dynamics

## The Math (Invisible to Users)

- Each agent = 4 bytes (ternary int8 × 4 weights)
- 3^4 = 81 possible strategies — enumerable, not searchable
- RTX 4050 fits 750 million agents
- Every possible strategy tested against every environment simultaneously
- Natural selection in the sort operation
- Mutation in the autofill
- Species detection in the pivot table

Users never see any of this. They see a spreadsheet where cells think.

## Architecture

```
Browser (HTML + WASM)
├── Grid engine (Canvas, virtual scrolling for millions of cells)
├── Ternary agent core (lever-runner-wasm, 71KB gzip)
├── Evolution formulas (EVOLVE, BEST_STRATEGY, SPECIES, CONVERGE)
├── Visualization (fitness heatmap, strategy dendrogram, entropy chart)
└── Export (.csv, .json, .nail bridge to lever-runner)

GPU Backend (optional)
├── CUDA/OpenCL ternary batch (tile-cuda / tile-opencl)
├── 750M agents on RTX 4050
└── Results stream back to spreadsheet
```

## Quick Start

```bash
# Zero-install: open index.html in any browser
open browser/index.html

# Or with GPU backend:
python -m spreadsheet.server --gpu
```

## Why This Works

1. **Familiar**: Everyone already knows spreadsheets
2. **Powerful**: 750M parallel minds, exhaustive strategy search
3. **Instant**: Ternary = integer ops, no gradients, no training
4. **Honest**: No black box — you see every weight, every outcome
5. **Alive**: Cells evolve, strategies compete, species emerge

## License

MIT
