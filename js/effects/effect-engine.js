import { normalizeEffectDefinition } from "./effect-schema.js";

const EASINGS = {
  linear: t => t,
  easeInCubic: t => t ** 3,
  easeOutCubic: t => 1 - (1 - t) ** 3,
  easeInOutCubic: t => t < .5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2
};

export class EffectEngine {
  constructor(canvas, { transparent = false, backdrop = true } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.effect = normalizeEffectDefinition();
    this.time = 0;
    this.animationFrame = 0;
    this.transparent = Boolean(transparent);
    this.backdrop = Boolean(backdrop);
    this.imageCache = new Map();
  }

  setRenderMode({ transparent = this.transparent, backdrop = this.backdrop } = {}) {
    this.transparent = Boolean(transparent);
    this.backdrop = Boolean(backdrop);
    this.render();
  }

  load(definition) {
    this.effect = normalizeEffectDefinition(definition);
    this.canvas.width = this.effect.width;
    this.canvas.height = this.effect.height;
    this.seek(0);
    return this.effect;
  }

  async loadFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Effect JSON request failed: ${response.status}`);
    return this.load(await response.json());
  }

  play({ speed = 1, onComplete = null } = {}) {
    this.stop(false);
    let previous = performance.now();
    const frame = now => {
      this.time += (now - previous) * Math.max(.01, Number(speed) || 1);
      previous = now;
      if (this.time >= this.effect.duration) {
        this.seek(this.effect.duration);
        this.animationFrame = 0;
        onComplete?.();
        return;
      }
      this.render();
      this.animationFrame = requestAnimationFrame(frame);
    };
    this.animationFrame = requestAnimationFrame(frame);
  }

  stop(reset = true) {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    if (reset) this.seek(0);
  }

  seek(milliseconds) {
    this.time = Math.max(0, Math.min(this.effect.duration, Number(milliseconds) || 0));
    this.render();
  }

  render() {
    const { ctx, effect } = this;
    ctx.save();
    if (this.transparent) ctx.clearRect(0, 0, effect.width, effect.height);
    else {
      ctx.fillStyle = effect.background;
      ctx.fillRect(0, 0, effect.width, effect.height);
    }
    if (this.backdrop) drawBackdrop(ctx, effect.width, effect.height);
    const shake = calculateShake(effect.parts, this.time);
    ctx.translate(shake.x, shake.y);
    for (const part of effect.parts) this.renderPart(part);
    ctx.restore();
  }

  renderPart(part) {
    if (!part.enabled || this.time < part.start || this.time > part.start + part.duration || part.type === "shake") return;
    const raw = Math.min(1, Math.max(0, (this.time - part.start) / part.duration));
    const progress = (EASINGS[part.easing] || EASINGS.linear)(raw);
    if (part.type === "cutin") this.drawCutin(part, progress, raw);
    else {
      const draw = DRAWERS[part.type];
      if (draw) draw(this.ctx, part, progress, raw);
    }
  }

  drawCutin(part, progress, raw) {
    if (!part.imageData) return;
    let image = this.imageCache.get(part.imageData);
    if (!image) {
      image = new Image();
      image.onload = () => this.render();
      image.src = part.imageData;
      this.imageCache.set(part.imageData, image);
    }
    if (!image.complete || !image.naturalWidth) return;
    const elapsed = raw * part.duration;
    const remaining = (1 - raw) * part.duration;
    const fadeIn = part.fadeIn ? Math.min(1, elapsed / part.fadeIn) : 1;
    const fadeOut = part.fadeOut ? Math.min(1, remaining / part.fadeOut) : 1;
    const x = part.fromX + (part.toX - part.fromX) * progress;
    const y = part.fromY + (part.toY - part.fromY) * progress;
    this.ctx.save();
    this.ctx.globalAlpha = Math.max(0, Math.min(1, part.opacity)) * fadeIn * fadeOut;
    this.ctx.drawImage(image, x - part.width / 2, y - part.height / 2, part.width, part.height);
    this.ctx.restore();
  }
}

function drawBackdrop(ctx, width, height) {
  ctx.strokeStyle = "rgba(125,180,205,.1)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y <= height; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.fillRect(width * .39, height * .25, width * .22, height * .58);
}

const DRAWERS = {
  whiteout(ctx, p, t) { drawScreenFade(ctx, p, t); },
  blackout(ctx, p, t) { drawScreenFade(ctx, p, t); },
  depthOrb(ctx, p, t) {
    const depthT = p.depthDirection === "nearToFar" ? 1 - t : t, scale = p.fromScale + (p.toScale - p.fromScale) * depthT, radius = Math.max(1, p.radius * scale), points = parseControlPoints(p.pathPoints), ordered = p.pathDirection === "reverse" ? [...points].reverse() : points, position = quadraticPoint(ordered, t, p.x, p.y), elapsed = t * p.duration, remaining = p.duration - elapsed, fadeIn = p.fadeIn ? Math.min(1, elapsed / p.fadeIn) : 1, fadeOut = p.fadeOut ? Math.min(1, remaining / p.fadeOut) : 1, alpha = fadeIn * fadeOut;
    ctx.save(); ctx.globalAlpha = alpha;
    if (p.glowMode === "outer" || p.glowMode === "both") { ctx.shadowColor = p.glowColor; ctx.shadowBlur = p.glowStrength * Math.max(.4, scale); }
    const gradient = ctx.createRadialGradient(position.x - radius * .25, position.y - radius * .3, radius * .08, position.x, position.y, radius);
    gradient.addColorStop(0, "#ffffff"); gradient.addColorStop(.28, p.color); gradient.addColorStop(1, p.glowMode === "inner" || p.glowMode === "both" ? p.glowColor : p.color);
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(position.x, position.y, radius, 0, Math.PI * 2); ctx.fill();
    if (p.outlineWidth > 0) { ctx.strokeStyle = p.glowColor; ctx.lineWidth = p.outlineWidth; ctx.stroke(); }
    ctx.restore();
  },
  flash(ctx, p, t) {
    ctx.save(); ctx.globalAlpha = Math.sin(t * Math.PI); ctx.strokeStyle = p.color; ctx.lineWidth = p.lineWidth * (1 - t * .55);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * t, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  },
  slash(ctx, p, t) {
    const points = parseControlPoints(p.controlPoints), fade = 1 - Math.max(0, (t - .72) / .28);
    if (points.length >= 2) {
      const ordered = p.pathDirection === "reverse" ? [...points].reverse() : points;
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = fade; ctx.strokeStyle = p.color; ctx.lineWidth = p.width; ctx.shadowColor = p.color; ctx.shadowBlur = p.width;
      traceSlashPath(ctx, ordered, p.pathMode); ctx.setLineDash([2000]); ctx.lineDashOffset = 2000 * (1 - Math.min(1, t * 1.4)); ctx.stroke(); ctx.restore(); return;
    }
    const angle = p.angle * Math.PI / 180, length = p.length * Math.min(1, t * 1.5);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle); ctx.lineCap = "round";
    for (let i = p.trail - 1; i >= 0; i--) {
      ctx.globalAlpha = fade * (1 - i / (p.trail + 1)); ctx.strokeStyle = p.color; ctx.lineWidth = p.width * (1 - i / (p.trail + 2));
      ctx.beginPath(); ctx.moveTo(-length / 2, i * p.width * .7); ctx.quadraticCurveTo(0, -p.width * 2, length / 2, -i * p.width * .35); ctx.stroke();
    }
    ctx.restore();
  },
  spark(ctx, p, t) { drawParticles(ctx, p, t, false); },
  smoke(ctx, p, t) { drawParticles(ctx, p, t, true); },
  explosion(ctx, p, t) {
    const alpha = 1 - t;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * t);
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`); gradient.addColorStop(.28, p.secondaryColor); gradient.addColorStop(1, "rgba(255,60,0,0)");
    ctx.globalAlpha = alpha; ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * t, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    drawParticles(ctx, { ...p, speed: p.radius * 1.4, size: 8, spread: 360 }, t, false);
  },
  ice(ctx, p, t) {
    const rng = mulberry32(Number(p.seed) || 1), reveal = Math.min(1, t * 2.2), fade = 1 - Math.max(0, (t - .68) / .32);
    ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = fade; ctx.shadowColor = p.secondaryColor; ctx.shadowBlur = 12;
    for (let i = 0; i < Math.max(1, Math.floor(p.count)); i++) {
      const angle = rng() * Math.PI * 2 + p.rotation * Math.PI / 180, distance = p.radius * reveal * (.35 + rng() * .65), size = p.size * (.55 + rng() * .9) * reveal;
      ctx.save(); ctx.rotate(angle); ctx.translate(distance, 0); ctx.rotate(angle * .35); ctx.fillStyle = i % 3 ? p.color : p.secondaryColor;
      ctx.beginPath(); ctx.moveTo(size * 1.7, 0); ctx.lineTo(0, -size * .45); ctx.lineTo(-size * .55, 0); ctx.lineTo(0, size * .45); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  },
  blizzard(ctx, p, t) {
    const rng = mulberry32(Number(p.seed) || 1), width = ctx.canvas.width, height = ctx.canvas.height, angle = p.angle * Math.PI / 180;
    ctx.save(); ctx.globalAlpha = Math.min(1, t * 5) * (1 - Math.max(0, (t - .82) / .18)); ctx.lineCap = "round";
    for (let i = 0; i < Math.max(1, Math.floor(p.count)); i++) {
      const originX = rng() * width, originY = rng() * height, travel = p.speed * t * (.45 + rng() * .8), size = p.size * (.4 + rng());
      const x = (originX + Math.cos(angle) * travel + width) % width, y = (originY + Math.sin(angle) * travel + height) % height;
      ctx.strokeStyle = i % 4 ? p.color : p.secondaryColor; ctx.lineWidth = Math.max(1, size * .35); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(angle) * size * 4, y - Math.sin(angle) * size * 4); ctx.stroke();
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, size * .45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },
  electric(ctx, p, t) {
    const rng = mulberry32((Number(p.seed) || 1) + Math.floor(t * 18)), fade = Math.sin(t * Math.PI);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let bolt = 0; bolt < Math.max(1, Math.floor(p.count)); bolt++) {
      const startAngle = rng() * Math.PI * 2, endAngle = startAngle + (.5 + rng()) * Math.PI, segments = Math.max(2, Math.floor(p.segments));
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const ratio = i / segments, angle = startAngle + (endAngle - startAngle) * ratio, radius = p.radius * (.35 + ratio * .65) + (rng() - .5) * p.radius * .3;
        const x = p.x + Math.cos(angle) * radius, y = p.y + Math.sin(angle) * radius; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.globalAlpha = fade * .45; ctx.strokeStyle = p.secondaryColor; ctx.lineWidth = p.lineWidth * 3; ctx.stroke(); ctx.globalAlpha = fade; ctx.strokeStyle = p.color; ctx.lineWidth = p.lineWidth; ctx.stroke();
    }
    ctx.restore();
  },
  lightning(ctx, p, t) {
    const rng = mulberry32(Number(p.seed) || 1), segments = Math.max(3, Math.floor(p.segments)), visibleSegments = Math.max(1, Math.ceil(segments * Math.min(1, t * 3))), topY = p.y - p.height;
    const points = [{ x: p.x, y: topY }];
    for (let i = 1; i <= segments; i++) points.push({ x: p.x + (rng() - .5) * p.width * (i === segments ? .12 : 1), y: topY + p.height * i / segments });
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = 1 - Math.max(0, (t - .72) / .28);
    drawBoltPath(ctx, points.slice(0, visibleSegments + 1), p.secondaryColor, p.lineWidth * 2.8); drawBoltPath(ctx, points.slice(0, visibleSegments + 1), p.color, p.lineWidth);
    for (let branch = 0; branch < Math.floor(p.branches); branch++) {
      const originIndex = 1 + Math.floor(rng() * Math.max(1, visibleSegments - 1)), origin = points[Math.min(originIndex, visibleSegments)]; if (!origin) continue;
      const direction = rng() < .5 ? -1 : 1, branchPoints = [origin, { x: origin.x + direction * p.width * (.25 + rng() * .45), y: origin.y + p.height * (.08 + rng() * .14) }]; drawBoltPath(ctx, branchPoints, p.color, Math.max(1, p.lineWidth * .35));
    }
    ctx.restore();
  },
  cracker(ctx, p, t) {
    const rng = mulberry32(Number(p.seed) || 1), count = Math.max(1, Math.floor(p.count)), spread = p.spread * Math.PI / 180;
    ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (t - .82) / .18);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (rng() - .5) * spread, speed = p.speed * (.45 + rng() * .8), x = p.x + Math.cos(angle) * speed * t, y = p.y + Math.sin(angle) * speed * t + .5 * p.gravity * t * t, size = p.size * (.45 + rng());
      ctx.save(); ctx.translate(x, y); ctx.rotate((rng() * 8 - 4) * Math.PI * t); ctx.fillStyle = i % 2 ? p.color : p.secondaryColor; ctx.fillRect(-size, -size * .35, size * 2, size * .7); ctx.restore();
    }
    ctx.restore();
  },
  magicCircle(ctx, p, t) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rotation * t) * Math.PI / 180); ctx.strokeStyle = p.color; ctx.lineWidth = p.lineWidth; ctx.globalAlpha = Math.sin(Math.min(1, t * 1.2) * Math.PI);
    for (let ring = 1; ring <= p.rings; ring++) { ctx.beginPath(); ctx.arc(0, 0, p.radius * ring / p.rings, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const x = Math.cos(a) * p.radius, y = Math.sin(a) * p.radius; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); ctx.restore();
  },
  popup(ctx, p, t) {
    const displayText = p.valueSource === "fixed" || !/^\{.+\}$/.test(p.text) ? p.text : p.previewText;
    const font = { game: 'Game, "Yu Gothic UI", sans-serif', pixel: 'Pixel, monospace', sans: '"Yu Gothic UI", sans-serif', serif: '"Yu Mincho", serif' }[p.fontFamily] || '"Yu Gothic UI", sans-serif';
    ctx.save(); ctx.globalAlpha = Math.min(1, t * 5) * (1 - Math.max(0, (t - .75) / .25)); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `bold ${p.fontSize}px ${font}`; ctx.lineWidth = Math.max(3, p.fontSize / 12); ctx.strokeStyle = p.outlineColor; ctx.fillStyle = p.color; const y = p.y - p.rise * t; ctx.strokeText(displayText, p.x, y); ctx.fillText(displayText, p.x, y); ctx.restore();
  }
};

function drawScreenFade(ctx, p, t) {
  const elapsed = t * p.duration, fadeIn = Math.max(1, p.fadeIn), holdEnd = fadeIn + Math.max(0, p.hold), fadeOut = Math.max(1, p.fadeOut);
  let alpha = elapsed < fadeIn ? elapsed / fadeIn : elapsed < holdEnd ? 1 : 1 - (elapsed - holdEnd) / fadeOut;
  alpha = Math.max(0, Math.min(1, alpha)) * p.intensity;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
}

function parseControlPoints(value) {
  return String(value || "").split(";").map(pair => pair.split(",").map(Number)).filter(pair => pair.length === 2 && pair.every(Number.isFinite)).map(([x, y]) => ({ x, y }));
}

function quadraticPoint(points, t, fallbackX, fallbackY) {
  if (points.length < 3) return points[0] || { x: fallbackX, y: fallbackY };
  const [start, control, end] = points, inverse = 1 - t;
  return { x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x, y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y };
}

function traceSlashPath(ctx, points, mode = "line") {
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  if (mode === "line") { for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y); return; }
  const side = mode === "arcRight" ? 1 : -1;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1, bend = Math.min(120, length * .28) * side;
    ctx.quadraticCurveTo(mx - dy / length * bend, my + dx / length * bend, b.x, b.y);
  }
}

function drawBoltPath(ctx, points, color, lineWidth) {
  if (points.length < 2) return;
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y); ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
}

function drawParticles(ctx, p, t, smoke) {
  const rng = mulberry32(Number(p.seed) || 1), count = Math.max(1, Math.floor(p.count));
  ctx.save();
  for (let i = 0; i < count; i++) {
    const baseAngle = ((rng() - .5) * p.spread - 90) * Math.PI / 180;
    const distance = p.speed * t * (.35 + rng() * .65), size = p.size * (.45 + rng() * .8) * (smoke ? .6 + t : 1 - t * .55);
    const x = p.x + Math.cos(baseAngle) * distance, y = p.y + Math.sin(baseAngle) * distance;
    ctx.globalAlpha = (1 - t) * (smoke ? .35 : .9); ctx.fillStyle = p.color;
    if (smoke) { ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.save(); ctx.translate(x, y); ctx.rotate(baseAngle); ctx.fillRect(0, -size / 2, size * 3, size); ctx.restore(); }
  }
  ctx.restore();
}

function calculateShake(parts, time) {
  let x = 0, y = 0;
  for (const p of parts) {
    if (!p.enabled || p.type !== "shake" || time < p.start || time > p.start + p.duration) continue;
    const t = (time - p.start) / p.duration, strength = p.strength * (1 - t), wave = time / 1000 * p.frequency * Math.PI * 2;
    x += Math.sin(wave) * strength; y += Math.cos(wave * 1.37) * strength;
  }
  return { x, y };
}

function mulberry32(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
