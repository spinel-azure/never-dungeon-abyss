// Presentation only. Draw after the original sprite; never recolor its pixels.
export function drawSpecialBossSparkles(ctx, bossId, timeMs, {x=0,y=0,width=600,height=600,reducedMotion=false}={}) {
 if(bossId!=='karte_boss_maikaefer_koenig'||!Number.isFinite(timeMs)||width<=0||height<=0)return;
 const t=reducedMotion?0:timeMs/1000;
 ctx.save();
 try {
  ctx.globalCompositeOperation='source-over';
  for(let i=0;i<18;i++) {
   const phase=i*2.399963, pulse=.5+.5*Math.sin(t*(1.2+(i%3)*.22)+phase);
   const alpha=reducedMotion?.38:Math.pow(pulse,3)*.85;
   const px=x+width*(.15+((i*37)%71)/100);
   const py=y+height*(.12+((i*29)%73)/100);
   const radius=Math.min(width,height)*(.004+.008*pulse);
   ctx.globalAlpha=alpha;
   const glow=ctx.createRadialGradient(px,py,0,px,py,radius*3);
   glow.addColorStop(0,'rgba(255,232,135,.85)');glow.addColorStop(1,'rgba(255,184,36,0)');
   ctx.fillStyle=glow;ctx.fillRect(px-radius*3,py-radius*3,radius*6,radius*6);
   ctx.fillStyle='#ffe79b';ctx.beginPath();
   ctx.moveTo(px,py-radius);ctx.lineTo(px+radius*.23,py-radius*.23);
   ctx.lineTo(px+radius,py);ctx.lineTo(px+radius*.23,py+radius*.23);
   ctx.lineTo(px,py+radius);ctx.lineTo(px-radius*.23,py+radius*.23);
   ctx.lineTo(px-radius,py);ctx.lineTo(px-radius*.23,py-radius*.23);ctx.closePath();ctx.fill();
   ctx.fillStyle='#fff9df';ctx.fillRect(px-1,py-1,2,2);
  }
 } finally {ctx.restore();}
}
