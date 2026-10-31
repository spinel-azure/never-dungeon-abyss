import {getAuroraBattleRoute} from '../aurora-battle-intro.js';

// Only the V2 adapter knows its source and encounter metadata.
export function getV2AuroraBattleRoute(character,enemy,context,resumed){
 const mapBoss=context?.source==='special-map-v2-special-boss'&&context.mapLevel===100
  &&context.bossId===enemy?.id;
 return getAuroraBattleRoute(character,enemy,{mapBoss,resumed});
}
