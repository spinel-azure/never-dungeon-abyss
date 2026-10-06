# V2 battle experience settlement

Based on main `7e77004c829383169267cf4c90bdb27c1bfe8e2c`.

- Victories add battle-card-adjusted EXP to `session.battleExperience`, shared by all three floors. Gold and supported drops accumulate in the independent session loot bag and settle on return. Ordinary abyss loot is never consumed.
- Successful return (entrance, menu return, or emergency escape) settles the aggregate once using the session's map level as `returnFloor`. `createDepthReturnSettlement` owns depth/card rules for both abyss and V2; `settleIndependentReturnExperience` applies the same experience cap without reading or clearing abyss carry/pending fields. Battle bonuses apply per victory; depth rounding applies once to the aggregate, with the deck equipped at return.
- Escape adds no reward and retains previous victories. Defeat discards V2 EXP unless the equipped Goddess card preserves it (then settle without a level bonus); session loot is settled using the ordinary loot rules; ordinary abyss carry/pending are preserved. Closing/abandoning the runtime discards its balance. Reload creates a fresh session: accumulated V2 EXP is intentionally not part of the character save.
- Failed survey/character saves block return. Character changes are rolled back and the session remains eligible for retry. The balance is cleared and the session closed only after saving succeeds. A session ID plus sequential battle ID survives structuredClone and rejects stale/duplicate outcomes. Repeated returns cannot award twice.
- Successful return reuses LOT BAG and EXP SETTLEMENT overlays, labeling the bonus 地図Lvボーナス. The return receipt is saved with the character before releasing the session. Emergency escape consumption is rolled back when returning fails.
- Return also expires Wing Gift and recalculates its HP penalty, retaining existing special-map behavior. Level increases remain deferred to lodging.

Deterministic coverage: `tests/special-map-v2-experience.test.mjs` exercises the production battle-outcome and return hooks with controlled persistence, including map Lv1/60/100, multiple victories across floors, rounding, battle and return cards, escape, defeat, abort/re-entry, save retry, EXP cap, duplicate callbacks, and subsequent ordinary legacy settlement. The runtime disposal test is in `tests/special-map-v2-feedback.test.mjs`; existing ordinary settlement tests remain unchanged.

Validation commands:

```sh
node --test tests/*.test.mjs
python tests/python/validate_game_data.py
git diff --check
```

UI QA: closed Three.js gold chest on contact; DotGothic16 survey readout under the small minimap; map title above expanded map. Survey fanfare is triggered by each floor's first 100/100, never total 100/200; final 300/300 uses importantItem only.
