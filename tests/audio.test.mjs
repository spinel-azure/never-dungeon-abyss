import test from "node:test";
import assert from "node:assert/strict";

test("Web Audio uses one context, caches buffers, and applies SE volume through the master gain", async () => {
  const listeners = new Map();
  const gainValues = [];
  const sources = [];
  let contextCount = 0;
  let fetchCount = 0;

  globalThis.document = {
    hidden: false,
    body: { classList: { contains: () => false } },
    addEventListener(type, handler) { listeners.set(`document:${type}`, handler); }
  };
  globalThis.window = {
    addEventListener(type, handler) { listeners.set(`window:${type}`, handler); },
    AudioContext: class {
      constructor() {
        contextCount += 1;
        this.state = "suspended";
        this.currentTime = 0;
        this.destination = {};
      }
      createGain() {
        return {
          gain: {
            value: 0,
            setValueAtTime(value) {
              this.value = value;
              gainValues.push(value);
            }
          },
          connect() {}
        };
      }
      createBufferSource() {
        const source = {
          connect() {},
          disconnect() {},
          start() {},
          stop() { source.onended?.(); },
          onended: null
        };
        sources.push(source);
        return source;
      }
      async resume() { this.state = "running"; }
      decodeAudioData(_data, success) {
        const buffer = {};
        success(buffer);
        return Promise.resolve(buffer);
      }
    }
  };
  globalThis.fetch = async () => {
    fetchCount += 1;
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
  };

  const audio = await import(`../js/audio.js?test=${Date.now()}`);
  audio.configureAudio();
  listeners.get("document:pointerdown")();
  await Promise.resolve();

  audio.setSeOptions({ enabled: true, volume: 1 });
  assert.equal(await audio.playSe("confirm"), true);
  sources[0].onended();
  audio.setSeOptions({ volume: .1 });
  assert.equal(await audio.playSe("confirm"), true);
  assert.equal(contextCount, 1);
  assert.equal(fetchCount, 1);
  assert.ok(gainValues.includes(1));
  assert.equal(gainValues.at(-1), .1);

  audio.setSeOptions({ enabled: false });
  assert.equal(await audio.playSe("confirm"), false);
  assert.equal(gainValues.at(-1), 0);
});
