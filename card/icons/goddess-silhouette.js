const DEFAULT_THEME = Object.freeze({
  light: "#fff8cf",
  middle: "#e7c86c",
  dark: "#513a68",
  outline: "#fff4b0",
  glow: "rgba(255,225,132,.72)"
});

export function drawGoddessSilhouetteIcon(context, centerX, centerY, size, options = {}) {
  const theme = { ...DEFAULT_THEME, ...options.theme };
  context.save();
  context.translate(centerX, centerY);
  context.scale(size / 360, size / 360);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = theme.glow;
  context.shadowBlur = options.glow === false ? 0 : 18;

  const halo = context.createLinearGradient(-70, -145, 70, -105);
  halo.addColorStop(0, theme.middle);
  halo.addColorStop(.5, theme.light);
  halo.addColorStop(1, theme.middle);
  context.strokeStyle = halo;
  context.lineWidth = 12;
  context.beginPath();
  context.ellipse(0, -118, 70, 22, 0, 0, Math.PI * 2);
  context.stroke();

  const silhouette = context.createLinearGradient(0, -95, 0, 155);
  silhouette.addColorStop(0, theme.light);
  silhouette.addColorStop(.42, theme.middle);
  silhouette.addColorStop(1, theme.dark);
  context.fillStyle = silhouette;
  context.strokeStyle = theme.outline;
  context.lineWidth = 6;

  context.beginPath();
  context.arc(0, -72, 35, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(-22, -43);
  context.bezierCurveTo(-74, -13, -95, 67, -112, 145);
  context.quadraticCurveTo(-48, 121, 0, 151);
  context.quadraticCurveTo(48, 121, 112, 145);
  context.bezierCurveTo(95, 67, 74, -13, 22, -43);
  context.closePath();
  context.fill();
  context.stroke();

  context.globalAlpha = .84;
  for (const direction of [-1, 1]) {
    context.save();
    context.scale(direction, 1);
    context.beginPath();
    context.moveTo(29, -31);
    context.bezierCurveTo(96, -41, 153, 3, 145, 70);
    context.bezierCurveTo(112, 45, 82, 36, 51, 49);
    context.bezierCurveTo(84, 65, 102, 91, 106, 119);
    context.bezierCurveTo(58, 90, 35, 37, 29, -31);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
  context.restore();
}
