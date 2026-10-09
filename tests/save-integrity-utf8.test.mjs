import test from 'node:test';
import assert from 'node:assert/strict';
import {protectSavePayload,unprotectSavePayload,hmacSha256,SAVE_ENVELOPE_FORMAT} from '../js/save-integrity.js';

test('optimized decoding reads legacy envelopes with Japanese, emoji, escapes and large payloads',()=>{
  for(const text of ['', '転生・赤錆びた鍵 🐈🌿\u0000\n"\\', 'あいうえお🙂'.repeat(20000)]) {
    const value={character:{name:text},list:[0,null,true,1.25]};
    const payload=Buffer.from(JSON.stringify(value),'utf8').toString('base64');
    const legacy={format:SAVE_ENVELOPE_FORMAT,envelopeVersion:1,encoding:'base64',payload,
      signature:hmacSha256('NDA::ABYSS::THE-MISSING-QUEEN::2026',payload)};
    assert.deepEqual(unprotectSavePayload(legacy),value);
    assert.deepEqual(protectSavePayload(value),legacy);
    assert.equal(unprotectSavePayload({...legacy,signature:'0'.repeat(64)}),null);
  }
});
