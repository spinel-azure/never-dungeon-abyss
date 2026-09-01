import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantItem, getItemCount } from "../data/inventory.js";
import { createEnemyCombatant, getEnemyById } from "../data/enemies.js";
import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { getConditionLabel } from "../combat/condition-label.js";
import { resolveFieldItemUse } from "../combat/resolve-item-use.js";

test("poison, deadly poison, and death poison use distinct status labels", () => {
  assert.equal(getConditionLabel([{ statusId: "poison" }]), "POISON");
  assert.equal(getConditionLabel([{ statusId: "deadly_poison" }]), "TOXIC");
  assert.equal(getConditionLabel([{ statusId: "death_poison" }]), "DEATH POISON");
  assert.equal(normalizeCharacter({
    ...createInitialCharacter({ name: "TEST", job: "warrior" }),
    statuses: [{ statusId: "deadly_poison" }]
  }).condition, "TOXIC");
});

test("ordinary antidote cannot cure deadly poison or consume an item or battle turn", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.inventory = grantItem(character.inventory, "antidote", 1).inventory;
  character.statuses = [{ statusId: "deadly_poison" }];
  character.condition = "TOXIC";
  character.hp = Math.max(1, character.maxHp - 5);

  const field = resolveFieldItemUse({ character, itemId: "antidote", context: "dungeon" });
  assert.deepEqual(field, { accepted: false, reason: "deadlyPoisonNotCurable" });
  assert.equal(getItemCount(character.inventory, "antidote"), 1);
  assert.equal(character.hp, character.maxHp - 5);

  const enemy = createEnemyCombatant(getEnemyById("abyss_rat"));
  const battle = createBattleState({ character, enemy });
  const round = resolveBattleRound({
    battle,
    playerCommand: { type: "item", itemId: "antidote" },
    rng: () => 0.5
  });
  assert.equal(round.accepted, false);
  assert.equal(round.reason, "deadlyPoisonNotCurable");
  assert.equal(round.battle.turn, battle.turn);
  assert.equal(getItemCount(round.battle.player.inventory, "antidote"), 1);
});

test("deadly poison antidote rejection has its dedicated text and buzzer feedback", async () => {
  const [overlay, battle] = await Promise.all([
    readFile(new URL("../js/item-overlay.js", import.meta.url), "utf8"),
    readFile(new URL("../js/battle.js", import.meta.url), "utf8")
  ]);
  for (const source of [overlay, battle]) {
    assert.match(source, /deadlyPoisonNotCurable:\s*"解毒剤では猛毒を治療できません。"/);
    assert.match(source, /deadlyPoisonNotCurable[\s\S]{0,180}costOver|costOver[\s\S]{0,180}deadlyPoisonNotCurable/);
  }
});
