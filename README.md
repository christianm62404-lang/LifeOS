# ShatterSand

A 2D superhero destruction sandbox where the **entire world is a falling-sand
cellular simulation**. Every pixel is a material that (eventually) melts,
floods, freezes, burns and collapses according to real rules.

Original name, art and code. No game engine — TypeScript + Vite, rendering to a
single canvas.

> **Status: Phase 4 complete** — the flying superhero and all nine elemental
> powers, plus Phase 3's rigid-chunk structural collapse, on top of the
> Phase 1–2 cellular simulation (temperature, materials, fire, explosions).

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

## Controls

Two modes, toggled with **Tab**:

**Hero mode** (default) — play as the flying hero, *Emberkin*:

| Input | Action |
| --- | --- |
| **WASD / arrows** | Fly (momentum-based) — the hero plows *through* terrain, carving and collapsing it |
| **Mouse** | Aim |
| **Left mouse** | Use the selected power (unlimited — no cooldowns) |
| **1–9** or **wheel** | Switch power |
| **Middle mouse** | Explode at the cursor |

Powers: **1** Heat Beam · **2** Freeze Breath · **3** Water Jet ·
**4** Lava Eruption · **5** Earth Raise · **6** Quake · **7** Lightning ·
**8** Wind Gust · **9** Ground Slam.

**Paint mode** — the material sandbox:

| Input | Action |
| --- | --- |
| **Left mouse** | Paint the selected material |
| **Right mouse** | Erase (paint air) |
| **1–9** or **wheel** | Switch material |
| **`[` / `]`** | Shrink / grow the brush |
| **X** or **middle mouse** | Explode at the cursor |

Materials: sand, water, rock, dirt, wood, metal, lava, ice, fire, steam, air.

Things to try:
- Pour **water** onto the **lava** pocket → it flashes to **steam** and the lava
  quenches to **rock**.
- Drop **fire** on the **wooden shack** → it catches, spreads, and leaves
  **smoke** that rises and dissipates.
- Bury the **metal** beam in **lava** → it melts to molten metal, then
  resolidifies as it cools.
- Splash **water** on the **ice** block, or heat the ice → it melts and drips.
- **Explode** (X) a hillside → solids shatter into flying debris that falls and
  re-settles into the grid; screen shake on the blast.
- Melt **sand** with lava/heat → it fuses into **glass**.
- **Undermine a structure** (erase/ground-slam its base) → the disconnected top
  detaches, falls as a rigid chunk, and shatters back into cells on impact.
- Fly into **lava** or deep **water** → watch the HP bar drop (then regen when safe).
- Watch the HUD: idle regions drop out of "chunks awake" and sim ms falls to ~0.

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
│   ├── simulation.ts        # two-pass update: thermal/reactions, then movement
│   ├── particles.ts         # debris pool (SoA) that re-enters the grid
│   ├── explosion.ts         # radial shatter + heat + debris
│   ├── collapse.ts          # connectivity flood-fill -> falling rigid bodies
│   └── worldgen.ts          # starter scene
├── entity/
│   ├── hero.ts              # flying hero: movement, AABB collision, health
│   └── powers.ts            # the 9 elemental powers (data-driven table)
├── render/
│   └── renderer.ts          # framebuffer -> canvas; draws cells, bodies, hero, FX
├── core/
│   ├── loop.ts              # fixed-timestep loop (60 Hz sim, rAF render) + profiling
│   ├── input.ts             # pointer/keyboard -> hero + paint intent
│   ├── effects.ts           # transient beam/bolt overlay
│   ├── fx.ts                # screen-shake trauma
│   └── rng.ts               # deterministic PRNG
├── ui/
│   └── hud.ts               # DOM overlay: stats, health, palette, help
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
  - *Liquid* (water, lava, molten metal): falls, then disperses sideways by a
    per-material `fluidity` (water runny, lava viscous).
  - *Gas* (steam, smoke): rises and drifts; `floats:false` fire sits on its fuel.
  - *Displacement:* a denser mobile cell sinks through a lighter liquid/gas by
    swapping (sand sinks through water); gases rise through heavier fluids.
  - *Solid* (rock, metal, ice, glass, wood) doesn't move.

### Temperature & reactions (Phase 2)

- Each active cell diffuses heat with its neighbours (rate ∝ `conductivity`),
  relaxes toward ambient, and — if it's a source (`sourceTemp`) — drives its own
  temperature (lava hot, ice cold, fire hot). A chunk only stays awake while its
  temperature is still changing, so thermal equilibrium sleeps.
- **Phase changes** are pure data on the material: cross `highAbove`→`highTo`
  (ice→water, water→steam, sand→glass, metal→molten, rock→lava, wood→fire) or
  `lowBelow`→`lowTo` (water→ice, steam→water, lava→rock, molten→metal). Fire and
  smoke decay over time (`life`/`decayTo`).
- **Contact reactions** live in a `REACTIONS` table, e.g. lava + water →
  rock + steam, molten metal + water → metal + steam (quench). Checked both
  orderings; only materials flagged reactive pay the neighbour-scan cost.
- **Explosions** deposit radial heat and shatter solids whose `strength` is
  below the local impulse, throwing debris **particles** (a typed-array pool)
  that fly in continuous space and re-enter the grid where they land.
- Hot materials **glow** in the renderer (temperature-driven), and blasts
  trigger screen shake.

### Structural collapse (Phase 3)

When solids are damaged, the affected region is queued for a connectivity check.
A flood-fill walks each connected-solid component; any component that no longer
reaches the world floor (its anchor) is lifted out of the grid into a **rigid
body** that falls under gravity and shatters back into cells on impact. Falling
solids (rigid bodies and debris) **sink through liquids and gases** — only
solids and powders stop them. Cost is
bounded: only damaged regions are checked (never the whole world), each
component floods at most `MAX_COMPONENT` cells (so the ground is permanently
anchored), and only a few regions are processed per tick.

### Hero & powers (Phase 4)

The hero is an animated 8×12 flying sprite with momentum flight. Rather than
colliding, he **flies through terrain** — solids he overlaps shatter into debris
and the surrounding structure is flagged for collapse, so he tunnels destruction
as he moves. Health is drained by heat, lava/fire, drowning and crushing (regen
when safe). Powers have **no cooldowns**, and originate from a muzzle point just
ahead of the hero so beams never cook him. Every power acts directly on the
simulation and lives in a data table
(`powers.ts`): **Heat Beam** (melts), **Freeze Breath** (freezes), **Water Jet**
(emits water particles), **Lava Eruption**, **Earth Raise** (rock pillar),
**Quake** (destabilises structures → collapse), **Lightning** (conducts through
connected metal/water), **Wind Gust** (blows powders/liquids/gases as
particles), **Ground Slam** (kinetic, fireless shatter + collapse).

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

`npm run test` (53 tests) covers the physics and systems:

- **Movement:** powder falls/piles/conserves mass/forms a slope; water spreads
  to level and conserves volume; density displacement (sand sinks through water;
  sand can't pass solid rock).
- **Chunk sleeping:** correct chunk wakes, border neighbours wake, untouched
  world sleeps, activity doesn't persist without a touch; swap + moved-tick.
- **Thermal:** metal↔molten, ice↔water, water↔steam, sand→glass, wood→fire
  phase changes; fire decays to smoke.
- **Reactions:** lava + water → rock + steam, in either neighbour order.
- **Explosions:** weak material shatters, material stronger than the impulse is
  spared, debris enters the particle pool.
- **Collapse:** a floating component detaches into a body, an anchored one does
  not, blowing out a tower's base collapses its top, a fallen body re-enters the
  grid as cells.
- **Hero:** momentum movement, stays in bounds, carves through solid terrain,
  takes lava damage, regenerates when safe, respawns on death.
- **Powers:** every power fires without error and affects the world; the muzzle
  offset keeps the Heat Beam off the hero's own cell; per-power checks for lava
  eruption, earth raise, quake debris, lightning conduction, wind lift, slam.

---

## Roadmap

1. **Phase 1 (done)** — grid, renderer, sand/water/rock, painting, chunk
   sleeping, fps counter.
2. **Phase 2 (done)** — temperature, all materials, phase changes, fire,
   explosions + debris particles.
3. **Phase 3 (done)** — rigid-chunk structural collapse.
4. **Phase 4 (done)** — superhero movement and all nine elemental powers.
5. Phase 5 — procedural worlds, HUD, menus, synthesized audio.
6. Phase 6 — data-driven mission system + first 6 missions.
7. Phase 7 — level editor with save / load / share.
8. Phase 8 — kaiju fights.
