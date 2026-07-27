const COLORS = Object.freeze({
  backgroundTop: "#173044",
  backgroundBottom: "#06111d",
  line: "#dff5ff",
  muted: "#8aa8b8",
  glow: "rgba(150,225,255,.55)"
});

export function drawCardCanvas(canvas, card) {
  const context = canvas?.getContext("2d");
  if (!context || !card) return;
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  drawFrame(context, width, height);
  drawHeader(context, card, width, height);
  drawIcon(context, card.iconId, width / 2, height * .48, Math.min(width, height) * .23);
  drawFooter(context, card, width, height);
}

function drawFrame(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, COLORS.backgroundTop);
  gradient.addColorStop(1, COLORS.backgroundBottom);
  roundedRect(context, 3, 3, width - 6, height - 6, 12);
  context.fillStyle = gradient;
  context.fill();
  context.save();
  context.shadowColor = COLORS.glow;
  context.shadowBlur = 9;
  context.strokeStyle = COLORS.line;
  context.lineWidth = 3;
  context.stroke();
  context.restore();
  roundedRect(context, 8, 8, width - 16, height - 16, 9);
  context.strokeStyle = COLORS.muted;
  context.lineWidth = 1;
  context.stroke();
  context.strokeStyle = "rgba(160,210,235,.18)";
  context.lineWidth = 1;
  [0.27, 0.34, 0.41].forEach(scale => {
    context.beginPath();
    context.arc(width / 2, height * .48, width * scale, 0, Math.PI * 2);
    context.stroke();
  });
}

function drawHeader(context, card, width, height) {
  context.fillStyle = COLORS.line;
  context.strokeStyle = COLORS.line;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `bold ${Math.max(12, width * .095)}px "PixelFont", monospace`;
  context.fillText(card.rarity, width * .14, height * .105);
  context.font = `${Math.max(9, width * .06)}px "GameFont", sans-serif`;
  context.fillText(card.rarity === "C" ? "Common" : card.rarity, width / 2, height * .105);
  context.beginPath();
  context.arc(width * .86, height * .105, width * .09, 0, Math.PI * 2);
  context.strokeStyle = COLORS.line;
  context.lineWidth = 2;
  context.stroke();
  context.font = `bold ${Math.max(12, width * .09)}px "PixelFont", monospace`;
  context.fillText(String(card.cost), width * .86, height * .105);
}

function drawFooter(context, card, width, height) {
  context.strokeStyle = COLORS.line;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(width * .12, height * .78);
  context.lineTo(width * .88, height * .78);
  context.stroke();
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${Math.max(10, width * .075)}px "GameFont", sans-serif`;
  context.fillText(card.nameJa, width / 2, height * .86, width * .82);
  context.font = `${Math.max(9, width * .065)}px "PixelFont", monospace`;
  context.fillText(card.concept, width / 2, height * .925, width * .82);
}

function drawIcon(context, iconId, centerX, centerY, size) {
  context.save();
  context.translate(centerX, centerY);
  context.strokeStyle = COLORS.line;
  context.fillStyle = "rgba(210,235,248,.2)";
  context.lineWidth = Math.max(2, size * .06);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = COLORS.glow;
  context.shadowBlur = 8;
  if (iconId === "knowledge") drawBook(context, size);
  else if (iconId === "luck") drawClover(context, size);
  else drawStrength(context, size);
  context.restore();
}

function drawStrength(context, size) {
  context.beginPath();
  context.moveTo(-size * .72, size * .52);
  context.bezierCurveTo(-size * .62, size * .12, -size * .45, -size * .2, -size * .2, -size * .18);
  context.bezierCurveTo(-size * .05, -size * .65, size * .36, -size * .55, size * .45, -size * .28);
  context.bezierCurveTo(size * .55, -size * .02, size * .28, size * .08, size * .12, 0);
  context.bezierCurveTo(size * .75, size * .05, size * .88, size * .62, size * .48, size * .72);
  context.bezierCurveTo(size * .05, size * .82, -size * .35, size * .65, -size * .72, size * .52);
  context.closePath();
  context.fill();
  context.stroke();
}

function drawBook(context, size) {
  context.beginPath();
  context.moveTo(0, size * .62);
  context.quadraticCurveTo(-size * .35, size * .35, -size * .78, size * .5);
  context.lineTo(-size * .7, -size * .55);
  context.quadraticCurveTo(-size * .32, -size * .65, 0, -size * .35);
  context.quadraticCurveTo(size * .32, -size * .65, size * .7, -size * .55);
  context.lineTo(size * .78, size * .5);
  context.quadraticCurveTo(size * .35, size * .35, 0, size * .62);
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(0, -size * .35);
  context.lineTo(0, size * .62);
  context.stroke();
  [-.38, -.16, .06, .28].forEach(y => {
    context.beginPath();
    context.moveTo(-size * .56, size * y);
    context.quadraticCurveTo(-size * .28, size * (y - .08), -size * .08, size * (y + .04));
    context.moveTo(size * .56, size * y);
    context.quadraticCurveTo(size * .28, size * (y - .08), size * .08, size * (y + .04));
    context.stroke();
  });
}

function drawClover(context, size) {
  for (let index = 0; index < 4; index += 1) {
    context.save();
    context.rotate(index * Math.PI / 2);
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(-size * .55, -size * .08, -size * .6, -size * .62, -size * .2, -size * .66);
    context.bezierCurveTo(size * .18, -size * .7, size * .4, -size * .3, 0, 0);
    context.fill();
    context.stroke();
    context.restore();
  }
  context.beginPath();
  context.moveTo(0, size * .1);
  context.quadraticCurveTo(size * .12, size * .62, size * .38, size * .82);
  context.stroke();
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}
