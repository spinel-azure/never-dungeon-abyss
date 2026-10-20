// Trial rules are restricted to the three fixed Lv100 map encounters.
const ids={rice:'karte_boss_lumina',dusk:'karte_boss_noctia',tender:'karte_boss_zelena'};
export const isSuperGoddess=e=>e?.level===100&&e.goddessCandidate==='superboss-1'&&ids[e.goddessTheme]===e.id;
export const goddessState=e=>e.goddessRuntime ||= {cooldowns:{},uses:{},reviveUsed:false,growth:0,regen:0,power:0};
const say=(b,message,extra={})=>{b.log.push(message);b.presentationEvents.push({type:'message',message,...extra});};
const idle=(name='力を整えている……',kind='wait')=>({id:'goddess_'+kind,name,actionType:'buff',goddessUtility:kind});
const eclipse=()=>({id:'noctia_eclipse',name:'月蝕',actionType:'spell',element:'dark',spellPower:180,guardable:true,goddessUltimate:true,turnPriority:-1});
export const MOONS=['🌑 新月','🌒 三日月','🌓 半月','🌕 満月'];
export function goddessForecast(e){
 if(!isSuperGoddess(e))return '';
 const r=goddessState(e);
 if(e.goddessTheme==='dusk')return `${MOONS[r.moon||0]}${r.moon===3?'／次の行動：月蝕':''}`;
 if(r.healPreparation)return `回復準備：あと${r.healPreparation.remaining}行動／${r.healPreparation.damage}/6000`;
 if(e.reservedEnemyAction)return `次の行動：${e.reservedEnemyAction.name}`;
 return '';
}
export function selectSuperGoddessAction(e,b,rng){
 const r=goddessState(e);r.opportunities=(r.opportunities||0)+1;
 if(r.rest)return idle('大技の反動で休息している。','rest');
 if(r.healPreparation)return idle('若葉の息吹を準備している。','preparedHeal');
 if(e.goddessTheme==='dusk'&&r.moon===3)return eclipse();
 const table=e.actions.filter(({action:a})=>{
  if(a.actionType==='spDrain')return (r.uses[a.id]||0)<3&&r.opportunities-(r.lastDrainOpportunity??-4)>=4;
  return !(a.goddessUtility&&((r.uses[a.id]||0)>=(a.goddessUtility==='barrier'?3:2)))&&!(r.cooldowns[a.id]>(b?.turn||1))
   &&!(a.goddessUtility==='heal'&&e.hp>e.maxHp*.8)&&!(a.goddessUtility==='barrier'&&e.bossMagicBarrier>0);
 });
 let roll=Math.max(0,Math.min(.999999999,Number(rng())||0))*table.reduce((sum,row)=>sum+row.weight,0);
 for(const row of table){roll-=row.weight;if(roll<0)return {...structuredClone(row.action),speedModifier:(row.action.speedModifier||0)+(e.goddessTheme==='rice'&&e.hp<=e.maxHp*.5?12:0)};}
 return structuredClone(table[0].action);
}
export function prepareSuperGoddessAction(b,e,a){
 const r=goddessState(e);
 // Recheck after a faster player interrupts a heal selected at the round start.
 if(r.rest)a=idle('休息している。','rest');
 else if(r.healPreparation)a=idle('若葉の息吹を準備している。','preparedHeal');
 else if(a.goddessUtility==='preparedHeal')a=idle();
 else if(e.goddessTheme==='dusk'&&r.moon===3)a=eclipse();
 if(a.goddessUltimate&&b.turn<=(r.ultimateAnnouncedTurn||0))a=idle();
 r.executed=true;r.lastAction=a;
 if(a.actionType==='prepareAction'){
  r.ultimateAnnouncedTurn=b.turn;a={...a,reservedAction:{...a.reservedAction,goddessUltimate:true,turnPriority:-1}};
 }
 if(a.actionType==='spDrain'){r.uses[a.id]=(r.uses[a.id]||0)+1;r.lastDrainOpportunity=r.opportunities;}
 if(e.goddessTheme==='rice'&&e.hp<=e.maxHp*.5&&!r.phase){r.phase=true;say(b,'解放の光！ ルミナの雷光と行動速度が増した！');}
 const hacked=e.hackingDeviceApplied===true;
 const moonBonus=[0,.15,.25,.4][r.moon||0];
 const multiplier=e.goddessOffenseMultiplier*(r.power>0?1.1:1)
  *(e.goddessTheme==='dusk'&&a.actionType==='spell'?1+moonBonus*(hacked?.5:1):1)
  *(r.phase&&a.element==='lightning'?1.2:1)
  *(hacked&&e.goddessTheme==='rice'&&a.element==='lightning'?.9:1);
 return {...a,...(a.goddessUltimate?{turnPriority:-1}:{}),criticalBonus:a.goddessUltimate?0:(a.criticalBonus||0)+(r.phase?.08:0),disableCritical:!!a.goddessUltimate,goddessDamageMultiplier:multiplier};
}
export function executeSuperGoddessUtility(b,e,a){
 const r=goddessState(e),kind=a.goddessUtility;
 if(!kind)return false;
 if(kind==='rest'){r.rest=false;say(b,a.name);return true;}
 if(kind==='wait'){say(b,a.name);return true;}
 if(kind==='heal'&&e.goddessTheme==='tender'){
  r.uses[a.id]=(r.uses[a.id]||0)+1;r.cooldowns[a.id]=b.turn+(a.cooldown||1);
  r.healPreparation={remaining:2,damage:0,startedTurn:b.turn,name:a.name};
  say(b,'若葉の息吹の準備！ 次の2行動で6000ダメージを与えると回復を阻止できる。');return true;
 }
 if(kind==='preparedHeal'){
  const p=r.healPreparation;
  if(!p||p.remaining>0){say(b,'若葉の息吹を準備している……');return true;}
  delete r.healPreparation;heal(b,e,e.hackingDeviceApplied?6300:8400,p.name,{goddessHealResolved:true,interruptionDamage:p.damage});return true;
 }
 if(kind==='heal'){
  r.uses[a.id]=(r.uses[a.id]||0)+1;r.cooldowns[a.id]=b.turn+(a.cooldown||1);heal(b,e,4000,a.name);return true;
 }
 return false; // Existing finite barrier, regeneration and power behavior.
}
function heal(b,e,value,name,extra={}){
 const amount=Math.min(e.maxHp-e.hp,value);e.hp+=amount;
 e.statuses=e.statuses.filter(s=>!['poison','deadly_poison','death_poison','bleeding','speed_down','action_skip','electrified','charm','charge_defense_down_15','charge_defense_down_25'].includes(s.id||s.statusId));
 say(b,`${name}！ HPが${amount}回復し、穢れが払われた。`,{type:'healing',targetSide:'enemy',actorSide:'enemy',amount,...extra});
}
export function finishSuperGoddessAction(b,e){
 const r=goddessState(e);if(!r.executed)return false;
 r.executed=false;
 const a=r.lastAction;delete r.lastAction;
 if(e.goddessTheme==='dusk'){
  if(a.id==='noctia_eclipse')r.moon=0;
  else if(!['wait','rest','preparedHeal'].includes(a.goddessUtility))r.moon=((r.moon||0)+1)%4;
  if(r.moon===3){r.ultimateAnnouncedTurn=b.turn;say(b,'満月／次の行動で月蝕！ 防御に備えよ！');}
 }else if(a.goddessUltimate)r.rest=true;
 return true;
}
export function recordGoddessInterruptionDamage(b,e,damage){
 if(!isSuperGoddess(e))return;
 const p=goddessState(e).healPreparation;
 if(p&&p.remaining>0&&b.turn>p.startedTurn)p.damage+=Math.max(0,damage);
}
export function finishGoddessPlayerOpportunity(b){
 for(const e of b.enemies||[b.enemy]){
  if(!isSuperGoddess(e))continue;
  const r=goddessState(e),p=r.healPreparation;
  if(!p||b.turn<=p.startedTurn||p.remaining<=0)continue;
  p.remaining--;
  if(p.damage>=6000){
   delete r.healPreparation;r.rest=true;
   say(b,'若葉の息吹を阻止した！ ゼレーナは休息している。',{goddessHealInterrupted:true,goddessHealResolved:true,interruptionDamage:p.damage});
  }
 }
}
