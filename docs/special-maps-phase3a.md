# Phase 3A: deterministic special-map blueprints

No gameplay/UI/save integration. `generateSpecialMap(ruleset, seed)` returns a fresh plain object containing ruleset, seed, width/height, walls, entrance, exit, startDirection, themeId. Walls are 100 row-major arrays with booleans in N/E/S/W order (true = closed). Coordinates are zero-based, x east, y south.

## Frozen contracts

- Formal blueprint V1 ID: `special-map-v1`. Explicit dispatcher; unknown rules are errors.
- Existing `phase2a-1` originals have a separate explicit frozen route, using that exact ID in seed derivation. No original, existing code, name, level or save is rewritten. Formal V1 issuance/codec support is intentionally not connected in Phase 3A; Phase 2 still issues its existing provisional originals. Both routes must be maintained independently of future defaults.
- PRNG: Mulberry32 unsigned output. Addition is explicitly truncated to 32 bits each call; Math.imul and bitwise integer operations only. Index selection floor(uint32 / 2^32 * count).
- Subseed: FNV-1a 32-bit over UTF-16 code units of JSON.stringify(['nda-special-map-rng-v1', ruleset, seed, purpose]). Purpose strings and format are frozen. Independent streams: topology, entrance, exit, theme. Future ecology/treasure streams never consume these streams.
- 10x10. Iterative DFS from cell 0, candidates in N/E/S/W order, produces a 99-edge spanning tree. Enumerate remaining internal walls row-major, E then S; remove exactly 14 randomly chosen distinct walls (113 passages total). All exterior walls stay closed.
- Entrance: row-major list of 36 perimeter cells, uniform selection; choose outward side in N/E/S/W order if corner. Start faces the opposite side, geometrically inward. This is facing metadata, not a promise that the immediately forward edge is open.
- Exit: BFS shortest paths from entrance, select maximum distance; ties row-major and independently selected with exit stream. Post-generation connectivity assertion retained, no retries.
- Themes frozen in this order: slate, magic, torture, red, blue, green, yellow, water, crystal, black. IDs exist in both WALL_COLORS/FLOOR_COLORS in js/floorTheme.js. No live resolver/config import, no progress/event effects. Future palette changes cannot change this selection list.
- Fingerprint: FNV-1a hex of explicit ordered fields (not object key iteration); diagnostics only. Full-domain audit additionally pins SHA-256 of every generated result.
- Do not modify V1 primitives/constants/order/selection consumption when adding new systems. Introduce a new ruleset for any intentional changes. Retain old route and associated data. Tests detect accidental changes; long-term compatibility requires maintaining these frozen implementations.

## Developer commands

```powershell
node scripts/inspect-special-map.mjs 12345
node scripts/inspect-special-map.mjs 12345 phase2a-1
node scripts/audit-special-maps.mjs
node --test tests/*.test.mjs
```

Inspector prints metadata, fingerprint and ASCII maze (`I` entrance, `O` exit). Registered original adapter: `generateRegisteredSpecialMap({rulesetVersion,seed})`. No DOM, localStorage, normal-dungeon state, character or Math.random dependency. Only originals need persistence; blueprint walls are regenerated.

## Audit result (2026-09-27)

Both domains ran completely: 65,536 seeds each, total 131,072 maps. Zero exceptions/invalid dimensions/unreachable cells/boundary breaches/asymmetric walls/invalid entry/exit/facing/theme. Exit independently confirmed as BFS-farthest; exactly 113 undirected passages for every seed. Formal V1 exit distance 14–54; legacy 14–56. Each audit took approximately 5.5 seconds locally.

Full-output SHA-256:
- special-map-v1: b985066f1fb5720c8f27c56d925e58d700af9d637d90cd2c6e0fc33ce0920e58
- phase2a-1: 3d92b41f2e2994ca08e40626cd85e498a20c8c0dfc1a135c32472641805df592

V1 examples:

|seed|entrance (side)|exit|facing|theme|fingerprint|
|---|---|---|---|---|---|
|0|(0,3) W|(3,9)|E|magic|085620c1|
|1|(9,3) E|(4,9)|W|red|487444ba|
|12345|(0,2) W|(3,0)|E|torture|65bbb4f0|
|32768|(0,3) W|(3,8)|E|crystal|e7e9d2c5|
|65535|(9,0) E|(8,9)|W|crystal|26ac1209|

Normal suite: 1,620 passed, zero failed. Added repeat-100 deep comparisons, pinned fingerprints/PRNG/subseed vectors, invalid inputs, future-stream isolation, throwing Math.random test, output mutation isolation, theme ID existence, legacy code roundtrip, ASCII and independent structural checks. Exhaustive audit is separate from normal test glob and must be run for generator changes. PC/iPhone hardware comparison remains for user testing; deterministic behavior relies only on specified ECMAScript integer/string operations, not runtime random algorithms, time or locale.
