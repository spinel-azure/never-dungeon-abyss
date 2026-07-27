import { CARD_DISPLAY_MODES } from "../prototype/card-system/data/cards.js?v=20260717-3";
import { drawCard } from "../prototype/card-system/renderers/card-renderer.js?v=20260727-1";
import { registerIconDrawer } from "../prototype/card-system/renderers/icon-registry.js?v=20260717-4";

registerIconDrawer("knowledge", drawKnowledgeIcon);
registerIconDrawer("luck", drawLuckIcon);

export function drawCardCanvas(canvas, card) {
  const context = canvas?.getContext("2d");
  if (!context || !card) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawCard(context, {
    ...card,
    footerText: card.footerText || card.nameJa || card.name,
  }, {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    radius: Math.max(8, Math.round(canvas.width * .065)),
  }, {
    mode: CARD_DISPLAY_MODES.DECK,
    face: "front",
  });
}

function setupIcon(context, centerX, centerY, size, options) {
  const theme = {
    light: "#eef9ff",
    middle: "#7895aa",
    dark: "#142536",
    outline: "#def5ff",
    glow: "rgba(137,211,255,.62)",
    ...options.theme,
  };
  context.save();
  context.translate(centerX, centerY);
  context.scale(size / 360, size / 360);
  context.lineCap = "round";
  context.lineJoin = "round";
  const fill = context.createLinearGradient(-110, -125, 110, 125);
  fill.addColorStop(0, theme.light);
  fill.addColorStop(.45, theme.middle);
  fill.addColorStop(1, theme.dark);
  context.fillStyle = fill;
  context.strokeStyle = theme.outline;
  context.lineWidth = 7;
  context.shadowColor = theme.glow;
  context.shadowBlur = options.glow === false ? 0 : 15;
}

function drawKnowledgeIcon(context, centerX, centerY, size, options = {}) {
  setupIcon(context, centerX, centerY, size, options);
  context.beginPath();
  context.moveTo(0, 108);
  context.quadraticCurveTo(-66, 65, -142, 88);
  context.lineTo(-128, -102);
  context.quadraticCurveTo(-58, -120, 0, -64);
  context.quadraticCurveTo(58, -120, 128, -102);
  context.lineTo(142, 88);
  context.quadraticCurveTo(66, 65, 0, 108);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(0, -64);
  context.lineTo(0, 108);
  context.stroke();
  [-64, -25, 14, 53].forEach(y => {
    context.beginPath();
    context.moveTo(-108, y);
    context.quadraticCurveTo(-55, y - 15, -14, y + 8);
    context.moveTo(108, y);
    context.quadraticCurveTo(55, y - 15, 14, y + 8);
    context.stroke();
  });
  context.restore();
}

function drawLuckIcon(context, centerX, centerY, size, options = {}) {
  setupIcon(context, centerX, centerY, size, options);
  for (let index = 0; index < 4; index += 1) {
    context.save();
    context.rotate(index * Math.PI / 2);
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(-99, -14, -108, -112, -36, -119);
    context.bezierCurveTo(32, -126, 72, -54, 0, 0);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(0, 18);
  context.quadraticCurveTo(22, 112, 70, 148);
  context.stroke();
  context.restore();
}
