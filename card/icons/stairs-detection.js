export function drawStairsDetectionIcon(context, centerX, centerY, size, options = {}) {
  context.save();
  context.translate(centerX, centerY);
  context.scale(size / 360, size / 360);
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = "#eef9ff";
  context.lineWidth = 12;
  context.shadowColor = "rgba(137,211,255,.72)";
  context.shadowBlur = options.glow === false ? 0 : 18;
  context.beginPath();
  context.moveTo(-125, 105);
  context.lineTo(-55, 105);
  context.lineTo(-55, 45);
  context.lineTo(15, 45);
  context.lineTo(15, -15);
  context.lineTo(85, -15);
  context.lineTo(85, -75);
  context.lineTo(135, -75);
  context.stroke();
  context.beginPath();
  context.moveTo(88, -125);
  context.lineTo(135, -75);
  context.lineTo(85, -30);
  context.stroke();
  context.restore();
}
