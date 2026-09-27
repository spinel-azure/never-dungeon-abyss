# Treliren patrol flake investigation

- Before changes: `node --test tests/treliren.test.mjs` in 200 separate processes: 5 failed at the reported moved assertion.
- Instrumented original setup, 2,000 generations: 1,969 moved; 31 did not. All 31 were same-cell contact (`contact:true`), zero had no traversable neighbors, zero other causes.
- Example: NPC (0,0), test player (0,0), real generation entrance (1,1), neighbors (1,0) and (0,1). The contact guard correctly returns before patrol movement.
- `buildBoundaryWallMap(10, () => .4, ...)` does not control `carvePerfectMaze`, `addLoopOpenings`, or `placeNormalDoors`: each calls `shuffled` without the supplied rng, so they use Math.random. Thus NPC spawn varies while the test hard-codes a different player coordinate.

## Fix

`tests/treliren.test.mjs` now uses a four-cell corridor, passes the same player position to placement and movement, and asserts the exact spawn, available neighbor and destination. `moved:true`, patrol mode, alternating image, restore and marker assertions remain. Math.random is mocked to throw inside this fixture. An additional test distinguishes same-cell contact from zero-neighbor non-movement.

Post-fix: 200 separate test processes, zero failures.

## Additional flake found during full-suite repetition

`tests/gemini-preview-door.test.mjs` failed once because randomly generated B1 room data at (2,2) shadows the intended B22 room at (3,2): getSpecialRoomAtDoor prioritizes current.specialRoom. This was separately reproduced at iteration 87. The fixture now uses resetAllWalls, places only its intended door/room, asserts room identity and rejects Math.random use. Production code and opening assertions are unchanged.

## Validation

Three full runs of the GitHub Actions command `node --test tests/*.test.mjs`: each 1,668 passed, zero failures. Logs: artifacts/treliren-regression-{1,2,3}.log.

This validation ran locally on Windows. GitHub Actions uses ubuntu-latest and Node lts/*. No commit/push or remote CI run was performed; success of the next actual Actions run remains to be confirmed after the user publishes the fix.
