// Deterministic balance probe, not a claim to reproduce a player's save/build.
import {writeFile,mkdir} from 'node:fs/promises';
import {createInitialCharacter,normalizeCharacter} from '../data/classes.js';
import {getExperienceForLevel} from '../data/growth.js';
import {createBossCombatant} from '../data/bosses.js';
import {createBattleState,resolveBattleRound} from '../combat/battle-engine.js';
import {getSkill} from '../data/skills.js';
import {getEffectiveSpCost} from '../combat/sp-cost.js';

const builds=[
  {name:'warrior-no-poison',job:'warrior',deck:['zodiac_sagittarius','zodiac_pisces','zodiac_cancer','zodiac_aries']},
  {name:'warrior-scorpio',job:'warrior',deck:['zodiac_sagittarius','zodiac_pisces','zodiac_cancer','zodiac_scorpio']},
  {name:'mage-scorpio',job:'mage',deck:['zodiac_aquarius','zodiac_pisces','zodiac_gemini','zodiac_scorpio']}
];
const results=[];
for(const build of builds)for(let seed=1;seed<=20;seed++) {
  let random=seed;const rng=()=>((random=(Math.imul(random,1664525)+1013904223)>>>0)/4294967296);
  let c=createInitialCharacter({name:build.name,job:build.job});
  c.level=125;c.experience=getExperienceForLevel(125);c.deckCost=33;
  c.cards.ownedCardCounts=Object.fromEntries(build.deck.map(id=>[id,1]));c.cards.deckSlots=build.deck;
  c=normalizeCharacter(c);c.hp=c.maxHp;c.sp=c.maxSp;
  // Controlled late-game reference: capped stats/DEF; no NPC support or equipment passives.
  c.baseStats={str:30,int:30,agi:30,dex:30,luc:30};c.def=60;
  c.equipment={weaponId:build.job==='warrior'?'musashi_blade':'salamander_staff',rightArmEnhancement:3};
  c.skillIds.push('lightning_bolt','tunguska');
  c.inventory.counts.strong_healing_potion_medium=99;
  let b=createBattleState({character:c,enemy:createBossCombatant('loewenkoenigin_b1f')}),turns=0;
  const phases={};let maxHit=0,guards=0,heals=0,poison=0,self=0;
  while(!b.outcome&&turns<1200) {
    let cmd={type:'attack'};
    if(b.enemy.reservedEnemyAction) {cmd={type:'guard'};guards++;}
    else if(b.player.hp<b.player.maxHp*.6&&b.player.inventory.counts.strong_healing_potion_medium>0) {cmd={type:'item',itemId:'strong_healing_potion_medium'};heals++;}
    else if(build.job==='mage') {
      if(b.player.playerCharge.value>=100&&!b.player.playerCharge.cooldown)cmd={type:'skill',skillId:'tunguska'};
      else if(b.player.sp>=getEffectiveSpCost(getSkill('lightning_bolt'),b.player))cmd={type:'skill',skillId:'lightning_bolt'};
    }
    const result=resolveBattleRound({battle:b,playerCommand:cmd,rng});
    if(!result.accepted)throw new Error(JSON.stringify({cmd,reason:result.reason}));
    b=result.battle;turns++;phases[b.enemy.lionPhase||1]??=turns;
    for(const e of b.presentationEvents) {
      if(e.type==='attackHit'&&e.actorSide==='enemy')maxHit=Math.max(maxHit,e.damage||0);
      if(e.type==='poisonDamage'&&e.targetSide==='enemy')poison+=e.amount||0;
      if(e.type==='leoHpCost'&&e.targetSide==='enemy')self+=e.amount||0;
    }
  }
  results.push({build:build.name,seed,hp:c.maxHp,sp:c.maxSp,outcome:b.outcome||'limit',turns,enemyHp:b.enemy.hp,phases,guards,heals,maxHit,poison,self});
}
await mkdir('artifacts/lion-queen',{recursive:true});
await writeFile('artifacts/lion-queen/balance.json',JSON.stringify(results,null,2));
for(const build of builds) {
  const r=results.filter(r=>r.build===build.name),wins=r.filter(r=>r.outcome==='victory');
  console.log(JSON.stringify({build:build.name,wins:wins.length,runs:r.length,turnRange:[Math.min(...r.map(r=>r.turns)),Math.max(...r.map(r=>r.turns))],winTurns:wins.map(r=>r.turns),remainingHpRange:[Math.min(...r.map(r=>r.enemyHp)),Math.max(...r.map(r=>r.enemyHp))],maxHit:Math.max(...r.map(r=>r.maxHit)),maxHeals:Math.max(...r.map(r=>r.heals))}));
}
