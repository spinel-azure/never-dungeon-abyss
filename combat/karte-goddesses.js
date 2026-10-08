// Every hook is gated by both the fixed ID and the battle-only theme marker.
const ids={rice:'karte_boss_lumina',dusk:'karte_boss_noctia',tender:'karte_boss_zelena'};
export const isGoddess = e => Boolean(e?.goddessTheme && ids[e.goddessTheme]===e.id);
function runtime(e) { return e.goddessRuntime ||= {cooldowns:{},uses:{},reviveUsed:false,growth:0,regen:0,power:0}; }
function message(b,text,extra={}) { b.log.push(text);b.presentationEvents.push({type:'message',message:text,...extra}); }
export function selectGoddessAction(e,b,rng) {
  const r=runtime(e);
  const table=e.actions.filter(({action:a})=>!(a.goddessUtility&&((r.uses[a.id]||0)>=(a.goddessUtility==='barrier'?3:2)))&&!(r.cooldowns[a.id]>(b?.turn||1))
    && !(a.goddessUtility==='heal'&&e.hp>e.maxHp*.8)
    && !(a.goddessUtility==='barrier'&&e.bossMagicBarrier>0));
  let roll=Math.max(0,Math.min(.999999999,Number(rng())||0))*table.reduce((n,a)=>n+a.weight,0);
  for(const a of table){roll-=a.weight;if(roll<0)return {...structuredClone(a.action),speedModifier:(a.action.speedModifier||0)+(e.goddessTheme==='rice'&&e.hp<=e.maxHp*.5?12:0)};}
  return structuredClone(table[0].action);
}
export function prepareGoddessAction(b,e,a) {
  if(!isGoddess(e))return a;
  const r=runtime(e);
  if(e.goddessTheme==='rice'&&e.hp<=e.maxHp*.5&&!r.phase){r.phase=true;message(b,'解放の光！ ルミナの雷光と行動速度が増した！');}
  if(e.goddessTheme==='dusk'&&e.hp<=e.maxHp*.3&&r.growthTurn!==b.turn){
    r.growthTurn=b.turn;r.growth=Math.min(.4,Number((r.growth+.04).toFixed(2)));
    message(b,`宵闇が深まる……ノクティアの魔法威力＋${Math.round(r.growth*100)}％！`);
  }
  const multiplier=(e.goddessOffenseMultiplier||1)*(r.power>0?1.1:1)*(e.goddessTheme==='dusk'&&a.actionType==='spell'?1+r.growth:1)
    *(r.phase&&a.element==='lightning'?1.2:1);
  return {...a,speedModifier:a.speedModifier||0,
    criticalBonus:(a.criticalBonus||0)+(r.phase ? .08 : 0),goddessDamageMultiplier:multiplier};
}
export function executeGoddessUtility(b,e,a) {
  if(!isGoddess(e)||!a.goddessUtility)return false;
  const r=runtime(e);r.uses[a.id]=(r.uses[a.id]||0)+1;r.cooldowns[a.id]=b.turn+(a.cooldown||1);
  if(a.goddessUtility==='heal'){
    const amount=Math.min(e.maxHp-e.hp,Math.round(e.maxHp*a.healRatio));e.hp+=amount;
    e.statuses=e.statuses.filter(s=>!['poison','deadly_poison','death_poison','bleeding','speed_down','action_skip','electrified','charm','charge_defense_down_15','charge_defense_down_25'].includes(s.id||s.statusId));
    message(b,`${a.name}！ HPが${amount}回復し、穢れが払われた。`,{type:'healing',targetSide:'enemy',actorSide:'enemy',amount});
  }else if(a.goddessUtility==='barrier'){
    e.bossMagicBarrierMax=a.barrier;e.bossMagicBarrier=a.barrier;
    message(b,`${a.name}！ ${a.barrier}の障壁を展開した。`,{type:'bossMagicBarrier',enemyId:e.id,remaining:a.barrier,goddessBarrierCreated:a.barrier});
  }else if(a.goddessUtility==='regeneration'){r.regen=3;message(b,'萌芽！ 3ターンの間、若葉の生命が再生する。');}
  else {r.power=4;message(b,'黄金の稲穂！ 攻撃威力が3ターン上昇した。');}
  return true;
}
export function finishGoddessAction(b,e) {
  if(!isGoddess(e)||e.hp<=0)return;
  const r=runtime(e);
  if(r.power>0)r.power--;
  if(r.regen>0){r.regen--;const amount=Math.min(e.maxHp-e.hp,Math.round(e.maxHp*.01));e.hp+=amount;
    if(amount)message(b,`萌芽がHPを${amount}再生した。`,{type:'healing',targetSide:'enemy',actorSide:'enemy',amount});}
}
export function reviveGoddess(b,e,targetIndex) {
  if(!isGoddess(e)||e.goddessTheme!=='tender'||e.hp>0||runtime(e).reviveUsed)return false;
  const r=runtime(e);r.reviveUsed=true;r.reviveTurn=b.turn;r.regen=0;
  e.hp=Math.round(e.maxHp*.3);e.alive=true;e.statuses=[];e.bossMagicBarrier=0;delete e.reservedEnemyAction;
  message(b,'若葉が舞い、失われた生命が再び芽吹く――。',{type:'healing',actorSide:'enemy',targetSide:'enemy',
    ...(targetIndex==null?{}:{targetIndex}),amount:e.hp,goddessRevival:true});
  return true;
}
// Percentage attacks cannot bypass the encounter. Poison can land, but deals a fixed
// level-scaled amount instead of max-HP damage (including Scorpio's direct proc).
export function capGoddessDot(e,end) {
  if(!isGoddess(e))return end;
  for(const key of ['poisonDamage','deadlyPoisonDamage','deathPoisonDamage','bleedingDamage'])
    if(end[key]>0)end[key]=Math.min(end[key],Math.round(e.level*(key==='deathPoisonDamage'?.8:.4)));
  return end;
}

export function recordGoddessStatus(e,applications) {
 if(!isGoddess(e))return;
 const metrics=runtime(e).statusMetrics ||= {};
 for(const a of applications){const m=metrics[a.statusId] ||= {attempts:0,successes:0};m.attempts++;if(a.success)m.successes++;}
}
