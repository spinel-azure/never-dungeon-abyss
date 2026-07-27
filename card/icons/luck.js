const DEFAULT_THEME = Object.freeze({
  light: "#eef9ff",
  middle: "#7895aa",
  dark: "#142536",
  outline: "#def5ff",
  glow: "rgba(137,211,255,.62)",
});

export function drawLuckIcon(context, centerX, centerY, size, options = {}) {
  const theme = { ...DEFAULT_THEME, ...options.theme };
  context.save();
  context.translate(centerX, centerY);
  context.scale(size / 360, size / 360);
  context.lineCap = "round";
  context.lineJoin = "round";
  const fill = context.createLinearGradient(-110, -125, 110, 125);
  fill.addColorStop(0, theme.light);
  fill.addColorStop(.45, theme.middle);
  fill.addColorStop(1, theme.dark);
  context.fillStyle = fill;
  context.strokeStyle = theme.outline;
  context.lineWidth = 7;
  context.shadowColor = theme.glow;
  context.shadowBlur = options.glow === false ? 0 : 15;
  for (let index = 0; index < 4; index += 1) {
    context.save();
    context.rotate(index * Math.PI / 2);
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(-99, -14, -108, -112, -36, -119);
    context.bezierCurveTo(32, -126, 72, -54, 0, 0);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(0, 18);
  context.quadraticCurveTo(22, 112, 70, 148);
  context.stroke();
  context.restore();
}
