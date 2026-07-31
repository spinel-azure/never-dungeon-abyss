const DEFAULT_THEME = Object.freeze({
  light: "#eef9ff",
  middle: "#7895aa",
  dark: "#142536",
  outline: "#def5ff",
  glow: "rgba(137,211,255,.62)",
});

export function drawAlertnessIcon(context, centerX, centerY, size, options = {}) {
  const theme = { ...DEFAULT_THEME, ...options.theme };
  context.save();
  context.translate(centerX, centerY);
  context.scale(size / 360, size / 360);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = theme.outline;
  context.lineWidth = 8;
  context.shadowColor = theme.glow;
  context.shadowBlur = options.glow === false ? 0 : 16;

  context.beginPath();
  context.moveTo(-142, 0);
  context.bezierCurveTo(-82, -82, 82, -82, 142, 0);
  context.bezierCurveTo(82, 82, -82, 82, -142, 0);
  context.closePath();
  const eyeFill = context.createLinearGradient(-90, -60, 90, 70);
  eyeFill.addColorStop(0, theme.light);
  eyeFill.addColorStop(.55, theme.middle);
  eyeFill.addColorStop(1, theme.dark);
  context.fillStyle = eyeFill;
  context.fill();
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = theme.dark;
  context.beginPath();
  context.arc(0, 0, 48, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = theme.light;
  context.beginPath();
  context.arc(-15, -17, 13, 0, Math.PI * 2);
  context.fill();

  context.lineWidth = 7;
  [
    [-112, -82, -140, -120],
    [0, -92, 0, -143],
    [112, -82, 140, -120],
    [-112, 82, -140, 120],
    [0, 92, 0, 143],
    [112, 82, 140, 120],
  ].forEach(([x1, y1, x2, y2]) => {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  });
  context.restore();
}
