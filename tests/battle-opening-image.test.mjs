import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../js/battle.js',import.meta.url),'utf8');
test('each battle initializes its presentation sprite before first render and ambush',()=>{
 const start=source.slice(source.indexOf('export function startBattle('),source.indexOf('export function isBattleActive'));
 const init=start.indexOf('battleUi.presentationEnemyImage = battleUi.battle.enemy.image');
 assert.ok(init>start.indexOf('createBattleState('));assert.ok(init<start.indexOf('renderBattle();'));
 const ambush=source.slice(source.indexOf('async function executeAmbushOpening()'),source.indexOf('async function playPresentationEvents()'));
 const ambushInit = ambush.indexOf('battleUi.presentationEnemyImage = battleUi.battle.enemy.image');
 assert.ok(ambushInit >= 0);assert.ok(ambushInit<ambush.indexOf('battleUi.presenting = true'));
});
test('new single sprite is installed after effect cleanup and before rendering',()=>{
 const start=source.slice(source.indexOf('export function startBattle('),source.indexOf('export function isBattleActive'));
 const swap=start.indexOf('previousImage.replaceWith(image)');assert.ok(swap>start.indexOf('ambientEffects?.clear()'));assert.ok(swap>start.indexOf('resetEnemyVanishEffects'));assert.ok(swap<start.indexOf('renderBattle();'));
 assert.ok(start.includes('previousImage.ownerDocument.createElement("img")'));
});
