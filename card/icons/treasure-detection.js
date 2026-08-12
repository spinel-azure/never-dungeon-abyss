export function drawTreasureDetectionIcon(context, centerX, centerY, size, options = {}) {
  context.save();
  context.translate(centerX, centerY);
  context.scale(size / 360, size / 360);
  context.lineJoin = "round";
  context.strokeStyle = "#eef9ff";
  context.fillStyle = "#7895aa";
  context.lineWidth = 10;
  context.shadowColor = "rgba(137,211,255,.72)";
  context.shadowBlur = options.glow === false ? 0 : 18;
  context.beginPath();
  context.moveTo(-125, -25);
  context.quadraticCurveTo(-115, -110, 0, -110);
  context.quadraticCurveTo(115, -110, 125, -25);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillRect(-130, -20, 260, 130);
  context.strokeRect(-130, -20, 260, 130);
  context.fillStyle = "#142536";
  context.fillRect(-24, -20, 48, 70);
  context.strokeRect(-24, -20, 48, 70);
  context.restore();
}
