import test from 'node:test';
import assert from 'node:assert/strict';
import {getAuroraBattleRoute} from '../js/aurora-battle-intro.js';
import {getV2AuroraBattleRoute} from '../js/special-map/aurora-v2.js';
import {canActivateHackingDevice} from '../combat/hacking-device.js';
import {createGoddessMapBoss} from '../data/karte-goddess-bosses.js';
import {grantKeyItem} from '../data/key-items.js';

test('intro route agrees with existing device eligibility for all goddesses and reincarnations',()=>{
 for(const themeId of ['rice','dusk','tender'])for(const reincarnationCount of [0,1,2,3])for(const owned of [false,true]){
  const enemy=createGoddessMapBoss({themeId,level:100});
  const c={reincarnationCount,keyItems:owned?grantKeyItem({},'hacking_device').keyItems:{}};
  const context={source:'special-map-v2-special-boss',mapLevel:100,bossId:enemy.id};
  assert.equal(getV2AuroraBattleRoute(c,enemy,context,null),owned&&reincarnationCount===3?'hacking':'normal');
  assert.equal(getAuroraBattleRoute(c,enemy,{mapBoss:true}),owned&&reincarnationCount===3?'hacking':'normal');
  assert.equal(getAuroraBattleRoute(c,enemy),null);
  assert.equal(getAuroraBattleRoute(c,enemy,{mapBoss:true,resumed:{turn:1}}),null);
  assert.equal(canActivateHackingDevice(c,enemy),owned&&reincarnationCount===3);
  assert.equal(getV2AuroraBattleRoute(c,enemy,context,{turn:1}),null);
 }
});
test('intro excludes other sources, levels and identities even when names match',()=>{
 const enemy=createGoddessMapBoss({themeId:'rice',level:100});
 const ctx={source:'special-map-v2-special-boss',mapLevel:100,bossId:enemy.id};
 for(const context of [null,{...ctx,source:'dungeon'},{...ctx,source:'special-map-v2-boss'},{...ctx,mapLevel:99},{...ctx,bossId:'other'}])assert.equal(getV2AuroraBattleRoute({},enemy,context),null);
 for(const e of [{...enemy,level:99},{...enemy,id:'other'},{...enemy,goddessCandidate:null}])assert.equal(getV2AuroraBattleRoute({},e,ctx),null);
});
