const DEFAULT_TORCH_THEME = Object.freeze({
  paleGold: "#ffe59a",
  gold: "#e9ad2e",
  brightGold: "#ffd85a",
  whiteHot: "#fffde8",
  creamOutline: "#fff3bf",
  deepGold: "#7b4d12",
  glow: "rgba(255, 190, 49, 0.68)",
});

function applyFlameStyle(context, fillStyle, theme, glowStrength = 12) {
  context.fillStyle = fillStyle;
  context.strokeStyle = theme.creamOutline;
  context.lineWidth = 2.6;
  context.shadowColor = theme.glow;
  context.shadowBlur = glowStrength;
}

function drawOuterFlame(context, theme) {
  const fill = context.createLinearGradient(-22, -168, 22, 32);
  fill.addColorStop(0, theme.whiteHot);
  fill.addColorStop(0.42, theme.paleGold);
  fill.addColorStop(1, theme.gold);
  applyFlameStyle(context, fill, theme, 16);

  context.beginPath();
  context.moveTo(8, 30);
  context.bezierCurveTo(-46, 26, -74, -18, -45, -70);
  context.bezierCurveTo(-46, -43, -28, -31, -26, -64);
  context.bezierCurveTo(-24, -107, 18, -118, 5, -165);
  context.bezierCurveTo(47, -133, 23, -99, 45, -72);
  context.bezierCurveTo(77, -33, 64, 12, 27, 31);
  context.bezierCurveTo(46, 0, 32, -27, 13, -46);
  context.bezierCurveTo(25, -13, -7, -5, 8, 30);
  context.closePath();
  context.fill();
  context.stroke();
}

function drawMiddleFlame(context, theme) {
  const fill = context.createLinearGradient(4, -118, -8, 29);
  fill.addColorStop(0, theme.paleGold);
  fill.addColorStop(0.55, theme.brightGold);
  fill.addColorStop(1, "#fff19a");
  applyFlameStyle(context, fill, theme, 10);

  context.beginPath();
  context.moveTo(-20, 25);
  context.bezierCurveTo(-40, 1, -17, -28, -4, -48);
  context.bezierCurveTo(12, -76, 3, -96, -10, -112);
  context.bezierCurveTo(31, -91, 51, -57, 31, -33);
  context.bezierCurveTo(16, -16, 25, 3, 40, 11);
  context.bezierCurveTo(20, 30, -1, 35, -20, 25);
  context.closePath();
  context.fill();
  context.stroke();
}

function drawInnerFlame(context, theme) {
  const fill = context.createLinearGradient(0, -34, 0, 21);
  fill.addColorStop(0, theme.whiteHot);
  fill.addColorStop(1, "#fff7b8");
  applyFlameStyle(context, fill, theme, 8);

  context.beginPath();
  context.moveTo(2, 19);
  context.bezierCurveTo(-15, 8, -12, -12, 3, -34);
  context.bezierCurveTo(18, -16, 21, 7, 2, 19);
  context.closePath();
  context.fill();
  context.stroke();
}

function drawBrazier(context, theme) {
  context.save();
  context.shadowColor = theme.glow;
  context.shadowBlur = 9;
  context.fillStyle = theme.brightGold;
  context.strokeStyle = theme.creamOutline;
  context.lineWidth = 2.2;

  context.beginPath();
  context.moveTo(-54, 31);
  context.lineTo(54, 31);
  context.lineTo(46, 42);
  context.lineTo(-46, 42);
  context.closePath();
  context.fill();
  context.stroke();

  const bowl = context.createLinearGradient(0, 42, 0, 72);
  bowl.addColorStop(0, theme.paleGold);
  bowl.addColorStop(1, theme.gold);
  context.fillStyle = bowl;
  context.beginPath();
  context.moveTo(-43, 45);
  context.bezierCurveTo(-35, 70, 35, 70, 43, 45);
  context.lineTo(-43, 45);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = theme.deepGold;
  context.strokeStyle = theme.creamOutline;
  context.fillRect(-33, 71, 66, 12);
  context.strokeRect(-33, 71, 66, 12);

  context.fillStyle = theme.brightGold;
  for (const x of [-20, 0, 20]) {
    context.save();
    context.translate(x, 77);
    context.rotate(Math.PI / 4);
    context.fillRect(-3.5, -3.5, 7, 7);
    context.restore();
  }
  context.restore();
}

function drawDecorativeCollar(context, theme) {
  context.save();
  context.strokeStyle = theme.creamOutline;
  context.fillStyle = theme.gold;
  context.lineWidth = 2.2;
  context.shadowColor = theme.glow;
  context.shadowBlur = 7;

  context.fillRect(-25, 86, 50, 10);
  context.strokeRect(-25, 86, 50, 10);

  context.beginPath();
  context.moveTo(-22, 99);
  context.bezierCurveTo(-20, 87, -8, 91, -5, 103);
  context.bezierCurveTo(-2, 91, 10, 91, 14, 102);
  context.bezierCurveTo(17, 91, 27, 91, 25, 103);
  context.stroke();

  context.fillStyle = theme.brightGold;
  context.beginPath();
  context.arc(0, 92, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHandle(context, theme) {
  context.save();
  const handleFill = context.createLinearGradient(-15, 103, 15, 174);
  handleFill.addColorStop(0, theme.paleGold);
  handleFill.addColorStop(0.5, theme.deepGold);
  handleFill.addColorStop(1, theme.gold);
  context.fillStyle = handleFill;
  context.strokeStyle = theme.creamOutline;
  context.lineWidth = 3;
  context.shadowColor = theme.glow;
  context.shadowBlur = 7;

  context.beginPath();
  context.moveTo(-15, 103);
  context.lineTo(15, 103);
  context.lineTo(11, 157);
  context.lineTo(0, 181);
  context.lineTo(-11, 157);
  context.closePath();
  context.fill();
  context.stroke();

  context.strokeStyle = theme.creamOutline;
  context.lineWidth = 1.8;
  context.beginPath();
  context.moveTo(-7, 109);
  context.lineTo(-5, 153);
  context.moveTo(7, 109);
  context.lineTo(5, 153);
  context.stroke();

  context.fillStyle = theme.brightGold;
  context.strokeStyle = theme.creamOutline;
  context.lineWidth = 1.5;
  for (const [x, y] of [[-11, 132], [11, 132], [0, 150]]) {
    context.save();
    context.translate(x, y);
    context.rotate(Math.PI / 4);
    context.fillRect(-4, -4, 8, 8);
    context.strokeRect(-4, -4, 8, 8);
    context.restore();
  }
  context.restore();
}

function drawTorchSpark(context, x, y, radius, theme) {
  context.save();
  context.translate(x, y);
  context.fillStyle = theme.whiteHot;
  context.shadowColor = theme.glow;
  context.shadowBlur = 9;
  context.beginPath();
  context.moveTo(0, -radius);
  context.lineTo(radius * 0.25, -radius * 0.25);
  context.lineTo(radius, 0);
  context.lineTo(radius * 0.25, radius * 0.25);
  context.lineTo(0, radius);
  context.lineTo(-radius * 0.25, radius * 0.25);
  context.lineTo(-radius, 0);
  context.lineTo(-radius * 0.25, -radius * 0.25);
  context.closePath();
  context.fill();
  context.restore();
}

export function drawTorchIcon(context, centerX, centerY, size, options = {}) {
  const theme = {
    ...DEFAULT_TORCH_THEME,
    ...options.theme,
    glow: options.glow === false
      ? "rgba(0, 0, 0, 0)"
      : (options.theme?.glow ?? DEFAULT_TORCH_THEME.glow),
  };
  const scale = size / 360;

  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  drawOuterFlame(context, theme);
  drawMiddleFlame(context, theme);
  drawInnerFlame(context, theme);
  drawBrazier(context, theme);
  drawDecorativeCollar(context, theme);
  drawHandle(context, theme);
  drawTorchSpark(context, -67, -69, 10, theme);
  drawTorchSpark(context, 64, -94, 8, theme);
  drawTorchSpark(context, 72, -29, 5, theme);
  context.restore();
}
