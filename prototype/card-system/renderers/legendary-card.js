import { CARD_DISPLAY_MODES, CARD_RARITIES } from "../data/cards.js";
import { drawCachedIcon } from "./cache/icon-cache.js";

const THEME = Object.freeze({
  gold: "#e9ae25",
  brightGold: "#ffe678",
  whiteGold: "#fff8c8",
  deepGold: "#6c430f",
  frameGlow: "rgba(255, 190, 42, 0.68)",
});

function createStars(count, seed) {
  let value = seed >>> 0;
  const random = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };

  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    radius: 0.35 + random() * 1.25,
    alpha: 0.2 + random() * 0.55,
    phase: random() * Math.PI * 2,
  }));
}

const STARS = createStars(76, 0x1e6e4d);

function roundedRectPath(context, rect, inset = 0) {
  context.beginPath();
  context.roundRect(
    rect.x + inset,
    rect.y + inset,
    rect.width - inset * 2,
    rect.height - inset * 2,
    Math.max(0, rect.radius - inset),
  );
}

function fillRadialColor(context, rect, xRatio, yRatio, radiusRatio, color) {
  const centerX = rect.x + rect.width * xRatio;
  const centerY = rect.y + rect.height * yRatio;
  const glow = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    rect.width * radiusRatio,
  );
  glow.addColorStop(0, color);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function drawRainbowLayer(context, rect) {
  const base = context.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
  base.addColorStop(0, "#341129");
  base.addColorStop(0.52, "#152334");
  base.addColorStop(1, "#100d2f");
  context.fillStyle = base;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  context.save();
  context.globalCompositeOperation = "screen";
  fillRadialColor(context, rect, 0.02, 0.02, 0.78, "rgba(229, 10, 72, 0.86)");
  fillRadialColor(context, rect, 0.5, -0.02, 0.7, "rgba(255, 145, 18, 0.9)");
  fillRadialColor(context, rect, 1.0, 0.02, 0.72, "rgba(178, 218, 31, 0.8)");
  fillRadialColor(context, rect, 1.02, 0.46, 0.72, "rgba(0, 179, 117, 0.76)");
  fillRadialColor(context, rect, 1.02, 0.96, 0.8, "rgba(10, 88, 213, 0.82)");
  fillRadialColor(context, rect, -0.03, 0.93, 0.76, "rgba(129, 24, 177, 0.82)");
  fillRadialColor(context, rect, -0.06, 0.48, 0.58, "rgba(213, 12, 126, 0.58)");
  context.restore();
}

function drawGoldenRadiance(context, rect) {
  const centerX = rect.x + rect.width * 0.5;
  const centerY = rect.y + rect.height * 0.47;
  const radiance = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    rect.width * 0.68,
  );
  radiance.addColorStop(0, "rgba(255, 249, 177, 0.88)");
  radiance.addColorStop(0.17, "rgba(255, 203, 61, 0.72)");
  radiance.addColorStop(0.42, "rgba(246, 144, 20, 0.4)");
  radiance.addColorStop(0.74, "rgba(213, 82, 15, 0.1)");
  radiance.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = radiance;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawIndigoFalloff(context, rect) {
  const falloff = context.createLinearGradient(
    rect.x,
    rect.y + rect.height * 0.48,
    rect.x,
    rect.y + rect.height,
  );
  falloff.addColorStop(0, "rgba(8, 12, 45, 0)");
  falloff.addColorStop(0.44, "rgba(8, 13, 61, 0.26)");
  falloff.addColorStop(0.76, "rgba(7, 9, 48, 0.58)");
  falloff.addColorStop(1, "rgba(3, 5, 25, 0.9)");
  context.fillStyle = falloff;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function drawLegendaryBackground(context, rect) {
  drawRainbowLayer(context, rect);
  drawGoldenRadiance(context, rect);
  drawIndigoFalloff(context, rect);
}

function drawCardArtwork(context, card, rect, time, mode) {
  context.save();
  roundedRectPath(context, rect);
  context.clip();
  drawLegendaryBackground(context, rect);
  drawStars(context, rect, time, mode);
  drawDoubleCircle(context, rect);
  context.restore();

  drawCachedIcon(
    context,
    card.iconId,
    rect.x + rect.width / 2,
    rect.y + rect.height * 0.49,
    250,
    {
      variant: "legendary",
      themeId: "legendary-gold",
      glow: true,
    },
  );
}

function drawStars(context, rect, time, mode) {
  const animated = mode === CARD_DISPLAY_MODES.GALLERY;
  for (const star of STARS) {
    const twinkle = animated
      ? 0.35 + 0.65 * ((Math.sin(time * 0.002 + star.phase) + 1) / 2)
      : 0.72;
    context.globalAlpha = star.alpha * twinkle;
    context.fillStyle = star.x > 0.58 ? "#d9fff0" : "#fff1a3";
    context.beginPath();
    context.arc(
      rect.x + 16 + star.x * (rect.width - 32),
      rect.y + 18 + star.y * (rect.height - 36),
      star.radius,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawDoubleCircle(context, rect) {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height * 0.49;
  context.save();
  context.strokeStyle = "rgba(255, 225, 111, 0.2)";
  context.lineWidth = 1.2;
  for (const radius of [104, 135]) {
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.setLineDash([2, 6]);
  context.beginPath();
  context.arc(centerX, centerY, 119, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.restore();
}

function drawRarityBadge(context, rect, rarity) {
  const x = rect.x + 24;
  const y = rect.y + 24;
  const size = 50;
  context.save();
  context.fillStyle = "rgba(9, 7, 12, 0.88)";
  context.strokeStyle = THEME.brightGold;
  context.lineWidth = 2;
  context.shadowColor = THEME.frameGlow;
  context.shadowBlur = 12;
  context.fillRect(x, y, size, size);
  context.strokeRect(x, y, size, size);
  context.shadowBlur = 0;
  context.strokeStyle = THEME.deepGold;
  context.lineWidth = 1;
  context.strokeRect(x + 6, y + 6, size - 12, size - 12);
  context.fillStyle = THEME.whiteGold;
  context.font = "36px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(rarity, x + size / 2, y + size / 2 + 1);
  context.restore();
}

function drawCostBadge(context, rect, cost) {
  const centerX = rect.x + rect.width - 49;
  const centerY = rect.y + 49;
  context.save();
  const fill = context.createRadialGradient(centerX - 5, centerY - 7, 2, centerX, centerY, 26);
  fill.addColorStop(0, "#fff0a0");
  fill.addColorStop(0.28, "#b47518");
  fill.addColorStop(1, "#130c08");
  context.fillStyle = fill;
  context.strokeStyle = THEME.brightGold;
  context.lineWidth = 2.5;
  context.shadowColor = THEME.frameGlow;
  context.shadowBlur = 12;
  context.beginPath();
  context.arc(centerX, centerY, 26, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255, 249, 197, 0.72)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(centerX, centerY, 20, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "#fffbe0";
  context.font = "30px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "#050608";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.strokeText(String(cost), centerX, centerY + 1);
  context.fillText(String(cost), centerX, centerY + 1);
  context.restore();
}

function drawLegendaryLabel(context, rect) {
  const centerX = rect.x + rect.width / 2;
  const y = rect.y + 47;
  context.save();
  context.fillStyle = THEME.whiteGold;
  context.font = "17px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = THEME.frameGlow;
  context.shadowBlur = 8;
  context.fillText(CARD_RARITIES.L.name, centerX, y);
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255, 223, 106, 0.58)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centerX - 66, y + 17);
  context.lineTo(centerX - 18, y + 17);
  context.moveTo(centerX + 18, y + 17);
  context.lineTo(centerX + 66, y + 17);
  context.stroke();
  context.translate(centerX, y + 17);
  context.rotate(Math.PI / 4);
  context.fillStyle = THEME.brightGold;
  context.fillRect(-3, -3, 6, 6);
  context.restore();
}

function drawFooter(context, rect, name) {
  const lineY = rect.y + rect.height - 84;
  const centerX = rect.x + rect.width / 2;
  context.save();
  const line = context.createLinearGradient(rect.x + 34, 0, rect.x + rect.width - 34, 0);
  line.addColorStop(0, "rgba(255, 214, 73, 0)");
  line.addColorStop(0.2, THEME.gold);
  line.addColorStop(0.5, THEME.whiteGold);
  line.addColorStop(0.8, THEME.gold);
  line.addColorStop(1, "rgba(255, 214, 73, 0)");
  context.strokeStyle = line;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(rect.x + 30, lineY);
  context.lineTo(rect.x + rect.width - 30, lineY);
  context.stroke();
  context.fillStyle = THEME.whiteGold;
  context.font = "18px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = THEME.frameGlow;
  context.shadowBlur = 7;
  context.fillText(name, centerX, lineY + 43);
  context.restore();
}

function drawGalleryHologram(context, rect, time) {
  const cycle = (time * 0.00009) % 1;
  const beamX = rect.x - 100 + cycle * (rect.width + 200);
  context.save();
  roundedRectPath(context, rect, 7);
  context.clip();
  context.globalCompositeOperation = "screen";

  context.translate(beamX, rect.y + rect.height / 2);
  context.rotate(-0.38);
  const beam = context.createLinearGradient(-60, 0, 60, 0);
  beam.addColorStop(0, "rgba(255, 255, 255, 0)");
  beam.addColorStop(0.48, "rgba(255, 245, 194, 0.13)");
  beam.addColorStop(0.52, "rgba(215, 250, 255, 0.18)");
  beam.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = beam;
  context.fillRect(-60, -rect.height, 120, rect.height * 2);
  context.restore();
}

function drawFrontFrame(context, rect) {
  context.save();
  roundedRectPath(context, rect, 1.5);
  context.strokeStyle = THEME.brightGold;
  context.lineWidth = 4;
  context.shadowColor = THEME.frameGlow;
  context.shadowBlur = 18;
  context.stroke();
  context.shadowBlur = 0;
  roundedRectPath(context, rect, 8);
  context.strokeStyle = THEME.deepGold;
  context.lineWidth = 2;
  context.stroke();
  roundedRectPath(context, rect, 13);
  context.strokeStyle = "rgba(255, 245, 174, 0.72)";
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

export function drawLegendaryCard(context, card, cardRect, options = {}) {
  const mode = options.mode ?? CARD_DISPLAY_MODES.DECK;
  const time = options.time ?? 0;
  const renderRect = { x: 0, y: 0, width: 328, height: 512, radius: 22 };

  context.save();
  context.translate(cardRect.x, cardRect.y);
  context.scale(cardRect.width / renderRect.width, cardRect.height / renderRect.height);

  drawCardArtwork(context, card, renderRect, time, mode);

  if (mode === CARD_DISPLAY_MODES.GALLERY) {
    drawGalleryHologram(context, renderRect, time);
  }

  drawRarityBadge(context, renderRect, card.rarity);
  drawLegendaryLabel(context, renderRect);
  drawCostBadge(context, renderRect, card.cost);
  drawFooter(context, renderRect, card.footerText ?? card.name);
  drawFrontFrame(context, renderRect);
  context.restore();
}
