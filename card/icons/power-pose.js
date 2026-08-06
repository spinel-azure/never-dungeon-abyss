const DEFAULT_THEME = Object.freeze({
  light: "#f2fbff",
  middle: "#75a5bf",
  dark: "#142838",
  outline: "#e5f8ff",
  glow: "rgba(126, 219, 255, 0.68)"
});

export function drawPowerPoseIcon(context, centerX, centerY, size, options = {}) {
  const theme = { ...DEFAULT_THEME, ...options.theme };
  const scale = size / 360;
  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.fillStyle = theme.dark;
  context.strokeStyle = theme.outline;
  context.lineWidth = 8;
  context.shadowColor = theme.glow;
  context.shadowBlur = options.glow === false ? 0 : 17;

  context.beginPath();
  context.arc(0, -92, 29, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(-25, -60);
  context.bezierCurveTo(-52, -52, -64, -27, -62, 4);
  context.lineTo(-50, 80);
  context.lineTo(-73, 132);
  context.lineTo(-33, 132);
  context.lineTo(0, 83);
  context.lineTo(33, 132);
  context.lineTo(73, 132);
  context.lineTo(50, 80);
  context.lineTo(62, 4);
  context.bezierCurveTo(64, -27, 52, -52, 25, -60);
  context.closePath();
  context.fill();
  context.stroke();

  drawFlexedArm(context, -1, theme);
  drawFlexedArm(context, 1, theme);
  context.restore();
}

function drawFlexedArm(context, direction, theme) {
  context.save();
  context.scale(direction, 1);
  context.fillStyle = theme.dark;
  context.strokeStyle = theme.outline;
  context.beginPath();
  context.moveTo(48, -43);
  context.bezierCurveTo(77, -58, 98, -72, 107, -99);
  context.bezierCurveTo(111, -116, 105, -133, 91, -140);
  context.bezierCurveTo(80, -146, 66, -139, 64, -126);
  context.bezierCurveTo(62, -114, 71, -105, 83, -107);
  context.bezierCurveTo(72, -85, 53, -78, 34, -69);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}
