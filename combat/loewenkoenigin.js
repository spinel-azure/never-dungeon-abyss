import {LOEWENKOENIGIN_ID,LION_CONFIG as C,LION_IMAGES,LION_ACTIONS} from '../data/loewenkoenigin.js';
export const isLionQueen=enemy=>enemy?.id===LOEWENKOENIGIN_ID;
export function lionPhase(enemy){return Math.max(enemy.lionPhase||1,enemy.hp<=enemy.maxHp*C.phaseThreeRate?3:enemy.hp<=enemy.maxHp*C.phaseTwoRate?2:1);}
export function synchronizeLionQueen(battle){
 for(const enemy of battle.enemies||[battle.enemy]){
  if(!isLionQueen(enemy)||enemy.hp<=0)continue;
  const before=enemy.lionPhase||1,phase=lionPhase(enemy);
  enemy.lionPhase=phase;enemy.def=Math.floor(C.def*C.defMultipliers[phase-1]);enemy.image=LION_IMAGES[phase-1];
  if(phase===before)continue;
  const message=phase===2?'レーヴェンケーニギン「……よいぞ。その力、さらに見せてみよ！」\n獅子の咆哮――与ダメージ2倍・DEF低下！':'レーヴェンケーニギン「見事！ならば妾も、命を燃やして応えようぞ！」\n獅子王――与ダメージ3倍・DEF低下！';
  battle.log.push(message);battle.presentationEvents.push({type:'lionPhase',enemyId:enemy.id,phase,fromImage:LION_IMAGES[before-1],image:enemy.image,message});
 }
}
export function selectLionAction(enemy,rng){
 const phase=lionPhase(enemy);const weights=C.weights[phase-1];
 const options=LION_ACTIONS.map((action,i)=>({action,weight:weights[i]})).filter(e=>e.action.id!=='lion_roar'||!['lion_judgment','lion_roar'].includes(enemy.lastLionAction));
 let roll=Math.max(0,Math.min(.999999,Number(rng())||0))*options.reduce((sum,e)=>sum+e.weight,0);
 for(const option of options){roll-=option.weight;if(roll<0)return structuredClone(option.action);}
 return structuredClone(LION_ACTIONS[0]);
}
export function prepareLionAction(battle,enemy,action){
 if(!isLionQueen(enemy))return action;
 synchronizeLionQueen(battle);
 enemy.lastLionAction=action.id;
 const attack=['physicalAttack','spell'].includes(action.actionType);
 enemy.lionSelfDamagePending=attack&&enemy.lionPhase===3;
 return {...action,lionDamageMultiplier:attack?C.damageMultipliers[enemy.lionPhase-1]:1};
}
export function payLionSelfDamage(battle,enemy,targetIndex=null){
 if(!isLionQueen(enemy)||!enemy.lionSelfDamagePending)return;
 enemy.lionSelfDamagePending=false;
 const amount=Math.min(Math.max(0,enemy.hp-1),Math.floor(enemy.maxHp*C.selfDamageRate));
 if(!amount)return;
 enemy.hp-=amount;
 const message=`レーヴェンケーニギンは命を燃やし、HPを${amount}消費した！`;
 battle.log.push(message);battle.presentationEvents.push({type:'leoHpCost',targetSide:'enemy',...(targetIndex==null?{}:{targetIndex}),amount,message});
}
export function capLionDamageOverTime(enemy,end){
 if(!isLionQueen(enemy))return end;
 for(const [key,rate]of Object.entries(C.dotRates))end[key]=Math.min(end[key],Math.floor(enemy.maxHp*rate));
 return end;
}

// Combat-local state only: a completed judgment exposes the queen until the
// player's next executed action. Incapacitation/cancelled commands do not act.
export function exposeLionQueen(battle, enemy, action) {
 if (!isLionQueen(enemy) || action.id !== 'lion_judgment' || enemy.hp <= 0) return;
 enemy.lionOpening = true;
 const message='レーヴェンケーニギンは大斧を振り抜き、大きく体勢を崩した！';
 battle.log.push(message);
 battle.presentationEvents.push({type:'message',lionOpeningCreated:true,message});
}
export function prepareLionOpening(battle, action) {
 if (!['physicalAttack','spell'].includes(action.actionType)) return action;
 const enemy=(battle.enemies || [battle.enemy]).find(e=>isLionQueen(e) && e.lionOpening && e.hp>0);
 if (!enemy) return action;
 // Snapshot at action start: every hit and Gemini/recast uses this same factor,
 // even if the original attack changes the queen's phase.
 return {...action, lionOpeningMultiplier:C.openingMultipliers[lionPhase(enemy)-1]};
}
export function finishLionPlayerAction(battle) {
 for (const enemy of battle.enemies || [battle.enemy]) {
  if (!isLionQueen(enemy) || !enemy.lionOpening) continue;
  const used=battle.presentationEvents.some(e=>e.type==='attackHit' && e.lionOpeningMultiplier>1);
  delete enemy.lionOpening;
  battle.presentationEvents.push({type:'lionOpeningEnded',used});
 }
}
export function clearLionOpenings(battle) {
 for (const enemy of battle.enemies || [battle.enemy]) if (enemy) delete enemy.lionOpening;
}
