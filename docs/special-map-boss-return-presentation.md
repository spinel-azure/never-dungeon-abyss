# V2 boss room / return presentation

- The status screen shows settled character EXP plus the active V2 session's `battleExperience`. Normal abyss carried EXP remains independent; normal/V1 status behavior is unchanged.
- The gold chest's Three.js completion callback awards the session-only rusty key, plays the existing important-item jingle once, and shows the shared item acquisition popup. The image comes from compendium entry `red_rust_key_b9f`; this is a presentation lookup only, not a story-key inventory grant. Field input stays locked through the popup.
- B3F's second boss-room cell displays the deterministically selected boss's original image using existing world-sprite visibility/projection. Battle image HSL preparation remains unchanged. Special themes can display their fixed boss image but their battles remain disabled.
- After a normal map boss victory, the sprite becomes `images/dungeon_effects/warp_portal.avif`. A/Enter on that cell uses the existing scene transition and `fixedWarp` sound to return to B1F's up stairs. Entering the gate cell does not automatically teleport; B cancels its prompt.
- Teleportation preserves the same session, torch, EXP/LOT BAG, key, opened chest, boss defeat flag, doors and survey. It does not exit or settle rewards. Survey flush failure blocks the teleport and permits retry. B1F arrival does not automatically return to town; the player can continue exploring or confirm the usual return prompt.
- The gate is session-only, like boss defeat. Re-entry starts a fresh boss/chest/key runtime. No clear flag, reward/drop rules or generation inputs change.

Regression tests: `tests/special-map-return-gate.test.mjs`, `tests/special-map-v2-feedback.test.mjs`. Browser route: `tests/browser/special-map-boss-gate-polish.mjs` (test fixtures and battle control only; screenshots/results in OS temp). The browser route covers the key/door path, boss victory, status EXP, gate transfer and return settlement at desktop and 390px widths.

## Follow-up playtest polish

- Favorite maps have a trailing star in the map list/detail/management UI. The canonical name and share code remain unchanged.
- Entry confirmation retains the map detail and its background instead of switching to the explorer tent.
- Normal V2 return schedules the existing NPC renewal in the same save transaction as return rewards. The existing presentation queue remains LOT BAG → EXP SETTLEMENT → NPC renewal. Save failure rolls back renewal as well as rewards.
- V2 successful steps now honor the equipped Perpetual Torch card; forced lighting is reflected in rendering/minimap and the encounter darkness check. Unequipping restores consumption. V1 behavior is unchanged.
- Exorcism talisman/presence-clearing effects remain intentionally disabled under the earlier F1 restriction; this change does not enable them.
- Exploration boss and gate sprites are enlarged (boss scale 1.9, gate 1.8) with a 90%-height cap. Battle image size is unchanged.
- `tests/browser/special-map-qa-polish.mjs` exercises favorite/entry confirmation, an equipped Perpetual Torch, NPC renewal after reward presentation, and desktop/390px sprite rendering.
