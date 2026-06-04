# Future Integration: superinstance-spreadsheet

## Current State
The ternary spreadsheet — every cell is a ternary agent with 4 weights in {-1, 0, +1}, every column is an environment, every cell is an outcome. Press "Evolve" and natural selection happens in the spreadsheet. Zero-install browser app (`browser/index.html`). The spreadsheet that thinks.

## Integration Opportunities

### With ternary-spreadsheet
superinstance-spreadsheet IS the proof-of-concept for ternary-spreadsheet's Rust implementation. The browser demo validates the concept: ternary agents evolving in a spreadsheet grid with real-time visualization. The Rust port (ternary-spreadsheet) provides the production backend; superinstance-spreadsheet provides the UI reference.

### With room-as-codespace
The superinstance-spreadsheet IS the room's world model. When a room spins up, it creates a ternary spreadsheet grid. Agents are rows, environments are columns, outcomes are cells. The room ticks by evolving the spreadsheet. The spreadsheet IS the room.

### With evolution-ternary
The "Evolve" button triggers evolution-ternary's `EvolutionEngine` under the hood. Tournament selection, point mutation, crossover, and autofill mutation drive the spreadsheet's evolution. SpeciesTracker classifies agents into Explorer/Diplomat/Warrior/Hybrid, coloring the spreadsheet rows.

## Dormant Ideas Now Unlockable
The browser demo was a proof-of-concept without a backend. Now the full ternary stack (ternary-cell, ternary-protocol, ternary-registry) provides the backend. The browser demo becomes the frontend for a real distributed simulation, not just a local toy.

## Potential in Mature Systems
The ternary spreadsheet becomes the fleet's world model. Every room runs one. The fleet is a collection of spreadsheets, each representing a domain. Strategy transfer between rooms (strategy-transfer crate) becomes copy-paste between spreadsheets. Evolution happens continuously. Natural selection IS the fleet's optimization algorithm.

## Cross-Pollination Ideas
- **Spreadsheet-moment**: Production UI replaces the browser demo's HTML
- **strategy-ecology**: Five strategy species (Explorer through Prospector) color the spreadsheet
- **conservation-matrix-rs**: Conservation laws constrain what evolution can produce
- **lotka-volterra-agents**: Population dynamics between strategy species in the spreadsheet

## Dependencies for Next Steps
- Backend: ternary-spreadsheet Rust engine with WebSocket API
- Frontend: Spreadsheet-moment Univer UI replacing browser demo
- Evolution: evolution-ternary integration for real evolutionary dynamics
