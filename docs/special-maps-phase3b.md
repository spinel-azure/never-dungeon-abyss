# Phase 3B: runtime exploration

Phase 3A remains unchanged. Phase 3B connects registered maps to walking only;
ecology/enemies (3C), treasure/rewards/levels/requirements (3D) remain separate.

## Entry and lifecycle

With 探検家テスト enabled: 奈落入口 → 地図探索 → registered map →
探索する → はい. Organize details retain their existing management actions.
Cancelling confirmation/detail preserves list page and cursor.

`session.js` accepts only a map key found in the registered collection. It calls
`generateRegisteredSpecialMap`, preserving formal V1 and Phase 2A legacy routing.
Neither discoverer nor acquisition method affects generation. Formal V1 seed
12345 remains entrance (0,2)/W, exit (3,0), facing E, torture, 65bbb4f0.

The runtime session holds kind, mapKey, ruleset, seed, generatedMap, fingerprint,
floor-only renderer cells, explored, playerX/Y, direction, motion, exitReached,
and a dedicated renderState. It is owned by the explorer controller, not the
character save or normal dungeon. Entrance is the only initially explored cell.
No activeSession, cleared record, rewards, or terrain are written to saves.

`useSpecialMapRenderSource` temporarily binds the existing renderer to the
session canvas, collision callbacks, minimap and animation. Disposal restores
the exact previous renderer dependencies, theme and minimap-overlay setting.
Normal dungeon movement, encounter, survey and event handlers are never called.
The application remains in the entrance/town save context while this runtime
view is active; reload therefore does not resume special exploration.

## Movement and display

Up/down move forward/backward; left/right turn. Closed walls and exterior
coordinates reject movement. Movement interpolates over 170ms, with additional
movement ignored until completion. Explored cells belong only to this session.
The generated theme selects existing wall/floor assets. The shared minimap draws
explored walls and the player arrow; the exit is not disclosed before arrival.
The 地図 button toggles its larger view. Coordinates are zero-based and cardinal
direction is shown with 特殊地図 rather than a normal BxxF floor.

Reaching the generated exit presents an arrival message; A/Enter returns to
奈落入口. B or 帰還 returns immediately, including during animation. Both paths
dispose the runtime. Re-entry regenerates identical terrain with fresh explored
cells. Normal dungeon torch, depth, progression and event state are not used by
movement. Cells contain no enemies, chests, NPCs, traps, or normal floor events.

## Validation

- `node --test tests/*.test.mjs`
- Final local run: 1,629 passed, 0 failed (2026-09-27); `git diff --check` clean.
- Session tests: frozen V1 case, every blocked edge, BFS exit traversal,
  animation lock, backward/turn movement, re-entry, shared origin equivalence,
  real minimap compatibility, renderer restoration and immediate runtime disposal.
- Controller test: entry confirmation, cancellation/page restoration, runtime
  input routing and returning without changing registered maps.
- Browser QA used an isolated localhost fixture (not a production save): PC
  keyboard entry, walking seed 12345 to (3,0), exit confirmation; 390×844 entry,
  minimap expansion and single-click immediate return. iPhone hardware and USB
  controller hardware verification remain with the user; common action handlers
  are covered by automated tests.

No changes to Phase 3A generator or Phase 2 code encoding/save formats.
