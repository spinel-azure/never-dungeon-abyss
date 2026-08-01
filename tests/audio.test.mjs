import test from "node:test";
import assert from "node:assert/strict";

test("Web Audio uses one context with independent cached SE and BGM gain paths", async () => {
  const listeners = new Map();
  const gainValues = [];
  const gainNodes = [];
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
        const node = {
          gain: {
            value: 0,
            setValueAtTime(value) {
              this.value = value;
              gainValues.push(value);
            }
          },
          connect() {}
        };
        gainNodes.push(node.gain);
        return node;
      }
      createBufferSource() {
        const source = {
          connect() {},
          disconnect() {},
          start() {},
          stop() { source.stopped = true; source.onended?.(); },
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

  assert.equal(await audio.startLoopSe("townAmbience"), true);
  const loopSource = sources.at(-1);
  assert.equal(loopSource.loop, true);
  assert.equal(contextCount, 1);
  assert.equal(fetchCount, 2);
  audio.stopLoopSe("townAmbience");
  assert.equal(loopSource.stopped, true);

  audio.setBgmOptions({ enabled: true, volume: .25 });
  assert.equal(await audio.startBgm("dungeon"), true);
  const bgmSource = sources.at(-1);
  assert.equal(bgmSource.loop, true);
  assert.equal(gainNodes[1].value, .25);
  assert.equal(contextCount, 1);
  assert.equal(fetchCount, 3);
  audio.stopBgm();
  assert.equal(bgmSource.stopped, true);

  audio.setSeOptions({ enabled: false });
  assert.equal(await audio.playSe("confirm"), false);
  assert.equal(gainValues.at(-1), 0);
});
