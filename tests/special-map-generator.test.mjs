import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSpecialMap,generateRegisteredSpecialMap,SPECIAL_DUNGEON_V1,specialMapFingerprint,specialMapAscii} from '../js/special-map/generator.js';
import {deriveSeedV1,mulberry32V1,streamV1} from '../js/special-map/random-v1.js';
import {V1_THEMES} from '../js/special-map/generator-v1.js';
import {WALL_COLORS,FLOOR_COLORS} from '../js/floorTheme.js';
import {encodeMapCode,decodeMapCode} from '../data/special-map-code.js';
import {checkStructure} from './special-map-structure-helper.mjs';
const vectors=[[0,'085620c1'],[1,'487444ba'],[12345,'65bbb4f0'],[32768,'e7e9d2c5'],[65535,'26ac1209']];
test('V1 frozen examples repeat 100 times with independent complete structure checks',()=>{
 for(const [seed,fingerprint] of vectors){const expected=generateSpecialMap(SPECIAL_DUNGEON_V1,seed);checkStructure(expected);assert.equal(specialMapFingerprint(expected),fingerprint);
  for(let i=0;i<100;i++)assert.deepEqual(generateSpecialMap(SPECIAL_DUNGEON_V1,seed),expected);
  assert.equal(specialMapFingerprint(Object.fromEntries(Object.entries(expected).reverse())),fingerprint);
 }
 assert.equal(new Set(vectors.map(([s])=>JSON.stringify(generateSpecialMap(SPECIAL_DUNGEON_V1,s).walls))).size,5);
});
test('V1 PRNG/subseed vectors and future streams cannot consume topology randomness',()=>{
 const next=mulberry32V1(0);assert.deepEqual(Array.from({length:5},next),[1144304738,1416247,958946056,627933444,2007157716]);
 assert.equal(deriveSeedV1(SPECIAL_DUNGEON_V1,12345,'topology'),1738464607);
 const purposes=['topology','entrance','exit','theme','ecology','treasure'];
 assert.equal(new Set(purposes.map(p=>deriveSeedV1(SPECIAL_DUNGEON_V1,12345,p))).size,6);
 const before=generateSpecialMap(SPECIAL_DUNGEON_V1,12345);
 for(const p of purposes){const a=streamV1(SPECIAL_DUNGEON_V1,12345,p),b=streamV1(SPECIAL_DUNGEON_V1,12345,p);for(let i=0;i<1000;i++)assert.equal(a(),b());}
 assert.deepEqual(generateSpecialMap(SPECIAL_DUNGEON_V1,12345),before);
});
test('generator rejects invalid seeds/rulesets without coercion',()=>{
 for(const seed of [-1,65536,NaN,Infinity,1.1,'0',null,undefined])assert.throws(()=>generateSpecialMap(SPECIAL_DUNGEON_V1,seed),RangeError);
 for(const ruleset of ['',null,undefined,1,'latest','v2','constructor'])assert.throws(()=>generateSpecialMap(ruleset,0),RangeError);
});
test('no Math.random dependency or mutable output shared across calls',()=>{
 const random=Math.random;try{Math.random=()=>{throw Error('forbidden')};for(const [seed] of vectors)checkStructure(generateSpecialMap(SPECIAL_DUNGEON_V1,seed));}finally{Math.random=random;}
 const map=generateSpecialMap(SPECIAL_DUNGEON_V1,0);map.walls[0][0]=false;map.entrance.x=8;
 assert.equal(specialMapFingerprint(generateSpecialMap(SPECIAL_DUNGEON_V1,0)),'085620c1');
});
test('legacy registered originals regenerate without changing save, name rules or shared code',()=>{
 const original={rulesetVersion:'phase2a-1',seed:12345,discovererName:'†ルル'},code=encodeMapCode(original),before=JSON.stringify(original);
 const a=generateRegisteredSpecialMap(original),b=generateRegisteredSpecialMap(decodeMapCode(code).map);
 checkStructure(a);assert.deepEqual(a,b);assert.equal(a.ruleset,'phase2a-1');assert.equal(JSON.stringify(original),before);assert.equal(encodeMapCode(original),code);
 for(const theme of V1_THEMES){assert.ok(WALL_COLORS.includes(theme));assert.ok(FLOOR_COLORS.includes(theme));}
 const ascii=specialMapAscii(a);assert.equal(ascii.split('\n').length,21);assert.equal((ascii.match(/I/g)||[]).length,1);assert.equal((ascii.match(/O/g)||[]).length,1);
});
