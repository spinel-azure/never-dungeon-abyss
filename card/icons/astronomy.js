export function drawAstronomyIcon(ctx, x, y, size) {
 ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);
 ctx.strokeStyle='#daceff';ctx.fillStyle='#fff3b0';ctx.lineWidth=2;
 ctx.shadowColor='#ad80ff';ctx.shadowBlur=8;
 const stars=[[-31,20],[-17,-21],[9,-8],[30,-29],[25,25]];
 ctx.beginPath();stars.forEach(([sx,sy],i)=>i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy));ctx.stroke();
 for(const [sx,sy] of stars){ctx.beginPath();ctx.moveTo(sx,sy-6);ctx.lineTo(sx+2,sy-2);ctx.lineTo(sx+6,sy);ctx.lineTo(sx+2,sy+2);ctx.lineTo(sx,sy+6);ctx.lineTo(sx-2,sy+2);ctx.lineTo(sx-6,sy);ctx.lineTo(sx-2,sy-2);ctx.closePath();ctx.fill();}
 ctx.restore();
}
