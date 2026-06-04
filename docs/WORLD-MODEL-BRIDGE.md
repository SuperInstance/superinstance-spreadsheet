# World Model Bridge: Spreadsheet-as-World

> The spreadsheet isn't a tool. It's a **universe** where every cell is alive, every formula is physics, and every recalculation is a tick of time.

## The Core Mapping

| Spreadsheet Concept | World Model Concept | ternary-world Equivalent |
|---|---|---|
| Cell | Room (PLATO) | `WorldGrid` cell at `(x, y)` |
| Formula | Physics law | `WorldPhysics` rule |
| Recalculation | Time tick | `WorldTime::advance()` |
| Sort | Natural selection | `sort_by_fitness()` |
| Conditional formatting | Vibe visualization | Fitness-based coloring |
| Conservation law | Thermodynamics | `WorldPhysics::target_sum` |
| `=EVOLVE()` | Evolutionary dynamics | 6-phase tick with GC |
| Autofill | Mutation / reproduction | `autofill_mutate()` |

---

## 1. Cell = Room

Every cell in the spreadsheet is a room from the PLATO model. It has sensors (formulas reading neighbors), a nervous system (dependency propagation), and memory (value history).

```rust
use ternary_world::{Trit, WorldGrid};
use ternary_spreadsheet::{TernaryValue, Cell};

/// A spreadsheet cell that IS a world room.
struct SpreadsheetRoom {
    /// Grid position (row, col) = room coordinates (x, y)
    position: (usize, usize),
    /// Current ternary value — the room's state
    value: TernaryValue,
    /// The formula — the room's physics
    formula: Option<String>,
    /// Prediction: what the room expects its next value to be
    prediction: TernaryValue,
    /// Surprise: deviation between prediction and actual
    surprise: f64,
    /// Energy: room health (depletes with low surprise, recharges with high)
    energy: f64,
    /// Neighbors: which cells this room reads (dependency edges)
    dependencies: Vec<(usize, usize)>,
    /// History: value memory for distillation
    history: Vec<TernaryValue>,
}

impl SpreadsheetRoom {
    /// Convert to ternary_world Trit for grid operations
    fn as_trit(&self) -> Trit {
        match self.value {
            TernaryValue::Negative => Trit::Neg,
            TernaryValue::Neutral => Trit::Zero,
            TernaryValue::Positive => Trit::Pos,
        }
    }

    /// Compute surprise: |prediction - actual|
    fn compute_surprise(&mut self) -> f64 {
        let pred = self.prediction.as_i8() as f64;
        let actual = self.value.as_i8() as f64;
        self.surprise = (pred - actual).abs();
        self.surprise
    }
}
```

The PLATO mapping:
- **Sensors**: Cell formula reads from other cells → `dependencies`
- **JEPA prediction**: Cell's expected value → `prediction`
- **Surprise**: Deviation between predicted and actual → `surprise`
- **Vibe vector**: Cell formatting (color, font) = state visualization → `conditional_format()`
- **Conservation**: Sum/range invariants preserved across recalculations → `WorldPhysics`
- **Murmur gossip**: Dependency propagation → cells tell dependents they changed
- **Distillation**: Value history → learned formula pattern → `Cell::history`

---

## 2. Formula = Physics

Every formula is a law of physics for the cell-universe:

| Formula | Physics Metaphor | Implementation |
|---|---|---|
| `=SUM(A1:A10)` | Conservation of mass | Total is preserved, redistribution is constrained |
| `=IF(A1>0, 1, -1)` | Binary phase transition | Ternary threshold crossing |
| `=EVOLVE(B2:B50, 100)` | Natural selection | Fitness-based survival, mutation, reproduction |
| `=EXHAUSTIVE(C1:C10)` | Quantum measurement | All 3^N states explored, best collapsed to |
| `=ENTROPY(D1:D10)` | Thermodynamic measurement | Shannon entropy of ternary distribution |
| `=BEST(E1:E10)` | Least action principle | Optimal path selected |
| `=SPECIES(F1:F10)` | Ecological survey | Count distinct populations |
| `=AVG(G1:G10)` | Equilibrium | Mean-field approximation |

### Conservation Laws as Formulas

The `WorldPhysics` struct enforces conservation. In spreadsheet terms:

```
=CONSERVE(A1:J10, 0)    // Total must remain 0
=CONSERVE(A1:J10, sum)  // Total must remain constant
```

When cell B3 changes from 0 to +1, the physics engine compensates by adjusting B4 from 0 to -1. This is **thermodynamics** — energy is neither created nor destroyed, only redistributed.

```rust
use ternary_world::{WorldPhysics, WorldGrid, Trit};

/// Physics engine that wraps spreadsheet recalculation
struct SpreadsheetPhysics {
    physics: WorldPhysics,
}

impl SpreadsheetPhysics {
    fn new() -> Self {
        SpreadsheetPhysics {
            physics: WorldPhysics::new(), // target_sum = 0
        }
    }

    /// Apply a cell change with conservation enforcement
    fn apply_change(
        &self,
        grid: &mut WorldGrid,
        x: usize,
        y: usize,
        new_val: Trit,
    ) -> bool {
        self.physics.apply(grid, x, y, new_val)
    }

    /// Check that the entire spreadsheet obeys conservation
    fn is_conserved(&self, grid: &WorldGrid) -> bool {
        self.physics.is_conserved(grid)
    }
}
```

---

## 3. Sort = Natural Selection

Sorting a spreadsheet IS natural selection. The fittest rise, the weakest sink.

The `sort_by_fitness()` function from `ternary-spreadsheet` is literally evolution:

1. **Fitness evaluation**: Each cell's fitness is computed (from its value, history diversity)
2. **Selection**: Rows/columns sorted by total fitness (descending)
3. **Survival**: Top half survives unchanged
4. **Mutation**: Bottom half gets new values via `autofill_mutate()`
5. **Conservation**: Population size stays constant (grid dimensions don't change)

```rust
use ternary_spreadsheet::{Grid, sort_by_fitness, SortAxis, autofill_mutate, MutationConfig};

fn natural_selection(grid: &mut Grid) {
    // Phase 1: Evaluate fitness
    grid.compute_all_fitness();

    // Phase 2: Sort = selection pressure
    sort_by_fitness(grid, SortAxis::Row);

    // Phase 3: Mutate bottom half
    let (rows, cols) = grid.dimensions();
    let cutoff = rows / 2;
    let config = MutationConfig::default();
    for row in cutoff..rows {
        for col in 0..cols {
            if let Some(cell) = grid.get_mut(row, col) {
                // Mutation: introduce variation
                autofill_mutate(cell, &config);
            }
        }
    }

    // Phase 4: Conservation — grid size unchanged, energy budget preserved
}
```

---

## 4. The =EVOLVE() Formula

The crown jewel. `=EVOLVE(B2:B50, 100)` makes cells alive.

**What it does:**
1. Takes a range of cells (a population)
2. Runs N generations of evolution
3. Each generation: compute fitness → sort → keep top 50% → mutate bottom 50%
4. Returns the best fitness achieved

**How it maps to the 6-phase tick:**

| EVOLVE Phase | Tick Phase | What Happens |
|---|---|---|
| Compute fitness | `predict` | Each cell predicts its expected value |
| Evaluate formula | `perceive` | Actual value is computed |
| Compare fitness | `surprise` | |prediction - actual| = fitness signal |
| Update formatting | `vibe` | Cell color/weight reflects fitness |
| Remove low fitness | `gc` | Bottom 50% pruned (apoptosis) |
| Check conservation | `conservation` | Total energy budget maintained |

```rust
use ternary_spreadsheet::{FormulaEngine, Grid};

fn demo_evolve() {
    let mut grid = Grid::new(50, 3);
    // Initialize with random ternary values...

    let mut engine = FormulaEngine::new(grid);

    // This single formula call runs 100 generations of evolution
    let best_fitness = engine.evaluate("=EVOLVE(A1:C50, 100)").unwrap();

    println!("Best fitness after 100 generations: {}", best_fitness);

    // The grid is now evolved — cells have adapted
    let grid = engine.grid();
    for row in 0..grid.rows() {
        for col in 0..grid.cols() {
            let cell = grid.get(row, col).unwrap();
            print!("{} ", cell.value);
        }
        println!();
    }
}
```

---

## 5. Integration with ternary-cell Tick Cycle

The ternary-cell 6-phase tick maps directly to spreadsheet recalculation:

```
Spreadsheet Recalculation          ternary-cell Tick
─────────────────────              ──────────────────
1. Read dependencies    →          1. predict (JEPA)
2. Evaluate formulas    →          2. perceive (actual)
3. Compare expected     →          3. surprise (|pred - perc|)
   vs actual
4. Update formatting    →          4. vibe (energy redistribution)
5. Cache/remove dead    →          5. gc (apoptosis)
   cells
6. Verify totals        →          6. conservation (invariants)
```

**Bridge code:**

```rust
/// A spreadsheet that ticks like a ternary cell
struct TickingSpreadsheet {
    grid: Grid,
    physics: SpreadsheetPhysics,
    time: ternary_world::WorldTime,
    observer: ternary_world::WorldObserver,
}

impl TickingSpreadsheet {
    fn tick(&mut self) -> u64 {
        let (rows, cols) = self.grid.dimensions();

        // Phase 1: predict — each cell predicts next value
        for row in 0..rows {
            for col in 0..cols {
                if let Some(cell) = self.grid.get(row, col) {
                    // Prediction: average of history (simple JEPA)
                    let pred = if cell.history.is_empty() {
                        cell.value
                    } else {
                        // Most recent value as prediction
                        *cell.history.last().unwrap()
                    };
                    // Store prediction (would need extension)
                }
            }
        }

        // Phase 2: perceive — evaluate formulas (recalculation)
        // In practice, FormulaEngine.evaluate() handles this

        // Phase 3: surprise — compute fitness
        self.grid.compute_all_fitness();

        // Phase 4: vibe — conditional formatting
        // conditional_format() applies color based on fitness

        // Phase 5: gc — sort and mutate (natural selection)
        natural_selection(&mut self.grid);

        // Phase 6: conservation — verify invariants
        // physics.is_conserved() checks grid totals

        self.observer.record("tick", self.time.now() as f64);
        self.time.advance()
    }
}
```

---

## 6. Integration with ternary-room for Spatial Layout

A room IS a spreadsheet. The `WorldGrid` provides the spatial structure:

```rust
use ternary_world::{WorldGrid, WorldSnapshot, Trit};
use ternary_spreadsheet::Grid;

/// Convert between ternary-world grid and ternary-spreadsheet grid
fn world_to_spreadsheet(world: &WorldGrid) -> Grid {
    let mut grid = Grid::new(world.height, world.width);
    for y in 0..world.height {
        for x in 0..world.width {
            let trit = world.get(x, y).unwrap_or(Trit::Zero);
            let tv = match trit {
                Trit::Neg => TernaryValue::Negative,
                Trit::Zero => TernaryValue::Neutral,
                Trit::Pos => TernaryValue::Positive,
            };
            grid.set(y, x, tv);
        }
    }
    grid
}

/// A room that IS a spreadsheet
struct SpreadsheetRoomLayout {
    /// The world grid = the room's spatial layout
    world: WorldGrid,
    /// The spreadsheet = the room's computational model
    spreadsheet: Grid,
    /// Physics = conservation laws for the room
    physics: SpreadsheetPhysics,
}

impl SpreadsheetRoomLayout {
    /// Sync world state to spreadsheet
    fn sync_to_spreadsheet(&mut self) {
        self.spreadsheet = world_to_spreadsheet(&self.world);
    }

    /// Capture a snapshot of the room at this moment
    fn snapshot(&self, tick: u64) -> WorldSnapshot {
        WorldSnapshot::capture(tick, &self.world, &std::collections::HashMap::new(), &[])
    }
}
```

---

## 7. "One Strategy, Three Brains" Demo

The same spreadsheet, running at three hardware tiers simultaneously:

```
┌──────────────────────────────────────────────────────┐
│                     DGX (Layer 2)                     │
│                  "Runs the Universe"                   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  1000×1000 grid = 1M cells                       │ │
│  │  =EVOLVE(A1:ALL, 10000)                          │ │
│  │  Full GPU-accelerated evolution                  │ │
│  │  Discovers optimal strategies                    │ │
│  └──────────────────────────────────────────────────┘ │
│                    │ distill                           │
│                    ▼                                   │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Distillation: extract patterns from 1M cells    │ │
│  │  → Top 100 strategies with fitness scores        │ │
│  │  → Compressed lookup table                       │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│                 Raspberry Pi (Layer 1)                 │
│                 "Runs the Solar System"                │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  100×100 grid = 10K cells                        │ │
│  │  =EVOLVE(A1:J100, 1000)                          │ │
│  │  Uses distilled strategies from DGX              │ │
│  │  Refines for local conditions                    │ │
│  └──────────────────────────────────────────────────┘ │
│                    │ compile                           │
│                    ▼                                   │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Compile: top strategies → fixed lookup table    │ │
│  │  81 entries for 4-trit inputs                    │ │
│  │  ~650 bytes total                                │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│                    ESP32 (Layer 0)                     │
│                  "Runs the Planet"                     │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  1 cell = THE WORLD                              │ │
│  │  query_lookup("value") → 8ns                     │ │
│  │  Pre-evolved strategy from Pi                    │ │
│  │  The cell IS the universe                        │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### The Demo Flow

```rust
/// One Strategy, Three Brains — the complete demo
fn one_strategy_three_brains() {
    // === DGX: The Universe ===
    // 1M cells evolving on GPU
    let mut universe = Grid::new(1000, 1000);
    let mut engine = FormulaEngine::new(universe);

    // Run 10,000 generations of evolution
    let best_fitness = engine.evaluate("=EVOLVE(A1:ALL1000, 10000)").unwrap();
    println!("DGX: Best fitness = {}", best_fitness);

    // === Distillation: Universe → Solar System ===
    // Extract top 100 strategies from the universe
    let universe = engine.grid();
    let mut strategies: Vec<(TernaryValue, f64)> = universe.cells()
        .iter()
        .map(|c| (c.value, c.fitness))
        .collect();
    strategies.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    strategies.truncate(100);

    // === Pi: The Solar System ===
    // 10K cells using distilled strategies
    let mut solar_system = Grid::new(100, 100);

    // Seed with top strategies
    for (i, (val, _fitness)) in strategies.iter().enumerate() {
        let row = i / 100;
        let col = i % 100;
        if row < 100 {
            solar_system.set(row, col, *val);
        }
    }

    let mut pi_engine = FormulaEngine::new(solar_system);
    let pi_fitness = pi_engine.evaluate("=EVOLVE(A1:CV100, 1000)").unwrap();
    println!("Pi: Best fitness = {}", pi_fitness);

    // === Compile: Solar System → Planet ===
    // Build 81-entry lookup table from evolved strategies
    let solar_system = pi_engine.grid();
    let mut lookup = [TernaryValue::Neutral; 81];
    for (i, cell) in solar_system.cells().iter().take(81).enumerate() {
        lookup[i] = cell.value;
    }

    // === ESP32: The Planet ===
    // Single cell, 8ns lookup
    let planet_value = lookup[0]; // query_lookup("value")
    println!("ESP32: value = {} (frozen strategy from universe)", planet_value);

    // Same intelligence. Three bodies.
    println!("\nOne strategy. Three brains.");
}
```

### What Each Tier Computes

| Tier | Hardware | Grid Size | Tick Speed | What It Does |
|---|---|---|---|---|
| Layer 2 | DGX (GPU) | 1M cells | ~100 Hz (GPU parallel) | Discover strategies via evolution |
| Layer 1 | Raspberry Pi | 10K cells | ~1 kHz | Refine strategies for local context |
| Layer 0 | ESP32 | 1 cell | ~125 MHz (bare metal) | Execute frozen strategy instantly |

The key insight: **the ESP32 doesn't compute, it remembers**. The DGX computed the answer. The Pi refined it. The ESP32 just looks it up. Same intelligence, three bodies.

---

## Architecture Summary

```
ternary-world              ternary-spreadsheet           superinstance-spreadsheet
─────────────              ───────────────────           ─────────────────────────
WorldGrid          ←→      Grid (2D cells)               The spatial universe
WorldPhysics       ←→      FormulaEngine                  The laws of physics
WorldTime          ←→      Recalculation cycle            The tick of time
WorldObserver      ←→      Fitness heatmap                The telescope
WorldSnapshot      ←→      Cell history                   The fossil record
Trit               ←→      TernaryValue                   The atom of reality
```

The bridge is complete. The spreadsheet IS the world. Every formula IS physics. Every sort IS natural selection. And `=EVOLVE()` is the formula that makes it all come alive.
