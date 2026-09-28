# V2 structural candidate 2: two-cell boss room and session key chest

Candidate 2 is provisional. This change is limited to pure blueprint generation,
inspection and audit. There is no multi-floor gameplay integration, key pickup,
runtime lock handling, combat, reward, survey update, save change or V2 shared code.

## Candidate 1 preservation

The previous 1x3 generator is retained as
`tests/fixtures/special-map-v2-candidate-1.mjs` (only its relative import path changes).
The original Candidate 1 report, ASCII example, test log and design document are
left unchanged. The current audit regenerates all Candidate 1 seeds and verifies
its original structural SHA-256:

```text
19f8f3aad737c8ab9e91c7e673e892ab810b7938b182cab63e77d3b9601750b1
```

Candidate 1 seed 12345 remains `f69172cd`. Current CLI commands generate Candidate
2; use the comparison fixture to regenerate Candidate 1. Neither candidate is a
released/frozen V2 ruleset. V1 and legacy `phase2a-1` production generators, codecs,
progress and runtime are untouched.

## Changes to generation

- Revision: `v2-structure-candidate-2`; ruleset remains `special-map-v2`.
- Room: approach → antechamber → BOSS, with exactly two reserved cells **inside**
  floor 3's 100 cells. There is no extra rear room or external cell.
- Candidate enumeration remains row-major then N/E/S/W, checking that the other
  98 cells are connected. DFS and 14 loop openings affect only the exterior, then
  the gate and single internal room edge are opened in the topology layer.
- The room has exactly one entrance and no bypass. Its gate is an open topology
  edge with **locked boss-door metadata**, not a topology wall. Open-gate geometry
  has 113 passages and all 100 cells connected, as before.
- Up stairs are selected farthest from the approach after loop carving. Changing
  the room footprint changes floor 3's maze and up-stair position. The stair link
  from floor 2 is updated accordingly.
- Floor 1/2 blueprints are exactly equal to Candidate 1 for every seed. All three
  theme selections are also unchanged. PRNG and existing stream names are unchanged.

### Session-only lock/key contract

`bossRoom.doorEdge` retains a canonical floor-scoped E/S edge and adds:

```js
{
  kind: 'boss',
  initialState: 'locked',
  lock: {
    keyId: 'special-map-v2:rusted-boss-key',
    scope: 'specialMapSession'
  }
}
```

Floor 3 has exactly one `keyChest`, with coordinates, `kind: 'gold'` and:

```js
contents: {
  type: 'sessionKey',
  keyId: 'special-map-v2:rusted-boss-key',
  name: '赤錆びた鍵',
  scope: 'specialMapSession'
}
```

The chest ID is `floor-3:rusted-key-chest`. Floors 1/2 have no key chest. These
identifiers are not normal inventory items; in particular, they do not reference
`red_rust_key_b9f` or any normal-floor key flag. Future ownership/unlock state belongs
to the active special-map run and must be discarded with it. Pickup, consumption,
inventory UI and unlocking are intentionally not implemented here.

### Key chest placement

Uses the independent `floor-3-key-chest` stream. After room, stairs and topology
are fixed, BFS treats the boss gate as blocked **in both directions**. It does not
mutate the wall arrays. Candidates are row-major cells that:

1. Are reachable with the gate closed.
2. Are at least **10 actual passage steps** from the up stair (provisional constant
   `V2_KEY_CHEST_MIN_DISTANCE`).
3. Are not the up stair, either room cell or the gate approach cell.
4. Are not directly adjacent to the up stair, even across a wall.

One candidate is selected with the dedicated stream. There is no minimum-distance
relaxation, random retry, per-seed exception or behind-the-gate fallback. A missing
candidate throws, so the full-domain audit must prove this never occurs.

The two room cells are intentionally inaccessible while locked; the other 98
floor-3 cells remain reachable. Across all three floors this is 298 reachable cells
while locked, then 300 after the gate becomes passable. "No unreachable cells"
means no permanently inaccessible cells or key/lock circular dependency, not that
the closed gate is ignored.

The BOSS cell is an ordinary in-bounds cell with walls and coordinates. No cell is
automatically surveyed by generation. Future survey processing must use actual
cell entry, including entry into this cell.

## Identity and fingerprints

Level 1..100 and WHITE/SILVER/GOLD are validated inputs, retained but not used by
structural streams. Discoverer signature does not affect generation. The structural
canonical form now also covers key chest coordinates/contents and initial lock
metadata. Runtime acquired/opened/survey state is absent. Changing those blueprint
fields changes the diagnostic structural fingerprint and full-domain SHA.

The 65,536-set audit covers structure, not future level-dependent ecology/balance.
The candidate comparison value is not a permanent V2 compatibility promise.

## Verification

```powershell
node --test tests/special-map-v2.test.mjs
node scripts/audit-special-map-v2.mjs
node scripts/inspect-special-map-v2.mjs 12345 1 WHITE
node --test tests/*.test.mjs
```

The independent validator checks closed-gate BFS, key distance, no overlap, room
isolation, lock/key matching, session scope and open-gate reachability, in addition
to existing wall/stair/facing/theme checks. Negative tests intentionally put the key
behind the gate, on/near the stairs, or substitute the normal B9 key and require
rejection. Fingerprint tests cover chest and lock metadata. Every seed is regenerated
and checked at alternate level/color inputs with `Math.random` forced to throw.

The audit also recomputes Candidate 1 and the V1/legacy topology, V1 door and
Candidate 2 ecology SHA values. Output goes to a new file:
`artifacts/special-map-v2-structure-candidate-2.json`; it never overwrites Candidate 1.
The ASCII inspector uses K for the gold key chest and prints full lock metadata.
It does not simulate picking up the key or opening the door.

## Audit results (2026-09-29)

Final Candidate 2 audit: **65,536 valid sets / 196,608 valid floors**, in 118.537s
including comparison/regeneration and old-version SHA checks. Generation failures,
structural failures (including overlaps/room topology), key access failures,
repeat mismatches, level/color mismatches, Candidate 1 comparison mismatches and
legacy failures were all **0**. No room placement failed. Closed-gate reachability
and the 10-step/adjacency constraints passed for every key chest.

| Actual shortest-path distance | Minimum | Maximum |
| --- | ---: | ---: |
| Up stair to key chest, gate closed | 10 | 53 |
| Key chest to gate approach, gate closed | 1 | 47 |
| Floor 3 up stair to boss, gate passable | 13 | 58 |
| Map entrance to boss, gate passable, including stairs | 50 | 122 |

Average up-stair→key-chest distance: **18.024337768554688 steps**. No relaxation or
placement fallback was used. Ordinary closed doors are not yet a V2 layer; distances
refer to topology with only the boss gate blocked.

| Seed | Candidate 1 fingerprint | Candidate 2 fingerprint | Key distance |
| ---: | --- | --- | ---: |
| 0 | `8cc6ed66` | `ff8e2d5e` | 10 |
| 1 | `3cdc3767` | `10a7c000` | 19 |
| 12345 | `f69172cd` | `5a0826f6` | 22 |
| 32768 | `3c07b720` | `7d9192d0` | 12 |
| 65535 | `9c6552d9` | `43f0e785` | 21 |

Seed 12345 floor 3: up stair `(6,9)`, gold key chest `(9,8)`, approach `(6,2)`,
antechamber `(6,1)`, BOSS cell `(6,0)`. The locked edge is `floor-3:6,1,S`. The
chest is 22 steps from up stairs and 9 steps from the approach without opening the
gate. Theme remains torture. Its new ASCII output is
`artifacts/special-map-v2-candidate-2-seed-12345.txt`.

Candidate 2 provisional structural SHA-256:

```text
243b09bbd93f5ff783b1bf772c156e159132451d90a630a807a19b8d6fdd4db3
```

Candidate 1's original SHA was reproduced exactly. V1/legacy topology, V1 door and
ecology hashes also matched their prior values:

```text
V1 topology:     b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58
Legacy topology: 3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592
V1 doors:        6a625e0aac5a8c87367c2ab52e46570dcb195e4260ecb7cacc4f1167c81f693f
V1 ecology:      04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a
```

Final Node suite: **1,703 passed, 0 failed**, including 11 V2 tests (4 new tests,
7 updated/retained). Log: `artifacts/special-map-v2-candidate-2-node-tests.log`.
No hardware/gameplay test is claimed; this remains an unconnected blueprint.
