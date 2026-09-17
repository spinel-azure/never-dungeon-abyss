import test from 'node:test';
import assert from 'node:assert/strict';
import {markGeminiStarted,hasGeminiTransferMarker,resolveGeminiChoice,resetGeminiRetry} from '../data/gemini-event.js';
import {grantKeyItem} from '../data/key-items.js';
test('Gemini transfer marker requires contact plus one of the three explicit detection sources',()=>{
  const c={cards:{deckSlots:[],ownedCardCounts:{common_person_detection:1}}};
  markGeminiStarted(c);assert.equal(hasGeminiTransferMarker(c,20),false);
  for(const source of ['card','queen_tiara','royal_cat_medal']) {
    const c={cards:{deckSlots:source==='card'?['common_person_detection']:[]}};
    if(source!=='card')c.keyItems=grantKeyItem([],source).keyItems;
    assert.equal(hasGeminiTransferMarker(c,20),false);
    assert.equal(markGeminiStarted(c),true);assert.equal(markGeminiStarted(c),false);
    assert.equal(hasGeminiTransferMarker(c,20),true);
    assert.equal(hasGeminiTransferMarker(c,30),false);
    assert.equal(hasGeminiTransferMarker(JSON.parse(JSON.stringify(c)),20),true);
  }
});
test('Marker follows sisters presence; discovery persists across success and retry',()=>{
  for(const choice of ['sun','moon']) {
    const c={cards:{deckSlots:['common_person_detection']}};
    markGeminiStarted(c);resolveGeminiChoice(c,choice);
    assert.equal(hasGeminiTransferMarker(c,20),choice==='moon');
    resetGeminiRetry(c);
    assert.equal(c.eventFlags.gemini_event_started,true);
    assert.equal(hasGeminiTransferMarker(c,20),choice==='moon');
    c.cards.deckSlots=[];assert.equal(hasGeminiTransferMarker(c,20),false);
  }
  assert.equal(hasGeminiTransferMarker({eventFlags:{gemini_first_completed:true},cards:{deckSlots:['common_person_detection']}},20),false);
  assert.equal(hasGeminiTransferMarker({eventFlags:{gemini_event_started:true,royal_cat_medal_awarded:true}},20),false);
});
