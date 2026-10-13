function drawBeetle(context, centerX, centerY, size, palette, king = false, options = {}) {
  const scale = size / 360;
  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = palette.outline;
  context.lineWidth = 7;
  context.shadowColor = palette.glow;
  context.shadowBlur = options.glow === false ? 0 : 16;

  const shell = context.createLinearGradient(-100, -120, 100, 125);
  shell.addColorStop(0, palette.light);
  shell.addColorStop(.42, palette.middle);
  shell.addColorStop(1, palette.dark);
  context.fillStyle = shell;

  // Abdomen and divided wing cases.
  context.beginPath();
  context.ellipse(0, 48, king ? 93 : 80, king ? 118 : 108, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(0, -55);
  context.lineTo(0, 157);
  context.stroke();

  // Thorax and head.
  context.shadowBlur = options.glow === false ? 0 : 12;
  context.beginPath();
  context.ellipse(0, -54, king ? 69 : 58, king ? 58 : 50, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.ellipse(0, -112, king ? 48 : 39, king ? 38 : 32, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Six legs.
  context.shadowBlur = 0;
  context.lineWidth = king ? 10 : 8;
  for (const side of [-1, 1]) {
    for (const [y, outY] of [[-45, -78], [22, 17], [88, 116]]) {
      context.beginPath();
      context.moveTo(side * 54, y);
      context.lineTo(side * (king ? 105 : 92), outY);
      context.lineTo(side * (king ? 132 : 116), outY + (y < 0 ? -20 : 19));
      context.stroke();
    }
  }

  // Antennae; the king has large crown-like mandibles.
  context.lineWidth = king ? 11 : 7;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(side * 21, -139);
    context.quadraticCurveTo(side * (king ? 56 : 43), -170, side * (king ? 91 : 67), -158);
    context.stroke();
    if (king) {
      context.beginPath();
      context.moveTo(side * 23, -126);
      context.quadraticCurveTo(side * 70, -111, side * 88, -145);
      context.stroke();
    }
  }

  // Highlights preserve readability at deck size.
  context.strokeStyle = palette.highlight;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(-28, 33, 35, Math.PI * 1.08, Math.PI * 1.72);
  context.stroke();
  if (king) {
    context.beginPath();
    context.moveTo(-48, -70);
    context.lineTo(0, -91);
    context.lineTo(48, -70);
    context.stroke();
  }
  context.restore();
}

const SILVER = Object.freeze({
  light: "#ffffff", middle: "#aebcca", dark: "#344454",
  outline: "#e7f7ff", highlight: "rgba(255,255,255,.9)", glow: "rgba(170,225,255,.7)"
});
const GOLD = Object.freeze({
  light: "#fff4a8", middle: "#dfa927", dark: "#6d3b08",
  outline: "#fff0a0", highlight: "rgba(255,255,215,.95)", glow: "rgba(255,190,35,.85)"
});

export function drawSilverBeetleIcon(context, centerX, centerY, size, options = {}) {
  drawBeetle(context, centerX, centerY, size, SILVER, false, options);
}

export function drawBeetleKingIcon(context, centerX, centerY, size, options = {}) {
  drawBeetle(context, centerX, centerY, size, GOLD, true, options);
}
