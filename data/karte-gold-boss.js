import {resolveSpecialThemeBoss} from './karte-special-bosses.js';

// F3-B1 Candidate 1. Independent of normal-species combat and ecology metadata.
export function createGoldMapBoss({themeId,level}={}){
 if(themeId!=='gold')throw RangeError('Gold theme required');
 const boss=resolveSpecialThemeBoss(themeId,level,{strict:true}),s=boss.scaledStats;
 const scale=s.maxHp/32000;
 const physical=(id,name,powerPerHit,speedModifier=0)=>({id,name,actionType:'physicalAttack',hitCount:1,powerPerHit,speedModifier,effects:[]});
 return {...boss,...s,candidate:'v2-gold-boss-combat-candidate-1',ambientEffect:'gold-king',race:'insect',battleSize:'large',isBoss:true,
  // Weapon component is deliberately below STR; spells use the existing neutral elemental multipliers.
  attack:Math.round(50*scale),
  actions:[{weight:35,action:physical('gold_king_attack','攻撃',1)},
   {weight:30,action:physical('gold_king_strike','甲虫王の強撃',1.6,-10)},
   {weight:25,action:physical('gold_king_rush','黄金突進',1.3,10)},
   {weight:10,action:{id:'gold_king_wait',name:'黄金の翅を震わせている',actionType:'wait'}}],
  elementMultipliers:{fire:1,ice:1,lightning:1,light:1,dark:1},
  statusResistances:{instantDeath:{immune:true,resistancePoints:100},petrify:{immune:true,resistancePoints:100},
   poison:{resistancePoints:75},deadly_poison:{resistancePoints:85},bleeding:{resistancePoints:75},
   action_skip:{resistancePoints:75},speed_down:{resistancePoints:55}},
  escapeRate:0,surpriseRate:0,surpriseRateMaximum:0,noDrop:true,fixedGoldPerDefeat:true,
  experienceReward:Math.round(12000*scale),dropGold:Math.round(2500*scale)};
}
