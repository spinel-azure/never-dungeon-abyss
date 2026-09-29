import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialCharacter } from '../data/classes.js';
import { getBossById, createBossCombatant } from '../data/bosses.js';
import { AKASHIC_PHANTOM_IDS as IDS, QUEEN_PROJECTION_MESSAGES } from '../data/akashic-phantoms.js';
import { B100_GAUNTLET_BOSS_IDS } from '../data/fixed-floor-maps.js';
import { buildBoundaryWallMap, cells, refreshB100FinalBoss } from '../js/dungeon.js';
import { createBattleState, resolveBattleRound, resolveBattleOutcome, createEnemyAction } from '../combat/battle-engine.js';
import { applyStatus, clearBattleOnlyStatuses } from '../combat/status-lifecycle.js';
import { resolveStatusEffect } from '../combat/resolve-status-effect.js';
import { isCharmed, charmAction } from '../combat/akashic-phantoms.js';
import { collectStats } from '../combat/collect-stats.js';
import { getEquipmentItem } from '../data/equipment.js';
import { applyNpcTurnStart } from '../combat/npc-support.js';

function setup(index = 0) {
  const character = createInitialCharacter({ name: 'スピネル', job: 'mage' });
  character.hp = character.maxHp = 10000; character.sp = character.maxSp = 999;
  return createBattleState({ character, enemy: createBossCombatant(IDS[index]) });
}
function round(battle, playerCommand = { type: 'wait' }, rng = () => .2) {
  const result = resolveBattleRound({ battle, playerCommand, rng });
  assert.equal(result.accepted, true, result.reason); return result.battle;
}
function passive(battle) {
  battle.enemy.actions = [{ weight: 1, action: { actionType: 'wait', name: '待機' } }];
  battle.enemy.apocalypseUsed = true; return battle;
}
test('ending replay still requires all ten guardians and resets both final phantoms each exploration', () => {
  const flags = { ending_story_completed: true, tavern_rumor_018_base_read: true, boss_erzdaemonin_b100f_defeated: true, boss_amayenak_b100f_defeated: true };
  const boss = () => cells[3][4].bossId;
  buildBoundaryWallMap(100, () => .5, { eventFlags: flags });
  assert.equal(cells.flat().filter(c => c.bossId).length, 10);
  assert.ok(!boss());
  assert.equal(refreshB100FinalBoss(flags, B100_GAUNTLET_BOSS_IDS.slice(1)), false);
  refreshB100FinalBoss(flags, B100_GAUNTLET_BOSS_IDS); assert.equal(boss(), IDS[0]);
  const progress = [...B100_GAUNTLET_BOSS_IDS, IDS[0]];
  buildBoundaryWallMap(100, () => .5, JSON.parse(JSON.stringify({ eventFlags: flags, b100GauntletDefeatedBossIds: progress })));
  assert.equal(boss(), IDS[1]);
  refreshB100FinalBoss(flags, [...progress, IDS[1]]); assert.equal(boss(), null);
  buildBoundaryWallMap(100, () => .5, { eventFlags: flags, b100GauntletDefeatedBossIds: B100_GAUNTLET_BOSS_IDS });
  assert.equal(boss(), IDS[0]);
  const events = cells.flat().filter(c => c.fixedEvent).map(c => c.fixedEvent);
  assert.equal(events.length, 2);
  assert.ok(events.every(e => e.projection && e.imageId === 'NPC_01c'));
  assert.deepEqual(new Set(events.map(e => e.description)), new Set(QUEEN_PROJECTION_MESSAGES));
  assert.equal(flags.boss_amayenak_b100f_defeated, true);
});
test('phantoms have separate definitions, no rewards or escape and retain base defenses', () => {
  for (const [i, id] of IDS.entries()) {
    const boss = getBossById(id), original = getBossById(i ? 'amayenak_b100f' : 'erzdaemonin_b100f');
    assert.equal(boss.maxHp, i ? 54000 : 56000);
    assert.equal(boss.def, original.def); assert.deepEqual(boss.stats, original.stats);
    assert.equal(boss.escapeRate, 0); assert.equal(boss.experienceReward, 0);
    assert.equal(boss.reward.type, 'none'); assert.equal(boss.noDrop, true);
    assert.equal(boss.statusResistances.deadly_poison.resistancePoints, 50);
    assert.equal(original.statusResistances.deadly_poison.immune, true);
  }
});
test('charm forces three actions without spending requested skill SP or refreshing duration', () => {
  let b = passive(setup()); b.player.statuses = applyStatus([], { statusId: 'charm', success: true });
  const sp = b.player.sp, hp = b.enemy.hp;
  for (const remaining of [2, 1, 0]) {
    b = round(b, { type: 'skill', skillId: 'not_a_skill' }, () => .9);
    assert.equal(b.player.sp, sp); assert.equal(b.enemy.hp, hp);
    assert.equal(b.player.statuses.find(s => s.id === 'charm')?.remainingTurns || 0, remaining);
    if (remaining) {
      b.player.statuses = applyStatus(b.player.statuses, { statusId: 'charm', success: true });
      assert.equal(b.player.statuses.find(s => s.id === 'charm').remainingTurns, remaining);
    }
  }
  assert.equal(isCharmed(b.player), false);
  assert.equal(charmAction(() => 0).actionType, 'guard');
  assert.match(charmAction(() => .5).waitMessage, /逃げられない/);
  assert.match(charmAction(() => .9).waitMessage, /見とれて/);
});
test('new charm before player turn cancels the selected attack', () => {
  const b = setup(); b.player.baseStats.agi = 1;
  b.enemy.actions = [{ weight: 1, action: { id: 'charm_test', actionType: 'spell', element: 'dark', spellPower: 0,
    unavoidable: true, speedModifier: 999, effects: [{ statusId: 'charm', guaranteed: true, trigger: 'perAction' }] } }];
  const result = round(b, { type: 'attack' }, () => .9);
  assert.ok(isCharmed(result.player)); assert.equal(result.enemy.hp, b.enemy.hp);
  assert.equal(result.presentationEvents.filter(e => e.actorSide === 'player' && e.hit).length, 0);
});
test('charm honors ordinary resistance, Kirke amulet, Musa immunity and battle cleanup', () => {
  const effect = { statusId: 'charm', statusKind: 'magical', baseRate: .6 };
  const plain = resolveStatusEffect({ effect, rng: () => .4 });
  assert.equal(plain.rate, .6);
  const amulet = resolveStatusEffect({ effect, defender: { ordinaryStatusRateMultiplier: .5 }, rng: () => .4 });
  assert.equal(amulet.rate, .3); assert.equal(amulet.success, false);
  assert.equal(resolveStatusEffect({ effect, defender: { statusResistanceBonus: .2 } }).rate, .39999999999999997);
  const crown = getEquipmentItem('musa_crown');
  const stats = collectStats({ equipmentStatBonuses: crown.statBonuses });
  // Actual equipment definitions expose bonuses through statBonuses.
  assert.equal(stats.temptationResistance, 1);
  const immune = resolveStatusEffect({ effect: { ...effect, guaranteed: true }, defender: stats, rng: () => 0 });
  assert.equal(immune.immune, true); assert.equal(immune.success, false);
  assert.equal(clearBattleOnlyStatuses(applyStatus([], { statusId: 'charm', success: true })).length, 0);
});
test('Apocalypse is telegraphed, reserved, capped and used once including after revival', () => {
  let b = setup(1); b.enemy.hp = 30000; b.player.hp = b.player.maxHp = 200;
  b = round(b); assert.equal(b.enemy.apocalypseUsed, true);
  assert.equal(b.enemy.reservedEnemyAction.id, 'phantom_apocalypse');
  b = round(b);
  const hit = b.presentationEvents.find(e => e.battlePresentationId === 'apocalypse');
  assert.ok(hit); assert.ok(hit.damage <= 120); assert.ok(b.player.hp > 0);
  assert.equal(b.enemy.reservedEnemyAction, undefined);
  b.enemy.hp = 0; b.enemy.alive = false; resolveBattleOutcome(b);
  assert.equal(b.enemy.hp, 27000); assert.equal(b.enemy.apocalypseUsed, true);
  assert.notEqual(createEnemyAction(b.enemy, () => .1).actionType, 'prepareAction');
});
test('causality intercepts lethal player attacks, revives once and resets on fresh battle', () => {
  let b = passive(setup(1)); b.enemy.hp = 1; b.player.cards.deckSlots = ['zodiac_sagittarius'];
  b = round(b, { type: 'attack' });
  assert.ok(!b.outcome); assert.equal(b.enemy.hp, 27000); assert.equal(b.enemy.causalityUsed, true);
  assert.equal(b.presentationEvents.filter(e => e.causalityRevival).length, 1);
  b.enemy.hp = 1; b = round(b, { type: 'attack' }); assert.equal(b.outcome, 'victory');
  const fresh = createBattleState({ character: b.player, enemy: { ...b.enemy, hp: 54000 } });
  assert.equal(fresh.enemy.causalityUsed, false); assert.equal(fresh.enemy.apocalypseUsed, false);
});
test('deadly poison and death poison use Lion Queen percentages and lethal DOT also revives', () => {
  for (const [statusId, rate] of [['deadly_poison', .005], ['death_poison', .01]]) {
    for (const index of [0, 1]) {
      const b = passive(setup(index)); b.enemy.statuses = applyStatus([], { statusId, success: true });
      const result = round(b); assert.equal(b.enemy.hp - result.enemy.hp, Math.floor(b.enemy.maxHp * rate));
      if (index) { b.enemy.hp = 1; const lethal = round(b); assert.equal(lethal.enemy.hp, 27000); assert.ok(!lethal.outcome); }
    }
  }
});
test('NPC lethal damage cannot bypass causality', () => {
  const b = passive(setup(1)); b.enemy.hp = 1;
  b.player.npcSystem = { activeIds: ['johan'], growth: {} };
  applyNpcTurnStart(b, () => 0);
  assert.equal(b.enemy.causalityUsed, true); assert.ok(b.enemy.hp > 0); assert.ok(!b.outcome);
});


test('ending alone does not unlock projections or final phantoms before hearing the rumor', () => {
  const flags = { ending_story_completed: true, ending_credits_watched: true };
  buildBoundaryWallMap(100, () => .5, { eventFlags: flags, b100GauntletDefeatedBossIds: B100_GAUNTLET_BOSS_IDS });
  assert.equal(cells.flat().filter(c => c.fixedEvent).length, 0);
  assert.equal(cells[3][4].bossId, null);
  assert.equal(refreshB100FinalBoss(flags, B100_GAUNTLET_BOSS_IDS), false);
  flags.tavern_rumor_018_base_read = true;
  assert.equal(refreshB100FinalBoss(flags, B100_GAUNTLET_BOSS_IDS), true);
  assert.equal(cells[3][4].bossId, IDS[0]);
});


test('Musa crown separates concise effects from flavor and projections identify Michaela', () => {
  const crown = getEquipmentItem('musa_crown');
  assert.equal(crown.description, '魅了完全耐性。');
  assert.equal(crown.flavorText, '異界の女神の加護を宿す冠。');
  assert.ok(QUEEN_PROJECTION_MESSAGES.every(message => message.startsWith('女王ミカエラ「') && message.endsWith('」')));
});
