const THEMES = Object.freeze({
  fire: Object.freeze({ pale: "#fff5b0", bright: "#ffb21c", deep: "#e62f14", glow: "rgba(255, 80, 20, .8)" }),
  ice: Object.freeze({ pale: "#f4ffff", bright: "#72ddff", deep: "#287bd9", glow: "rgba(90, 220, 255, .8)" }),
  lightning: Object.freeze({ pale: "#fffbd0", bright: "#ffe84d", deep: "#d89000", glow: "rgba(255, 232, 77, .9)" })
});

function drawElementalSword(context, centerX, centerY, size, element, options = {}) {
  const theme = { ...THEMES[element], ...options.theme };
  const scale = size / 360;
  context.save();
  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.rotate(Math.PI / 4);
  context.lineJoin = "round";
  context.lineCap = "round";

  context.shadowColor = theme.glow;
  context.shadowBlur = options.glow === false ? 0 : 18;
  const aura = context.createLinearGradient(0, -170, 0, 80);
  aura.addColorStop(0, theme.pale);
  aura.addColorStop(.45, theme.bright);
  aura.addColorStop(1, theme.deep);
  context.fillStyle = aura;
  context.strokeStyle = theme.pale;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(0, -174);
  context.bezierCurveTo(-32, -128, -10, -105, -42, -76);
  context.bezierCurveTo(-61, -51, -30, -33, -49, -4);
  context.bezierCurveTo(-18, -14, -18, 15, 0, 35);
  context.bezierCurveTo(18, 15, 18, -14, 49, -4);
  context.bezierCurveTo(30, -33, 61, -51, 42, -76);
  context.bezierCurveTo(10, -105, 32, -128, 0, -174);
  context.closePath();
  context.fill();
  context.stroke();

  const blade = context.createLinearGradient(-24, -135, 24, -135);
  blade.addColorStop(0, "#5d6978");
  blade.addColorStop(.5, "#ffffff");
  blade.addColorStop(1, "#8e9cab");
  context.fillStyle = blade;
  context.strokeStyle = "#f7fbff";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(0, -154);
  context.lineTo(25, -106);
  context.lineTo(13, 69);
  context.lineTo(-13, 69);
  context.lineTo(-25, -106);
  context.closePath();
  context.fill();
  context.stroke();

  context.shadowBlur = 8;
  context.fillStyle = theme.bright;
  context.strokeStyle = theme.pale;
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(-62, 61);
  context.lineTo(62, 61);
  context.lineTo(53, 82);
  context.lineTo(-53, 82);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#463323";
  context.fillRect(-11, 80, 22, 76);
  context.strokeRect(-11, 80, 22, 76);
  context.fillStyle = theme.bright;
  context.beginPath();
  context.arc(0, 164, 17, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

export function drawFlameSwordIcon(context, centerX, centerY, size, options = {}) {
  drawElementalSword(context, centerX, centerY, size, "fire", options);
}

export function drawIceSwordIcon(context, centerX, centerY, size, options = {}) {
  drawElementalSword(context, centerX, centerY, size, "ice", options);
}

export function drawLightningSwordIcon(context, centerX, centerY, size, options = {}) {
  drawElementalSword(context, centerX, centerY, size, "lightning", options);
}
