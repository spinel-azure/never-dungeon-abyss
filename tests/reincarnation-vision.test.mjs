import test from 'node:test';
import assert from 'node:assert/strict';
import {isReincarnationVisionEligible} from '../js/reincarnation-vision.js';
test('Lumina vision requires third reincarnation level cap and an unseen event',()=>{
 for(const [count,level,expected] of [[0,197,false],[2,197,false],[3,1,false],[3,196,false],[3,197,true]]){
  assert.equal(isReincarnationVisionEligible({reincarnationCount:count,level}),expected);
 }
 assert.equal(isReincarnationVisionEligible({reincarnationCount:3,level:197,eventFlags:{reincarnation_lumina_completed:true}}),false);
 assert.equal(isReincarnationVisionEligible({reincarnationCount:3,level:1,eventFlags:{reincarnation_lumina_pending:true}}),false);
});
