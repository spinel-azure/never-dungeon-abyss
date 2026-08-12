export function drawPersonDetectionIcon(context, centerX, centerY, size, options = {}) {
  context.save();
  context.translate(centerX, centerY);
  context.scale(size / 360, size / 360);
  context.strokeStyle = "#eef9ff";
  context.fillStyle = "#7895aa";
  context.lineWidth = 10;
  context.lineCap = "round";
  context.shadowColor = "rgba(137,211,255,.72)";
  context.shadowBlur = options.glow === false ? 0 : 18;
  context.beginPath();
  context.arc(-25, -72, 50, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(-115, 105);
  context.quadraticCurveTo(-105, 5, -25, -5);
  context.quadraticCurveTo(55, 5, 65, 105);
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(88, 45, 57, 0, Math.PI * 2);
  context.stroke();
  context.moveTo(128, 87);
  context.lineTo(165, 124);
  context.stroke();
  context.restore();
}
