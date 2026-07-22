const DEFAULT_THEME = Object.freeze({
  gold: "#e2a91d",
  bright: "#fff0a0",
  white: "#fffbe2",
  dark: "#674000",
  glow: "rgba(255, 188, 24, 0.82)",
});

function heartPath(context) {
  context.beginPath();
  context.moveTo(0, 126);
  context.bezierCurveTo(-24, 101, -121, 35, -121, -48);
  context.bezierCurveTo(-121, -94, -89, -121, -51, -121);
  context.bezierCurveTo(-24, -121, -7, -105, 0, -86);
  context.bezierCurveTo(7, -105, 24, -121, 51, -121);
  context.bezierCurveTo(89, -121, 121, -94, 121, -48);
  context.bezierCurveTo(121, 35, 24, 101, 0, 126);
  context.closePath();
}

export function drawVitalHeartIcon(context, centerX, centerY, size, options = {}) {
  const theme = { ...DEFAULT_THEME, ...options.theme };
  const scale = size / 360;

  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = theme.glow;
  context.shadowBlur = options.glow === false ? 0 : 18;

  const fill = context.createRadialGradient(-28, -52, 4, 0, 0, 150);
  fill.addColorStop(0, "rgba(255, 246, 174, 0.34)");
  fill.addColorStop(0.45, "rgba(226, 169, 29, 0.18)");
  fill.addColorStop(1, "rgba(103, 64, 0, 0.08)");
  heartPath(context);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = theme.bright;
  context.lineWidth = 10;
  context.stroke();

  context.shadowBlur = options.glow === false ? 0 : 12;
  context.strokeStyle = theme.white;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(-116, 9);
  context.lineTo(-61, 9);
  context.lineTo(-43, -13);
  context.lineTo(-20, 58);
  context.lineTo(12, -67);
  context.lineTo(39, 9);
  context.lineTo(116, 9);
  context.stroke();

  context.shadowBlur = 0;
  context.strokeStyle = theme.dark;
  context.globalAlpha = 0.55;
  context.lineWidth = 2.5;
  heartPath(context);
  context.stroke();
  context.restore();
}
