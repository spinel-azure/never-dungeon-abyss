import {resolveSpecialThemeBoss} from './karte-special-bosses.js';

export const GODDESS_THEMES = Object.freeze(['rice', 'dusk', 'tender']);
const spell = (id, name, element, spellPower, extra = {}) => ({id, name, actionType:'spell', element, spellPower, guardable:true, ...extra});
const utility = (id, name, goddessUtility, extra = {}) => ({id, name, actionType:'buff', goddessUtility, ...extra});
const charge = (action) => ({id:action.id+'_prepare', name:action.name, actionType:'prepareAction',
  prepareMessage:`${action.name}の光が集まる……！ 次の一撃に備えよ！`, reservedAction:action});
const entry = (weight, action) => ({weight, action});

// Combat Candidate 1. Design metadata remains unchanged; these fields are consumed by the engine.
export function createGoddessMapBoss({themeId, level, bossId} = {}) {
  if (!GODDESS_THEMES.includes(themeId)) throw RangeError('Not a goddess theme');
  const boss = resolveSpecialThemeBoss(themeId, level, {bossId, strict:true});
  const scale = level === 100 ? 1 : level >= 90 ? .95 : .9;
  const round = n => Math.floor(n * scale + .5);
  const tables = {
    rice:[
      entry(20,{id:'lumina_attack',name:'通常攻撃',actionType:'physicalAttack',hitCount:1,powerPerHit:1}),
      entry(25,spell('lumina_thunder','黄金雷閃','lightning',65)),
      entry(25,{id:'lumina_blades',name:'稲妻の双刃',actionType:'physicalAttack',element:'lightning',hitCount:2,powerPerHit:.8}),
      entry(15,utility('lumina_heal','豊穣の光','heal',{healRatio:.05,cooldown:8})),
      entry(10,utility('lumina_wheat','黄金の稲穂','power',{cooldown:5})),
      entry(5,charge(spell('lumina_sky','天穹雷霆','lightning',115)))
    ],
    dusk:[
      entry(25,spell('noctia_noctis','ノクティス','dark',70,{speedModifier:12})),
      entry(20,{id:'noctia_dew',name:'夜露の雫',actionType:'spDrain',spDamage:25,goddessSpAbsorb:true,speedModifier:12}),
      entry(15,spell('noctia_dusk','宵闇','dark',20,{effects:[{statusId:'speed_down',statusKind:'magical',baseRate:.65}]})),
      entry(15,spell('noctia_eclipse','月蝕','dark',30,{effects:[{statusId:'charge_defense_down_25',statusKind:'magical',baseRate:.65}]})),
      entry(15,utility('noctia_veil','夜の帳','barrier',{barrier:180,cooldown:6})),
      entry(10,charge(spell('noctia_stars','夜天星葬','dark',120,{speedModifier:12})))
    ],
    tender:[
      entry(25,spell('zelena_sylvan','シルワンエメラ','earth',60)),
      entry(20,utility('zelena_breath','若葉の息吹','heal',{healRatio:.04,cooldown:10})),
      entry(15,utility('zelena_barrier','翠緑障壁','barrier',{barrier:250,cooldown:6})),
      entry(15,spell('zelena_vines','森羅の蔦','earth',25,{effects:[{statusId:'speed_down',statusKind:'magical',baseRate:.6}]})),
      entry(15,utility('zelena_bud','萌芽','regeneration',{cooldown:12})),
      entry(10,charge(spell('zelena_judgment','大樹の審判','holy',105)))
    ]
  };
  const combatBase={rice:{maxHp:10000,def:65},dusk:{maxHp:9000,def:50},tender:{maxHp:12000,def:70}}[themeId];
  return {...boss, ...boss.scaledStats,maxHp:round(combatBase.maxHp),def:round(combatBase.def),candidate:'v2-goddess-combat-candidate-1',
    goddessTheme:themeId, race:'divine', isBoss:true, battleSize:'large', attack:round(themeId==='rice'?80:55),
    // magicDefense is design metadata; the existing engine consumes reduction instead.
    magicDamageReduction:Math.min(.3, boss.scaledStats.magicDefense/500),
    actions:tables[themeId], ambientEffect:`goddess-${themeId}`,
    statusResistances:{instantDeath:{immune:true},petrify:{immune:true},
      poison:90,deadly_poison:95,death_poison:95,bleeding:90,action_skip:95,
      electrified:95,speed_down:75,charge_defense_down_15:75,charge_defense_down_25:75,charm:95},
    elementMultipliers:{fire:1,ice:1,lightning:1,earth:1,holy:1,dark:1},
    escapeRate:0,surpriseRate:0,surpriseRateMaximum:0,noDrop:true,fixedGoldPerDefeat:true,
    experienceReward:round(themeId==='tender'?30000:25000),dropGold:round(themeId==='tender'?6000:5000)};
}
