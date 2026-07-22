const THEME = Object.freeze({
  cardTop: "#111327",
  cardBottom: "#060711",
  ink: "#fff4be",
  gold: "#e5b94c",
  brightGold: "#fff0a0",
  deepGold: "#765019",
  frameShadow: "rgba(255, 208, 85, 0.36)",
});

const EFFECTS = Object.freeze({
  rainbowOpacity: 0.11,
  beamOpacity: 0.2,
  starOpacity: 0.52,
  hologramSpeed: 0.000075,
  starTwinkleSpeed: 0.0022,
  pointerEase: 0.065,
  flashDuration: 720,
  weakGlow: 7,
  strongGlow: 18,
});

const stars = createStars(64, 0x5a17c0de);

function roundedRectPath(context, rect, inset = 0) {
  const x = rect.x + inset;
  const y = rect.y + inset;
  const width = rect.width - inset * 2;
  const height = rect.height - inset * 2;
  const radius = Math.max(0, rect.radius - inset);

  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

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
    phase: random() * Math.PI * 2,
    speed: 0.55 + random() * 1.1,
    warm: random() > 0.7,
  }));
}

function drawCardBase(context, rect) {
  context.save();
  roundedRectPath(context, rect);
  context.shadowColor = THEME.frameShadow;
  context.shadowBlur = 24;
  context.fillStyle = THEME.deepGold;
  context.fill();
  context.restore();

  context.save();
  roundedRectPath(context, rect, 5);
  const bodyGradient = context.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
  bodyGradient.addColorStop(0, THEME.cardTop);
  bodyGradient.addColorStop(0.52, "#0b0c19");
  bodyGradient.addColorStop(1, THEME.cardBottom);
  context.fillStyle = bodyGradient;
  context.fill();
  context.restore();

  drawCelestialPattern(context, rect);
}

function drawCelestialPattern(context, rect) {
  context.save();
  roundedRectPath(context, rect, 7);
  context.clip();
  context.translate(rect.x + rect.width / 2, rect.y + rect.height * 0.46);

  context.strokeStyle = "rgba(231, 194, 91, 0.1)";
  context.lineWidth = 1;
  [78, 112, 148].forEach((radius) => {
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  });

  context.rotate(-0.18);
  context.beginPath();
  context.ellipse(0, 0, 145, 48, 0, 0, Math.PI * 2);
  context.stroke();

  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const x = Math.cos(angle) * 148;
    const y = Math.sin(angle) * 148;
    context.fillStyle = i === 0 ? "rgba(255, 230, 133, 0.5)" : "rgba(255, 230, 133, 0.18)";
    context.beginPath();
    context.arc(x, y, i === 0 ? 2.1 : 1.2, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawStarField(context, rect, time) {
  context.save();
  roundedRectPath(context, rect, 7);
  context.clip();

  for (const star of stars) {
    const x = rect.x + 12 + star.x * (rect.width - 24);
    const y = rect.y + 12 + star.y * (rect.height - 24);
    const twinkle = 0.28 + 0.72 * ((Math.sin(time * EFFECTS.starTwinkleSpeed * star.speed + star.phase) + 1) / 2);
    context.globalAlpha = EFFECTS.starOpacity * twinkle;
    context.fillStyle = star.warm ? "#ffe5a2" : "#c9e9ff";
    context.beginPath();
    context.arc(x, y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawAriesSymbol(context, centerX, centerY, size, glowStrength) {
  const top = centerY - size * 0.38;
  const split = centerY - size * 0.12;
  const bottom = centerY + size * 0.42;
  const hornWidth = size * 0.44;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = THEME.brightGold;
  context.lineWidth = Math.max(4, size * 0.055);
  context.shadowColor = "rgba(255, 207, 82, 0.95)";
  context.shadowBlur = glowStrength;

  context.beginPath();
  context.moveTo(centerX, bottom);
  context.lineTo(centerX, split);
  context.bezierCurveTo(
    centerX - size * 0.02,
    top - size * 0.08,
    centerX - hornWidth,
    top - size * 0.12,
    centerX - hornWidth,
    centerY - size * 0.01,
  );
  context.bezierCurveTo(
    centerX - hornWidth,
    centerY + size * 0.14,
    centerX - size * 0.23,
    centerY + size * 0.13,
    centerX - size * 0.23,
    centerY + size * 0.02,
  );
  context.stroke();

  context.beginPath();
  context.moveTo(centerX, split);
  context.bezierCurveTo(
    centerX + size * 0.02,
    top - size * 0.08,
    centerX + hornWidth,
    top - size * 0.12,
    centerX + hornWidth,
    centerY - size * 0.01,
  );
  context.bezierCurveTo(
    centerX + hornWidth,
    centerY + size * 0.14,
    centerX + size * 0.23,
    centerY + size * 0.13,
    centerX + size * 0.23,
    centerY + size * 0.02,
  );
  context.stroke();

  context.globalAlpha = 0.55;
  context.strokeStyle = "#fffbe7";
  context.lineWidth = Math.max(1.2, size * 0.013);
  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(centerX, bottom - size * 0.05);
  context.lineTo(centerX, split);
  context.stroke();
  context.restore();
}

function setZodiacStroke(context, size, glowStrength) {
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = THEME.brightGold;
  context.lineWidth = Math.max(4, size * 0.055);
  context.shadowColor = "rgba(255, 207, 82, 0.95)";
  context.shadowBlur = glowStrength;
}

function drawTaurusSymbol(context, centerX, centerY, size, glowStrength) {
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.arc(centerX, centerY + size * 0.14, size * 0.25, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.moveTo(centerX - size * 0.42, centerY - size * 0.36);
  context.bezierCurveTo(
    centerX - size * 0.36,
    centerY - size * 0.12,
    centerX - size * 0.18,
    centerY - size * 0.15,
    centerX,
    centerY - size * 0.08,
  );
  context.bezierCurveTo(
    centerX + size * 0.18,
    centerY - size * 0.15,
    centerX + size * 0.36,
    centerY - size * 0.12,
    centerX + size * 0.42,
    centerY - size * 0.36,
  );
  context.stroke();
  context.restore();
}

function drawGeminiSymbol(context, centerX, centerY, size, glowStrength) {
  const left = centerX - size * 0.25;
  const right = centerX + size * 0.25;
  const top = centerY - size * 0.36;
  const bottom = centerY + size * 0.36;
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.moveTo(left, top + size * 0.06);
  context.lineTo(left, bottom - size * 0.06);
  context.moveTo(right, top + size * 0.06);
  context.lineTo(right, bottom - size * 0.06);
  context.stroke();

  context.beginPath();
  context.moveTo(centerX - size * 0.38, top);
  context.quadraticCurveTo(centerX, top + size * 0.13, centerX + size * 0.38, top);
  context.moveTo(centerX - size * 0.38, bottom);
  context.quadraticCurveTo(centerX, bottom - size * 0.13, centerX + size * 0.38, bottom);
  context.stroke();
  context.restore();
}

function drawCancerSymbol(context, centerX, centerY, size, glowStrength) {
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.arc(centerX - size * 0.2, centerY - size * 0.11, size * 0.095, 0, Math.PI * 2);
  context.arc(centerX + size * 0.2, centerY + size * 0.11, size * 0.095, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.moveTo(centerX - size * 0.39, centerY - size * 0.01);
  context.bezierCurveTo(
    centerX - size * 0.25,
    centerY - size * 0.35,
    centerX + size * 0.27,
    centerY - size * 0.33,
    centerX + size * 0.39,
    centerY - size * 0.1,
  );
  context.moveTo(centerX + size * 0.39, centerY + size * 0.01);
  context.bezierCurveTo(
    centerX + size * 0.25,
    centerY + size * 0.35,
    centerX - size * 0.27,
    centerY + size * 0.33,
    centerX - size * 0.39,
    centerY + size * 0.1,
  );
  context.stroke();
  context.restore();
}

function drawLeoSymbol(context, centerX, centerY, size, glowStrength) {
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.arc(centerX - size * 0.24, centerY + size * 0.15, size * 0.13, 0, Math.PI * 2);
  context.moveTo(centerX - size * 0.11, centerY + size * 0.12);
  context.bezierCurveTo(
    centerX - size * 0.05,
    centerY - size * 0.37,
    centerX + size * 0.36,
    centerY - size * 0.38,
    centerX + size * 0.24,
    centerY - size * 0.01,
  );
  context.bezierCurveTo(
    centerX + size * 0.14,
    centerY + size * 0.3,
    centerX + size * 0.32,
    centerY + size * 0.35,
    centerX + size * 0.42,
    centerY + size * 0.2,
  );
  context.stroke();
  context.restore();
}

function drawVirgoSymbol(context, centerX, centerY, size, glowStrength) {
  const left = centerX - size * 0.36;
  const top = centerY - size * 0.25;
  const base = centerY + size * 0.28;
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.moveTo(left, top);
  context.quadraticCurveTo(left + size * 0.12, top - size * 0.09, left + size * 0.12, top + size * 0.1);
  context.lineTo(left + size * 0.12, base);
  context.moveTo(left + size * 0.12, top + size * 0.02);
  context.quadraticCurveTo(left + size * 0.27, top - size * 0.11, left + size * 0.28, top + size * 0.1);
  context.lineTo(left + size * 0.28, base);
  context.moveTo(left + size * 0.28, top + size * 0.02);
  context.quadraticCurveTo(left + size * 0.44, top - size * 0.11, left + size * 0.45, top + size * 0.12);
  context.lineTo(left + size * 0.45, base - size * 0.03);
  context.stroke();

  context.beginPath();
  context.moveTo(left + size * 0.45, centerY - size * 0.01);
  context.bezierCurveTo(
    left + size * 0.74,
    centerY - size * 0.02,
    left + size * 0.75,
    centerY + size * 0.29,
    left + size * 0.51,
    centerY + size * 0.34,
  );
  context.lineTo(left + size * 0.73, centerY + size * 0.11);
  context.stroke();
  context.restore();
}

function drawLibraSymbol(context, centerX, centerY, size, glowStrength) {
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.moveTo(centerX - size * 0.4, centerY + size * 0.25);
  context.lineTo(centerX + size * 0.4, centerY + size * 0.25);
  context.moveTo(centerX - size * 0.4, centerY + size * 0.08);
  context.lineTo(centerX - size * 0.18, centerY + size * 0.08);
  context.arc(centerX, centerY + size * 0.08, size * 0.18, Math.PI, 0);
  context.lineTo(centerX + size * 0.4, centerY + size * 0.08);
  context.stroke();
  context.restore();
}

function drawScorpioSymbol(context, centerX, centerY, size, glowStrength) {
  const left = centerX - size * 0.37;
  const top = centerY - size * 0.25;
  const base = centerY + size * 0.27;
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.moveTo(left, top);
  context.quadraticCurveTo(left + size * 0.12, top - size * 0.09, left + size * 0.12, top + size * 0.1);
  context.lineTo(left + size * 0.12, base);
  context.moveTo(left + size * 0.12, top + size * 0.02);
  context.quadraticCurveTo(left + size * 0.28, top - size * 0.11, left + size * 0.29, top + size * 0.1);
  context.lineTo(left + size * 0.29, base);
  context.moveTo(left + size * 0.29, top + size * 0.02);
  context.quadraticCurveTo(left + size * 0.47, top - size * 0.11, left + size * 0.48, top + size * 0.12);
  context.lineTo(left + size * 0.48, centerY + size * 0.19);
  context.quadraticCurveTo(left + size * 0.52, base, left + size * 0.78, centerY + size * 0.05);
  context.stroke();

  context.beginPath();
  context.moveTo(left + size * 0.66, centerY + size * 0.06);
  context.lineTo(left + size * 0.78, centerY + size * 0.05);
  context.lineTo(left + size * 0.75, centerY + size * 0.17);
  context.stroke();
  context.restore();
}

function drawSagittariusSymbol(context, centerX, centerY, size, glowStrength) {
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.moveTo(centerX - size * 0.33, centerY + size * 0.34);
  context.lineTo(centerX + size * 0.34, centerY - size * 0.34);
  context.moveTo(centerX + size * 0.08, centerY - size * 0.34);
  context.lineTo(centerX + size * 0.34, centerY - size * 0.34);
  context.lineTo(centerX + size * 0.34, centerY - size * 0.08);
  context.moveTo(centerX - size * 0.2, centerY - size * 0.08);
  context.lineTo(centerX + size * 0.08, centerY + size * 0.2);
  context.stroke();
  context.restore();
}

function drawCapricornSymbol(context, centerX, centerY, size, glowStrength) {
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.moveTo(centerX - size * 0.4, centerY - size * 0.22);
  context.quadraticCurveTo(centerX - size * 0.25, centerY - size * 0.36, centerX - size * 0.19, centerY - size * 0.08);
  context.lineTo(centerX - size * 0.03, centerY + size * 0.34);
  context.lineTo(centerX + size * 0.08, centerY - size * 0.08);
  context.bezierCurveTo(
    centerX + size * 0.17,
    centerY - size * 0.38,
    centerX + size * 0.45,
    centerY - size * 0.15,
    centerX + size * 0.35,
    centerY + size * 0.12,
  );
  context.bezierCurveTo(
    centerX + size * 0.27,
    centerY + size * 0.32,
    centerX + size * 0.05,
    centerY + size * 0.28,
    centerX + size * 0.04,
    centerY + size * 0.13,
  );
  context.bezierCurveTo(
    centerX + size * 0.03,
    centerY - size * 0.03,
    centerX + size * 0.26,
    centerY - size * 0.02,
    centerX + size * 0.39,
    centerY + size * 0.27,
  );
  context.stroke();
  context.restore();
}

function drawAquariusSymbol(context, centerX, centerY, size, glowStrength) {
  context.save();
  setZodiacStroke(context, size, glowStrength);

  for (const offset of [-size * 0.14, size * 0.16]) {
    context.beginPath();
    context.moveTo(centerX - size * 0.42, centerY + offset);
    for (let i = 0; i < 4; i += 1) {
      const x = centerX - size * 0.42 + size * 0.21 * i;
      context.lineTo(x + size * 0.105, centerY + offset - size * 0.12);
      context.lineTo(x + size * 0.21, centerY + offset);
    }
    context.stroke();
  }
  context.restore();
}

function drawPiscesSymbol(context, centerX, centerY, size, glowStrength) {
  context.save();
  setZodiacStroke(context, size, glowStrength);

  context.beginPath();
  context.moveTo(centerX - size * 0.36, centerY - size * 0.36);
  context.bezierCurveTo(
    centerX - size * 0.12,
    centerY - size * 0.18,
    centerX - size * 0.12,
    centerY + size * 0.18,
    centerX - size * 0.36,
    centerY + size * 0.36,
  );
  context.moveTo(centerX + size * 0.36, centerY - size * 0.36);
  context.bezierCurveTo(
    centerX + size * 0.12,
    centerY - size * 0.18,
    centerX + size * 0.12,
    centerY + size * 0.18,
    centerX + size * 0.36,
    centerY + size * 0.36,
  );
  context.moveTo(centerX - size * 0.34, centerY);
  context.lineTo(centerX + size * 0.34, centerY);
  context.stroke();
  context.restore();
}

const zodiacDrawers = Object.freeze({
  aries: drawAriesSymbol,
  taurus: drawTaurusSymbol,
  gemini: drawGeminiSymbol,
  cancer: drawCancerSymbol,
  leo: drawLeoSymbol,
  virgo: drawVirgoSymbol,
  libra: drawLibraSymbol,
  scorpio: drawScorpioSymbol,
  sagittarius: drawSagittariusSymbol,
  capricorn: drawCapricornSymbol,
  aquarius: drawAquariusSymbol,
  pisces: drawPiscesSymbol,
});

function drawRarityBadge(context, rect, rarity) {
  const badge = { x: rect.x + 24, y: rect.y + 24, size: 50 };
  context.save();
  context.shadowColor = "rgba(255, 219, 107, 0.72)";
  context.shadowBlur = 12;
  context.fillStyle = "rgba(12, 10, 18, 0.9)";
  context.strokeStyle = THEME.brightGold;
  context.lineWidth = 2;
  context.fillRect(badge.x, badge.y, badge.size, badge.size);
  context.strokeRect(badge.x, badge.y, badge.size, badge.size);
  context.shadowBlur = 0;
  context.strokeStyle = THEME.deepGold;
  context.lineWidth = 1;
  context.strokeRect(badge.x + 5, badge.y + 5, badge.size - 10, badge.size - 10);

  context.fillStyle = THEME.brightGold;
  context.font = "36px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(rarity, badge.x + badge.size / 2, badge.y + badge.size / 2 + 1);
  context.restore();
}

function drawCostBadge(context, rect, cost) {
  const x = rect.x + rect.width - 49;
  const y = rect.y + 49;
  context.save();
  const gradient = context.createRadialGradient(x - 5, y - 7, 2, x, y, 26);
  gradient.addColorStop(0, "#fff2ab");
  gradient.addColorStop(0.18, "#d7a83d");
  gradient.addColorStop(0.56, "#684719");
  gradient.addColorStop(1, "#17111a");
  context.fillStyle = gradient;
  context.strokeStyle = THEME.brightGold;
  context.lineWidth = 2.5;
  context.shadowColor = "rgba(255, 207, 82, 0.6)";
  context.shadowBlur = 12;
  context.beginPath();
  context.arc(x, y, 26, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255, 246, 198, 0.55)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(x, y, 20, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#fff9dd";
  context.font = "30px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "#050608";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.strokeText(String(cost), x, y + 1);
  context.fillText(String(cost), x, y + 1);
  context.restore();
}

function drawSeriesLabel(context, rect) {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + 47;
  context.save();
  context.fillStyle = THEME.brightGold;
  context.strokeStyle = "rgba(229, 185, 76, 0.55)";
  context.lineWidth = 1;
  context.shadowColor = "rgba(255, 220, 112, 0.58)";
  context.shadowBlur = 9;
  context.font = "17px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Zodiac", centerX, centerY);
  context.shadowBlur = 0;

  context.beginPath();
  context.moveTo(centerX - 68, centerY + 16);
  context.lineTo(centerX - 28, centerY + 16);
  context.moveTo(centerX + 28, centerY + 16);
  context.lineTo(centerX + 68, centerY + 16);
  context.stroke();

  context.fillStyle = THEME.gold;
  context.translate(centerX, centerY + 16);
  context.rotate(Math.PI / 4);
  context.fillRect(-3, -3, 6, 6);
  context.restore();
}

function drawNamePlate(context, rect, name) {
  const lineY = rect.y + rect.height - 84;
  context.save();
  const lineGradient = context.createLinearGradient(rect.x + 34, 0, rect.x + rect.width - 34, 0);
  lineGradient.addColorStop(0, "rgba(230, 184, 71, 0)");
  lineGradient.addColorStop(0.18, THEME.deepGold);
  lineGradient.addColorStop(0.5, THEME.brightGold);
  lineGradient.addColorStop(0.82, THEME.deepGold);
  lineGradient.addColorStop(1, "rgba(230, 184, 71, 0)");
  context.strokeStyle = lineGradient;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(rect.x + 30, lineY);
  context.lineTo(rect.x + rect.width - 30, lineY);
  context.stroke();

  context.fillStyle = THEME.ink;
  context.shadowColor = "rgba(255, 209, 82, 0.48)";
  context.shadowBlur = 9;
  context.font = "34px NdePixel, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(name, rect.x + rect.width / 2, lineY + 43);
  context.restore();
}

function drawHologram(context, rect, time, pointer, flashStrength) {
  const cycle = (time * EFFECTS.hologramSpeed) % 1;
  const wave = Math.sin(cycle * Math.PI * 2);

  context.save();
  roundedRectPath(context, rect, 6);
  context.clip();
  context.globalCompositeOperation = "screen";

  const rainbowX = rect.x - rect.width * 0.7 + cycle * rect.width * 1.4;
  const rainbow = context.createLinearGradient(
    rainbowX,
    rect.y,
    rainbowX + rect.width * 1.25,
    rect.y + rect.height,
  );
  rainbow.addColorStop(0, "rgba(255, 62, 132, 0)");
  rainbow.addColorStop(0.18, `rgba(255, 62, 132, ${EFFECTS.rainbowOpacity})`);
  rainbow.addColorStop(0.36, `rgba(255, 215, 64, ${EFFECTS.rainbowOpacity})`);
  rainbow.addColorStop(0.54, `rgba(69, 255, 188, ${EFFECTS.rainbowOpacity})`);
  rainbow.addColorStop(0.72, `rgba(68, 180, 255, ${EFFECTS.rainbowOpacity})`);
  rainbow.addColorStop(0.9, `rgba(189, 96, 255, ${EFFECTS.rainbowOpacity})`);
  rainbow.addColorStop(1, "rgba(189, 96, 255, 0)");
  context.fillStyle = rainbow;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  const pointerX = rect.x + pointer.x * rect.width;
  const pointerY = rect.y + pointer.y * rect.height;
  const followLight = context.createRadialGradient(pointerX, pointerY, 2, pointerX, pointerY, rect.width * 0.58);
  followLight.addColorStop(0, `rgba(212, 244, 255, ${0.13 + flashStrength * 0.22})`);
  followLight.addColorStop(0.28, `rgba(116, 211, 255, ${0.055 + flashStrength * 0.08})`);
  followLight.addColorStop(1, "rgba(100, 170, 255, 0)");
  context.fillStyle = followLight;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  context.save();
  const beamX = rect.x - 170 + cycle * (rect.width + 340);
  context.translate(beamX, rect.y + rect.height / 2);
  context.rotate(-0.42);
  const beam = context.createLinearGradient(-70, 0, 70, 0);
  beam.addColorStop(0, "rgba(255, 255, 255, 0)");
  beam.addColorStop(0.46, `rgba(255, 255, 255, ${EFFECTS.beamOpacity + flashStrength * 0.28})`);
  beam.addColorStop(0.54, `rgba(224, 249, 255, ${EFFECTS.beamOpacity + flashStrength * 0.28})`);
  beam.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = beam;
  context.fillRect(-70, -rect.height, 140, rect.height * 2);
  context.restore();

  const sheen = context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0)");
  sheen.addColorStop(0.46 + wave * 0.05, "rgba(255, 246, 196, 0.045)");
  sheen.addColorStop(0.53 + wave * 0.05, "rgba(255, 255, 255, 0.1)");
  sheen.addColorStop(0.61 + wave * 0.05, "rgba(255, 255, 255, 0)");
  context.fillStyle = sheen;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawFrontFrame(context, rect, glowStrength, flashStrength) {
  context.save();
  roundedRectPath(context, rect, 1.5);
  context.strokeStyle = flashStrength > 0.02 ? "#fff9d5" : THEME.brightGold;
  context.lineWidth = 3;
  context.shadowColor = "rgba(255, 218, 102, 0.86)";
  context.shadowBlur = glowStrength + flashStrength * 20;
  context.stroke();

  roundedRectPath(context, rect, 8);
  context.strokeStyle = "rgba(220, 164, 52, 0.76)";
  context.lineWidth = 1;
  context.shadowBlur = 0;
  context.stroke();

  const corners = [
    [rect.x + 18, rect.y + 18, 1, 1],
    [rect.x + rect.width - 18, rect.y + 18, -1, 1],
    [rect.x + 18, rect.y + rect.height - 18, 1, -1],
    [rect.x + rect.width - 18, rect.y + rect.height - 18, -1, -1],
  ];
  context.strokeStyle = THEME.brightGold;
  context.lineWidth = 1.5;
  for (const [x, y, sx, sy] of corners) {
    context.beginPath();
    context.moveTo(x, y + sy * 9);
    context.quadraticCurveTo(x, y, x + sx * 9, y);
    context.stroke();
  }
  context.restore();
}

function getFlashStrength(time, flashStartedAt) {
  const elapsed = time - flashStartedAt;
  if (elapsed < 0 || elapsed >= EFFECTS.flashDuration) return 0;
  const progress = elapsed / EFFECTS.flashDuration;
  return Math.sin(progress * Math.PI) * (1 - progress * 0.35);
}

export function drawZodiacCard(context, card, cardRect, options = {}) {
  const time = options.time ?? 0;
  const flashStrength = getFlashStrength(time, options.flashStartedAt ?? Number.NEGATIVE_INFINITY);
  const baseGlow = options.glow === false ? EFFECTS.weakGlow : EFFECTS.strongGlow;
  const symbolDrawer = zodiacDrawers[card.zodiac];
  const pointer = options.pointer ?? { x: 0.5, y: 0.45 };
  const renderRect = { x: 0, y: 0, width: 328, height: 512, radius: 22 };

  context.save();
  context.translate(cardRect.x, cardRect.y);
  context.scale(cardRect.width / renderRect.width, cardRect.height / renderRect.height);

  drawCardBase(context, renderRect);
  drawStarField(context, renderRect, time);

  if (symbolDrawer) {
    symbolDrawer(
      context,
      renderRect.width / 2,
      renderRect.height * 0.5,
      Math.min(renderRect.width, renderRect.height) * 0.48,
      baseGlow + flashStrength * 24,
    );
  }

  if (options.mode === "gallery" && options.hologram !== false) {
    drawHologram(context, renderRect, time, pointer, flashStrength);
  }

  drawSeriesLabel(context, renderRect);
  drawRarityBadge(context, renderRect, card.rarity);
  drawCostBadge(context, renderRect, card.cost);
  drawNamePlate(context, renderRect, card.footerText ?? card.name);
  drawFrontFrame(context, renderRect, baseGlow, flashStrength);
  context.restore();
}
