# ShatterSand

A 2D superhero destruction sandbox where the **entire world is a falling-sand
cellular simulation**. Every pixel is a material that (eventually) melts,
floods, freezes, burns and collapses according to real rules.

Original name, art and code. No game engine — TypeScript + Vite, rendering to a
single canvas.

> **Status: Phase 1 complete** — grid, renderer, sand/water/rock(/dirt), mouse
> painting, chunk sleeping, and an fps/profiling HUD. Built to be extended phase
> by phase (see roadmap below).

---

## Run it

```bash
npm install
npm run dev      # open the printed localhost URL
```

Other scripts:

```bash
npm run build      # typecheck + production bundle into dist/
npm run preview    # serve the production build
npm run test       # unit tests (Vitest)
npm run typecheck  # tsc --noEmit
```

## Controls (Phase 1)

| Input | Action |
| --- | --- |
| **Left mouse** | Paint the selected material |
| **Right mouse** | Erase (paint air) |
| **1–5** or **mouse wheel** | Switch material |
| **`[` / `]`** | Shrink / grow the brush |

Try: pour sand into the water pool and watch it sink; carve a hole in a pool
wall and let it drain; bury the dune; watch the HUD — idle regions drop out of
"chunks awake" and sim time falls to ~0.

---

## Architecture

Strict module separation; materials and their behaviour live in a **data
table**, not scattered conditionals.

```
src/
├── sim/                     # the cellular world (no DOM, no rendering)
│   ├── constants.ts         # world size & timestep — fixed constants
│   ├── materials.ts         # THE material data table (ids, state, density, colour)
│   ├── world.ts             # typed-array cell storage + chunk sleeping
│   ├── simulation.ts        # fixed-step update rules (powder / liquid / displacement)
│   └── worldgen.ts          # Phase 1 starter scene
├── render/
│   └── renderer.ts          # framebuffer -> canvas (ImageData + CSS pixelated scale)
├── core/
│   ├── loop.ts              # fixed-timestep loop (60 Hz sim, rAF render) + profiling
│   ├── input.ts             # pointer/keyboard -> paint intent
│   └── rng.ts               # deterministic PRNG
├── ui/
│   └── hud.ts               # DOM overlay: stats, palette, help
└── main.ts                  # wires everything together
```

### How the simulation works

- **Storage is structure-of-arrays** in flat typed arrays (`mat`, `temp`,
  `shade`, `flags`), no per-cell objects — cache-friendly and allocation-free.
  World resolution is **512×288**, fixed in `constants.ts`. `World` takes
  dimensions as constructor args (defaulting to those constants) purely so tests
  can build tiny worlds.
- **Fixed timestep:** the sim runs at a fixed 60 Hz via an accumulator,
  decoupled from the render loop (`requestAnimationFrame`), with a catch-up cap
  to avoid a death-spiral after a stall.
- **Chunk sleeping:** the world is split into 32×32 chunks with double-buffered
  dirty flags. Only chunks touched last frame are simulated; a move or paint
  wakes the affected chunk and its border neighbours. **Idle areas cost nothing**
  (watch "chunks awake" in the HUD).
- **Update order:** chunks are processed bottom-row-first; within a row the
  horizontal scan direction alternates each tick to cancel left/right drift. A
  per-cell "moved this tick" guard prevents a cell being advanced twice.
- **Movement rules (data-driven by `state` + `density`):**
  - *Powder* (sand, dirt): falls down, then diagonally down.
  - *Liquid* (water): falls down/diagonally, then disperses sideways (bounded).
  - *Displacement:* a denser mobile cell sinks through a lighter liquid/gas by
    swapping — so sand sinks through water and the water rises.
  - *Solid* (rock) and *gas* (air) are inert in Phase 1.

### Rendering

An `ImageData` the size of the world is filled from the material colour table
plus a per-cell shade jitter, blitted 1:1 to the canvas, then scaled up by CSS
`image-rendering: pixelated`. No per-frame scaling draw, chunky pixels for free.

---

## Performance notes & risks (tracked for later phases)

- **Liquids may never sleep** — open water sloshing at its edges keeps chunks
  awake. Phase 1 confines water to walled pools; later phases need equilibrium
  detection. **This is the main thing to watch as content grows.**
- **Temperature diffusion** (Phase 2) must run only on active chunks.
- **Rigid-chunk collapse** (Phase 3) flood-fill must be bounded + budgeted.
- **Explosions / lightning** must be radius/graph bounded.
- **Particles** must use a typed-array pool (no per-particle GC).
- Escape hatch if single-core isn't enough: move the sim to a WebWorker +
  SharedArrayBuffer. The sim module is pure and self-contained to allow this.

---

## Tests

`npm run test` covers the Phase 1 physics and the chunk system:

- powder falls, piles, conserves mass, forms a slope;
- water spreads to level and conserves volume;
- density displacement (sand sinks through water; sand can't pass solid rock);
- chunk sleeping: correct chunk wakes, border neighbours wake, untouched world
  sleeps, activity doesn't persist without a touch;
- world storage swap + moved-tick bookkeeping.

---

## Roadmap

1. **Phase 1 (done)** — grid, renderer, sand/water/rock, painting, chunk
   sleeping, fps counter.
2. Phase 2 — temperature, all materials, phase changes, fire, explosions.
3. Phase 3 — rigid-chunk structural collapse.
4. Phase 4 — superhero movement and all elemental powers.
5. Phase 5 — procedural worlds, HUD, menus, synthesized audio.
6. Phase 6 — data-driven mission system + first 6 missions.
7. Phase 7 — level editor with save / load / share.
8. Phase 8 — kaiju fights.
