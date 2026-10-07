import {createGoldMapBoss} from '../data/karte-gold-boss.js';
import {beginNpcRenewal} from '../data/npc-party.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {MAX_EXPERIENCE} from '../data/growth.js';
import {GODDESS_GRACE_CARD_ID,GODDESS_MERCY_CARD_ID,DEEP_FLOOR_PROOF_CARD_ID} from '../data/cards.js';
import {createDepthReturnSettlement,formatDepthReturnSettlement} from '../data/experience-settlement.js';
import {settleReturnExperience,resolveDungeonDefeat} from '../js/character-services.js';
import {createSpecialMapV2Session,switchV2Floor} from '../js/special-map/session-v2.js';
import {resumeV2Encounter,matchesV2Battle} from '../js/special-map/encounter-v2.js';
import {mapOriginalId} from '../data/special-maps.js';
import {grantV2BattleRewards,settleV2ReturnExperience,discardV2Experience} from '../js/special-map/battle-rewards-v2.js';
import {getV2CombatEnemy} from '../data/special-map-enemies.js';
import {createEnemyCombatant} from '../data/enemies.js';
import {createNormalMapBoss} from '../data/karte-normal-bosses.js';

const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../js/special-map/exploration-ui.js',import.meta.url),'utf8');
function harness(t,level=60,cards=[]){
 const map={rulesetVersion:'special-map-v2',seed:12345,level,rarity:'WHITE',discovererName:'QA'};
 const session=createSpecialMapV2Session([map],mapOriginalId(map));
 t.after(()=>session.disposeSurvey());
 const character=createInitialCharacter({name:'QA',job:'warrior'});
 character.experience=1000;character.carriedExperience=777;character.guildExperiencePool=333;
 character.pendingExperienceSettlement=createDepthReturnSettlement(character,10);
 character.cards.deckSlots=cards;character.wingGiftUses=1;
 let saves=0,exits=0,saveOk=true,surveyOk=true;
 const scope={beginNpcRenewal,character,session,disposed:false,returned:false,normalizeCharacter,grantV2BattleRewards,settleV2ReturnExperience,resumeV2Encounter,matchesV2Battle,resolveDungeonDefeat,
  rememberReturnLoot(){},saveGame:()=>{saves++;return saveOk;},say(){},updateCharacterUi(){},updateHud(){},startBgm(){},stopBgm(){},
  getSpecialMapBgmKey:()=>'',flushSpecialSurvey:()=>surveyOk,close:()=>discardV2Experience(session),onExit:()=>exits++,message:{},
  runDefeatPresentation:async()=>{},openTown(){},finishReturnPresentation:async()=>{},worldLocation:'town',templeRevivalJinglePending:false};
 const context=vm.createContext(scope);
 const hook=main.slice(main.indexOf('    beforeReturn:({session,reason})=>{'),main.indexOf('    leave:()=>{'));
 vm.runInContext('this.host={'+hook+'};',context);
 const finish=ui.slice(ui.indexOf(' function finish('),ui.indexOf('\n onEnter();'));
 vm.runInContext(finish+';this.finish=finish;',context);
 scope.getSpecialMapContext=()=>({session,finish:scope.finish});
 const battleFinish=main.slice(main.indexOf('  async function finishV2Battle('),main.indexOf('  configureSpecialMapHost({'));
 vm.runInContext(battleFinish+';this.outcome=finishV2Battle;',context);
 return {session,scope,get c(){return scope.character;},get saves(){return saves;},get exits(){return exits;},
  saveOk:v=>{saveOk=v;},surveyOk:v=>{surveyOk=v;},
  battle(exp=100){session.battleContext={source:'special-map-v2',sessionId:session.encounterSessionId,battleId:++session.encounterSequence,mapKey:session.mapKey,mapLevel:level};session.transitioning=true;
   return {enemy:{hp:0,alive:false,experienceReward:exp,dropGold:20,fixedGoldPerDefeat:true},explorationContext:structuredClone(session.battleContext)};},
  async win(exp){const battle=this.battle(exp);await scope.outcome(battle,'victory');return battle;}};
}
const protectedState=c=>structuredClone({carried:c.carriedExperience,pending:c.pendingExperienceSettlement,guild:c.guildExperiencePool,loot:c.lootBag});
test('V2 normal return schedules NPC renewal atomically with rewards, retry does not duplicate',t=>{
 const h=harness(t);h.c.npcSystem={registeredIds:['alec'],activeIds:['alec'],records:{alec:{}},renewal:null,expeditionMaxDepth:0};
 // Use an actual registered companion ID from the production registry.
 const before=structuredClone(h.c);h.session.battleExperience=100;h.saveOk(false);
 assert.equal(h.scope.finish(),false);assert.deepEqual(h.c,before);assert.equal(h.session.battleExperience,100);
 h.saveOk(true);assert.equal(h.scope.finish(),true);assert.equal(h.c.npcSystem.renewal?.pending,true);
 const token=h.c.npcSystem.renewal.token;assert.equal(h.scope.finish(),false);assert.equal(h.c.npcSystem.renewal.token,token);
});

for(const source of ['special-map-v2-boss','special-map-v2-special-boss'])test(`${source} production outcome: victory once, same runtime, defeat save retry and grace`,async t=>{
 const h=harness(t,60,[GODDESS_GRACE_CARD_ID]),normal=protectedState(h.c);
 const make=()=>{const b=h.battle();h.session.battleContext.source=source;h.session.battleContext.bossId='karte_boss_001';b.explorationContext=structuredClone(h.session.battleContext);b.enemy=createEnemyCombatant(source==='special-map-v2-special-boss'?createGoldMapBoss({themeId:'gold',level:60}):createNormalMapBoss({seed:12345,level:60,rarity:'WHITE',themeId:'crystal'}));return b;};
 h.session.currentFloor=2;h.session.playerX=6;h.session.playerY=0;h.session.direction=1;h.session.torchFuel=63;h.session.bossKeyFound=h.session.bossDoorUnlocked=true;
 const before=JSON.stringify({x:h.session.playerX,y:h.session.playerY,dir:h.session.direction,torch:h.session.torchFuel,survey:h.session.surveyedMasks});
 const win=make();win.enemy.hp=0;win.enemy.alive=false;await h.scope.outcome(win,'victory');
 const reward=h.session.battleExperience;assert.ok(reward>0);assert.equal(h.session.bossDefeated,true);assert.equal(h.session.battleContext,null);assert.ok(h.session.presence<100);
 assert.equal(JSON.stringify({x:h.session.playerX,y:h.session.playerY,dir:h.session.direction,torch:h.session.torchFuel,survey:h.session.surveyedMasks}),before);
 await h.scope.outcome(structuredClone(win),'victory');assert.equal(h.session.battleExperience,reward);
 const loss=make();h.surveyOk(false);await h.scope.outcome(loss,'defeat');assert.equal(h.exits,0);
 h.surveyOk(true);h.saveOk(false);await h.session.defeatRetry();assert.equal(h.exits,0);assert.equal(h.session.battleExperience,reward);
 h.saveOk(true);await h.session.defeatRetry();assert.equal(h.exits,1);assert.equal(h.session.battleExperience,0);
 assert.deepEqual(protectedState(h.c),normal);assert.equal(h.c.experience,1000+reward);
 await h.scope.outcome(loss,'defeat');assert.equal(h.exits,1);
});

for(const id of ['silberkaefer','maikaefer_koenig'])test(`${id}: production victory/escape/defeat callback with survey/save retry`,async t=>{
 const h=harness(t),normal=protectedState(h.c),d=getV2CombatEnemy(id);
 const battle=()=>({...h.battle(),enemy:createEnemyCombatant(d)});
 const win=battle();win.enemy.hp=0;win.enemy.alive=false;
 await h.scope.outcome(win,'victory');assert.equal(h.session.battleExperience,d.experienceReward);assert.equal(h.session.lootBag.gold,d.dropGold);
 await h.scope.outcome(structuredClone(win),'victory');assert.equal(h.session.battleExperience,d.experienceReward);
 await h.scope.outcome(battle(),'escape');assert.equal(h.session.battleExperience,d.experienceReward);assert.equal(h.session.lootBag.gold,d.dropGold);
 const masks=[...h.session.surveyedMasks],loss=battle();h.surveyOk(false);
 await h.scope.outcome(loss,'defeat');assert.equal(h.exits,0);assert.equal(h.session.battleExperience,d.experienceReward);
 h.surveyOk(true);h.saveOk(false);await h.session.defeatRetry();assert.equal(h.exits,0);
 h.saveOk(true);await h.session.defeatRetry();assert.equal(h.exits,1);assert.equal(h.session.battleExperience,0);
 assert.equal(h.c.experience,1000);assert.deepEqual(h.session.surveyedMasks,masks);assert.deepEqual(protectedState(h.c),normal);
 await h.scope.outcome(loss,'defeat');assert.equal(h.exits,1);
});

test('cloned outcomes match IDs, but other sessions and duplicate copies cannot award',async t=>{
 const a=harness(t),b=harness(t),battle=a.battle(100);
 assert.ok(matchesV2Battle(a.session,structuredClone(battle.explorationContext)));
 assert.equal(matchesV2Battle(b.session,battle.explorationContext),false);
 const reward=grantV2BattleRewards(a.c,structuredClone(battle),a.session);
 assert.equal(reward.exp,100);assert.equal(a.session.lootBag.gold,20);
 assert.equal(grantV2BattleRewards(a.c,structuredClone(battle),a.session).exp,0);
 assert.equal(a.session.lootBag.gold,20);
});

test('map loot and EXP commit together; save failure retains both, return does not consume abyss loot',async t=>{
 const h=harness(t),initialGold=h.c.gold;
 h.c.lootBag={gold:777,items:{},cards:{},equipmentInstances:[]};const normal=protectedState(h.c);
 await h.win(1000);assert.equal(h.c.gold,initialGold);assert.equal(h.session.lootBag.gold,20);
 h.saveOk(false);assert.equal(h.scope.finish(),false);assert.equal(h.c.gold,initialGold);assert.equal(h.session.lootBag.gold,20);
 h.saveOk(true);assert.equal(h.scope.finish(),true);assert.equal(h.c.gold,initialGold+20);assert.equal(h.c.experience,2300);
 assert.deepEqual(protectedState(h.c),normal);assert.equal(h.session.lootBag,null);
 assert.match(formatDepthReturnSettlement(h.c.returnPresentation.settlement),/地図Lvボーナス　＋30％/);
 assert.equal(h.scope.finish(),false);assert.equal(h.c.gold,initialGold+20);
});

for(const [level,expected] of [[1,1203],[60,1262],[100,1303]])test(`Lv${level}: multiple wins across floors settle once with aggregate rounding`,async t=>{
 const h=harness(t,level),before=protectedState(h.c),pending=h.c.pendingExperienceSettlement;
 const first=await h.win(101);assert.equal(h.c.experience,1000);assert.equal(h.session.battleExperience,101);
 switchV2Floor(h.session,h.session.blueprint.links[0].lower);
 await h.win(101);assert.equal(h.session.battleExperience,202);
 await h.scope.outcome(first,'victory');assert.equal(h.session.battleExperience,202,'stale callback ignored');
 assert.equal(h.scope.finish(),true);assert.equal(h.c.experience,expected);assert.equal(h.c.level,1);
 assert.equal(h.session.battleExperience,0);assert.equal(h.c.pendingExperienceSettlement,pending);
 assert.deepEqual(protectedState(h.c),before);assert.equal(h.scope.finish(),false);assert.equal(h.exits,1);
 assert.equal(settleV2ReturnExperience(h.c,h.session,()=>assert.fail('duplicate commit')),false);
 assert.equal(h.c.experience,expected);
});

test('battle and return card rules are shared; return deck is sampled at return',async t=>{
 for(const [cards,expected] of [
  [[],1325],[[DEEP_FLOOR_PROOF_CARD_ID],1350],
  [[GODDESS_GRACE_CARD_ID,DEEP_FLOOR_PROOF_CARD_ID],1250],
  [[GODDESS_MERCY_CARD_ID,DEEP_FLOOR_PROOF_CARD_ID],1250]
 ]){
  const h=harness(t,60,['sr_golden_beetle']);await h.win(100);await h.win(100);
  assert.equal(h.session.battleExperience,250);h.c.cards.deckSlots=cards;
  h.c.eventFlags.johanna_bonus_unlocked=true;h.scope.finish();assert.equal(h.c.experience,expected);
 }
});

test('escape adds nothing and keeps previous wins; duplicate reward cannot add EXP or loot',async t=>{
 const h=harness(t),battle=h.battle(100);
 const reward=grantV2BattleRewards(h.c,battle,h.session,()=>.5);h.scope.character=reward.character;
 const duplicate=grantV2BattleRewards(h.c,battle,h.session,()=>assert.fail('duplicate drop'));
 assert.equal(duplicate.character,h.c);assert.equal(h.session.battleExperience,100);
 resumeV2Encounter(h.session,battle.explorationContext);
 await h.scope.outcome(h.battle(999),'escape');assert.equal(h.session.battleExperience,100);
 assert.equal(h.c.experience,1000);h.scope.finish();assert.equal(h.c.experience,1130);
});

test('defeat preserves EXP only with goddess cards and never consumes abyss pending EXP',async t=>{
 for(const cards of [[],[GODDESS_GRACE_CARD_ID],[GODDESS_MERCY_CARD_ID]]){
  const h=harness(t,60,cards),before=protectedState(h.c);await h.win(100);
  h.saveOk(false);await h.scope.outcome(h.battle(900),'defeat');
  assert.equal(h.exits,0);assert.equal(h.session.battleExperience,100);
  h.saveOk(true);await h.session.defeatRetry();
  assert.equal(h.exits,1);assert.equal(h.c.experience,cards.length?1100:1000);assert.equal(h.c.alive,false);
  assert.equal(h.session.battleExperience,0);assert.deepEqual(protectedState(h.c),before);
  assert.equal(h.scope.finish(),false);
 }
});

test('abort discards only this session; re-entry starts empty',async t=>{
 const h=harness(t),before=protectedState(h.c);await h.win(100);
 discardV2Experience(h.session);assert.equal(h.session.battleExperience,0);assert.equal(h.c.experience,1000);
 assert.equal(h.scope.finish(),false);assert.deepEqual(protectedState(h.c),before);
 const next=harness(t);assert.equal(next.session.battleExperience,0);next.scope.finish();assert.equal(next.c.experience,1000);
});

test('failed survey or character save keeps EXP and Wing Gift; successful retry commits once',async t=>{
 const h=harness(t);await h.win(100);const before=h.c,saves=h.saves;
 h.surveyOk(false);assert.equal(h.scope.finish(),false);assert.equal(h.saves,saves);
 h.surveyOk(true);h.saveOk(false);assert.equal(h.scope.finish(),false);
 assert.equal(h.c,before);assert.equal(h.c.wingGiftUses,1);assert.equal(h.session.battleExperience,100);
 assert.equal(h.session.experienceClosed,false);h.saveOk(true);assert.equal(h.scope.finish(),true);
 assert.equal(h.c.experience,1130);assert.equal(h.c.wingGiftUses,0);assert.equal(h.scope.finish(),false);
});

test('experience cap consumes the V2 balance exactly once; normal legacy settlement remains intact',async t=>{
 for(const initial of [MAX_EXPERIENCE-10,MAX_EXPERIENCE]){
  const h=harness(t,100),before=protectedState(h.c);h.c.experience=initial;await h.win(100);
  h.scope.finish();assert.equal(h.c.experience,MAX_EXPERIENCE);assert.equal(h.session.battleExperience,0);
  assert.deepEqual(protectedState(h.c),before);assert.equal(h.scope.finish(),false);
 }
 const h=harness(t);await h.win(100);h.scope.finish();
 const ordinary=settleReturnExperience(h.c,100,{legacy:true});
 assert.equal(ordinary.settlement.returnFloor,10);assert.equal(ordinary.settlement.finalSettlementExp,815);
 Object.assign(h.c,ordinary.changes);assert.equal(h.c.experience,1945);assert.equal(h.c.carriedExperience,0);
 assert.equal(h.c.pendingExperienceSettlement,null);assert.equal(h.c.guildExperiencePool,333);
});
