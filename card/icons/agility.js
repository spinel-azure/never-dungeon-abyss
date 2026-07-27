export function drawAgilityIcon(context, centerX, centerY, size) {
  const scale = size / 100;
  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.rotate(-0.2);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#edfaff";
  context.fillStyle = "#a9d8e8";
  context.lineWidth = 4;
  context.shadowColor = "#9beaff";
  context.shadowBlur = 10;

  context.beginPath();
  context.moveTo(-34, 37);
  context.bezierCurveTo(-10, 9, -17, -25, 29, -42);
  context.bezierCurveTo(39, -20, 20, 14, -34, 37);
  context.closePath();
  context.fill();
  context.stroke();

  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(-37, 40);
  context.quadraticCurveTo(-5, 8, 28, -39);
  context.moveTo(-21, 24);
  context.lineTo(8, 15);
  context.moveTo(-12, 10);
  context.lineTo(17, 1);
  context.moveTo(-5, -5);
  context.lineTo(23, -14);
  context.stroke();
  context.restore();
}
