import { AKASHIC_BACKGROUND } from '../data/akashic-phantoms.js';
import { isCharmed } from '../combat/akashic-phantoms.js';

export function renderCharmStatus(character, root = document) {
  const active = isCharmed(character);
  for (const id of ['quickName', 'quickNameCompact', 'battlePlayerName']) {
    root.getElementById(id)?.classList.toggle('condition-charm', active);
  }
  const job = root.getElementById('quickJob');
  if (!job) return;
  let heart = root.getElementById('quickCharm');
  if (!heart) {
    heart = root.createElement('span'); heart.id = 'quickCharm';
    heart.className = 'condition-charm'; heart.textContent = '♥';
    heart.setAttribute('aria-label', '魅了'); job.after(heart);
  }
  heart.hidden = !active;
}

export function drawQueenProjection(ctx, image, width, height, event, now, reducedMotion = false) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  const fading = event.phase === 'fading';
  const progress = fading ? Math.min(1, (now - event.fadeStartedAt) / 650) : 0;
  ctx.save();
  ctx.globalAlpha = (reducedMotion ? .85 : .8 + Math.sin(now / 130) * .08) * (1 - progress);
  ctx.filter = 'drop-shadow(0 0 8px #b7ebff)';
  if (fading && !reducedMotion) {
    // Collapse to a thin projection line, then cut out. No sound is played.
    ctx.translate(width / 2, height / 2);
    ctx.scale(1 + progress * .15, Math.max(.004, 1 - progress * 4));
    ctx.translate(-width / 2, -height / 2);
  }
  for (let y = 0; y < image.naturalHeight; y += 16) {
    const sh = Math.min(16, image.naturalHeight - y);
    const jitter = !reducedMotion && Math.sin(Math.floor(now / 110) + y * 7) > .93 ? 7 : 0;
    ctx.drawImage(image, 0, y, image.naturalWidth, sh, (width - w) / 2 + jitter, height - h + y * scale, w, sh * scale);
  }
  ctx.filter = 'none'; ctx.fillStyle = 'rgba(140,210,240,.12)';
  for (let y = 0; y < height; y += 5) ctx.fillRect((width - w) / 2, y, w, 1);
  ctx.restore();
}

export function mountAkashicBackground(root) {
  root.classList.add('is-akashic-battle');
  root.style.backgroundImage = `linear-gradient(#000c,#000c),url("${AKASHIC_BACKGROUND}")`;
  root.style.backgroundSize = 'cover'; root.style.backgroundPosition = 'center';
  const canvas = document.createElement('canvas');
  canvas.className = 'akashic-magic'; canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  root.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, stopped = false, previous = 0;
  function draw(now) {
    if (stopped) return;
    if (now - previous >= 33) {
      previous = now;
      const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#b978e8'; ctx.strokeStyle = '#9353c6'; ctx.globalAlpha = .25;
      const time = reduced.matches ? 0 : now / 1000;
      for (let i = 0; i < 28; i++) {
        const x = ((i * .618 + Math.sin(time * .2 + i) * .015) % 1) * w;
        const y = ((i * .317 + time * .025) % 1) * h;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const x = w * (.2 + i * .075), y = h * (.3 + Math.sin(i * 9 + time * .3) * .16);
        if (!i) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  return () => { stopped = true; cancelAnimationFrame(frame); canvas.remove(); root.classList.remove('is-akashic-battle'); root.style.backgroundImage = ''; root.style.backgroundSize = ''; root.style.backgroundPosition = ''; };
}
