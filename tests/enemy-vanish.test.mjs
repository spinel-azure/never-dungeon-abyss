import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createEnemyVanishPlayback,
  getEnemyVanishEffect,
  resolveEnemyVanishEffectId,
  setEnemyVanishCatalog
} from "../combat/enemy-vanish.js";

const catalog=JSON.parse(await fs.readFile(new URL("../data/vanish-effects.json",import.meta.url),"utf8"));
setEnemyVanishCatalog(catalog);

test("vanish effect catalog is generator-compatible and contains every fallback",()=>{
  assert.equal(catalog.format,"NDA_VANISH_EFFECTS");
  assert.equal(catalog.version,1);
  for(const id of Object.values(catalog.defaults))assert.ok(catalog.effects[id],`missing ${id}`);
  assert.ok(Object.values(catalog.effects).every(effect=>effect.steps.length>0));
});

test("enemy-specific vanish effect takes priority over race and boss defaults",()=>{
  assert.equal(resolveEnemyVanishEffectId({race:"undead",vanishEffect:"vanish_dissolve"}),"vanish_dissolve");
  assert.equal(resolveEnemyVanishEffectId({isBoss:true,race:"undead"}),"vanish_boss");
  assert.equal(resolveEnemyVanishEffectId({race:"undead"}),"vanish_ash");
  assert.equal(resolveEnemyVanishEffectId({race:"spirit"}),"vanish_evaporate");
  assert.equal(resolveEnemyVanishEffectId({race:"slime"}),"vanish_dissolve");
  assert.equal(resolveEnemyVanishEffectId({race:"construct"}),"vanish_shatter");
  assert.equal(resolveEnemyVanishEffectId({race:"beast"}),"vanish_default");
});

test("unknown individual effect safely falls back to category and default",()=>{
  assert.equal(resolveEnemyVanishEffectId({race:"undead",vanishEffect:"missing"}),"vanish_ash");
  assert.equal(getEnemyVanishEffect({race:"unknown"}).id,"vanish_default");
});

test("each defeated enemy receives an independent visual playback record without reward state",()=>{
  const first=createEnemyVanishPlayback({id:"enemy_a",race:"slime"});
  const second=createEnemyVanishPlayback({id:"enemy_b",race:"construct"});
  assert.notStrictEqual(first,second);
  assert.deepEqual([first.enemyId,first.effectId,first.deathConfirmed,first.rewardHandled],["enemy_a","vanish_dissolve",true,false]);
  assert.deepEqual([second.enemyId,second.effectId,second.deathConfirmed,second.rewardHandled],["enemy_b","vanish_shatter",true,false]);
});

test("boss timeline can combine shake flash aura shatter and fade",()=>{
  assert.deepEqual(getEnemyVanishEffect({isBoss:true}).steps.map(step=>step.type),["shake","flash","boss_vanish","shatter","fade"]);
});

test("completed vanish playback keeps the defeated image hidden until the next battle reset",async()=>{
  const source=await fs.readFile(new URL("../combat/enemy-vanish.js",import.meta.url),"utf8");
  assert.match(source,/cleanupPlayback\(controller,previousPosition,false\)/);
  assert.match(source,/if\(restoreImage&&playback\.image\?\.isConnected\)playback\.image\.style\.visibility=""/);
  assert.match(source,/querySelectorAll\?\.\("\.battle-enemy-member-image, #battleEnemyImage"\)/);
});

test("instant-death slash hands its hidden image directly to vanish playback",async()=>{
  const source=await fs.readFile(new URL("../js/battle.js",import.meta.url),"utf8");
  assert.match(source,/playSlashEffect\(targetImage, \{ restoreImage: !vanishImage \}\)/);
  assert.match(source,/function playSlashEffect\(image, \{ restoreImage = true \} = \{\}\)/);
  assert.match(source,/if \(restoreImage\) image\.style\.visibility = ""/);
});
