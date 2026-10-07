import test from 'node:test';import assert from 'node:assert/strict';
import {NORMAL_MAP_THEMES,SPECIAL_MAP_THEMES,ALL_MAP_THEMES,SPECIAL_THEME_DEFINITIONS} from '../data/special-map-themes.js';
import {generateSpecialMapV2,specialMapV2StructureFingerprint} from '../js/special-map/generator-v2.js';
import {generateExplicitSpecialMapV2,describeSpecialThemeMapName} from '../js/special-map/special-themes-v2.js';
import {KARTE_SPECIAL_BOSSES,resolveSpecialThemeBoss,assertSpecialThemeBoss,SPECIAL_THEME_BOSS_IDS} from '../data/karte-special-bosses.js';
import {generateV2Ecology,V2_ECOLOGY_SPECIES} from '../js/special-map/ecology-v2.js';
import {generateV2EcologyCandidate2,getV2Candidate2Candidates} from '../js/special-map/ecology-v2-candidate-2.js';
import {createBossVariantCache} from '../js/boss-color-variant.js';
import {prepareSpecialThemeBoss} from '../js/special-map/boss-presentation.js';
import {getSpecialMapBgmKey} from '../js/special-map/context.js';
const base={ruleset:'special-map-v2',seed:12345,level:100,rarity:'WHITE'};
test('normal lottery remains ten; explicit themes replace presentation only across all three floors',()=>{
 assert.equal(NORMAL_MAP_THEMES.length,10);assert.equal(ALL_MAP_THEMES.length,14);
 for(const seed of [0,1,12345,65535]){
  const normal=generateSpecialMapV2({...base,seed});assert.ok(NORMAL_MAP_THEMES.includes(normal.themeId));
  for(const themeId of SPECIAL_MAP_THEMES){const special=generateExplicitSpecialMapV2({...base,seed,themeId});
   assert.equal(special.themeId,themeId);assert.equal(special.bossAssignment.id,SPECIAL_THEME_BOSS_IDS[themeId]);
   assert.deepEqual(special.links,normal.links);
   for(let i=0;i<3;i++){const {themeId:t,...geometry}=special.floors[i],{themeId:_,...original}=normal.floors[i];assert.equal(t,themeId);assert.deepEqual(geometry,original);}
  }
 }
 assert.equal(specialMapV2StructureFingerprint(generateSpecialMapV2(base)),'3519b715');
});
test('goddess themes require 80..100; gold runtime requires 60..100; invalid identity rejected',()=>{
 for(const themeId of SPECIAL_MAP_THEMES){for(const level of [0,101,NaN])assert.throws(()=>generateExplicitSpecialMapV2({...base,themeId,level}));
  if(themeId!=='gold')for(const level of [1,79])assert.throws(()=>generateExplicitSpecialMapV2({...base,themeId,level}));
  else {assert.throws(()=>generateExplicitSpecialMapV2({...base,themeId,level:59}));assert.equal(generateExplicitSpecialMapV2({...base,themeId,level:60}).themeId,'gold');}
 }
 assert.throws(()=>generateExplicitSpecialMapV2({...base,themeId:'unknown'}));
});
test('fixed assignments reject other bosses in development and fall back only to correct boss in production',()=>{
 const expected={rice:['karte_boss_lumina','013'],dusk:['karte_boss_noctia','014'],tender:['karte_boss_zelena','015'],gold:['karte_boss_maikaefer_koenig','016']};
 for(const themeId of SPECIAL_MAP_THEMES){
  const id=SPECIAL_THEME_BOSS_IDS[themeId];assert.equal(resolveSpecialThemeBoss(themeId,100,{bossId:'wrong'}).id,id);
  assert.equal(id,expected[themeId][0]);assert.equal(KARTE_SPECIAL_BOSSES[id].image,`images/karte_bosses/karte_boss_${expected[themeId][1]}.avif`);
  assert.throws(()=>assertSpecialThemeBoss(themeId,'wrong',100));assert.throws(()=>resolveSpecialThemeBoss(themeId,100,{bossId:'wrong',strict:true}));
  assert.equal(resolveSpecialThemeBoss(themeId,100,{strict:true}).image,KARTE_SPECIAL_BOSSES[id].image);
 }
 assert.equal(resolveSpecialThemeBoss('rice',79),null);
 assert.equal(resolveSpecialThemeBoss('unknown',100),null);
 assert.equal(KARTE_SPECIAL_BOSSES.karte_boss_maikaefer_koenig.image,'images/karte_bosses/karte_boss_016.avif');
 assert.ok(V2_ECOLOGY_SPECIES.maikaefer_koenig);assert.ok(!V2_ECOLOGY_SPECIES.karte_boss_maikaefer_koenig);
});
test('goddess numeric stats use integer 90/95/100 percent; SP stays 9999',()=>{
 const expected={rice:[55000,115,105,100,110,120,115,105],dusk:[48000,80,130,125,115,105,95,125],tender:[60000,95,120,105,100,115,125,115]};
 for(const [themeId,values] of Object.entries(expected))for(const level of [80,89,90,99,100]){
  const boss=resolveSpecialThemeBoss(themeId,level),s=boss.scaledStats,p=level===100?100:level>=90?95:90;
  assert.deepEqual([s.maxHp,s.stats.str,s.stats.int,s.stats.agi,s.stats.dex,s.stats.luc,s.def,s.magicDefense],values.map(v=>Math.floor((v*p+50)/100)));
  assert.equal(s.maxSp,9999);assert.equal(boss.battleEnabled,false);assert.equal(boss.resistanceProfile.nonImmuneAilmentsMaySucceed,true);
 }
 assert.equal(KARTE_SPECIAL_BOSSES.karte_boss_zelena.design.phaseDesign.reviveRatio,.3);
});
test('all four fixed bosses bypass variant canvas and caller path selection twice',async()=>{
 let canvases=0;const cache=createBossVariantCache({createCanvas:()=>{canvases++;throw Error('Forbidden');}});
 for(const themeId of SPECIAL_MAP_THEMES){const boss=resolveSpecialThemeBoss(themeId,100),image={width:600,height:600};
  assert.equal(boss.allowColorVariant,false);
  assert.equal(cache.getBossVariantImage({...base,bossId:boss.id,imagePath:boss.image,image,allowColorVariant:true}),image);
  assert.equal(cache.getBossVariantImage({...base,themeId,bossId:'karte_boss_001',imagePath:'images/karte_bosses/karte_boss_001.avif',image}),image);
  const result=await prepareSpecialThemeBoss({themeId,level:100,bossId:'wrong',loadImage:async path=>{assert.equal(path,boss.image);return image;}});
  assert.equal(result.image,image);
 }
 assert.equal(canvases,0);assert.equal(cache.size,0);
});
test('Candidate 2 preserves all normal theme outputs exactly and keeps bosses outside ecology',()=>{
 for(const themeId of ALL_MAP_THEMES)for(const seed of [0,1,12345,65535]){
  const input={...base,seed,themeId},e=generateV2EcologyCandidate2(input);
  if(NORMAL_MAP_THEMES.includes(themeId))assert.deepEqual(e,generateV2Ecology(input));
  else assert.deepEqual(e,generateV2EcologyCandidate2({...input,discovererName:'別署名'}));
  for(const f of e.floors){assert.equal(f.species.reduce((n,s)=>n+s.weight,0),10000);assert.equal(new Set(f.species.map(s=>s.id)).size,f.species.length);
   for(const s of f.species){assert.ok(s.weight>=1);assert.ok(V2_ECOLOGY_SPECIES[s.id]);assert.ok(!KARTE_SPECIAL_BOSSES[s.id]);}
  }
 }
 assert.throws(()=>generateV2EcologyCandidate2({...base,themeId:'rice',level:79}));
 assert.ok(getV2Candidate2Candidates({...base,themeId:'gold'}).some(s=>s.id==='maikaefer_koenig'));
});
test('special names are deterministic with explicit theme and existing prefix; BGM falls back to dungeon',()=>{
 for(const themeId of SPECIAL_MAP_THEMES){const input={...base,themeId},name=describeSpecialThemeMapName(input);
  assert.deepEqual(name,describeSpecialThemeMapName({...input,rarity:'GOLD',discovererName:'別名'}));
  assert.equal(name.themeId,themeId);assert.equal(getSpecialMapBgmKey(themeId),'dungeon');
  assert.equal(SPECIAL_THEME_DEFINITIONS[themeId].walls.length,2);
 }
});
