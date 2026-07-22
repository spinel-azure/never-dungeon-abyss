const DEFAULT_THEME = Object.freeze({
  light: "#ffffff",
  silver: "#aeb5bd",
  steel: "#555d66",
  dark: "#242a31",
  outline: "#f8fbff",
  glow: "rgba(235, 247, 255, 0.74)",
});

function shieldPath(context, inset = 0) {
  const top = -122 + inset;
  const side = 112 - inset;
  const shoulder = -88 + inset;
  const bottom = 132 - inset;
  context.beginPath();
  context.moveTo(0, top);
  context.bezierCurveTo(-31, -99 + inset, -69, -82 + inset, -side, shoulder);
  context.lineTo(-side, -11);
  context.bezierCurveTo(-side + 5, 54, -72, 99, 0, bottom);
  context.bezierCurveTo(72, 99, side - 5, 54, side, -11);
  context.lineTo(side, shoulder);
  context.bezierCurveTo(69, -82 + inset, 31, -99 + inset, 0, top);
  context.closePath();
}

export function drawQuarteredShieldIcon(context, centerX, centerY, size, options = {}) {
  const theme = { ...DEFAULT_THEME, ...options.theme };
  const scale = size / 360;

  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineJoin = "round";
  context.shadowColor = theme.glow;
  context.shadowBlur = options.glow === false ? 0 : 16;

  shieldPath(context);
  context.save();
  context.clip();
  context.fillStyle = theme.silver;
  context.fillRect(-130, -135, 260, 280);

  const leftTop = context.createLinearGradient(-110, -120, 0, 0);
  leftTop.addColorStop(0, theme.light);
  leftTop.addColorStop(1, theme.silver);
  context.fillStyle = leftTop;
  context.fillRect(-130, -135, 130, 135);

  const rightTop = context.createLinearGradient(0, -120, 110, 0);
  rightTop.addColorStop(0, theme.steel);
  rightTop.addColorStop(1, theme.dark);
  context.fillStyle = rightTop;
  context.fillRect(0, -135, 130, 135);

  const leftBottom = context.createLinearGradient(-110, 0, 0, 135);
  leftBottom.addColorStop(0, theme.dark);
  leftBottom.addColorStop(1, theme.steel);
  context.fillStyle = leftBottom;
  context.fillRect(-130, 0, 130, 145);

  const rightBottom = context.createLinearGradient(0, 0, 110, 135);
  rightBottom.addColorStop(0, theme.silver);
  rightBottom.addColorStop(1, theme.light);
  context.fillStyle = rightBottom;
  context.fillRect(0, 0, 130, 145);

  context.strokeStyle = "rgba(255, 255, 255, 0.72)";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(0, -115);
  context.lineTo(0, 124);
  context.moveTo(-108, 0);
  context.lineTo(108, 0);
  context.stroke();
  context.restore();

  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  shieldPath(context);
  context.fill();
  context.strokeStyle = theme.outline;
  context.lineWidth = 8;
  context.stroke();

  context.shadowBlur = 0;
  context.strokeStyle = "rgba(42, 47, 54, 0.9)";
  context.lineWidth = 4;
  shieldPath(context, 15);
  context.stroke();

  context.strokeStyle = "rgba(255, 255, 255, 0.68)";
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(-82, -70);
  context.bezierCurveTo(-54, -67, -27, -82, 0, -98);
  context.stroke();
  context.restore();
}
