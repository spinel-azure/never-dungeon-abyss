export const WASSERMANNFRAU_ID = 'wassermannfrau_b18f';
export const WASSERMANNFRAU = Object.freeze({
 id:WASSERMANNFRAU_ID,name:'ヴァッサーマンフラウ',level:85,floor:18,
 imageId:WASSERMANNFRAU_ID,image:'images/bosses/boss_26.avif',
 encounterImageId:'wassermannfrau_event_b18f',encounterImage:'images/background/dungeon_event_18.avif',
 defeatedEncounterImageId:'wassermannfrau_remains_b18f',defeatedEncounterImage:'images/background/dungeon_event_18.avif',defeatedEncounterImageFit:'cover',defeatedEncounterOverlayOnly:true,
 battleSize:'large',race:'human',maxHp:4000,stats:{str:18,int:30,agi:24,dex:27,luc:25},def:30,attack:24,
 experienceReward:50000,escapeRate:1,surpriseRate:0,surpriseRateMaximum:0,noDrop:true,isBoss:true,bossKind:'event',battleBgmKey:'eventBoss',
 bossMagicBarrier:1000,bossMagicBarrierMax:1000,ambientEffect:'aquarius-shield',
 defeatedFlag:'boss_wassermannfrau_b18f_defeated',reward:{type:'card',cardId:'zodiac_aquarius',amount:1},
 elementMultipliers:{fire:1,ice:.5,lightning:1,holy:1,dark:1,arcane:1},
 statusResistances:{instantDeath:{immune:true,resistancePoints:100},poison:{resistancePoints:50},deadly_poison:{resistancePoints:50},death_poison:{resistancePoints:50},bleeding:{resistancePoints:50},action_skip:{resistancePoints:80}},
 actions:[
 {weight:30,action:{id:'wassermannfrau_strike',name:'水瓶の一撃',actionType:'physicalAttack',hitCount:1,powerPerHit:1}},
 {weight:40,action:{id:'wassermannfrau_spell',name:'水魔の奔流',actionType:'spell',element:'arcane',spellPower:32,powerMultiplier:1}},
 {weight:30,action:{id:'wassermannfrau_absorb',name:'魔力吸収',actionType:'bossMagicAbsorb',absorbRate:.25,barrierRecoveryMultiplier:2}}
 ],
 event:{prompt:'静まりかえった部屋の中央には大きな水瓶が置かれ、澄んだ水をたたえていた。\nその傍らに巫女の様な女性が立っており、こちらに気付くと顔を上げて無機質な声をあげた。\n\n『イマスグ、タチサレ…。サモナクバ、ハイジョスル…！』\n\n＊Aボタンで次へ　Bボタンで立ち去る',
 start:'サラバダ、イホウジン…！\n\n異界の巫女、ヴァッサーマンフラウが襲ってきた！',autoStartDelay:2500,reserveMessageLines:8,
 remains:'部屋は静まり返り、水瓶には澄んだ水がたたえられている。\n＊Aボタン：次へ'}
});
