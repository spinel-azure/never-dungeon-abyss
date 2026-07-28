function traceHeart(context) {
  context.beginPath();
  context.moveTo(0, 39);
  context.bezierCurveTo(-12, 27, -42, 5, -42, -22);
  context.bezierCurveTo(-42, -48, -10, -54, 0, -32);
  context.bezierCurveTo(10, -54, 42, -48, 42, -22);
  context.bezierCurveTo(42, 5, 12, 27, 0, 39);
  context.closePath();
}

export function drawHealthPulseIcon(context, centerX, centerY, size, options = {}) {
  const scale = size / 120;
  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#edfaff";
  context.shadowColor = "#7eeaff";
  context.shadowBlur = options.glow === false ? 0 : 9;

  traceHeart(context);
  context.lineWidth = 4;
  context.stroke();

  context.lineWidth = 3.5;
  context.beginPath();
  context.moveTo(-45, 1);
  context.lineTo(-25, 1);
  context.lineTo(-17, -9);
  context.lineTo(-7, 17);
  context.lineTo(5, -20);
  context.lineTo(15, 1);
  context.lineTo(45, 1);
  context.stroke();
  context.restore();
}
