export function drawDexterityIcon(context, centerX, centerY, size) {
  const scale = size / 100;
  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#edfaff";
  context.fillStyle = "rgba(129, 205, 231, 0.22)";
  context.lineWidth = 4;
  context.shadowColor = "#8fe8ff";
  context.shadowBlur = 10;

  context.beginPath();
  context.arc(0, 0, 34, 0, Math.PI * 2);
  context.arc(0, 0, 18, 0, Math.PI * 2);
  context.fill("evenodd");
  context.stroke();

  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(-46, 0);
  context.lineTo(-24, 0);
  context.moveTo(24, 0);
  context.lineTo(46, 0);
  context.moveTo(0, -46);
  context.lineTo(0, -24);
  context.moveTo(0, 24);
  context.lineTo(0, 46);
  context.stroke();

  context.fillStyle = "#f5fcff";
  context.beginPath();
  context.arc(0, 0, 6, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
