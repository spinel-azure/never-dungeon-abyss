const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
export function normalizeAudioTracks(tracks) {
  return (Array.isArray(tracks) ? tracks : []).slice(0, 64).map((track, index) => ({
    id: `audio_${index}`, kind: track?.kind === 'bgm' ? 'bgm' : 'se',
    fileName: String(track?.fileName || '音声未選択').slice(0, 200),
    audioData: /^data:audio\//.test(track?.audioData || '') ? track.audioData : '',
    src: String(track?.src || '').slice(0, 2000),
    enabled: track?.enabled !== false, start: number(track?.start, 0, 0, 60000),
    duration: number(track?.duration, 1000, 1, 60000), volume: number(track?.volume, 80, 0, 100),
    loop: track?.loop === true, fadeIn: number(track?.fadeIn, 0, 0, 60000), fadeOut: number(track?.fadeOut, 0, 0, 60000)
  }));
}

export class EffectAudio {
  constructor({getEffect, context, destination, notice = () => {}} = {}) {
    Object.assign(this,{getEffect,destination,notice});this.ctx=context;this.buffers=new Map();this.voices=new Map();this.generation=0;
  }
  context() { return this.ctx ||= new AudioContext(); }
  async decode(data) {
    if (!data) throw new Error('音声データがありません');
    if (!this.buffers.has(data)) {
      const promise = fetch(data).then(r => r.arrayBuffer()).then(b => this.context().decodeAudioData(b));
      this.buffers.set(data, promise);
      promise.catch(() => this.buffers.delete(data));
    }
    return this.buffers.get(data);
  }
  pause() {
    this.generation++; this.running = false;
    for (const voice of this.voices.values()) { voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect(); }
    this.voices.clear();
  }
  async start(time, rate) {
    this.pause(); this.prepared = new Map(); const generation = this.generation;
    const tracks = (this.getEffect().audioTracks || []).filter(t => t.enabled);
    if (!tracks.length) { this.running = true; return true; }
    try {
      await this.context().resume();
      const buffers = await Promise.all(tracks.map(t => this.decode(t.audioData || t.src)));
      if (generation !== this.generation) return false;
      this.prepared = new Map(tracks.map((t, i) => [t, buffers[i]])); this.running = true; this.sync(time, rate); return true;
    } catch { if (generation === this.generation) this.notice('音声を再生できません。音声ファイルを再追加して確認してください。'); return false; }
  }
  sync(time, rate) {
    if (!this.running) return;
    for (const [track, buffer] of this.prepared || []) {
      const elapsed = (time - track.start) / 1000;
      const active = track.enabled && elapsed >= 0 && time < Math.min(this.getEffect().duration, track.start + track.duration) && (track.loop || elapsed < buffer.duration);
      let voice = this.voices.get(track);
      if (!active) { if (voice) { voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect(); this.voices.delete(track); } continue; }
      if (!voice) {
        const source = this.context().createBufferSource(), gain = this.context().createGain();
        source.buffer = buffer; source.loop = track.loop; source.playbackRate.value = rate;
        source.connect(gain); gain.connect(this.destination?.(track.kind) || this.ctx.destination); gain.gain.value = 0;
        source.start(0, track.loop ? elapsed % buffer.duration : elapsed);
        voice = {source, gain}; this.voices.set(track, voice);
      }
      voice.source.playbackRate.value = rate;
      const remaining = Math.min(this.getEffect().duration, track.start + track.duration) - time;
      const envelope = Math.min(1, track.fadeIn ? elapsed * 1000 / track.fadeIn : 1, track.fadeOut ? remaining / track.fadeOut : 1);
      voice.gain.gain.setTargetAtTime(track.volume / 100 * Math.max(0, envelope), this.ctx.currentTime, 0.005);
    }
  }
}