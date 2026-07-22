export function drawMinimap(ctx, {
  W,
  MAP_W,
  MAP_H,
  cells,
  explored,
  state,
  roundRect,
  size = 126,
  ox = W - size - 16,
  oy = 16,
  alpha = .82
}) {
  const cell = size / MAP_W;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(4,5,5,.68)";
  roundRect(ox - 8, oy - 8, size + 16, size + 16, 8);
  ctx.fill();

  ctx.fillStyle = "#151d19";
  ctx.fillRect(ox, oy, size, size);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const x1 = ox + x * cell;
      const y1 = oy + y * cell;
      if (explored[y][x]) {
        ctx.fillStyle = "#14201b";
        ctx.fillRect(x1 + 1, y1 + 1, cell - 2, cell - 2);
        ctx.strokeStyle = "rgba(174,160,126,.13)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x1 + .5, y1 + .5, cell, cell);
      } else {
        drawUnknownMapCell(ctx, x1, y1, cell, x, y);
      }
    }
  }

  ctx.strokeStyle = "#b8a77f";
  ctx.lineWidth = 2;
  ctx.lineCap = "square";
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const isExplored = explored[y][x];
      const c = cells[y][x];
      const x1 = ox + x * cell;
      const y1 = oy + y * cell;
      const x2 = x1 + cell;
      const y2 = y1 + cell;
      if (isExplored) {
        if (c.walls.N) line(ctx, x1, y1, x2, y1);
        if (c.walls.W) line(ctx, x1, y1, x1, y2);
        if (c.walls.E) line(ctx, x2, y1, x2, y2);
        if (c.walls.S) line(ctx, x1, y2, x2, y2);
      }
      if ((isExplored && c.type === "stairsUp") || (c.type === "stairsDown" && (isExplored || revealOptions.stairsDown))) {
        drawStairsMark(ctx, x1, y1, cell, c.type);
      }
      if (c.npc && (isExplored || revealOptions.npcs)) drawNpcMark(ctx, x1, y1, cell);
      if (c.treasure && ((isExplored && c.treasureDiscovered) || revealOptions.treasures)) drawTreasureMark(ctx, x1, y1, cell, c.treasure);
    }
  }

  ctx.lineCap = "round";
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!explored[y][x]) continue;
      const c = cells[y][x];
      const x1 = ox + x * cell;
      const y1 = oy + y * cell;
      const x2 = x1 + cell;
      const y2 = y1 + cell;
      drawDoorMark(ctx, x1, y1, x2, y1, c.doors.N, cell);
      drawDoorMark(ctx, x2, y1, x2, y2, c.doors.E, cell);
      drawDoorMark(ctx, x1, y2, x2, y2, c.doors.S, cell);
      drawDoorMark(ctx, x1, y1, x1, y2, c.doors.W, cell);
    }
  }

  const px = ox + (state.x / MAP_W) * size;
  const py = oy + (state.y / MAP_H) * size;
  ctx.fillStyle = "#d9a44c";
  ctx.beginPath();
  ctx.moveTo(px + Math.cos(state.angle) * 7, py + Math.sin(state.angle) * 7);
  ctx.lineTo(px + Math.cos(state.angle + 2.45) * 6, py + Math.sin(state.angle + 2.45) * 6);
  ctx.lineTo(px + Math.cos(state.angle - 2.45) * 6, py + Math.sin(state.angle - 2.45) * 6);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,.9)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(ox - 1, oy - 1, size + 2, size + 2);
  ctx.strokeStyle = "rgba(255,255,255,.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 5, oy - 5, size + 10, size + 10);
  ctx.restore();
}

const revealOptions = { stairsDown: false, npcs: false, treasures: false };

export function setMinimapRevealOptions(options = {}) {
  if ("stairsDown" in options) revealOptions.stairsDown = Boolean(options.stairsDown);
  if ("npcs" in options) revealOptions.npcs = Boolean(options.npcs);
  if ("treasures" in options) revealOptions.treasures = Boolean(options.treasures);
}

export function getMinimapRevealOptions() {
  return { ...revealOptions };
}

export function drawStairsMark(ctx, x, y, size, type) {
  const label = type === "stairsUp" ? "U" : "D";
  ctx.save();
  ctx.fillStyle = type === "stairsUp" ? "#87c7ff" : "#f0b35a";
  ctx.font = `700 ${Math.max(8, size * .62)}px GameFont, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + size / 2, y + size / 2);
  ctx.restore();
}

export function drawNpcMark(ctx, x, y, size) {
  ctx.save();
  ctx.fillStyle = "#f0eadc";
  ctx.font = `700 ${Math.max(8, size * .62)}px GameFont, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("👤", x + size / 2, y + size / 2);
  ctx.restore();
}

export function drawTreasureMark(ctx, x, y, size, type) {
  const color = type === "gold" ? "#f5d35c" : type === "black" ? "#d9dde2" : "#e85a45";
  const left = x + size * .22;
  const top = y + size * .29;
  const width = size * .56;
  const height = size * .46;
  ctx.save();
  ctx.fillStyle = "rgba(4,5,5,.86)";
  ctx.fillRect(left - 1, top - 1, width + 2, height + 2);
  ctx.fillStyle = color;
  ctx.fillRect(left, top + height * .28, width, height * .72);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, size * .1);
  ctx.beginPath();
  ctx.moveTo(left, top + height * .28);
  ctx.lineTo(left + width * .16, top);
  ctx.lineTo(left + width * .84, top);
  ctx.lineTo(left + width, top + height * .28);
  ctx.stroke();
  ctx.restore();
}

export function drawDoorMark(ctx, x1, y1, x2, y2, state, cellSize) {
  if (!state) return;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(4, cellSize * .46);
  const half = length / 2;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const color = state === "locked" ? "#c78dff" : state === "open" ? "#dfc18a" : "#f0b35a";
  ctx.save();

  ctx.strokeStyle = "#151d19";
  ctx.lineWidth = Math.max(3, cellSize * .34);
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(mx - half, my);
    ctx.lineTo(mx + half, my);
  } else {
    ctx.moveTo(mx, my - half);
    ctx.lineTo(mx, my + half);
  }
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.8, cellSize * .18);
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(mx - half * .62, my);
    ctx.lineTo(mx + half * .62, my);
  } else {
    ctx.moveTo(mx, my - half * .62);
    ctx.lineTo(mx, my + half * .62);
  }
  ctx.stroke();

  if (state === "open") {
    ctx.strokeStyle = "rgba(255,239,194,.76)";
    ctx.lineWidth = Math.max(1.2, cellSize * .1);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(mx - half * .12, my);
      ctx.lineTo(mx + half * .48, my + half * .52);
    } else {
      ctx.moveTo(mx, my + half * .12);
      ctx.lineTo(mx + half * .52, my - half * .48);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawUnknownMapCell(ctx, x, y, size, gx, gy) {
  const noise = hashNoise(gx, gy);
  const base = 58 + Math.floor(noise * 28);
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

  ctx.fillStyle = `rgba(18,18,18,${.18 + noise * .18})`;
  ctx.fillRect(x + 1, y + size * .52, size - 2, size * .22);

  ctx.fillStyle = `rgba(205,205,205,${.08 + noise * .05})`;
  const dots = 3 + Math.floor(noise * 4);
  for (let i = 0; i < dots; i++) {
    const px = x + 2 + ((hashNoise(gx + i * 3, gy + 7) * (size - 4)) | 0);
    const py = y + 2 + ((hashNoise(gx + 11, gy + i * 5) * (size - 4)) | 0);
    ctx.fillRect(px, py, 1.2, 1.2);
  }
}

export function getMinimapBounds(W, size = 126, margin = 16, pad = 8) {
  return {
    x: W - size - margin - pad,
    y: margin - pad,
    w: size + pad * 2,
    h: size + pad * 2
  };
}

export function hashNoise(x, y) {
  const n = Math.sin((x + 1) * 127.1 + (y + 1) * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
