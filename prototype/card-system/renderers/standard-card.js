import { CARD_DISPLAY_MODES, CARD_RARITIES } from "../data/cards.js?v=20260717-3";
import { drawCachedIcon } from "./cache/icon-cache.js?v=20260717-4";

const THEMES = Object.freeze({
  C: Object.freeze({
    top: "#253544",
    middle: "#142331",
    bottom: "#09131e",
    accent: "#9fb8c8",
    bright: "#e8f6ff",
    deep: "#253746",
    glow: "rgba(137, 205, 236, 0.32)",
    particle: "#ccecff",
    effects: false,
    iconTheme: Object.freeze({
      light: "#eef9ff",
      middle: "#7895aa",
      dark: "#142536",
      outline: "#def5ff",
      glow: "rgba(137, 211, 255, 0.62)",
    }),
  }),
  R: Object.freeze({
    top: "#7e838a",
    middle: "#41464d",
    bottom: "#181c22",
    accent: "#cbd2d9",
    bright: "#ffffff",
    deep: "#454b52",
    glow: "rgba(238, 248, 255, 0.76)",
    particle: "#ffffff",
    effects: true,
    iconTheme: Object.freeze({
      light: "#ffffff",
      silver: "#b8bec5",
      steel: "#656c74",
      dark: "#292e35",
      outline: "#ffffff",
      glow: "rgba(240, 249, 255, 0.78)",
    }),
  }),
  SR: Object.freeze({
    top: "#977000",
    middle: "#553a00",
    bottom: "#1b1300",
    accent: "#e6ad17",
    bright: "#fff3a6",
    deep: "#6f4b00",
    glow: "rgba(255, 190, 20, 0.82)",
    particle: "#ffe371",
    effects: true,
    iconTheme: Object.freeze({
      gold: "#e2a91d",
      bright: "#fff0a0",
      white: "#fffbe2",
      dark: "#674000",
      glow: "rgba(255, 188, 24, 0.86)",
    }),
  }),
});

function createParticles(count, seed) {
  let value = seed >>> 0;
  const random = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    radius: 0.4 + random() * 1.15,
    alpha: 0.12 + random() * 0.42,
  }));
}

const PARTICLES = createParticles(58, 0xc4a9d17);

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

function drawBackground(context, rect, theme, rarity) {
  context.save();
  roundedRectPath(context, rect, 4);
  context.clip();

  const base = context.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
  base.addColorStop(0, theme.top);
  base.addColorStop(0.52, theme.middle);
  base.addColorStop(1, theme.bottom);
  context.fillStyle = base;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  if (rarity !== "C") {
    const metal = context.createLinearGradient(
      rect.x,
      rect.y,
      rect.x + rect.width,
      rect.y + rect.height * 0.58,
    );
    metal.addColorStop(0, "rgba(255, 255, 255, 0.19)");
    metal.addColorStop(0.28, "rgba(255, 255, 255, 0.025)");
    metal.addColorStop(0.52, "rgba(0, 0, 0, 0.14)");
    metal.addColorStop(0.74, "rgba(255, 255, 255, 0.11)");
    metal.addColorStop(1, "rgba(0, 0, 0, 0.16)");
    context.fillStyle = metal;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height * 0.49;
  context.strokeStyle = rarity === "C"
    ? "rgba(190, 225, 241, 0.09)"
    : rarity === "R"
      ? "rgba(238, 248, 255, 0.16)"
      : "rgba(255, 190, 20, 0.16)";
  context.lineWidth = 1;
  for (const radius of [82, 112, 142]) {
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  }

  for (const particle of PARTICLES) {
    context.globalAlpha = particle.alpha * (rarity === "C" ? 0.45 : 1);
    context.fillStyle = theme.particle;
    context.beginPath();
    context.arc(
      rect.x + 14 + particle.x * (rect.width - 28),
      rect.y + 16 + particle.y * (rect.height - 32),
      particle.radius,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.globalAlpha = 1;
  context.restore();
}

function drawRarityBadge(context, rect, card, theme) {
  const x = rect.x + 24;
  const y = rect.y + 24;
  const size = 50;
  context.save();
  context.fillStyle = "rgba(5, 10, 16, 0.82)";
  context.strokeStyle = theme.bright;
  context.lineWidth = 2;
  context.shadowColor = theme.glow;
  context.shadowBlur = theme.effects ? 10 : 0;
  context.fillRect(x, y, size, size);
  context.strokeRect(x, y, size, size);
  context.shadowBlur = 0;
  context.strokeStyle = theme.deep;
  context.lineWidth = 1;
  context.strokeRect(x + 6, y + 6, size - 12, size - 12);
  context.fillStyle = theme.bright;
  context.font = card.rarity === "SR" ? "27px NdePixel, monospace" : "36px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(card.rarity, x + size / 2, y + size / 2 + 1);
  context.restore();
}

function drawCostBadge(context, rect, card, theme) {
  const centerX = rect.x + rect.width - 49;
  const centerY = rect.y + 49;
  context.save();
  const fill = context.createRadialGradient(centerX - 7, centerY - 8, 2, centerX, centerY, 27);
  fill.addColorStop(0, theme.bright);
  fill.addColorStop(0.3, theme.accent);
  fill.addColorStop(1, "#090d12");
  context.fillStyle = fill;
  context.strokeStyle = theme.bright;
  context.lineWidth = 2.5;
  context.shadowColor = theme.glow;
  context.shadowBlur = theme.effects ? 12 : 0;
  context.beginPath();
  context.arc(centerX, centerY, 26, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255, 255, 255, 0.52)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(centerX, centerY, 20, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = theme.bright;
  context.font = "30px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "#050608";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.strokeText(String(card.cost), centerX, centerY + 1);
  context.fillText(String(card.cost), centerX, centerY + 1);
  context.restore();
}

function drawHeaderLabel(context, rect, card, theme) {
  const centerX = rect.x + rect.width / 2;
  const y = rect.y + 47;
  const label = CARD_RARITIES[card.rarity]?.name ?? card.rarity;
  context.save();
  context.fillStyle = theme.bright;
  context.font = card.rarity === "SR" ? "15px NdePixel, monospace" : "17px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = theme.glow;
  context.shadowBlur = theme.effects ? 7 : 0;
  context.fillText(label, centerX, y);
  context.shadowBlur = 0;
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.62;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centerX - 67, y + 17);
  context.lineTo(centerX - 18, y + 17);
  context.moveTo(centerX + 18, y + 17);
  context.lineTo(centerX + 67, y + 17);
  context.stroke();
  context.globalAlpha = 1;
  context.translate(centerX, y + 17);
  context.rotate(Math.PI / 4);
  context.fillStyle = theme.bright;
  context.fillRect(-3, -3, 6, 6);
  context.restore();
}

function drawFooter(context, rect, card, theme) {
  const lineY = rect.y + rect.height - 84;
  const centerX = rect.x + rect.width / 2;
  context.save();
  const line = context.createLinearGradient(rect.x + 30, 0, rect.x + rect.width - 30, 0);
  line.addColorStop(0, "rgba(255, 255, 255, 0)");
  line.addColorStop(0.2, theme.accent);
  line.addColorStop(0.5, theme.bright);
  line.addColorStop(0.8, theme.accent);
  line.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.strokeStyle = line;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(rect.x + 30, lineY);
  context.lineTo(rect.x + rect.width - 30, lineY);
  context.stroke();
  context.fillStyle = theme.bright;
  context.font = "20px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = theme.glow;
  context.shadowBlur = theme.effects ? 7 : 0;
  context.fillText(card.footerText ?? card.name, centerX, lineY + 43, rect.width - 46);
  context.restore();
}

function drawGallerySheen(context, rect, time, pointer, theme) {
  const cycle = (time * 0.00012) % 1;
  const beamX = rect.x - 100 + cycle * (rect.width + 200);
  context.save();
  roundedRectPath(context, rect, 6);
  context.clip();
  context.globalCompositeOperation = "screen";
  context.translate(beamX, rect.y + rect.height / 2);
  context.rotate(-0.38);
  const beam = context.createLinearGradient(-70, 0, 70, 0);
  beam.addColorStop(0, "rgba(255, 255, 255, 0)");
  beam.addColorStop(0.46, "rgba(255, 255, 255, 0.08)");
  beam.addColorStop(0.52, "rgba(255, 255, 255, 0.3)");
  beam.addColorStop(0.58, "rgba(255, 255, 255, 0.08)");
  beam.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = beam;
  context.fillRect(-70, -rect.height, 140, rect.height * 2);
  context.restore();

  context.save();
  roundedRectPath(context, rect, 6);
  context.clip();
  context.globalCompositeOperation = "screen";
  const glowX = rect.x + rect.width * (pointer?.x ?? 0.5);
  const glowY = rect.y + rect.height * (pointer?.y ?? 0.45);
  const glow = context.createRadialGradient(glowX, glowY, 0, glowX, glowY, rect.width * 0.55);
  glow.addColorStop(0, theme.rarity === "SR" ? "rgba(255, 227, 113, 0.12)" : "rgba(255, 255, 255, 0.13)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawFrame(context, rect, theme) {
  context.save();
  roundedRectPath(context, rect, 1.5);
  context.strokeStyle = theme.bright;
  context.lineWidth = 4;
  context.shadowColor = theme.glow;
  context.shadowBlur = theme.effects ? 16 : 0;
  context.stroke();
  context.shadowBlur = 0;
  roundedRectPath(context, rect, 8);
  context.strokeStyle = theme.deep;
  context.lineWidth = 2;
  context.stroke();
  roundedRectPath(context, rect, 13);
  context.strokeStyle = theme.accent;
  context.globalAlpha = 0.76;
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

export function drawStandardCard(context, card, cardRect, options = {}) {
  const themeBase = THEMES[card.rarity] ?? THEMES.C;
  const theme = { ...themeBase, rarity: card.rarity };
  const renderRect = { x: 0, y: 0, width: 328, height: 512, radius: 22 };

  context.save();
  context.translate(cardRect.x, cardRect.y);
  context.scale(cardRect.width / renderRect.width, cardRect.height / renderRect.height);

  drawBackground(context, renderRect, theme, card.rarity);
  drawCachedIcon(
    context,
    card.iconId,
    renderRect.width / 2,
    renderRect.height * 0.5,
    238,
    {
      variant: card.rarity.toLowerCase(),
      themeId: `standard-${card.rarity.toLowerCase()}`,
      theme: theme.iconTheme,
      glow: theme.effects,
    },
  );

  if (theme.effects && options.mode === CARD_DISPLAY_MODES.GALLERY) {
    drawGallerySheen(context, renderRect, options.time ?? 0, options.pointer, theme);
  }

  drawRarityBadge(context, renderRect, card, theme);
  drawHeaderLabel(context, renderRect, card, theme);
  drawCostBadge(context, renderRect, card, theme);
  drawFooter(context, renderRect, card, theme);
  drawFrame(context, renderRect, theme);
  context.restore();
}
