export async function playWhirlpoolWave(root, isActive = () => true) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'whirlpool-wave';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:30';
  root.append(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const started = performance.now();
  try {
    await new Promise(resolve => {
      const frame = now => {
        if (!isActive() || !root.isConnected || root.hidden) { resolve(); return; }
        const progress = Math.min(1, (now - started) / 1000);
        canvas.width = Math.max(1, root.clientWidth);
        canvas.height = Math.max(1, root.clientHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(); return; }
        drawWhirlpoolWave(ctx, canvas.width, canvas.height, progress, reduced);
        if (progress >= 1) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  } finally { canvas.remove(); }
}
export function drawWhirlpoolWave(ctx, width, height, progress, reduced = false) {
  ctx.clearRect(0,0,width,height);
  ctx.save();
  ctx.globalAlpha = Math.sin(Math.PI * progress) * (reduced ? .25 : .8);
  for (let layer=0;layer<3;layer++) {
    const travel = reduced ? .65 : progress;
    const y = height * (.3 + travel * .75 - layer * .12);
    ctx.beginPath();
    for(let i=0;i<=60;i++){
      const x=width*i/60;
      const crest=y+Math.sin(i*.3-layer+travel*5)*height*(.025+travel*.04);
      if(i===0)ctx.moveTo(x,crest);else ctx.lineTo(x,crest);
    }
    ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.closePath();
    ctx.fillStyle=['#076486','#118caf','#36b4d0'][layer];ctx.fill();
    ctx.strokeStyle='#d2faff';ctx.lineWidth=2+travel*4;ctx.stroke();
  }
  ctx.restore();
}
