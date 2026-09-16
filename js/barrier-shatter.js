// Transient overlay: the underlying sprite and persistent barrier canvas stay untouched.
export async function playBarrierShatter(root, image, isActive = () => true) {
  if (!image) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'boss-barrier-shatter';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
  root.append(canvas);
  const started = performance.now();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    await new Promise(resolve => {
      const frame = now => {
        if (!isActive() || !root.isConnected || root.hidden) return resolve();
        const progress = Math.min(1, (now - started) / (reduced ? 250 : 750));
        const frameRect = root.getBoundingClientRect(), sprite = image.getBoundingClientRect();
        canvas.width = Math.max(1, root.clientWidth);
        canvas.height = Math.max(1, root.clientHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve();
        drawBarrierShatter(ctx, {
          x: sprite.left - frameRect.left + sprite.width / 2,
          y: sprite.top - frameRect.top + sprite.height / 2,
          rx: sprite.width * .38, ry: sprite.height * .43
        }, progress, reduced);
        if (progress >= 1) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  } finally { canvas.remove(); }
}

export function drawBarrierShatter(ctx, { x, y, rx, ry }, progress, reduced = false) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.globalAlpha = (1 - progress) * .9;
  ctx.strokeStyle = '#dcffff';
  ctx.fillStyle = '#7ad9ff';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI * 2 / 24;
    const travel = reduced ? 0 : Math.max(0, progress - .12) * 1.1;
    const px = x + Math.cos(angle) * rx * (.55 + travel);
    const py = y + Math.sin(angle) * ry * (.55 + travel) + (reduced ? 0 : progress * progress * ry * .8);
    const size = Math.max(3, Math.min(rx, ry) * (.12 + (i % 3) * .03));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle + (reduced ? 0 : progress * (i % 2 ? 3 : -3)));
    ctx.beginPath();ctx.moveTo(-size, -size * .4);ctx.lineTo(size, 0);ctx.lineTo(0, size);ctx.closePath();
    ctx.fill();ctx.stroke();ctx.restore();
    if (progress < .18 && !reduced) {
      ctx.beginPath();ctx.moveTo(x, y);ctx.lineTo(x + Math.cos(angle) * rx, y + Math.sin(angle) * ry);ctx.stroke();
    }
  }
  ctx.restore();
}
