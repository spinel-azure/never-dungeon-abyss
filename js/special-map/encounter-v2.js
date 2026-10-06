import {generateV2EcologyCandidate2} from './ecology-v2-candidate-2.js';
import {getV2CombatEnemy} from '../../data/special-map-enemies.js';
import {mapContentId} from '../../data/special-maps.js';

let nextSessionId=0;
export function matchesV2Battle(s,c){
 return Boolean(s?.battleContext&&c&&c.source==='special-map-v2'&&c.mapKey===s.mapKey&&c.sessionId===s.encounterSessionId&&c.battleId===s.battleContext.battleId&&Number.isInteger(c.battleId));
}
export function rollV2Species(species,random=Math.random){
 if(!Array.isArray(species)||!species.length||species.some(s=>!s.id||s.id.startsWith('karte_boss_')||!Number.isInteger(s.weight)||s.weight<1)||species.reduce((n,s)=>n+s.weight,0)!==10000)throw Error('Invalid V2 encounter weights');
 const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw RangeError('Invalid encounter random');
 let roll=Math.floor(value*10000);
 for(const s of species){if(roll<s.weight)return s.id;roll-=s.weight;}
}
export function isV2EncounterCell(s){
 const f=s.generatedMap,p={x:s.playerX,y:s.playerY};
 const same=q=>q&&q.x===p.x&&q.y===p.y;
 return ![f.stairsUp,f.stairsDown,f.keyChest,f.bossRoom?.bossCell].some(same);
}
export function attachV2Encounters(s,{onEncounter,random=Math.random,onBlocked=message=>console.warn(message)}={}){
 s.presence=0;s.battleContext=null;s.encounterSessionId=++nextSessionId;s.encounterSequence=0;
 s.ecology=generateV2EcologyCandidate2({ruleset:s.ruleset,seed:s.seed,level:s.level,rarity:s.rarity,themeId:s.generatedMap.themeId});
 s.onEncounterStep=()=>{
  if(!onEncounter||s.transitioning||s.cellPrompt||s.battleContext||!isV2EncounterCell(s))return false;
  const dark=s.torchFuel<=0;
  s.presence=Math.min(100,s.presence+(dark?5:4)+Math.floor(random()*(dark?6:5)));
  if(s.presence<100)return false;
  const speciesId=rollV2Species(s.ecology.floors[s.currentFloor].species,random);
  const enemy=getV2CombatEnemy(speciesId);
  // Preserve unknown-ID protection; never substitute or reroll the ecology pick.
  if(!enemy||enemy.isBoss){s.presence=0;s.autoPath=null;const message=`${speciesId}：戦闘定義未対応のため遭遇を保留しました。`;onBlocked(message);s.say(message);return false;}
  s.autoPath=null;
  s.battleContext={source:'special-map-v2',sessionId:s.encounterSessionId,battleId:++s.encounterSequence,mapKey:s.mapKey,contentId:mapContentId({rulesetVersion:s.ruleset,seed:s.seed,level:s.level,rarity:s.rarity}),mapSeed:s.seed,mapLevel:s.level,rarity:s.rarity,themeId:s.generatedMap.themeId,floorIndex:s.currentFloor,speciesId};
  s.transitioning=true;
  onEncounter(s,enemy,s.battleContext);
  return true;
 };
}
export function resumeV2Encounter(s,context){
 if(!s||s.battleContext!==context)return false;
 s.battleContext=null;s.transitioning=false;s.autoPath=null;s.presence=0;
 return true;
}
