export function drawUnknownIcon(context, centerX, centerY, size, options = {}) {
  const radius = size * 0.34;
  const glowEnabled = options.glow !== false;

  context.save();
  context.strokeStyle = "#fff1ad";
  context.fillStyle = "rgba(15, 18, 30, 0.86)";
  context.lineWidth = Math.max(2, size * 0.025);
  context.shadowColor = glowEnabled ? "rgba(255, 209, 73, 0.55)" : "rgba(0, 0, 0, 0)";
  context.shadowBlur = glowEnabled ? Math.min(10, size * 0.06) : 0;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = "#fff8d2";
  context.font = `${Math.round(size * 0.48)}px NdePixel, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("?", centerX, centerY + size * 0.025);
  context.restore();
}
