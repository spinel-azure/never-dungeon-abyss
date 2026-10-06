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

## F2 combat Candidate 1 — exclusive general beetles

`data/special-map-enemies.js` is a separate combat registry. The V2 encounter lookup consults it before the existing ordinary definitions. It does not register either beetle in ordinary encounter tables, and does not alter ecology metadata. Unknown IDs still stop safely; boss IDs cannot resolve here. Each fight uses the existing `createEnemyCombatant` cloning path. No map-level scaling, abyss-depth EXP correction, boss logic, HSL variant, or new reward system was added.

| Field | silberkaefer | maikaefer_koenig |
| --- | --- | --- |
| Name | ズィルバーケーファー | マイケーファーケーニヒ |
| Species level | 10 | 60 |
| HP / SP | 24 / 0 | 240 / 0 |
| STR / INT / AGI / DEX / LUC | 6 / 6 / 18 / 14 / 12 | 25 / 15 / 30 / 28 / 20 |
| Attack / DEF | 3 / 12 | 24 / 36 |
| Evasion bonus | 0.05 | 0.05 |
| Player escape base | 0.80 | 0.65 |
| Surprise / maximum | 0 / 0 | 0 / 0 |
| Actions | attack 75%, wait 25% | attack 70%, 1.4× strike 25%, wait 5% |
| Element multipliers | fire 1.25, ice 1, others default 1 | fire 1.25, ice 1, others default 1 |
| Resistance points | poison/deadly poison/action skip/speed down: 20 | same four: 40 |
| Immunities | none | none |
| Base EXP / guaranteed G per defeat | 220 / 60 | 2,000 / 300 |
| Image | images/karte_enemies/enemy_k02.avif | images/karte_enemies/enemy_k01.avif |

Both existing images were visually checked: 400×400 RGBA silver/gold beetles, original transparency preserved. General small-enemy rendering is reused. Boss image `karte_boss_016.avif` is not used. Combat definitions are recursively frozen; per-fight HP, statuses and actions are independent clones.

No enemy escape action is included in Candidate 1. Player escape remains available and gives no reward. `noDrop: true` explicitly disables item/card/red-chest rolls; `fixedGoldPerDefeat: true` separately grants G for defeated enemies. EXP goes to `battleExperience`, G to the session loot bag; neither is immediately credited to the character. Existing battle cards, map-Lv return bonus, Goddess rules, return overlays and failed-save retry are unchanged. Three king victories at Lv60 yield 6,000 pooled EXP, 900G, and 7,800 settled EXP without return-card modifiers. Lodging still controls level-up.

Comparison: ordinary maikaefer has HP8/DEF60/attack1, 25% evasion and frequent enemy escape. Its ordinary-abyss encounter path overwrites base EXP with depth×1,000; F2 does not call that path. Nearby ordinary species include giant_spider (Lv12, HP72, DEF8, EXP40) and abyss_giant_scorpion (Lv62, HP480, DEF31, attack31, EXP1180). The F2 choices retain a hard shell without maikaefer's extreme defenses or escape rate. King is sturdier than silver but has no boss immunity, regeneration or phase changes.

`tools/simulate-special-map-f2.mjs` runs 100 fixed RNG seeds per species/job. Silver uses Lv10 with initial equipment, unallocated ability points, no cards/NPC; king uses the existing Lv60 B60 pacing gear+3 and standard deck, no NPC. Warriors/thieves/priests only attack; mages use fireball. No healing or skills optimization:

| Species | Job | Wins / 100 | Mean rounds (all outcomes) | Maximum |
| --- | --- | --- | --- | --- |
| Silver | warrior | 100 | 3.56 | 7 |
| Silver | thief | 89 | 14.26 | 17 |
| Silver | priest | 100 | 5.44 | 10 |
| Silver | mage | 100 | 1.00 | 1 |
| King | warrior | 100 | 4.77 | 9 |
| King | thief | 100 | 7.06 | 9 |
| King | priest | 98 | 7.05 | 11 |
| King | mage | 100 | 3.00 | 3 |

These are controlled pacing fixtures, not claims about every player's build. Silver-rich maps can be efficient for fire magic; initial daggers take longer. Rewards/stats remain balance candidates. Ecology weights are not tuned to compensate.

### Device test originals (ordinary themes)

Both codes roundtrip to WHITE / discoverer `†ルル`; no survey is encoded.

- Silver: seed981, Lv10, crystal, `霞む晶窟の地図 Lv.10`; B1F/B2F/B3F = 83.77% / 78.87% / 91.79%. `NDA:AgID1QoAAyAgMOsw60e70dZzi-a2`
- General king: seed22172, Lv60, water, `禍々しき深水洞の地図 Lv.60`; B1F/B2F/B3F = 78.23% / 90.61% / 95.25%. `NDA:AgJWnDwAAyAgMOsw61LuOtzMRHnj`

Browser QA script: `tests/browser/special-map-f2.mjs`. It injects local test characters and a controlled roll within each real floor ecology, uses the production encounter/battle/outcome paths and unmodified enemy stats, and tests three victories across floors, player escape, return-save failure/retry, ordinary-state isolation and mobile layout. Characters are healed between trials; this is not an endurance or natural-random-encounter frequency measurement. Screenshots/raw logs go to the OS temporary directory. Node tests exercise both species through the production defeat callback, survey-save failure and retry, plus existing Goddess protection tests. No enemy escape AI is claimed or added.

Small verification summary: `artifacts/special-map-f2-candidate-1.json`. Full structural and ecology audits use the existing scripts and ordering; baseline artifact files remain unchanged. Development gates and normal-game starter distribution remain unchanged. F3, fixed bosses and exclusive drops remain disconnected.
