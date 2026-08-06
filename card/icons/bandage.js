export function drawBandageIcon(context, centerX, centerY, size) {
  context.save(); context.translate(centerX, centerY); context.rotate(-Math.PI / 4);
  context.scale(size / 360, size / 360);
  context.fillStyle = "#e8d8bd"; context.strokeStyle = "#f8f1e5"; context.lineWidth = 9;
  context.shadowColor = "rgba(255,120,120,.55)"; context.shadowBlur = 14;
  context.beginPath(); context.roundRect(-145, -52, 290, 104, 42); context.fill(); context.stroke();
  context.shadowBlur = 0; context.fillStyle = "#c6a985"; context.fillRect(-48, -52, 96, 104);
  context.fillStyle = "#8f7058";
  for (const x of [-94, 0, 94]) for (const y of [-24, 24]) {
    context.beginPath(); context.arc(x, y, 7, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}
