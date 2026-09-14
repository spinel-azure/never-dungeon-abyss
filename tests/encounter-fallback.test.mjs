import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as enemies from '../data/enemies.js';
import {getForcedEnemyId} from '../data/quests.js';
test('empty normal pools explicitly fall back to the rat and never to a roaming boss',()=>{
 for(const depth of [100,101,999])for(const value of [0,.5,.999])
 assert.equal(enemies.getRandomEnemy({depth,rng:()=>value}).id,'abyss_rat');
 for(let depth=1;depth<=101;depth++)for(const value of [0,.5,.999])
 assert.notEqual(enemies.getRandomEncounterEnemy({depth,rng:()=>value}).id,'verfolger');
});
test('real main encounter selection connects B89 to crystal formations and preserves rare encounters',async()=>{
 const source=await readFile(new URL('../js/main.js',import.meta.url),'utf8');
 const start=source.indexOf('  function getRandomEncounterEnemyPartyData()');
 const end=source.indexOf('  function prepareRandomEncounter()',start);
 assert.ok(start>=0&&end>start);
 const names=['getRandomEncounterEnemy','getEnemyById','getEnemyEncounterCount','getMagicRegionEncounterFormation','getTortureRegionEncounterFormation','getWaterRegionEncounterFormation','getCrystalRegionEncounterFormation','getDarkRegionEncounterFormation'];
 const select=new Function('currentDepth','character','getForcedEnemyId',...names,source.slice(start,end)+'return getRandomEncounterEnemyPartyData();');
 const old=Math.random;
 try{for(const value of [.02,.2,.5,.8,.999]){
  Math.random=()=>value;
  const party=select(89,{},getForcedEnemyId,...names.map(n=>enemies[n]));
  assert.deepEqual(party,enemies.getCrystalRegionEncounterFormation({depth:88,rng:()=>value}));
 }
 Math.random=()=>0;
 assert.equal(select(89,{},getForcedEnemyId,...names.map(n=>enemies[n]))[0].id,'maikaefer');
 }finally{Math.random=old;}
});
