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

## F3-A — normal map bosses, combat Candidate 1

The preceding F2 description is historical. F3-A connects only normal-theme B3F bosses. `data/karte-normal-bosses.js` is independent of the special-theme boss registry and all ecology pools. No special boss, persistent clear, next-map reward or exclusive item drop is connected. Re-entering a map creates a new session and permits another boss fight; this is the F3-A test rule, not permanent completion.

### Assets and eligibility

The user-supplied `images/karte_bosses/README.txt` is authoritative for names, theme eligibility and color permission. All 001–012 and 017 files exist and were checked as 600×600 RGBA; originals are unmodified. The README does not specify combat stats or actions, so those are explicitly provisional. It names 016 デアグローセ・ケーファーケーニヒ, whereas the existing special registry names it マイケーファーケーニヒ. F3-A deliberately leaves that registry untouched as requested.

| ID suffix | Name | Eligible normal themes |
| --- | --- | --- |
| 001 | ヒューテリン・ヴァッサーマン | all ten |
| 002 | ニュンフェ・デス・トーデス | all ten |
| 003 | ディーグローセ・アイスケーニギン | blue |
| 004 | ガイステル・ケーニヒ | all ten |
| 005 | ウーアヴェルク・メートヒェン | all ten |
| 006 | アイゼルネ・ユングフラウ | torture |
| 007 | グリミヒ・フライシュフレッサー | green |
| 008 | アマイゼンレーヴェ | yellow |
| 009 | ディーヴァ・ジレーネ | water |
| 010 | メヒティガー・ウィッカーマン | red |
| 011 | フレムデ・ヴァイスハイト | all ten |
| 012 | ディグローセ・レーヴェンケーニギン | all ten |
| 017 | アッシェンプッテル | all ten |

IDs are `karte_boss_NNN`; images are `images/karte_bosses/karte_boss_NNN.avif`. Slate/magic/crystal/black each have seven candidates; the other six normal themes each have eight. Empty or special-theme pools throw instead of borrowing a story/special boss.

Selection uses the existing stateless FNV-derived Mulberry32 primitive with purpose `JSON.stringify(['v2-map-boss-selection',1,level,rarity,themeId])`, ruleset `special-map-v2`, and the map seed. One uniform pool index is drawn. Discoverer is unused. No existing generator stream is advanced.

### Combat curve and rewards

Integer-rounded linear interpolation between the following anchors produces runtime combatants. Rarity has no stat multiplier. Provisional profiles adjust HP only (balanced 1, durable 1.15, offensive 0.9); offensive weapon attack is multiplied by 1.1. The complete 13-boss × five-Lv matrix is in `artifacts/special-map-boss-candidate-1.json`.

| Lv | base HP | attack | STR/INT/AGI/DEX/LUC | DEF | EXP | G |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 45 | 4 | 4/4/5/5/4 | 4 | 50 | 20 |
| 5 | 65 | 4 | 5/5/6/6/5 | 5 | 120 | 40 |
| 10 | 160 | 10 | 10/10/12/12/8 | 10 | 300 | 80 |
| 25 | 450 | 17 | 17/18/18/18/12 | 17 | 900 | 180 |
| 50 | 800 | 27 | 27/28/24/24/17 | 25 | 2300 | 400 |
| 75 | 1300 | 40 | 40/42/30/30/22 | 33 | 4500 | 650 |
| 100 | 1800 | 50 | 50/50/36/36/27 | 40 | 7500 | 1000 |

Actions use existing physical attack (65%), 1.25× strong attack (25%), and wait (10%). No new AI engine, phase or revival. Instant death/petrification are immune; poison 60, deadly poison 80, action-skip 70 and speed-down 30 resistance points. Other elements/statuses use ordinary defaults. Player escape is disabled using the existing boss escape rate 0, including equipment overrides. No boss item/card/red-chest rolls; fixed EXP/G use the same F2 transaction and Goddess protection rules described above.

Comparison anchors included story B2 HP45/attack4/DEF5, B9 HP140/7/8, B29 HP600/16/17, B49 HP1350/26/27, B69 HP4200/35/36, and B89 HP14000/54/50. Crystal B3F candidates range from low-level HP12–44 to ice spirit230/folter280 and late golem1100/mimic950. Higher initial HP curves made solo caster fights too long. The final high-Lv HP curve is therefore below the suggested 3–6× multiplier for the toughest ordinary species; this is an explicit pacing choice, not a claim that every enemy meets that ratio. It remains far below goddess HP48000–60000.

`tools/simulate-map-bosses.mjs` runs the actual battle engine: 480 conservative trials (six levels × four jobs × 20 RNG seeds), plus 160 Lv80/100 trials using learned ultimate skills. All 640 trials won, with no timeout. Fixtures use initial gear at Lv1/5, B60+3 gear at Lv25/50, B90+3 gear at Lv80/100, no NPC, and up to 20 strong healing potions. Mid-level gear is deliberately overpowered and must not be mistaken for an average-player claim. Full mean/max turns and damage totals are in `artifacts/special-map-boss-pacing.json`.

Without ultimate skills, Lv100 mean turns are warrior18.5, thief12.7, priest57 (max71), mage38.55 (max50). Priest solo remains a balancing concern. With already-learned Lv80 ultimate skills, Lv100 means are 12 / 9.9 / 10.8 / 12.95; all four jobs won all20 trials. No skill, card, equipment or battle-engine coefficients were modified to obtain these results.

### Arrival, presentation and return

Actual BOSS-cell entry records survey first, preserves the existing key/gate requirement, and flushes survey before queuing a boss. Failed saves retain the queue and allow A retry. The runtime context source is `special-map-v2-boss`, carrying session/battle IDs, mapKey/contentId, seed/Lv/rarity/theme, floorIndex2 and bossId. Special four themes only show the F3-B development notice.

Each floor's first 100/100 now shows the existing central k8x12 floor-banner renderer with `調査100マス達成！` and `（総合N／300）`. Final300 shows `地図調査完了！`. This is a floor completion milestone, not cumulative100/200 or repeat steps. It lasts at least2200ms, blocks exploration shortcuts, and waits for the final jingle before boss encounter. A milestone cell takes priority over general encounter. On a chest milestone, the chest preview waits until the banner finishes. Returning/reloading a completed survey does not replay it. No additional completion boolean is saved.

Boss encounter reuses the 1400ms encounter presentation and `floorBoss` BGM. `prepareNormalBossImage` waits for image decoding and the existing HSL/LRU8 preparation during that presentation. The canvas is serialized once per cached variant to a runtime data URL for the existing `<img>` battle renderer; a WeakMap ties URLs to cache canvas lifetime. No file export or per-frame conversion. False color permission and load/transform errors use the original path. Special four color prohibitions remain intact.

Victory resumes the same session/position/direction/torch/survey/keys/doors with presence0 and auto-walker stopped. `bossDefeated` is session-only and suppresses repeat entry fights. Defeat uses the existing survey/character save retry, Goddess EXP protection and loot settlement; abyss carried/pending EXP and loot stay isolated. Duplicate and stale battle outcomes cannot grant again. LOT BAG then EXP SETTLEMENT remains the existing return UI with 地図Lvボーナス and card modifiers; lodging still controls level-up.

### Audit and device originals

`scripts/audit-special-map-bosses-v2.mjs` covers all65536 seeds × Lv1/5/10/25/50/60/80/90/100 × all three rarities = 1,769,472 selections. Missing boss, invalid/special boss, theme mismatch and repeat mismatch are all0. Every boss appears. Per-theme individual shares range14.17–14.37% for seven-candidate pools and12.32–12.66% for eight-candidate pools; exact counts are in the audit artifact. Selection SHA: `6cf2013e47c6227a26e6af5774f80d2490fee33359a975b4ee2479abdf730183`.

Existing full-domain audits were rerun with their original ordering. Candidate3 fingerprint seed12345 remains `3519b715`; structure SHA `c1dbc28cf7bfc9f78fffa32281d8d001b4b0a1a8f1aa2f146cb5d0a5559f0e95`. EcologyCandidate2 remains `ab38d1e17e4f8d47c8fc89d895e20ed4eba33cc6e781db35cc0aac4a66a17dca`. V1 ecology remains `04c4c6902ef72c567a2166d4b4bd41d83b7ca89eab99a8926b0ceaa5d7c96a8a`; legacy/V1 topology and V1 doors also match their frozen hashes. Existing audit artifacts are retained unchanged.

`tests/fixtures/special-map-f3.mjs` fixes decoded originals, names, bosses and precise variant values. WHITE, discoverer `†ルル`; no survey is shared:

- Low: seed12345/Lv5/crystal, **朽ちかけた晶宮の地図 Lv.5**, `karte_boss_011` フレムデ・ヴァイスハイト. Hue+3.0492°, saturation1.023759, lightness−0.004016. `NDA:AgIwOQUAAyAgMOsw6yUMAoV_W1oO`
- High: seed12345/Lv100/crystal, **滅びの晶宮の地図 Lv.100**, `karte_boss_012` ディグローセ・レーヴェンケーニギン. Hue+8.6823°, saturation0.935190, lightness−0.012480. `NDA:AgIwOWQAAyAgMOsw6w7C8owb3gre`
- Same-boss comparison: seed14/Lv100/black, **虚無の黒宮の地図 Lv.100**, also012. Hue+1.2743°, saturation0.991556, lightness−0.042653. `NDA:AgIADmQAAyAgMOsw66KLwqoYqZrM`

Browser QA uses `tests/browser/special-map-f3-boss.mjs`: local test characters, general encounters suppressed only by the test hook, actual movement through all floors/chest/key/gate, production boss battle/outcome/return hooks. Survey fixtures leave a floor's last cell unvisited to test milestone order without300 manual steps. These are controlled desktop Edge tests at1280/390px, not iPhone hardware measurements. The 390px map-boss-only layout adjustment prevents long names being clipped at the top. Screenshots and raw logs remain in the OS temporary directory.

Final verification: Node1903 passed/0 failed; Python29 passed/0 failed/2 skipped; `git diff --check` clean. Eight successful browser runs cover Lv5/100 at1280/390px, with final desktop/mobile passes through LOT BAG → INVENTORY → EXP SETTLEMENT. Lv5 grants120 pooled EXP/40G and settles123EXP; Lv100 grants7500EXP/1000G and settles11250EXP without return-card modifiers. The production callback tests additionally cover boss defeat, Goddess protection, failed survey/character save retry and duplicate rewards. Actual browser escape input is not used because boss escape is disabled; the real escape resolver is tested with the boss definition and equipment override.

`artifacts/special-map-f3-a-verification.json` lists every changed file, SHA checks, browser outcomes and limitations. `images/karte_bosses/README.txt` was already user-owned/untracked and is not modified by this task. LAST UPDATE, commits, push, development unlock gates, special-four boss data and next-map rewards remain untouched.
