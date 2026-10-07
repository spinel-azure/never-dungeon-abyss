# V2 boss room / return presentation

- The status screen shows settled character EXP plus the active V2 session's `battleExperience`. Normal abyss carried EXP remains independent; normal/V1 status behavior is unchanged.
- The gold chest's Three.js completion callback awards the session-only rusty key, plays the existing important-item jingle once, and shows the shared item acquisition popup. The image comes from compendium entry `red_rust_key_b9f`; this is a presentation lookup only, not a story-key inventory grant. Field input stays locked through the popup.
- B3F's second boss-room cell displays the deterministically selected boss's original image using existing world-sprite visibility/projection. Battle image HSL preparation remains unchanged. Special themes can display their fixed boss image but their battles remain disabled.
- After a normal map boss victory, the sprite becomes `images/dungeon_effects/warp_portal.avif`. A/Enter on that cell uses the existing scene transition and `fixedWarp` sound to return to B1F's up stairs. Entering the gate cell does not automatically teleport; B cancels its prompt.
- Teleportation preserves the same session, torch, EXP/LOT BAG, key, opened chest, boss defeat flag, doors and survey. It does not exit or settle rewards. Survey flush failure blocks the teleport and permits retry. B1F arrival does not automatically return to town; the player can continue exploring or confirm the usual return prompt.
- The gate is session-only, like boss defeat. Re-entry starts a fresh boss/chest/key runtime. No clear flag, reward/drop rules or generation inputs change.

Regression tests: `tests/special-map-return-gate.test.mjs`, `tests/special-map-v2-feedback.test.mjs`. Browser route: `tests/browser/special-map-boss-gate-polish.mjs` (test fixtures and battle control only; screenshots/results in OS temp). The browser route covers the key/door path, boss victory, status EXP, gate transfer and return settlement at desktop and 390px widths.
