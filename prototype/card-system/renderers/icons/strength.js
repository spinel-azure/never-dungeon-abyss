const DEFAULT_THEME = Object.freeze({
  light: "#e9f6ff",
  middle: "#7894a8",
  dark: "#162838",
  outline: "#dff5ff",
  glow: "rgba(137, 211, 255, 0.62)",
});

export function drawStrengthIcon(context, centerX, centerY, size, options = {}) {
  const theme = { ...DEFAULT_THEME, ...options.theme };
  const scale = size / 360;
  const glow = options.glow === false ? 0 : 15;

  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";

  const fill = context.createLinearGradient(-100, -115, 105, 100);
  fill.addColorStop(0, theme.light);
  fill.addColorStop(0.38, theme.middle);
  fill.addColorStop(1, theme.dark);
  context.fillStyle = fill;
  context.strokeStyle = theme.outline;
  context.lineWidth = 7;
  context.shadowColor = theme.glow;
  context.shadowBlur = glow;

  context.beginPath();
  context.moveTo(-124, 78);
  context.bezierCurveTo(-127, 48, -115, 7, -96, -42);
  context.lineTo(-71, -99);
  context.bezierCurveTo(-64, -115, -50, -128, -34, -132);
  context.bezierCurveTo(-23, -140, -7, -137, 1, -126);
  context.bezierCurveTo(12, -134, 27, -127, 31, -115);
  context.bezierCurveTo(44, -117, 55, -106, 53, -93);
  context.bezierCurveTo(66, -87, 69, -72, 61, -62);
  context.bezierCurveTo(54, -52, 43, -49, 32, -54);
  context.bezierCurveTo(35, -43, 29, -33, 19, -30);
  context.bezierCurveTo(7, -27, -2, -35, -5, -47);
  context.lineTo(-22, -51);
  context.bezierCurveTo(-29, -34, -34, -14, -38, 4);
  context.bezierCurveTo(-42, 23, -49, 40, -58, 55);
  context.bezierCurveTo(-34, 29, -9, 5, 19, 0);
  context.bezierCurveTo(51, -7, 82, 4, 98, 29);
  context.bezierCurveTo(111, 49, 110, 74, 97, 91);
  context.bezierCurveTo(82, 111, 54, 120, 18, 120);
  context.bezierCurveTo(-36, 120, -87, 104, -124, 78);
  context.closePath();
  context.fill();
  context.stroke();

  context.shadowBlur = 0;
  context.strokeStyle = "rgba(239, 250, 255, 0.68)";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-42, 79);
  context.bezierCurveTo(-8, 97, 36, 102, 72, 73);
  context.stroke();

  context.strokeStyle = "rgba(10, 24, 36, 0.54)";
  context.lineWidth = 4.5;
  context.beginPath();
  context.moveTo(-38, -119);
  context.bezierCurveTo(-30, -108, -28, -97, -31, -87);
  context.moveTo(-9, -122);
  context.bezierCurveTo(-2, -111, 0, -100, -3, -90);
  context.moveTo(20, -111);
  context.bezierCurveTo(27, -101, 28, -91, 24, -82);
  context.moveTo(30, -55);
  context.bezierCurveTo(35, -45, 43, -41, 51, -45);
  context.moveTo(-58, 55);
  context.bezierCurveTo(-69, 68, -81, 78, -94, 87);
  context.stroke();
  context.restore();
}
