const NORTH_ANGLE = -Math.PI / 2;

const compass = {
  canvas: null,
  ctx: null,
  state: null,
  size: 72
};

export function configureCompass({ canvas, state }) {
  compass.canvas = canvas;
  compass.ctx = canvas?.getContext("2d") || null;
  compass.state = state;
  if (canvas) {
    compass.size = canvas.width;
    canvas.setAttribute("aria-label", "\u30b3\u30f3\u30d1\u30b9");
  }
}

export function drawCompass(now = performance.now()) {
  const { canvas, ctx, state, size } = compass;
  if (!canvas || !ctx || !state) return;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * .42;
  const wobble = Math.sin(now * .012) * .045 + Math.sin(now * .027) * .018;
  const needleAngle = NORTH_ANGLE - state.angle + wobble;

  ctx.clearRect(0, 0, size, size);
  drawCase(ctx, cx, cy, r);
  drawTicks(ctx, cx, cy, r);
  drawNeedle(ctx, cx, cy, r, needleAngle);
}

function drawCase(ctx, cx, cy, r) {
  const outer = ctx.createRadialGradient(cx - r * .28, cy - r * .32, r * .08, cx, cy, r * 1.2);
  outer.addColorStop(0, "#e5decf");
  outer.addColorStop(.48, "#989185");
  outer.addColorStop(1, "#3a352d");

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.36)";
  ctx.beginPath();
  ctx.arc(cx, cy + 2, r * 1.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,236,194,.55)";
  ctx.lineWidth = Math.max(1.5, r * .06);
  ctx.beginPath();
  ctx.arc(cx, cy, r * .96, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(10,9,8,.32)";
  ctx.beginPath();
  ctx.arc(cx, cy, r * .72, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTicks(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(245,232,204,.72)";
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const major = i % 2 === 0;
    const a = i * Math.PI / 4;
    const inner = major ? r * .74 : r * .8;
    const outer = r * .88;
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNeedle(ctx, cx, cy, r, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.lineJoin = "round";
  ctx.strokeStyle = "#070707";
  ctx.lineWidth = Math.max(2, r * .08);

  ctx.fillStyle = "#e72218";
  ctx.beginPath();
  ctx.moveTo(0, -r * .82);
  ctx.lineTo(r * .2, 0);
  ctx.lineTo(0, r * .12);
  ctx.lineTo(-r * .2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f2eee4";
  ctx.beginPath();
  ctx.moveTo(0, r * .82);
  ctx.lineTo(r * .2, 0);
  ctx.lineTo(0, r * -.12);
  ctx.lineTo(-r * .2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#050505";
  ctx.beginPath();
  ctx.arc(0, 0, r * .12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2eee4";
  ctx.beginPath();
  ctx.arc(0, 0, r * .055, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
