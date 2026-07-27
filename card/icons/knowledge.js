const DEFAULT_THEME = Object.freeze({
  light: "#eef9ff",
  middle: "#7895aa",
  dark: "#142536",
  outline: "#def5ff",
  glow: "rgba(137,211,255,.62)",
});

export function drawKnowledgeIcon(context, centerX, centerY, size, options = {}) {
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
  context.beginPath();
  context.moveTo(0, 108);
  context.quadraticCurveTo(-66, 65, -142, 88);
  context.lineTo(-128, -102);
  context.quadraticCurveTo(-58, -120, 0, -64);
  context.quadraticCurveTo(58, -120, 128, -102);
  context.lineTo(142, 88);
  context.quadraticCurveTo(66, 65, 0, 108);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(0, -64);
  context.lineTo(0, 108);
  context.stroke();
  [-64, -25, 14, 53].forEach(y => {
    context.beginPath();
    context.moveTo(-108, y);
    context.quadraticCurveTo(-55, y - 15, -14, y + 8);
    context.moveTo(108, y);
    context.quadraticCurveTo(55, y - 15, 14, y + 8);
    context.stroke();
  });
  context.restore();
}
