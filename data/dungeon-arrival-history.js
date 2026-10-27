import {normalizeReincarnationCount} from './reincarnation.js';

// Only known permanent flags are evidence; map exploration never raises this record.
const bossDepths={boss_otherworldly_wisdom_b4f_defeated:4,boss_quest_mimic_b6f_defeated:6,boss_strange_knight_statue_b9f_defeated:9,boss_fallen_mage_b19f_defeated:19,boss_iron_maiden_b29f_defeated:29,boss_wicker_man_b39f_defeated:39,boss_eiskrabbe_b47f_defeated:47,boss_eiskoenigin_b49f_defeated:49,boss_musk_beast_b56f_defeated:56,boss_fleischfresserknospe_b57f_defeated:57,boss_fleischfresser_b59f_defeated:59,boss_todes_scorpio_b64f_defeated:64,boss_b69f_defeated:69,boss_jirene_b79f_defeated:79,boss_b89f_defeated:89,boss_b99f_defeated:99,boss_erzdaemonin_b100f_defeated:100,boss_amayenak_b100f_defeated:100};
export function getLifetimeDungeonDepth(character){
 const flags=character?.eventFlags||{};
 let depth=Math.max(1,Math.floor(Number(character?.highestDungeonDepthReached)||1));
 if(normalizeReincarnationCount(character?.reincarnationCount)>0)depth=Math.max(depth,100);
 for(const n of [10,20,30,40,50,60,70,80,90,100])if(flags[`transfer_portal_b${n}f_unlocked`])depth=Math.max(depth,n);
 if(flags.floor_b80_reached)depth=Math.max(depth,80);
 for(const [flag,n] of Object.entries(bossDepths))if(flags[flag])depth=Math.max(depth,n);
 return depth;
}
