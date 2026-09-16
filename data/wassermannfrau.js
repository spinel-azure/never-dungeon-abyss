export const WASSERMANNFRAU_ID = 'wassermannfrau_b18f';
export const WASSERMANNFRAU_CONFIG = Object.freeze({
 barrierMax:1000, absorbRate:.25, absorbMultiplier:2, crisisRate:.25,
 regeneration:200, normalDef:30, exhaustedDef:15, tidePower:85,
 phaseTwoHpRate:.5, greaterSpellPower:45, chargeRecovery:150, strikeSpLoss:10,
 weights:{strike:30,spell:40,absorb:30}, crisisWeights:{strike:20,spell:30,absorb:50},
 phaseTwoWeights:{strike:25,spell:35,absorb:25,charge:15}, phaseTwoCrisisWeights:{strike:15,spell:20,absorb:50,charge:15}
});
const C = WASSERMANNFRAU_CONFIG;
export const WASSERMANNFRAU_ACTIONS = Object.freeze({
 strike:{id:'wassermannfrau_strike',name:'水瓶の一撃',actionType:'physicalAttack',hitCount:1,powerPerHit:1.2,spDamageOnHpHit:C.strikeSpLoss},
 spell:{id:'wassermannfrau_spell',name:'水魔の奔流',actionType:'spell',element:'arcane',spellPower:32,powerMultiplier:1},
 greaterSpell:{id:'wassermannfrau_greater_spell',name:'大水魔の奔流',actionType:'spell',element:'arcane',spellPower:C.greaterSpellPower,powerMultiplier:1},
 absorb:{id:'wassermannfrau_absorb',name:'魔力吸収',actionType:'bossMagicAbsorb',absorbRate:C.absorbRate,barrierRecoveryMultiplier:C.absorbMultiplier},
 regenerate:{id:'wassermannfrau_regenerate',name:'魔力再生',actionType:'bossMagicRegenerate'},
 charge:{id:'wassermannfrau_charge',name:'魔力充填',actionType:'bossMagicCharge'},
 tide:{id:'wassermannfrau_tide',name:'水瓶の満潮',actionType:'spell',element:'arcane',spellPower:C.tidePower,powerMultiplier:1,guardable:true,turnPriority:-100}
});
export const WASSERMANNFRAU = Object.freeze({
 id:WASSERMANNFRAU_ID,name:'ヴァッサーマンフラウ',level:85,floor:18,
 battleIntro:'魔力障壁によって護られている！',
 imageId:WASSERMANNFRAU_ID,image:'images/bosses/boss_26.avif',
 encounterImageId:'wassermannfrau_event_b18f',encounterImage:'images/background/dungeon_event_18.avif',
 defeatedEncounterImageId:'wassermannfrau_remains_b18f',defeatedEncounterImage:'images/background/dungeon_event_18.avif',defeatedEncounterImageFit:'cover',defeatedEncounterOverlayOnly:true,
 battleSize:'large',race:'human',maxHp:4000,stats:{str:18,int:30,agi:24,dex:27,luc:25},def:C.normalDef,attack:24,
 experienceReward:50000,escapeRate:1,surpriseRate:0,surpriseRateMaximum:0,noDrop:true,isBoss:true,bossKind:'event',battleBgmKey:'eventBoss',
 bossMagicBarrier:C.barrierMax,bossMagicBarrierMax:C.barrierMax,ambientEffect:'aquarius-shield',
 defeatedFlag:'boss_wassermannfrau_b18f_defeated',reward:{type:'card',cardId:'zodiac_aquarius',amount:1},
 elementMultipliers:{fire:1,ice:.5,lightning:1,holy:1,dark:1,arcane:1},
 statusResistances:{instantDeath:{immune:true,resistancePoints:100},poison:{resistancePoints:50},deadly_poison:{resistancePoints:50},death_poison:{resistancePoints:50},bleeding:{resistancePoints:50},action_skip:{resistancePoints:80}},
 actions:Object.entries(C.weights).map(([key,weight])=>({weight,action:WASSERMANNFRAU_ACTIONS[key]})),
 event:{prompt:'静まりかえった部屋の中央には大きな水瓶が置かれ、澄んだ水をたたえていた。\nその傍らに巫女の様な女性が立っており、こちらに気付くと顔を上げて無機質な声をあげた。\n\n『イマスグ、タチサレ…。サモナクバ、ハイジョスル…！』\n\n＊Aボタンで次へ　Bボタンで立ち去る',
 start:'サラバダ、イホウジン…！\n\n異界の巫女、ヴァッサーマンフラウが襲ってきた！',autoStartDelay:2500,reserveMessageLines:8,
 remains:'部屋は静まり返り、水瓶には澄んだ水がたたえられている。\n＊Aボタン：次へ'}
});
