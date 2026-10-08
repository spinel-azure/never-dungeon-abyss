import {getFireFloorStepDamage} from '../../data/fire-floor.js';
import {getColdFloorStepDamage} from '../../data/cold-floor.js';
import {applyCrystalFloorSpStep} from '../../data/crystal-floor.js';
import {hasKeyItem} from '../../data/key-items.js';
import {hasCardEffect} from '../../data/cards.js';
import {getNonlethalPoisonDamage} from '../../combat/status-lifecycle.js';

// Representative ordinary depths select the existing zone rules, never map Lv
// or the suspended ordinary dungeon's depth/counters.
export function isV2TorchRestricted(session,character){
 return session?.kind==='specialMapV2'&&session.generatedMap.themeId==='black'&&!hasKeyItem(character?.keyItems,'lichtbringer');
}
export function syncV2ThemeEnvironment(session,character,effects={}){
 if(session?.kind!=='specialMapV2')return session?.generatedMap.themeId;
 const restricted=isV2TorchRestricted(session,character);
 if(restricted)session.torchFuel=0;
 session.renderState.torchEffectForced=Boolean(effects.effectForced);
 session.renderState.minimapEffectForced=Boolean(effects.effectForced);
 return session.generatedMap.themeId==='black'&&!restricted?'light':session.generatedMap.themeId;
}
export function getV2ThemeBattleOptions(session,character,{boss=false}={}){
 const dark=session?.kind==='specialMapV2'&&session.generatedMap.themeId==='black'&&session.torchFuel<=0&&!session.renderState.torchEffectForced;
 return {concealed:dark,ambush:dark&&!boss&&!hasCardEffect(character?.cards?.deckSlots,'zodiac_aries')};
}
export function applyV2ThemeStep(character,session){
 if(!character||session?.kind!=='specialMapV2')return {character,hpDamage:0,spDamage:0};
 const theme=session.generatedMap.themeId;
 const requested=theme==='red'?getFireFloorStepDamage(character,30):theme==='blue'?getColdFloorStepDamage(character,40):0;
 const hpDamage=getNonlethalPoisonDamage(character.hp,requested);
 // The ordinary counter belongs to its own expedition; only this session ticks.
 const crystal=applyCrystalFloorSpStep({...character,crystalFloorStepCount:session.crystalFloorStepCount||0},theme==='crystal'?80:0);
 session.crystalFloorStepCount=crystal.character.crystalFloorStepCount;
 return {character:{...character,hp:character.hp-hpDamage,sp:crystal.character.sp},hpDamage,spDamage:crystal.drained};
}
