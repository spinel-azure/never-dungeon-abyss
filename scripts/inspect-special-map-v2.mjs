import {generateSpecialMapV2, SPECIAL_DUNGEON_V2, V2_STRUCTURE_REVISION,
  specialMapV2StructureFingerprint, specialMapV2Ascii} from '../js/special-map/generator-v2.js';

try {
  const map = generateSpecialMapV2({ruleset: SPECIAL_DUNGEON_V2,
    seed: Number(process.argv[2] ?? 12345), level: Number(process.argv[3] ?? 1), rarity: process.argv[4] ?? 'WHITE'});
  console.log(JSON.stringify({revision: V2_STRUCTURE_REVISION, ruleset: map.ruleset, seed: map.seed,
    level: map.level, rarity: map.rarity, structureFingerprint: specialMapV2StructureFingerprint(map), links: map.links}, null, 2));
  for (const {walls, ...floor} of map.floors) {
    console.log(JSON.stringify(floor, null, 2));
    console.log(specialMapV2Ascii({...floor, walls}));
  }
  console.log('U = up stair / map entrance; D = down stair; r = antechamber; B = boss location; K = gold chest with session key.');
  console.log('Room doorEdge describes a locked gate. Key/lock metadata only; no gameplay/save/code integration.');
} catch (error) {console.error(error.message); process.exitCode = 1;}
