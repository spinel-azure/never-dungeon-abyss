// README behaviors for 018–024. Stats/rewards inherit the normal Lv curve;
// these provisional combat weights do not modify ordinary species or older bosses.
const physical=(id,name,extra={})=>({id,name,actionType:'physicalAttack',hitCount:1,powerPerHit:1,effects:[],...extra});
const status=(statusId,baseRate)=>({statusId,baseRate});
const entry=(weight,action,when)=>({weight,action,...(when?{when}:{})});
const low={hpRateAtMost:.5},high={hpRateAbove:.5};
export function applyAdditionalMapBossTraits(boss){
 const attack=physical('map_boss_attack','攻撃');
 switch(boss.id){
  case 'karte_boss_018':
   return {...boss,actions:[
    entry(55,physical('munter_bleed','切開',{afterDamageStatus:status('bleeding',.65)})),
    entry(30,physical('munter_poison','猛毒の注射',{afterDamageStatus:status('deadly_poison',.45)})),
    entry(15,attack),
    entry(30,physical('munter_death_poison','死毒の注射',{afterDamageStatus:status('death_poison',.4)}),low)]};
  case 'karte_boss_019':
   return {...boss,mapBossTraits:{sealingArrow:true},race:'beast',
    stats:{...boss.stats,agi:Math.round(boss.stats.agi*1.3),dex:Math.round(boss.stats.dex*1.3)},
    actions:[entry(65,physical('elite_arrow','射撃',{speedModifier:8,hitBonus:.1})),
     entry(20,physical('elite_true_arrow','必中の矢',{unavoidable:true,speedModifier:8})),
     entry(15,{id:'elite_wait',name:'狙いを定める',actionType:'wait'},high)]};
  case 'karte_boss_020':
   return {...boss,mapBossTraits:{doubleActionBelowHalf:true},race:'beast',actions:[
    entry(40,attack),entry(30,physical('empress_sand','砂塵',{powerPerHit:.8,afterDamageStatus:status('speed_down',.65)})),
    entry(30,physical('empress_serpent','大蛇の牙',{afterDamageStatus:status('deadly_poison',.45)}))]};
  case 'karte_boss_021':
   return {...boss,mapBossTraits:{doubleActionBelowHalf:true},race:'insect',actions:[
    entry(60,physical('arachne_bleed','切り裂き',{afterDamageStatus:status('bleeding',.6)})),
    entry(25,physical('arachne_bind','束縛',{powerPerHit:.6,afterDamageStatus:status('action_skip',.4)})),entry(15,attack)]};
  case 'karte_boss_022':
   return {...boss,mapBossTraits:{regainRate:.05,strongHerbicideTrait:{regainSuppressionTurns:5}},race:'plant',actions:[
    entry(65,physical('flower_poison','猛毒の蔓',{afterDamageStatus:status('deadly_poison',.5)})),entry(35,attack)]};
  case 'karte_boss_023':
   return {...boss,mapBossTraits:{distantTarget:true},race:'beast',escapeRate:1,actions:[entry(65,attack),
    entry(35,{id:'whale_flood_prepare',name:'大洪水の予兆',actionType:'prepareAction',
     prepareMessage:`${boss.name}の周囲で水が大きく盛り上がる……！ 次の行動で大洪水が来る！`,
     reservedAction:physical('whale_flood','大洪水',{unavoidable:true})},low)]};
  default:return boss;
 }
}
