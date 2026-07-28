export function drawManaCoreIcon(context, centerX, centerY, size, options = {}) {
  const scale = size / 120;
  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#edfaff";
  context.fillStyle = "rgba(125, 220, 255, 0.2)";
  context.shadowColor = "#79dfff";
  context.shadowBlur = options.glow === false ? 0 : 11;

  context.beginPath();
  context.moveTo(0, -48);
  context.bezierCurveTo(22, -22, 38, -3, 38, 18);
  context.bezierCurveTo(38, 41, 21, 53, 0, 53);
  context.bezierCurveTo(-21, 53, -38, 41, -38, 18);
  context.bezierCurveTo(-38, -3, -22, -22, 0, -48);
  context.closePath();
  context.lineWidth = 4;
  context.fill();
  context.stroke();

  context.beginPath();
  context.arc(0, 18, 15, 0, Math.PI * 2);
  context.lineWidth = 3;
  context.stroke();
  context.beginPath();
  context.moveTo(-8, 18);
  context.quadraticCurveTo(0, 7, 8, 18);
  context.quadraticCurveTo(0, 29, -8, 18);
  context.stroke();
  context.restore();
}
