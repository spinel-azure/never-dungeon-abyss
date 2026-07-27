import { CARD_DISPLAY_MODES } from "../card/card-display.js?v=20260727-1";
import { drawCard } from "../card/renderers/card-renderer.js?v=20260727-1";

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
