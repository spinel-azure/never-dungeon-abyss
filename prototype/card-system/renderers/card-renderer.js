import { CARD_DISPLAY_MODES } from "../data/cards.js?v=20260717-3";
import { getCachedCard } from "./cache/card-cache.js";
import { drawCachedIcon } from "./cache/icon-cache.js";
import { drawLegendaryCard } from "./legendary-card.js?v=20260717-3";
import { drawStandardCard } from "./standard-card.js?v=20260717-4";
import { drawZodiacCard } from "./zodiac-card.js?v=20260717-3";

const rarityRenderers = new Map([
  ["C", drawStandardCard],
  ["R", drawStandardCard],
  ["SR", drawStandardCard],
  ["L", drawLegendaryCard],
  ["Z", drawZodiacCard],
]);
const warnedRarities = new Set();

export function registerCardRenderer(rarityId, renderer) {
  if (typeof rarityId !== "string" || !rarityId) {
    throw new TypeError("rarityId must be a non-empty string.");
  }
  if (typeof renderer !== "function") {
    throw new TypeError(`Card renderer for ${rarityId} must be a function.`);
  }
  rarityRenderers.set(rarityId, renderer);
}

function drawUnknownRarityCard(context, card, cardRect) {
  context.save();
  context.beginPath();
  context.roundRect(cardRect.x, cardRect.y, cardRect.width, cardRect.height, cardRect.radius ?? 12);
  context.fillStyle = "#111522";
  context.strokeStyle = "#b9c0d0";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
  drawCachedIcon(
    context,
    "unknown",
    cardRect.x + cardRect.width / 2,
    cardRect.y + cardRect.height / 2,
    Math.min(cardRect.width, cardRect.height) * 0.52,
    { variant: "unknown-rarity", glow: false },
  );
  context.fillStyle = "#eef2ff";
  context.font = `${Math.max(12, Math.round(cardRect.width * 0.06))}px NdePixel, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(card.footerText ?? card.name ?? "UNKNOWN CARD", cardRect.x + cardRect.width / 2, cardRect.y + cardRect.height * 0.88);
  context.restore();
}

function wrapTextByWidth(context, text, maximumWidth) {
  const lines = [];
  let line = "";
  for (const character of [...(text ?? "")]) {
    const candidate = line + character;
    if (line && context.measureText(candidate).width > maximumWidth) {
      lines.push(line);
      line = character;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCardDetailsOverlay(context, card, cardRect) {
  const centerX = cardRect.x + cardRect.width / 2;
  const panelX = cardRect.x + cardRect.width * 0.09;
  const panelY = cardRect.y + cardRect.height * 0.19;
  const panelWidth = cardRect.width * 0.82;
  const panelHeight = cardRect.height * 0.59;
  const nameFontSize = Math.max(13, Math.round(cardRect.width * 0.078));
  const labelFontSize = Math.max(10, Math.round(cardRect.width * 0.055));
  const effectFontSize = Math.max(9, Math.round(cardRect.width * 0.052));

  context.save();
  context.beginPath();
  context.roundRect(panelX, panelY, panelWidth, panelHeight, Math.max(7, cardRect.width * 0.035));
  context.fillStyle = "rgba(3, 6, 14, 0.94)";
  context.fill();
  context.strokeStyle = "rgba(230, 189, 84, 0.58)";
  context.lineWidth = Math.max(1, cardRect.width * 0.006);
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff8d2";
  context.shadowColor = "rgba(255, 218, 99, 0.42)";
  context.shadowBlur = Math.max(3, cardRect.width * 0.025);
  context.font = `${nameFontSize}px NdeDot, sans-serif`;
  context.fillText(card.nameJa ?? card.name, centerX, panelY + panelHeight * 0.14, panelWidth * 0.88);

  context.shadowBlur = 0;
  context.fillStyle = "#fff0a0";
  context.font = `${labelFontSize}px NdeDot, sans-serif`;
  context.fillText(`COST ${card.cost}`, centerX, panelY + panelHeight * 0.27);

  context.strokeStyle = "rgba(238, 197, 87, 0.55)";
  context.beginPath();
  context.moveTo(panelX + panelWidth * 0.12, panelY + panelHeight * 0.36);
  context.lineTo(panelX + panelWidth * 0.88, panelY + panelHeight * 0.36);
  context.stroke();

  context.fillStyle = "#a9f2ff";
  context.fillText(`【${card.concept ?? card.effect?.nameJa ?? "CARD EFFECT"}】`, centerX, panelY + panelHeight * 0.45, panelWidth * 0.9);

  context.fillStyle = "#f4f5e9";
  context.font = `${effectFontSize}px NdeDot, sans-serif`;
  const description = card.effect?.descriptionJa ?? card.descriptionJa ?? "効果情報は未登録です。";
  const effectLines = wrapTextByWidth(context, description, panelWidth * 0.84).slice(0, 5);
  const lineHeight = effectFontSize * 1.35;
  effectLines.forEach((line, index) => {
    context.fillText(line, centerX, panelY + panelHeight * 0.59 + index * lineHeight);
  });
  context.restore();
}

function drawCardUncached(context, card, cardRect, options) {
  const renderer = rarityRenderers.get(card.rarity);
  if (!renderer) {
    if (!warnedRarities.has(card.rarity)) {
      warnedRarities.add(card.rarity);
      console.warn(`No renderer is registered for rarity: ${card.rarity}. Using fallback card.`);
    }
    drawUnknownRarityCard(context, card, cardRect);
  } else {
    renderer(context, card, cardRect, options);
  }
  if (options.face === "back") drawCardDetailsOverlay(context, card, cardRect);
}

export function drawCard(context, card, cardRect, options = {}) {
  if (!context) throw new TypeError("A CanvasRenderingContext2D is required.");
  if (!card) throw new TypeError("Card data is required.");

  const mode = options.mode ?? CARD_DISPLAY_MODES.DECK;
  const shouldCacheWholeCard = mode === CARD_DISPLAY_MODES.DECK && options.cache !== false;
  if (shouldCacheWholeCard) {
    const cachedCard = getCachedCard(
      card,
      cardRect.width,
      cardRect.height,
      { ...options, mode, radius: cardRect.radius },
      drawCardUncached,
    );
    if (cachedCard) {
      context.drawImage(cachedCard, cardRect.x, cardRect.y, cardRect.width, cardRect.height);
      return;
    }
  }

  drawCardUncached(context, card, cardRect, { ...options, mode });
}
