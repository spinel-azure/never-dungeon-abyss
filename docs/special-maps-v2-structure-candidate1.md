# Special maps V2: three-floor structural candidate 1

## Scope and accepted design

V1 and `phase2a-1` remain their existing, independent one-floor formats. V2 is a
new three-floor format. Do not reinterpret old codes, seeds, survey or fingerprints.
This step implements a **pure development generator and exhaustive structural
audit only**. It does not issue/import V2 codes, change registered maps, enter V2
floors in the game, save a V2 session, or introduce encounters, combat or rewards.

V2 content identity is `(ruleset, seed, level, rarity)`; original identity will add
the normalized discoverer signature. These are future V2 identity contracts, not
changes to existing V1 `mapContentId`/`mapOriginalId` implementations.

- Seed: integer 0..65535. Level: integer 1..100. Rarity: WHITE/SILVER/GOLD.
- Level is danger, rarity is a separate attribute. This generator validates and
  carries those inputs; it does not calculate enemy strength or a danger rating.
- The first gift is planned as three unidentified white maps at levels 1..5.
- Planned boss reward roll: white 94% (+1..5), silver 5% (+10), gold 1% (+20),
  clamped to level 100, then draw a new seed. These are **drop probabilities**, not
  proportions of the seed domain. No reward or rarity RNG is implemented here.
- Once awarded, seed/level/rarity/signature must remain fixed across receipt/save
  retries. One pending reward protects a full 3-item unidentified inventory; while
  pending, another reward-producing boss battle must not start.
- Survey is three 25-hex-character masks, one per floor; derive counts/completion
  from masks. 300 surveyed cells and boss defeat are independent achievements.
- Boss location is the third/end cell of the room. Future cell-entry handling must
  update survey (and finish its completion notification) before starting combat.
  This permits survey completion before boss defeat, without an inaccessible rear
  cell. No enemy or battle is placed in this step.
- Future run state: one current-floor index and torch pool, plus three in-memory
  floor runtimes. Floor changes do not refill torch or reset earlier floor runtime.
  Leaving the map discards run state; persistent survey belongs to the original.

V2 codes can later retain the `NDA:` prefix: adding one byte each for level and
rarity to the current maximum 21-byte layout gives 23 bytes, 31 Base64URL characters
and **35 characters including prefix**. A new explicit codec/version route and
validation tag covering both fields are required. That work is intentionally not
part of this generator. V1/legacy encoding and decoding are unchanged.

## API and determinism

```js
import {generateSpecialMapV2} from './js/special-map/generator-v2.js';
const blueprint = generateSpecialMapV2({
  ruleset: 'special-map-v2', seed: 12345, level: 1, rarity: 'WHITE',
});
```

This is deliberately separate from the live single-floor `generateSpecialMap`
API. Passing V2 to that existing API still fails rather than handing a three-floor
object to V1 session/rendering code. All output is fresh plain data. No DOM, save,
character, normal-depth state, time or `Math.random` dependency.

Reuses the frozen Mulberry32/FNV-1a primitives in `random-v1.js`, without modifying
them. Sub-seeds are 32-bit; only the root seed is 16-bit. Derivation uses the V2
ruleset and these purpose strings:

- Each floor: `floor-N-topology`, `floor-N-entrance`, `floor-N-theme`.
- Floors 1/2: `floor-N-stairs` (farthest-distance ties).
- Floor 3: `floor-3-boss-room` (room position/direction).

Each stream is created independently. Future ecology/doors/boss-selection streams
must not consume these streams. Level, rarity and signature do not enter any
structural stream. This intentionally gives the same walls/stairs/room/theme for
the same seed at all levels and colors. Ecology and boss selection may later use
level/rarity as explicit eligibility inputs; their audit must be separate.

There are **65,536 structural sets**, but up to **19,660,800 seed/level/rarity
combinations**. This audit covers the former; it must never be reported as an
exhaustive audit of future level-dependent ecology, bosses or reward balance.

## Geometry

Walls: 100 row-major cells per floor, four booleans in N/E/S/W order; true = wall.
Coordinates are 0-based. Each floor has exactly 113 undirected open internal edges.
Exterior walls stay closed.

Floors 1/2:

1. Iterative DFS spanning tree, direction order N/E/S/W, starting cell 0.
2. Open exactly 14 additional walls: enumerate remaining edges row-major, E then S,
   choose and remove candidates with the floor topology stream.
3. Choose up stair from 36 perimeter cells; choose outward side at corners.
4. Choose down stair at maximum BFS distance from up stair on the **finished** maze;
   ties in row-major order use the independent stairs stream.

Floor 3:

1. Enumerate straight three-cell rooms in row-major first-cell order, then N/E/S/W.
   The approach cell immediately before the first room cell must be inside the map.
   Reject candidates whose remaining 97-cell grid is disconnected. This finite,
   seed-independent candidate list is private and never returned/mutated.
2. Select one candidate using `floor-3-boss-room`.
3. DFS over the 97 exterior cells, beginning with the first available row-major
   cell, then add 14 loops only between exterior cells.
4. Open just approach→room1→room2→room3. All room side walls remain closed, the
   third cell is a dead end, and the approach is the only room entrance.
5. Choose the up stair among exterior cells **farthest from the approach on the
   final maze**. This optimizes stair position after reserving the room, rather
   than modifying a finished V1 maze or performing random retries. Because floors
   link by explicit coordinates, stair XY need not align between floors.

This keeps the room inside the original 100 cells. Exactly 97 exterior cells plus
3 room cells are reachable; no extra rear cell, wall repairs, floor-size changes,
hidden doors, keys or locks are added. Boss distance is approach distance + 3.

`bossRoom.doorEdge` reserves the single approach boundary as a canonical E/S edge,
with a floor-scoped key. It is **placement metadata only**, not an implemented boss
door/lock or ordinary-door layout. Future V2 doors must respect room/stair
reservations. V1 door Candidate 1 is untouched.

The normal-dungeon `placeFloorBossRoom` is not called: it writes global cells,
normal stairs/boss flags and other normal-floor state. Its room-footprint and
exterior-connectivity concepts inform the pure V2 reservation approach.

## Stairs, facing, themes and fingerprints

- `links[0]` pairs floor 1 down stair with floor 2 up stair; `links[1]` pairs floor
  2 down with floor 3 up. Both pairs are bidirectional. Ascending arrives at the
  previous floor's down stair; floor 1 up is the map entrance. Floor 3 has no down
  stair and no exit field. No actual transfer input/UI exists yet.
- Initial direction always faces an open passage. For floors 1/2 prefer inward
  from the chosen side; otherwise use S/E/N/W. Floor 3 uses S/E/N/W. This is a V2
  rule and never alters V1's generated startDirection.
- Themes independently selected per floor from the fixed ordered list: slate,
  magic, torture, red, blue, green, yellow, water, crystal, black. No assets added.
- `canonicalV2Structure` uses an explicit field order including walls, stairs,
  room, themes, facing and links; it excludes level/color, runtime and future
  content layers. The 8-hex fingerprint is diagnostic FNV-1a, not authentication.
- The exhaustive SHA-256 hashes one canonical structure plus LF per seed, ascending
  0..65535. This is a **candidate comparison value**, not yet released V2 freeze.

## Verification commands

```powershell
node scripts/inspect-special-map-v2.mjs 12345 1 WHITE
node scripts/inspect-special-map-v2.mjs 65535 100 GOLD
node --test tests/special-map-v2.test.mjs
node scripts/audit-special-map-v2.mjs
node --test tests/*.test.mjs
```

Inspector labels: U = up stair/entrance, D = down stair, r = antechamber, B = final
boss-location cell (not a monster). Room gate coordinates are printed as metadata.

The audit uses an independent graph validator, verifies all 300 cells reachable
from the entrance and the route back from the boss location, exact farthest stairs,
room isolation/chain, symmetric walls, closed boundaries, open start facing and
theme IDs. Every seed is regenerated twice with identical inputs and again at an
alternate level/color. The unit suite additionally checks all 300 level/color
combinations at representative seeds. `Math.random` throws throughout the audit.

The same audit rechecks both formal V1 and legacy topology, and the frozen formal
V1 topology / doors / Candidate 2 ecology hashes. Results are saved in
`artifacts/special-map-v2-structure-candidate-1.json`, including example stair/room
coordinates, fingerprints, distance distributions, themes and failure counts.

## Next steps (not implemented)

Keep combat Phase 3C-2 on hold. Review this geometry before freezing V2. Then add
multi-floor runtime and transitions, original-level survey persistence and versioned
V2 issuance/code handling. Establish level-dependent ecology/boss eligibility and
reward transactions before connecting combat. A future boss encounter must not
race the final survey notification, and pending rewards must be checked before a
new reward-bearing battle begins.

## Candidate 1 results (2026-09-29)

All 65,536 seeds / 196,608 V2 floors passed. Generation, structure, identical-input
regeneration, level/color structural invariance and legacy checks each had **0
failures**. This local run, including legacy full-domain comparisons, took 88.337s.

| Distance on final topology | Minimum | Maximum |
| --- | ---: | ---: |
| Floor 1 up to down stair | 14 | 56 |
| Floor 2 up to down stair | 14 | 58 |
| Floor 3 up stair to boss location | 14 | 59 |
| Whole map entrance to boss, including two stair transfers | 50 | 140 |

Room orientation counts: N 16,405; E 16,456; S 16,248; W 16,427.

| Seed | Structural fingerprint | Floor 1 stair distance | Floor 2 stair distance | Floor 3 boss distance |
| ---: | --- | ---: | ---: | ---: |
| 0 | `8cc6ed66` | 22 | 34 | 24 |
| 1 | `3cdc3767` | 19 | 26 | 20 |
| 12345 | `f69172cd` | 21 | 29 | 26 |
| 32768 | `3c07b720` | 21 | 27 | 20 |
| 65535 | `9c6552d9` | 24 | 20 | 32 |

Seed 12345: floor 1 up `(0,3)`, down `(7,7)`; floor 2 up `(8,9)`, down
`(1,5)`; floor 3 up `(2,8)`, room `(7,1) → (7,2) → (7,3)`, with the final
cell reserved for the boss. Themes: crystal / crystal / torture. Initial facing:
S / N / S. Its complete ASCII inspection is in `artifacts/special-map-v2-seed-12345.txt`.

SHA-256 values:

```text
V2 structure candidate 1 (provisional):
19f8f3aad737c8ab9e91c7e673e892ab810b7938b182cab63e77d3b9601750b1
V1 topology (unchanged):
b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58
Legacy phase2a-1 topology (unchanged):
3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592
V1 doors candidate 1 (unchanged):
6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f
V1 ecology candidate 2 (unchanged):
04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a
```

V1 seed 12345 still has topology fingerprint `65bbb4f0` and door fingerprint
`04ec0371`. Seven V2 unit tests were added. The full Node suite passed **1,699 tests,
0 failures**, including current exploration, field-item routing, survey, save and
shared-code tests. Logs: `artifacts/special-map-v2-node-tests.log`.

No in-game or hardware playtest is claimed: V2 is not yet connected to gameplay.
