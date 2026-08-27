import {
  FOV,
  RAYS,
  MAX_DIST
} from "./config.js";
import { npcs, getNpcById } from "../data/npcs.js";
import { DESERT_OASIS, DESERT_OASIS_MIRAGE, getFountainById, HEALING_FOUNTAIN } from "../data/fountains.js";
import { BOSSES, getBossById } from "../data/bosses.js";
import { B100_GAUNTLET_BOSS_IDS } from "../data/fixed-floor-maps.js";
import { DESERT_QUICKSAND } from "../data/quicksand.js";
import { RAPID_CURRENT } from "../data/rapid-currents.js";

const renderer = {
  canvas: null,
  ctx: null,
  eventOverlayCanvas: null,
  eventOverlayCtx: null,
  W: 0,
  H: 0,
  state: null,
  wallOnCell: () => true,
  closedDoorOnCell: () => false,
  openDoorOnCell: () => false,
  getDoorState: () => null,
  getDoorKind: () => null,
  handleOverlayInput: () => false,
  inBounds: () => false,
  updateAnimation: () => {},
  updateHud: () => {},
  drawMinimap: () => {},
  getMinimapOptions: () => ({}),
  getMinimapBounds: () => ({ x: 0, y: 0, w: 0, h: 0 }),
  minimapOverlayVisible: false,
  lastCanvasTouchAt: 0,
  wallTexture: null,
  starterWallTextures: [],
  forestWallTextures: [],
  fireWallTextures: [],
  iceWallTextures: [],
  darkWallTextures: [],
  desertWallTextures: [],
  midDungeonWallTextures: [],
  magicWallTextures: [],
  tortureWallTextures: [],
  waterWallTextures: [],
  crystalWallTextures: [],
  acaciaWallTextures: [],
  marbleWallTextures: [],
  wallColor: "default",
  floorColor: "default",
  doorTextures: null,
  characterImages: new Map(),
  treasureImages: new Map(),
  screenShakeEnabled: true,
  torchFlickerEnabled: true,
  mistEnabled: true,
  mistIntensity: 1,
  mistDistance: 9,
  mistColor: "frost",
  mistLayers: null,
  minimapStaticFrames: []
};

const MIST_PALETTES = {
  green: { main: [66, 77, 75], veil: [63, 75, 72], haze: [93, 108, 104], bloom: [193, 164, 111] },
  frost: { main: [112, 145, 164], veil: [92, 126, 145], haze: [151, 187, 205], bloom: [150, 203, 229] },
  blue: { main: [35, 69, 112], veil: [25, 51, 91], haze: [62, 105, 157], bloom: [97, 166, 226] },
  poison: { main: [93, 62, 111], veil: [82, 48, 101], haze: [139, 91, 160], bloom: [174, 112, 199] },
  magic: { main: [61, 49, 112], veil: [35, 28, 76], haze: [104, 82, 168], bloom: [154, 123, 235] },
  red: { main: [112, 38, 31], veil: [88, 26, 22], haze: [158, 54, 42], bloom: [224, 105, 66] },
  black: { main: [12, 12, 15], veil: [5, 5, 7], haze: [24, 23, 29], bloom: [72, 66, 82] },
  yellow: { main: [206, 209, 21], veil: [151, 154, 14], haze: [222, 224, 67], bloom: [244, 226, 116] },
  slate: { main: [90, 108, 104], veil: [62, 77, 74], haze: [125, 143, 138], bloom: [176, 190, 171] },
  torture: { main: [69, 66, 52], veil: [52, 50, 39], haze: [83, 80, 62], bloom: [128, 122, 92] },
  water: { main: [62, 123, 204], veil: [35, 83, 151], haze: [102, 158, 224], bloom: [142, 199, 244] },
  crystal: { main: [116, 24, 114], veil: [78, 18, 91], haze: [158, 62, 170], bloom: [221, 143, 244] },
  acacia: { main: [169, 163, 51], veil: [145, 139, 40], haze: [194, 187, 61], bloom: [232, 224, 111] },
  white: { main: [235, 235, 235], veil: [210, 210, 210], haze: [245, 245, 245], bloom: [255, 255, 255] }
};
const WALL_PALETTES = {
  default: { base: "#817667", rows: ["#8b806f", "#716756"], mortar: "rgba(28,26,23,.62)", speckle: "rgba(236,220,181,.12)" },
  stone: { base: "#817667", rows: ["#8b806f", "#716756"], mortar: "rgba(28,26,23,.62)", speckle: "rgba(236,220,181,.12)" },
  red: { base: "#76504a", rows: ["#8c5a50", "#65413d"], mortar: "rgba(35,18,16,.68)", speckle: "rgba(255,190,146,.14)" },
  blue: { base: "#536b78", rows: ["#607f90", "#465d6a"], mortar: "rgba(16,27,35,.68)", speckle: "rgba(202,238,255,.16)" },
  green: { base: "#526b55", rows: ["#607c61", "#435a47"], mortar: "rgba(18,31,20,.68)", speckle: "rgba(203,236,184,.14)" },
  yellow: { base: "#ced115", rows: ["#dadd25", "#a4a711"], mortar: "rgba(61,62,5,.68)", speckle: "rgba(255,250,147,.18)" },
  slate: { base: "#5a6c68", rows: ["#687b76", "#485a56"], mortar: "rgba(19,28,26,.68)", speckle: "rgba(190,211,204,.14)" },
  magic: { base: "#30275a", rows: ["#493778", "#211a45"], mortar: "rgba(9,6,24,.78)", speckle: "rgba(184,150,255,.2)" },
  torture: { base: "rgb(69, 66, 52)", rows: ["rgb(83, 80, 62)", "rgb(54, 52, 41)"], mortar: "rgba(22,21,17,.76)", speckle: "rgba(187,178,132,.14)" },
  water: { base: "#3e7bcc", rows: ["#4d8bd9", "#3165ab"], mortar: "rgba(12,35,67,.68)", speckle: "rgba(174,220,255,.17)" },
  crystal: { base: "rgb(116, 24, 114)", rows: ["rgb(138, 39, 145)", "rgb(82, 18, 96)"], mortar: "rgba(35,8,45,.76)", speckle: "rgba(235,177,255,.22)" },
  acacia: { base: "rgb(169, 163, 51)", rows: ["rgb(194, 186, 66)", "rgb(139, 133, 38)"], mortar: "rgba(61,57,14,.66)", speckle: "rgba(255,247,158,.22)" },
  white: { base: "#aaa79e", rows: ["#c3c0b5", "#918f88"], mortar: "rgba(55,54,51,.52)", speckle: "rgba(255,255,240,.2)" },
  black: { base: "#28282b", rows: ["#35343a", "#1d1d20"], mortar: "rgba(0,0,0,.82)", speckle: "rgba(151,136,165,.12)" }
};
const FLOOR_PALETTES = {
  default: { near: "#0c0a08", mid: "#292316", far: "#413419", grid: "rgba(236,195,116,.07)" },
  red: { near: "#130807", mid: "#3b1711", far: "#682417", grid: "rgba(255,145,91,.1)" },
  blue: { near: "#071015", mid: "#143448", far: "#24617b", grid: "rgba(174,228,255,.13)" },
  green: { near: "#081109", mid: "#18341b", far: "#315b2d", grid: "rgba(174,226,137,.1)" },
  yellow: { near: "#181902", mid: "#686b0a", far: "#ced115", grid: "rgba(255,252,137,.12)" },
  slate: { near: "#080b0a", mid: "#273431", far: "#5a6c68", grid: "rgba(185,209,201,.09)" },
  magic: { near: "#05030d", mid: "#17102f", far: "#38265d", grid: "rgba(177,137,255,.13)" },
  torture: { near: "rgb(18, 17, 13)", mid: "rgb(36, 35, 27)", far: "rgb(54, 52, 41)", grid: "rgba(176,169,126,.09)" },
  water: { near: "#050d18", mid: "#183c6c", far: "#3e7bcc", grid: "rgba(171,218,255,.13)" },
  purple: { near: "#110713", mid: "#35143c", far: "#5d2369", grid: "rgba(226,143,244,.12)" },
  crystal: { near: "rgb(28, 6, 35)", mid: "rgb(70, 15, 82)", far: "rgb(116, 24, 114)", grid: "rgba(230,159,255,.16)" },
  acacia: { near: "rgb(92, 87, 25)", mid: "rgb(158, 151, 45)", far: "rgb(215, 207, 71)", grid: "rgba(255,247,158,.18)" },
  white: { near: "rgb(170, 170, 170)", mid: "rgb(210, 210, 210)", far: "rgb(235, 235, 235)", grid: "rgba(255,255,255,.2)" },
  black: { near: "#010102", mid: "#08080a", far: "#111116", grid: "rgba(104,94,118,.06)" }
};
const DISTANCE_MIST_BASE_ALPHA = .8;

export function setScreenShakeEnabled(enabled) {
  renderer.screenShakeEnabled = Boolean(enabled);
  if (!renderer.screenShakeEnabled && renderer.state) renderer.state.shake = 0;
}

export function setTorchFlickerEnabled(enabled) {
  renderer.torchFlickerEnabled = Boolean(enabled);
  if (!renderer.torchFlickerEnabled && renderer.state) renderer.state.torch = 0;
}

export function toggleMinimapOverlay() {
  if (!renderer.state || !hasEffectiveMinimap(renderer.state)) {
    renderer.minimapOverlayVisible = false;
    return false;
  }
  renderer.minimapOverlayVisible = !renderer.minimapOverlayVisible;
  return renderer.minimapOverlayVisible;
}

export function setMistEnabled(enabled) {
  renderer.mistEnabled = Boolean(enabled);
}

export function setWallColor(color) {
  if (!WALL_PALETTES[color]) color = "default";
  if (renderer.wallColor === color && renderer.wallTexture) return;
  renderer.wallColor = color;
  const themedTextures = getThemedWallTextures(color);
  renderer.wallTexture = themedTextures.length
    ? themedTextures[0]
    : makeWallTexture(color);
}

export function setFloorColor(color) {
  renderer.floorColor = FLOOR_PALETTES[color] ? color : "default";
}

export function setMistOptions({ enabled, intensity, distance, color } = {}) {
  if (typeof enabled === "boolean") renderer.mistEnabled = enabled;
  if (Number.isFinite(intensity)) renderer.mistIntensity = Math.max(.25, Math.min(2, intensity));
  if (Number.isFinite(distance)) renderer.mistDistance = Math.max(3, Math.min(9, distance));
  if (MIST_PALETTES[color] && color !== renderer.mistColor) {
    renderer.mistColor = color;
    if (renderer.ctx && renderer.W && renderer.H) renderer.mistLayers = makeMistLayers(renderer.ctx, renderer.W, renderer.H);
  }
}

export function configureRenderer(options) {
  Object.assign(renderer, options);
  renderer.W = renderer.canvas.width;
  renderer.H = renderer.canvas.height;
  renderer.mistLayers = makeMistLayers(renderer.ctx, renderer.W, renderer.H);
  renderer.minimapStaticFrames = makeMinimapStaticFrames(renderer.getMinimapBounds(renderer.W));
  if (renderer.eventOverlayCanvas) {
    renderer.eventOverlayCanvas.width = renderer.W;
    renderer.eventOverlayCanvas.height = renderer.H;
    renderer.eventOverlayCanvas.addEventListener("pointerup", () => {
      renderer.handleOverlayInput("dismiss");
    });
  }
  renderer.wallTexture = makeWallTexture();
  loadStarterWallTextures();
  loadForestWallTextures();
  loadFireWallTextures();
  loadIceWallTextures();
  loadDarkWallTextures();
  loadDesertWallTextures();
  loadMidDungeonWallTextures();
  loadMagicWallTextures();
  loadTortureWallTextures();
  loadWaterWallTextures();
  loadCrystalWallTextures();
  loadAcaciaWallTextures();
  loadMarbleWallTextures();
  renderer.doorTextures = {
    normal: makeDoorTexture("normal"),
    boss: makeDoorTexture("boss"),
    bossUnlocked: makeDoorTexture("boss"),
    locked: makeDoorTexture("locked"),
    specialLocked: makeDoorTexture("special"),
    specialUnlocked: makeDoorTexture("special")
  };
  loadDoorTexture(["normal", "locked"], "images/dungeon_effects/dungeon_door_normal.webp");
  loadDoorTexture(["boss", "bossUnlocked"], "images/dungeon_effects/dungeon_door_red.webp");
  loadDoorTexture(["specialLocked", "specialUnlocked"], "images/dungeon_effects/dungeon_door_purple.webp");
  npcs.forEach(npc => loadCharacterImage(npc.imageId, npc.image));
  Object.values(BOSSES).forEach(boss => {
    if (boss.encounterImageId && boss.encounterImage) {
      loadCharacterImage(boss.encounterImageId, boss.encounterImage);
    }
    if (boss.defeatedEncounterImageId && boss.defeatedEncounterImage) {
      loadCharacterImage(boss.defeatedEncounterImageId, boss.defeatedEncounterImage);
    }
    if (boss.event?.transformationImageId && boss.event?.transformationImage) {
      loadCharacterImage(boss.event.transformationImageId, boss.event.transformationImage);
    }
  });
  loadCharacterImage(HEALING_FOUNTAIN.id, HEALING_FOUNTAIN.image);
  loadCharacterImage(DESERT_OASIS.id, DESERT_OASIS.image);
  loadCharacterImage(DESERT_OASIS_MIRAGE.id, DESERT_OASIS_MIRAGE.image);
  loadCharacterImage(DESERT_QUICKSAND.id, DESERT_QUICKSAND.image);
  loadCharacterImage(RAPID_CURRENT.imageId, RAPID_CURRENT.image);
  loadCharacterImage("maikaefer_nest_event", "images/background/dungeon_event_08.avif");
  loadCharacterImage("giant_wasp_hive_b18f", "images/background/dungeon_event_10.avif");
  loadCharacterImage("kirke_house_b58f", "images/background/dungeon_event_11.avif");
  loadCharacterImage("NPC_23", "images/npc/NPC_23.avif");
  loadCharacterImage("warp_portal_b100f", "images/dungeon_effects/warp_portal.avif");
  ["red", "black", "gold"].forEach(type => loadTreasureImage(type, `images/treasure/treasure-${type}.png`));
  loadTreasureImage("purple", "images/treasure/treasure-red.png", "#8f42d8");
  renderer.canvas.addEventListener("pointerup", handleCanvasPointerUp);
  renderer.canvas.addEventListener("touchend", handleCanvasTouchEnd, { passive: false });
}

export function startRenderLoop() {
  requestAnimationFrame(drawScene);
}

export function drawScene(now) {
  const { ctx, W, H, state } = renderer;
  renderer.updateAnimation(now);
  ctx.save();
  ctx.fillStyle = "#070909";
  ctx.fillRect(0, 0, W, H);

  const sway = renderer.screenShakeEnabled ? Math.sin(now * 0.005) * 2 + state.shake : 0;
  state.shake *= 0.86;
  state.torch = renderer.torchFlickerEnabled ? Math.sin(now * 0.007) * 0.035 + Math.sin(now * 0.013) * 0.02 : 0;
  ctx.translate(0, sway);

  drawCeiling();
  drawFloor();
  drawRapidCurrentMotion(now);
  drawCellEvents("floor");
  drawBoundaryWalls();
  drawCellEvents("sprite");
  drawMist(now);
  drawDarkness();
  if (!hasEffectiveMinimap(state)) {
    renderer.minimapOverlayVisible = false;
    drawMinimapStatic(now);
  } else {
    renderer.drawMinimap(ctx, {
      ...renderer.getMinimapOptions(),
      roundRect
    });
    if (renderer.minimapOverlayVisible) drawMinimapOverlay();
  }
  if (state.overlayEvent?.type === "floorLap") drawFloorLapMessage();
  else if (state.overlayEvent?.type === "randomEncounter") drawEncounterMessage();
  ctx.restore();
  drawFrame();
  renderer.updateHud();
  drawOverlayEvent();
  requestAnimationFrame(drawScene);
}

function handleCanvasPointerUp(e) {
  if (Date.now() - renderer.lastCanvasTouchAt < 450) return;
  handleCanvasActivation(e.clientX, e.clientY);
}

function handleCanvasTouchEnd(e) {
  const touch = e.changedTouches[0];
  if (!touch) return;
  renderer.lastCanvasTouchAt = Date.now();
  handleCanvasActivation(touch.clientX, touch.clientY);
}

function handleCanvasActivation(clientX, clientY) {
  const { canvas, W, H, state } = renderer;
  if (!hasEffectiveMinimap(state)) {
    renderer.minimapOverlayVisible = false;
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * W;
  const y = ((clientY - rect.top) / rect.height) * H;
  if (renderer.minimapOverlayVisible) {
    renderer.minimapOverlayVisible = false;
    return;
  }

  const bounds = renderer.getMinimapBounds(W);
  if (
    x >= bounds.x && x <= bounds.x + bounds.w &&
    y >= bounds.y && y <= bounds.y + bounds.h
  ) {
    renderer.minimapOverlayVisible = true;
  }
}

function hasEffectiveTorch(state) {
  return Number(state?.torchFuel) > 0 || Boolean(state?.torchEffectForced) || Boolean(state?.lightbringerActive);
}

function hasEffectiveMinimap(state) {
  if (state?.minimapBlocked) return false;
  return hasEffectiveTorch(state) || Boolean(state?.minimapEffectForced);
}

function drawMinimapStatic(now) {
  const { ctx, minimapStaticFrames } = renderer;
  if (!minimapStaticFrames.length) return;
  const frame = minimapStaticFrames[Math.floor(now / 90) % minimapStaticFrames.length];
  ctx.drawImage(frame.canvas, frame.x, frame.y);
}

function makeMinimapStaticFrames(bounds) {
  const width = Math.max(1, Math.ceil(bounds.w));
  const height = Math.max(1, Math.ceil(bounds.h));
  return Array.from({ length: 4 }, (_, frameIndex) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const grain = Math.floor(Math.random() * 105) + 38;
        const scanline = y % 3 === frameIndex % 3 ? .62 : 1;
        const value = Math.floor(grain * scanline);
        image.data[index] = value;
        image.data[index + 1] = value;
        image.data[index + 2] = Math.min(255, value + 5);
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    ctx.strokeStyle = "rgba(184,167,127,.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    for (let y = frameIndex; y < height; y += 4) ctx.fillRect(0, y, width, 1);
    return { canvas, x: bounds.x, y: bounds.y };
  });
}

function drawMinimapOverlay() {
  const { ctx, W, H } = renderer;
  const size = Math.min(W * .58, H * .72, 360);
  const ox = (W - size) / 2;
  const oy = (H - size) / 2;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.58)";
  ctx.fillRect(0, 0, W, H);
  renderer.drawMinimap(ctx, {
    ...renderer.getMinimapOptions(),
    H,
    roundRect,
    size,
    ox,
    oy,
    alpha: .96
  });
  ctx.restore();
}

function drawEncounterMessage() {
  const { ctx, W, H, state } = renderer;
  const event = state.overlayEvent;
  document.body.classList.toggle("event-message-expanded", Number(event?.reserveMessageLines) >= 4);
  if (!event) return;
  const message = event.encounterLabel || (
    event.encounterType === "ambush" ? "AMBUSH!!" : "ENCOUNTER!!"
  );
  const startedAt = Number(event.encounterAnimationStartedAt) || performance.now();
  const progress = Math.max(0, Math.min(1, (performance.now() - startedAt) / 1400));
  const zoomProgress = 1 - Math.pow(1 - progress, 3);
  const scale = .12 + zoomProgress * 1.23;
  const fadeIn = Math.min(1, progress / .12);
  const fadeOut = progress < .58 ? 1 : Math.max(0, 1 - (progress - .58) / .42);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.8)";
  ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = fadeIn * fadeOut;
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '80px "PixelFont", monospace';
  ctx.strokeText(message, 0, 0);
  ctx.fillText(message, 0, 0);
  ctx.restore();
}

function drawFloorLapMessage() {
  const { ctx, W, H, state } = renderer;
  const title = String(state.overlayEvent?.overlayMessage || "");
  const subtitle = String(state.overlayEvent?.overlaySubtitle || "");
  if (!title) return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.8)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f0eadc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 ${Math.max(54, Math.floor(H * .15))}px PixelFont, monospace`;
  const titleY = subtitle ? H * .46 : H / 2;
  ctx.fillText(title, W / 2, titleY);
  if (subtitle) {
    ctx.fillStyle = "#bbb5aa";
    ctx.font = `400 ${Math.max(18, Math.floor(H * .045))}px PixelFont, monospace`;
    ctx.fillText(subtitle, W / 2, H * .59);
  }
  ctx.restore();
}

function drawOverlayEvent() {
  const { eventOverlayCtx: ctx, W, H, state } = renderer;
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  const event = state.overlayEvent;
  renderer.eventOverlayCanvas.style.pointerEvents = event?.type === "floorLap" ? "auto" : "none";
  if (!event?.showOverlay) return;
  if (event.type === "randomEncounter") return;
  const image = event.imageId ? renderer.characterImages.get(event.imageId) : null;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.8)";
  ctx.fillRect(0, 0, W, H);

  if (image && image.complete && image.naturalWidth > 0) {
    const mirageProgress = event.type === "fountain" && event.phase === "mirageFading"
      ? Math.max(0, Math.min(1, (performance.now() - Number(event.mirageFadeStartedAt || 0)) / 1500))
      : 0;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (mirageProgress > 0) {
      ctx.globalAlpha = Math.max(0, 1 - mirageProgress);
      ctx.filter = `blur(${Math.floor(mirageProgress * 5)}px)`;
      if (!reducedMotion) ctx.translate(Math.sin(mirageProgress * Math.PI * 12) * (3 + mirageProgress * 15), 0);
    }
    if (event.type === "fixedFloorEvent" && event.phase === "fading") {
      const fadeProgress = Math.max(0, Math.min(1, (performance.now() - Number(event.fadeStartedAt || 0)) / 650));
      ctx.globalAlpha = Math.max(0, 1 - fadeProgress);
      ctx.filter = `blur(${Math.floor(fadeProgress * 4)}px)`;
    }
    if (event.imageFit === "cover") {
      const scale = Math.max(W / image.naturalWidth, H / image.naturalHeight);
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      ctx.drawImage(image, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
      ctx.restore();
      return;
    }
    if (event.silhouette) {
      ctx.filter = "brightness(0) drop-shadow(0 0 3px rgba(225,252,255,.98)) drop-shadow(0 0 12px rgba(128,235,255,.9))";
    }
    const aspect = image.naturalWidth / image.naturalHeight;
    const maxH = H * .86;
    const maxW = W * .68;
    let drawH = maxH;
    let drawW = drawH * aspect;
    if (drawW > maxW) {
      drawW = maxW;
      drawH = drawW / aspect;
    }
    ctx.shadowColor = event.glow === "paleBlue"
      ? "rgba(170,235,255,.9)"
      : "rgba(255,224,150,.42)";
    ctx.shadowBlur = event.glow === "paleBlue"
      ? Math.max(22, H * .065)
      : Math.max(12, H * .035);
    ctx.drawImage(image, (W - drawW) / 2, H * .52 - drawH / 2, drawW, drawH);
  }
  ctx.restore();
}

export function drawCeiling() {
  const { ctx, W, H } = renderer;
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.52);
  if (renderer.floorColor === "yellow") {
    g.addColorStop(0, "rgb(38, 111, 176)");
    g.addColorStop(0.58, "rgb(25, 75, 122)");
    g.addColorStop(1, "rgb(8, 27, 46)");
  } else if (renderer.floorColor === "white") {
    g.addColorStop(0, "rgb(185, 185, 185)");
    g.addColorStop(0.58, "rgb(155, 155, 155)");
    g.addColorStop(1, "rgb(125, 125, 125)");
  } else if (renderer.floorColor === "crystal") {
    g.addColorStop(0, "rgb(63, 20, 77)");
    g.addColorStop(0.58, "rgb(43, 13, 56)");
    g.addColorStop(1, "rgb(23, 7, 32)");
  } else if (renderer.floorColor === "acacia") {
    g.addColorStop(0, "rgb(123, 118, 31)");
    g.addColorStop(0.58, "rgb(92, 88, 23)");
    g.addColorStop(1, "rgb(61, 58, 15)");
  } else if (renderer.floorColor === "torture") {
    g.addColorStop(0, "rgb(21, 20, 14)");
    g.addColorStop(0.58, "rgb(16, 15, 11)");
    g.addColorStop(1, "rgb(10, 10, 7)");
  } else if (renderer.floorColor === "magic") {
    g.addColorStop(0, "rgb(25, 17, 54)");
    g.addColorStop(0.58, "rgb(15, 10, 36)");
    g.addColorStop(1, "rgb(7, 4, 20)");
  } else {
    g.addColorStop(0, "#151918");
    g.addColorStop(0.58, "#0d1010");
    g.addColorStop(1, "#050606");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H / 2);

  ctx.strokeStyle = "rgba(116, 106, 88, .12)";
  ctx.lineWidth = 1;
  for (let y = 38; y < H / 2; y += 39) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + Math.sin(y) * 5);
    ctx.stroke();
  }
}

export function drawFloor() {
  const { ctx, W, H } = renderer;
  const palette = FLOOR_PALETTES[renderer.floorColor] || FLOOR_PALETTES.default;
  const horizon = H / 2;
  const floorGrad = ctx.createLinearGradient(0, horizon, 0, H);
  floorGrad.addColorStop(0, palette.near);
  floorGrad.addColorStop(0.42, palette.mid);
  floorGrad.addColorStop(1, palette.far);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, horizon, W, H / 2);

  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let y = horizon + 18; y < H; y += 18) {
    const spread = (y - horizon) / (H - horizon);
    ctx.beginPath();
    ctx.moveTo(W * (0.5 - spread * 0.52), y);
    ctx.lineTo(W * (0.5 + spread * 0.52), y);
    ctx.stroke();
  }
}

function drawRapidCurrentMotion(now) {
  const { ctx, W, H, state } = renderer;
  if (!state.rapidCurrentTransitionActive || state.overlayEvent?.type === "rapidCurrent") return;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const elapsed = Math.max(0, now - Number(state.rapidCurrentMotionStartedAt || now));
  const speed = reducedMotion ? 0.004 : 0.009;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, H / 2, W, H / 2);
  ctx.clip();
  ctx.strokeStyle = reducedMotion ? "rgba(151,215,255,.24)" : "rgba(174,229,255,.42)";
  ctx.lineWidth = reducedMotion ? 2 : 3;
  for (let row = 0; row < 7; row += 1) {
    const y = H * (0.56 + row * 0.065);
    const offset = (elapsed * speed * W + row * 47) % (W + 120) - 60;
    ctx.beginPath();
    for (let x = -120; x <= W + 120; x += 40) {
      const px = x + offset;
      const py = y + Math.sin((x + elapsed * 0.25) * 0.045) * (reducedMotion ? 1 : 4);
      if (x === -120) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  if (!reducedMotion) {
    ctx.fillStyle = "rgba(215,246,255,.55)";
    for (let index = 0; index < 12; index += 1) {
      const x = (index * 83 + elapsed * 0.18) % W;
      const y = H * 0.72 + Math.sin(index * 2.1 + elapsed * 0.008) * H * 0.12;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + index % 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawBoundaryWalls() {
  const { ctx, W, H, wallTexture, doorTextures, state } = renderer;
  const colW = W / RAYS;
  for (let i = 0; i < RAYS; i++) {
    const t = i / (RAYS - 1);
    const angle = state.angle - FOV / 2 + FOV * t;
    const hit = castRay(angle);
    const wallH = Math.min(H * 1.85, H / hit.corrected);
    const y1 = (H - wallH) / 2;
    const x = Math.floor(i * colW);
    const activeWallTexture = getWallTextureForHit(hit, wallTexture);
    const wallSampleX = Math.floor(hit.u * activeWallTexture.width) % activeWallTexture.width;
    const shade = Math.max(0.18, 1 - hit.dist / MAX_DIST);
    const orientationShade = hit.side === 0 ? 0.82 : 0.68;
    const light = Math.min(1.12, shade * orientationShade + 0.13 + state.torch);
    const doorTexture = doorTextures[hit.doorKind] || doorTextures.normal;

    ctx.drawImage(activeWallTexture, wallSampleX, 0, 1, activeWallTexture.height, x, y1, Math.ceil(colW) + 1, wallH);
    ctx.fillStyle = `rgba(0,0,0,${1 - light})`;
    ctx.fillRect(x, y1, Math.ceil(colW) + 1, wallH);

    if (hit.type === "door" && hit.doorState === "open") {
      const doorU = getOpenDoorSample(hit.u);
      const doorSampleX = Math.floor(doorU * doorTexture.width) % doorTexture.width;
      ctx.drawImage(doorTexture, doorSampleX, 0, 1, doorTexture.height, x, y1, Math.ceil(colW) + 1, wallH);
      ctx.fillStyle = "rgba(0,0,0,.28)";
      ctx.fillRect(x, y1, Math.ceil(colW) + 1, wallH);
    } else if (hit.type === "door" && isDoorPanelSample(hit.u)) {
      const doorU = normalizeDoorSample(hit.u);
      const opening = getDoorOpeningProgress(hit);
      if (isDoorOpeningGap(doorU, opening)) {
        ctx.fillStyle = "rgba(0,0,0,.72)";
        ctx.fillRect(x, y1, Math.ceil(colW) + 1, wallH);
      } else {
        const doorSampleX = Math.floor(getSlidingDoorSample(doorU, opening) * doorTexture.width) % doorTexture.width;
        const doorLight = Math.min(1.12, shade * orientationShade + 0.2 + state.torch);
        ctx.drawImage(doorTexture, doorSampleX, 0, 1, doorTexture.height, x, y1, Math.ceil(colW) + 1, wallH);
        ctx.fillStyle = `rgba(0,0,0,${1 - doorLight})`;
        ctx.fillRect(x, y1, Math.ceil(colW) + 1, wallH);
        if (isDoorPanelEdgeSample(hit.u) || isDoorOpeningEdge(doorU, opening)) {
          ctx.fillStyle = "rgba(255,219,143,.16)";
          ctx.fillRect(x, y1, Math.ceil(colW) + 1, wallH);
        }
      }
    } else if (isEdgeSample(hit.u)) {
      ctx.fillStyle = "rgba(0,0,0,.24)";
      ctx.fillRect(x, y1, Math.ceil(colW) + 1, wallH);
    }
    const distanceMistAlpha = getDistanceMistAlpha(hit.dist);
    if (distanceMistAlpha > 0) {
      ctx.fillStyle = rgba(MIST_PALETTES[renderer.mistColor].main, distanceMistAlpha);
      ctx.fillRect(x, y1, Math.ceil(colW) + 1, wallH);
    }
    const darknessAlpha = getDistanceDarknessAlpha(hit.dist);
    if (darknessAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${darknessAlpha})`;
      ctx.fillRect(x, y1, Math.ceil(colW) + 1, wallH);
    }
  }
}

function getWallTextureForHit(hit, fallback) {
  const textures = getThemedWallTextures(renderer.wallColor);
  if (textures.length === 0) return fallback;
  const cellKey = Math.abs((Number(hit.cellX) || 0) + (Number(hit.cellY) || 0));
  return textures[cellKey % textures.length] || fallback;
}

function getThemedWallTextures(color) {
  if (color === "stone") return renderer.starterWallTextures;
  if (color === "red") return renderer.fireWallTextures;
  if (color === "blue") return renderer.iceWallTextures;
  if (color === "green") return renderer.forestWallTextures;
  if (color === "black") return renderer.darkWallTextures;
  if (color === "yellow") return renderer.desertWallTextures;
  if (color === "slate") return renderer.midDungeonWallTextures;
  if (color === "magic") return renderer.magicWallTextures;
  if (color === "torture") return renderer.tortureWallTextures;
  if (color === "water") return renderer.waterWallTextures;
  if (color === "crystal") return renderer.crystalWallTextures;
  if (color === "acacia") return renderer.acaciaWallTextures;
  if (color === "white") return renderer.marbleWallTextures;
  return [];
}

function loadStarterWallTextures() {
  loadThemedWallTextures("starterWallTextures", "stone", [
    "images/dungeon_effects/dungeon_wall_03.webp",
    "images/dungeon_effects/dungeon_wall_04.webp"
  ]);
}

function loadForestWallTextures() {
  loadThemedWallTextures("forestWallTextures", "green", [
    "images/dungeon_effects/forest_01.webp",
    "images/dungeon_effects/forest_02.webp"
  ]);
}

function loadFireWallTextures() {
  loadThemedWallTextures("fireWallTextures", "red", [
    "images/dungeon_effects/fire_wall_01.webp",
    "images/dungeon_effects/fire_wall_02.webp"
  ]);
}

function loadIceWallTextures() {
  loadThemedWallTextures("iceWallTextures", "blue", [
    "images/dungeon_effects/ice_wall_01.webp",
    "images/dungeon_effects/ice_wall_02.webp"
  ]);
}

function loadDarkWallTextures() {
  loadThemedWallTextures("darkWallTextures", "black", [
    "images/dungeon_effects/dark_wall_01.webp",
    "images/dungeon_effects/dark_wall_02.webp"
  ]);
}

function loadDesertWallTextures() {
  loadThemedWallTextures("desertWallTextures", "yellow", [
    "images/dungeon_effects/desert_wall_01.webp",
    "images/dungeon_effects/desert_wall_02.webp"
  ]);
}

function loadMidDungeonWallTextures() {
  loadThemedWallTextures("midDungeonWallTextures", "slate", [
    "images/dungeon_effects/dungeon_wall_05.webp",
    "images/dungeon_effects/dungeon_wall_06.webp"
  ]);
}

function loadMagicWallTextures() {
  loadThemedWallTextures("magicWallTextures", "magic", [
    "images/dungeon_effects/magic_wall_01.webp",
    "images/dungeon_effects/magic_wall_02.webp"
  ]);
}

function loadTortureWallTextures() {
  loadThemedWallTextures("tortureWallTextures", "torture", [
    "images/dungeon_effects/torture_wall_01.webp",
    "images/dungeon_effects/torture_wall_02.webp"
  ]);
}
function loadWaterWallTextures() {
  loadThemedWallTextures("waterWallTextures", "water", [
    "images/dungeon_effects/watar_wall_01.webp",
    "images/dungeon_effects/watar_wall_02.webp"
  ]);
}

function loadCrystalWallTextures() {
  loadThemedWallTextures("crystalWallTextures", "crystal", [
    "images/dungeon_effects/crystal_wall_01.webp",
    "images/dungeon_effects/crystal_wall_02.webp"
  ]);
}

function loadAcaciaWallTextures() {
  loadThemedWallTextures("acaciaWallTextures", "acacia", [
    "images/dungeon_effects/acacia_wall_01.webp",
    "images/dungeon_effects/acacia_wall_02.webp"
  ]);
}

function loadMarbleWallTextures() {
  loadThemedWallTextures("marbleWallTextures", "white", [
    "images/dungeon_effects/marble_wall_01.webp",
    "images/dungeon_effects/marble_wall_02.webp"
  ]);
}

function loadThemedWallTextures(stateKey, color, paths) {
  Promise.all(paths.map(loadWallTextureImage)).then(textures => {
    renderer[stateKey] = textures.filter(Boolean);
    if (renderer.wallColor === color && renderer[stateKey].length) {
      renderer.wallTexture = renderer[stateKey][0];
    }
  }).catch(() => {
    renderer[stateKey] = [];
  });
}

function loadWallTextureImage(path) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const texture = document.createElement("canvas");
      texture.width = image.naturalWidth || 256;
      texture.height = image.naturalHeight || 256;
      texture.getContext("2d").drawImage(image, 0, 0, texture.width, texture.height);
      resolve(texture);
    };
    image.onerror = () => resolve(null);
    image.src = path;
  });
}

export function drawMist(now = 0) {
  if (!renderer.mistEnabled) return;
  const { ctx, W, H, mistLayers } = renderer;
  if (!mistLayers) return;
  const strength = renderer.mistIntensity;
  const palette = MIST_PALETTES[renderer.mistColor];

  ctx.save();
  ctx.globalAlpha = Math.min(1, strength);
  ctx.fillStyle = mistLayers.vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = rgba(palette.veil, .075);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (strength > 1) {
    ctx.fillStyle = rgba(palette.veil, Math.min(.24, (strength - 1) * .24));
    ctx.fillRect(0, 0, W, H);
  }

  const driftX = Math.sin(now * .00011) * W * .025;
  const driftY = Math.sin(now * .000073 + 1.4) * H * .008;
  ctx.save();
  ctx.globalAlpha = Math.min(.7, .34 * strength);
  ctx.drawImage(mistLayers.lowMist, -W * .1 + driftX, H * .47 + driftY);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = Math.min(1, strength);
  ctx.fillStyle = mistLayers.torchBloom;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function getDistanceMistAlpha(distance) {
  if (!renderer.mistEnabled) return 0;
  const mistDistance = renderer.mistDistance;
  const mistStart = mistDistance * .25;
  const progress = Math.max(0, Math.min(1, (distance - mistStart) / (mistDistance - mistStart)));
  const smooth = progress * progress * (3 - 2 * progress);
  return Math.min(.98, smooth * DISTANCE_MIST_BASE_ALPHA * renderer.mistIntensity);
}

function getDarknessSettings() {
  const fuel = renderer.state?.torchEffectForced
    ? 100
    : Number.isFinite(renderer.state?.torchFuel) ? renderer.state.torchFuel : 100;
  const remaining = Math.max(0, Math.min(100, fuel));
  if (remaining >= 50) return { strength: 0, intensity: .25, distance: 9 };
  let intensity;
  let distance;
  if (remaining >= 10) {
    const progress = (50 - remaining) / 40;
    intensity = .25 + (2 - .25) * progress;
    distance = 9 + (3 - 9) * progress;
  } else {
    const progress = (10 - remaining) / 10;
    intensity = 2 + .5 * progress;
    distance = 3 + (2 - 3) * progress;
  }
  return { strength: Math.max(0, Math.min(1, (intensity - .25) / 2.25)), intensity, distance };
}

function getDistanceDarknessAlpha(distance) {
  const darkness = getDarknessSettings();
  if (darkness.strength <= 0) return 0;
  const darknessStart = darkness.distance * .25;
  const progress = Math.max(0, Math.min(1, (distance - darknessStart) / (darkness.distance - darknessStart)));
  const smooth = progress * progress * (3 - 2 * progress);
  return Math.min(.98, smooth * darkness.strength);
}

function drawDarkness() {
  const { ctx, W, H, mistLayers } = renderer;
  const darkness = getDarknessSettings();
  if (darkness.strength <= 0 || !mistLayers) return;
  ctx.save();
  ctx.globalAlpha = darkness.strength;
  ctx.fillStyle = mistLayers.darknessVignette;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(0,0,0,${darkness.strength * .12})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function makeMistLayers(ctx, W, H) {
  const palette = MIST_PALETTES[renderer.mistColor];
  const vignette = ctx.createRadialGradient(W / 2, H * .5, W * .08, W / 2, H * .5, W * .62);
  vignette.addColorStop(0, rgba(palette.veil, .02));
  vignette.addColorStop(.42, rgba(palette.veil, .08));
  vignette.addColorStop(.75, "rgba(4,7,7,.38)");
  vignette.addColorStop(1, "rgba(0,0,0,.76)");

  const torchBloom = ctx.createRadialGradient(W / 2, H * .53, 8, W / 2, H * .53, W * .34);
  torchBloom.addColorStop(0, rgba(palette.bloom, .095));
  torchBloom.addColorStop(.34, rgba(palette.bloom, .052));
  torchBloom.addColorStop(1, "rgba(0,0,0,0)");

  const darknessVignette = ctx.createRadialGradient(W / 2, H * .53, W * .08, W / 2, H * .53, W * .68);
  darknessVignette.addColorStop(0, "rgba(0,0,0,0)");
  darknessVignette.addColorStop(.42, "rgba(0,0,0,.06)");
  darknessVignette.addColorStop(.76, "rgba(0,0,0,.42)");
  darknessVignette.addColorStop(1, "rgba(0,0,0,.82)");

  const lowMist = document.createElement("canvas");
  lowMist.width = Math.ceil(W * 1.2);
  lowMist.height = Math.ceil(H * .4);
  const lowCtx = lowMist.getContext("2d");
  const vertical = lowCtx.createLinearGradient(0, 0, 0, lowMist.height);
  vertical.addColorStop(0, rgba(palette.main, 0));
  vertical.addColorStop(.28, rgba(palette.main, .1));
  vertical.addColorStop(.62, rgba(palette.main, .2));
  vertical.addColorStop(1, rgba(palette.veil, 0));
  lowCtx.fillStyle = vertical;
  lowCtx.fillRect(0, 0, lowMist.width, lowMist.height);

  lowCtx.save();
  lowCtx.scale(1, .32);
  const haze = lowCtx.createRadialGradient(lowMist.width * .48, lowMist.height * 1.55, 10, lowMist.width * .48, lowMist.height * 1.55, lowMist.width * .6);
  haze.addColorStop(0, rgba(palette.haze, .2));
  haze.addColorStop(.56, rgba(palette.main, .1));
  haze.addColorStop(1, "rgba(0,0,0,0)");
  lowCtx.fillStyle = haze;
  lowCtx.fillRect(0, 0, lowMist.width, lowMist.height * 3.2);
  lowCtx.restore();

  return { vignette, torchBloom, darknessVignette, lowMist };
}

function rgba([r, g, b], alpha) {
  return `rgba(${r},${g},${b},${alpha})`;
}

export function drawCellEvents(layer = "all") {
  const { ctx, W, H, state } = renderer;
  const {
    MAP_W,
    MAP_H,
    cells
  } = renderer.getMinimapOptions();
  if (!cells) return;

  const events = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const cell = cells[y][x];
      const projected = projectCellCenter(x, y);
      if (!projected) continue;
      const hasSprite = isSpriteEventCell(cell);
      if (hasSprite ? !isSpriteCellVisible(x, y) : !hasLineOfSightToCell(x, y)) continue;
      if (cell.type === "stairsUp" || cell.type === "stairsDown") {
        if (layer === "sprite") continue;
        events.push({
          ...projected,
          footprint: projectCellFootprint(x, y, projected.forward),
          eventKind: "stairs",
          type: cell.type,
          portal: cell.portal
        });
      }
      if (cell.fixedWarp || cell.fixedReturnPortal) {
        if (layer === "floor") continue;
        events.push({
          ...projected,
          eventKind: "fixedPortal",
          npc: { imageId: "warp_portal_b100f", renderScale: 0.82, glow: "paleBlue" }
        });
      }
      if (cell.fixedEvent) {
        if (layer === "floor") continue;
        events.push({
          ...projected,
          eventKind: "fixedEvent",
          npc: { imageId: "NPC_01b", renderScale: 0.92, glow: "paleBlue" }
        });
      }
      if (cell.bossId) {
        if (layer === "floor") continue;
        const boss = getBossById(cell.bossId);
        if (boss) events.push({
          ...projected,
          eventKind: "boss",
          npc: {
            imageId: boss.encounterImageId,
            renderScale: boss.renderScale,
            silhouette: Boolean(
              renderer.state?.minimapBlocked && B100_GAUNTLET_BOSS_IDS.includes(cell.bossId)
            )
          }
        });
      }
      if (cell.bossRemainsId) {
        if (layer === "floor") continue;
        const boss = getBossById(cell.bossRemainsId);
        if (boss) events.push({ ...projected, eventKind: "bossRemains", npc: { imageId: boss.defeatedEncounterImageId } });
      }
      if (cell.npc) {
        if (layer === "floor") continue;
        const npc = getNpcById(cell.npc);
        if (!npc) continue;
        events.push({
          ...projected,
          eventKind: "npc",
          npc
        });
      }
      if (cell.fountain) {
        if (layer === "floor") continue;
        events.push({
          ...projected,
          eventKind: "fountain",
          npc: { imageId: getFountainById(cell.fountain).id }
        });
      }
      if (cell.quicksand) {
        if (layer === "floor") continue;
        events.push({
          ...projected,
          eventKind: "quicksand",
          npc: { imageId: DESERT_QUICKSAND.id }
        });
      }
      if (cell.treasure) {
        if (layer === "floor") continue;
        events.push({
          ...projected,
          eventKind: "treasure",
          treasureType: cell.treasure
        });
      }
      if (cell.questEvent) {
        if (layer === "floor") continue;
        events.push({ ...projected, eventKind: "questEvent", questEvent: cell.questEvent });
      }
    }
  }

  events
    .sort((a, b) => b.forward - a.forward)
    .forEach(event => {
      if (event.eventKind === "stairs") drawStairsEventMarker(ctx, W, H, event);
      if (event.eventKind === "npc") drawNpcEvent(ctx, event);
      if (event.eventKind === "boss") drawNpcEvent(ctx, event);
      if (event.eventKind === "bossRemains") drawNpcEvent(ctx, event);
      if (event.eventKind === "fountain") drawNpcEvent(ctx, event);
      if (event.eventKind === "quicksand") drawNpcEvent(ctx, event);
      if (event.eventKind === "treasure") drawTreasureEvent(ctx, event);
      if (event.eventKind === "questEvent") drawQuestEvent(ctx, event);
      if (event.eventKind === "fixedPortal") drawNpcEvent(ctx, event);
      if (event.eventKind === "fixedEvent") drawNpcEvent(ctx, event);
    });
}

function loadTreasureImage(type, src, tint = "") {
  if (renderer.treasureImages.has(type)) return;
  const image = new Image();
  if (tint) {
    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = tint;
      context.globalAlpha = .78;
      context.fillRect(0, 0, canvas.width, canvas.height);
      renderer.treasureImages.set(type, canvas);
    }, { once: true });
  }
  image.src = src;
  renderer.treasureImages.set(type, image);
}

function loadCharacterImage(id, src) {
  if (renderer.characterImages.has(id)) return;
  const image = new Image();
  image.src = src;
  renderer.characterImages.set(id, image);
}

function projectCellCenter(cellX, cellY) {
  return projectWorldPoint(cellX + .5, cellY + .5);
}

export function isSpriteEventCell(cell = {}) {
  return Boolean(cell.bossId || cell.bossRemainsId || cell.npc || cell.fountain || cell.quicksand || cell.treasure || cell.questEvent || cell.fixedWarp || cell.fixedReturnPortal || cell.fixedEvent);
}

function drawQuestEvent(ctx, event) {
  const radius = Math.max(8, event.size * .32);
  const isCollectible = Boolean(event.questEvent?.itemId || event.questEvent?.keyItemId);
  ctx.save();
  ctx.globalAlpha = event.alpha;
  if (isCollectible) {
    const centerY = event.floorY - radius * 1.4;
    const pulse = .94 + Math.sin(performance.now() * .004) * .06;
    const glow = ctx.createRadialGradient(event.x, centerY, 0, event.x, centerY, radius * 3.8 * pulse);
    glow.addColorStop(0, "rgba(239,253,255,.98)");
    glow.addColorStop(.12, "rgba(180,246,255,.92)");
    glow.addColorStop(.34, "rgba(91,221,255,.55)");
    glow.addColorStop(.68, "rgba(42,177,255,.18)");
    glow.addColorStop(1, "rgba(42,177,255,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(event.x, centerY, radius * 3.8 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "rgba(185,247,255,.98)";
    ctx.shadowBlur = radius * 2.8;
    ctx.fillStyle = "rgba(222,252,255,.78)";
    ctx.beginPath();
    ctx.arc(event.x, centerY, radius * .66, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.shadowColor = "rgba(110,225,255,.95)";
  ctx.shadowBlur = radius * 3.4;
  ctx.fillStyle = "rgba(190,250,255,.92)";
  ctx.beginPath();
  ctx.arc(event.x, event.floorY - radius * 1.4, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function isSpriteCellVisible(cellX, cellY) {
  const { state } = renderer;
  return hasGridLineOfSight({
    viewerX: state.x,
    viewerY: state.y,
    targetX: cellX + .5,
    targetY: cellY + .5,
    targetCellX: cellX,
    targetCellY: cellY,
    wallOnCell: renderer.wallOnCell
  });
}

function projectCellFootprint(cellX, cellY, forward, requireFullVisibility = false) {
  const visibilityInset = .18;
  const projectionInset = .03;
  const visibilitySamples = [
    { x: cellX + visibilityInset, y: cellY + visibilityInset },
    { x: cellX + 1 - visibilityInset, y: cellY + visibilityInset },
    { x: cellX + 1 - visibilityInset, y: cellY + 1 - visibilityInset },
    { x: cellX + visibilityInset, y: cellY + 1 - visibilityInset }
  ];
  if (
    (requireFullVisibility || forward > 1.35) &&
    visibilitySamples.some(sample => !hasLineOfSightToPoint(sample.x, sample.y, cellX, cellY))
  ) {
    return null;
  }

  const projectionSamples = [
    { x: cellX + projectionInset, y: cellY + projectionInset },
    { x: cellX + 1 - projectionInset, y: cellY + projectionInset },
    { x: cellX + 1 - projectionInset, y: cellY + 1 - projectionInset },
    { x: cellX + projectionInset, y: cellY + 1 - projectionInset }
  ];
  const corners = projectionSamples.map(sample => projectWorldPoint(sample.x, sample.y));
  if (corners.some(corner => !corner)) return null;
  return {
    floor: corners.map(corner => ({ x: corner.x, y: corner.floorY })),
    ceiling: corners.map(corner => ({ x: corner.x, y: corner.ceilingY }))
  };
}

function projectWorldPoint(worldX, worldY) {
  const { W, H, state } = renderer;
  const dx = worldX - state.x;
  const dy = worldY - state.y;
  const forward = dx * Math.cos(state.angle) + dy * Math.sin(state.angle);
  if (forward <= .25 || forward > MAX_DIST) return null;

  const side = dx * -Math.sin(state.angle) + dy * Math.cos(state.angle);
  const focalLength = (W / 2) / Math.tan(FOV / 2);
  const x = W / 2 + (side / forward) * focalLength;
  if (x < -W * .08 || x > W * 1.08) return null;

  const projectedWallH = Math.min(H * 1.85, H / forward);
  const floorY = Math.max(H * .5, Math.min(H * .94, H / 2 + projectedWallH / 2));
  const ceilingY = Math.min(H * .5, Math.max(H * .06, H / 2 - projectedWallH / 2));
  const size = Math.max(14, Math.min(104, (H * .32) / Math.max(.8, forward)));
  const baseAlpha = Math.max(.52, Math.min(1, 1 - forward / (MAX_DIST * 1.45)));
  const mistVisibility = 1 - getDistanceMistAlpha(forward) * .68;
  const darknessVisibility = 1 - getDistanceDarknessAlpha(forward) * .9;
  const alpha = baseAlpha * mistVisibility * darknessVisibility;
  return { x, y: floorY, floorY, ceilingY, size, alpha, forward };
}

function hasLineOfSightToCell(targetCellX, targetCellY) {
  return hasLineOfSightToPoint(targetCellX + .5, targetCellY + .5, targetCellX, targetCellY);
}

function hasLineOfSightToPoint(targetX, targetY, targetCellX = Math.floor(targetX), targetCellY = Math.floor(targetY)) {
  const { state } = renderer;
  return hasGridLineOfSight({
    viewerX: state.x,
    viewerY: state.y,
    targetX,
    targetY,
    targetCellX,
    targetCellY,
    wallOnCell: renderer.wallOnCell
  });
}

export function hasGridLineOfSight({
  viewerX,
  viewerY,
  targetX,
  targetY,
  targetCellX = Math.floor(targetX),
  targetCellY = Math.floor(targetY),
  wallOnCell = () => true
} = {}) {
  let prevX = Math.floor(viewerX);
  let prevY = Math.floor(viewerY);
  const dx = targetX - viewerX;
  const dy = targetY - viewerY;
  const steps = Math.max(8, Math.ceil(Math.hypot(dx, dy) * 12));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const sampleX = viewerX + dx * t;
    const sampleY = viewerY + dy * t;
    const cellX = Math.floor(sampleX);
    const cellY = Math.floor(sampleY);
    if (cellX === prevX && cellY === prevY) continue;

    const dirKey = directionKeyBetween(prevX, prevY, cellX, cellY);
    if (!dirKey || wallOnCell(prevX, prevY, dirKey)) return false;
    prevX = cellX;
    prevY = cellY;
    if (prevX === targetCellX && prevY === targetCellY) return true;
  }
  return prevX === targetCellX && prevY === targetCellY;
}

function directionKeyBetween(fromX, fromY, toX, toY) {
  if (toX > fromX) return "E";
  if (toX < fromX) return "W";
  if (toY > fromY) return "S";
  if (toY < fromY) return "N";
  return null;
}

function drawStairsEventMarker(ctx, W, H, event) {
  const isUp = event.type === "stairsUp";
  const isPortal = isUp && String(event.portal || "").startsWith("transfer_b");
  const color = isPortal ? "#c67cff" : isUp ? "#8ed4ff" : "#f3b15a";
  const quad = event.footprint ? (isUp ? event.footprint.ceiling : event.footprint.floor) : null;
  const centerY = isUp ? event.ceilingY : event.floorY;
  const glowY = isUp ? centerY + event.size * .22 : centerY - event.size * .22;
  if (!quad && event.forward > 2.25) return;

  ctx.save();
  ctx.globalAlpha = event.alpha;
  const glow = ctx.createRadialGradient(event.x, glowY, 2, event.x, glowY, event.size * 1.55);
  glow.addColorStop(0, isPortal ? "rgba(198,124,255,.72)" : isUp ? "rgba(142,212,255,.68)" : "rgba(243,177,90,.68)");
  glow.addColorStop(.5, isPortal ? "rgba(198,124,255,.28)" : isUp ? "rgba(142,212,255,.24)" : "rgba(243,177,90,.24)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(event.x, glowY, event.size * 1.55, 0, Math.PI * 2);
  ctx.fill();

  if (!quad) {
    drawNearStairsFallbackLine(ctx, event.x, centerY, event.size, color, isUp);
    ctx.restore();
    return;
  }

  if (isUp) {
    drawCeilingStairsOpening(ctx, event.x, centerY, event.size, color, quad);
  } else {
    drawFloorStairsOpening(ctx, event.x, centerY, event.size, color, quad);
  }
  ctx.restore();
}

function drawNpcEvent(ctx, event) {
  const image = renderer.characterImages.get(event.npc.imageId);
  const proximityScale = event.forward <= 1.55 ? 1.22 : 1;
  const spriteH = event.size * 2.05 * proximityScale * Math.max(0.25, Number(event.npc.renderScale) || 1);
  const fallbackW = spriteH * .64;
  const top = event.floorY - spriteH;

  ctx.save();
  ctx.globalAlpha = event.alpha;
  if (event.npc.silhouette) {
    ctx.filter = "brightness(0) drop-shadow(0 0 3px rgba(225,252,255,.98)) drop-shadow(0 0 10px rgba(128,235,255,.9))";
  }
  ctx.shadowColor = event.npc.glow === "paleBlue"
    ? "rgba(165,235,255,.95)"
    : "rgba(255,221,151,.45)";
  ctx.shadowBlur = event.npc.glow === "paleBlue" ? event.size * .32 : event.size * .14;
  if (image && image.complete && image.naturalWidth > 0) {
    const drawW = spriteH * (image.naturalWidth / image.naturalHeight);
    ctx.drawImage(image, event.x - drawW / 2, top, drawW, spriteH);
  } else {
    ctx.fillStyle = "rgba(255,232,186,.72)";
    ctx.fillRect(event.x - fallbackW / 2, top, fallbackW, spriteH);
    ctx.strokeStyle = "rgba(65,38,20,.9)";
    ctx.lineWidth = Math.max(2, event.size * .04);
    ctx.strokeRect(event.x - fallbackW / 2, top, fallbackW, spriteH);
  }
  ctx.restore();
}

function drawTreasureEvent(ctx, event) {
  const image = renderer.treasureImages.get(event.treasureType);
  const nearScale = 1 + Math.max(0, 1.65 - event.forward) * .22;
  const drawH = event.size * 1.32 * nearScale;
  const fallbackW = drawH * 1.45;
  const top = event.floorY - drawH;

  ctx.save();
  ctx.globalAlpha = event.alpha;
  ctx.shadowColor = event.treasureType === "gold" ? "rgba(255,222,104,.42)"
    : event.treasureType === "purple" ? "rgba(184,108,255,.5)" : "rgba(0,0,0,.55)";
  ctx.shadowBlur = event.size * .12;
  const imageWidth = Number(image?.naturalWidth || image?.width) || 0;
  const imageHeight = Number(image?.naturalHeight || image?.height) || 0;
  if (image && imageWidth > 0 && imageHeight > 0) {
    const drawW = drawH * (imageWidth / imageHeight);
    ctx.drawImage(image, event.x - drawW / 2, top, drawW, drawH);
  } else {
    ctx.fillStyle = event.treasureType === "red" ? "#f52a18"
      : event.treasureType === "gold" ? "#d7a72f"
        : event.treasureType === "purple" ? "#8f42d8" : "#111";
    ctx.fillRect(event.x - fallbackW / 2, top + drawH * .22, fallbackW, drawH * .78);
  }
  ctx.restore();
}

function drawFloorStairsOpening(ctx, x, y, size, color, quad) {
  const points = quad || makeFallbackFloorOpening(x, y, size);

  ctx.fillStyle = "rgba(0,0,0,.46)";
  drawPointQuad(ctx, points);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * .06);
  ctx.shadowColor = color;
  ctx.shadowBlur = size * .22;
  drawPointQuad(ctx, points);
  ctx.stroke();
}

function drawCeilingStairsOpening(ctx, x, y, size, color, quad) {
  const points = quad || makeFallbackCeilingOpening(x, y, size);

  ctx.fillStyle = "rgba(0,0,0,.5)";
  drawPointQuad(ctx, points);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * .06);
  ctx.shadowColor = color;
  ctx.shadowBlur = size * .22;
  drawPointQuad(ctx, points);
  ctx.stroke();
}

function drawNearStairsFallbackLine(ctx, x, y, size, color, isUp) {
  const halfW = size * 1.35;
  const lineY = isUp ? y + size * .16 : y - size * .08;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * .07);
  ctx.shadowColor = color;
  ctx.shadowBlur = size * .24;
  ctx.beginPath();
  ctx.moveTo(x - halfW, lineY);
  ctx.lineTo(x + halfW, lineY);
  ctx.stroke();
}

function makeFallbackFloorOpening(x, y, size) {
  const topY = y - size * .44;
  const bottomY = y + size * .12;
  const topW = size * 1.05;
  const bottomW = size * 1.62;
  return [
    { x: x - topW / 2, y: topY },
    { x: x + topW / 2, y: topY },
    { x: x + bottomW / 2, y: bottomY },
    { x: x - bottomW / 2, y: bottomY }
  ];
}

function makeFallbackCeilingOpening(x, y, size) {
  const topY = y - size * .12;
  const bottomY = y + size * .44;
  const topW = size * 1.62;
  const bottomW = size * 1.05;
  return [
    { x: x - topW / 2, y: topY },
    { x: x + topW / 2, y: topY },
    { x: x + bottomW / 2, y: bottomY },
    { x: x - bottomW / 2, y: bottomY }
  ];
}

function drawPointQuad(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

export function drawFrame() {
  const { ctx, W, H } = renderer;
  ctx.save();
  ctx.strokeStyle = "rgba(236, 209, 151, .18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.strokeStyle = "rgba(0,0,0,.55)";
  ctx.lineWidth = 16;
  ctx.strokeRect(0, 0, W, H);
  ctx.restore();
}

export function castRay(angle) {
  const { state } = renderer;
  const rayX = Math.cos(angle);
  const rayY = Math.sin(angle);
  let cellX = Math.floor(state.x);
  let cellY = Math.floor(state.y);

  const stepX = rayX < 0 ? -1 : 1;
  const stepY = rayY < 0 ? -1 : 1;
  const deltaX = Math.abs(1 / (Math.abs(rayX) < 0.00001 ? 0.00001 : rayX));
  const deltaY = Math.abs(1 / (Math.abs(rayY) < 0.00001 ? 0.00001 : rayY));
  let sideX = rayX < 0 ? (state.x - cellX) * deltaX : (cellX + 1 - state.x) * deltaX;
  let sideY = rayY < 0 ? (state.y - cellY) * deltaY : (cellY + 1 - state.y) * deltaY;

  for (let i = 0; i < 80; i++) {
    if (sideX < sideY) {
      const dirKey = stepX > 0 ? "E" : "W";
      const dist = sideX;
      const doorState = renderer.getDoorState(cellX, cellY, dirKey);
      const doorKind = renderer.getDoorKind(cellX, cellY, dirKey);
      const hitY = state.y + rayY * dist;
      const hitU = hitY - Math.floor(hitY);
      if (doorState === "open" && isOpenDoorFrameSample(hitU)) {
        return makeHit(dist, hitU, dirKey, 0, angle, "door", doorState, doorKind, cellX, cellY);
      }
      if (renderer.wallOnCell(cellX, cellY, dirKey)) {
        return makeHit(dist, hitU, dirKey, 0, angle, doorState ? "door" : "wall", doorState, doorKind, cellX, cellY);
      }
      cellX += stepX;
      if (!renderer.inBounds(cellX, cellY)) return makeHit(dist, 0, dirKey, 0, angle);
      sideX += deltaX;
    } else {
      const dirKey = stepY > 0 ? "S" : "N";
      const dist = sideY;
      const doorState = renderer.getDoorState(cellX, cellY, dirKey);
      const doorKind = renderer.getDoorKind(cellX, cellY, dirKey);
      const hitX = state.x + rayX * dist;
      const hitU = hitX - Math.floor(hitX);
      if (doorState === "open" && isOpenDoorFrameSample(hitU)) {
        return makeHit(dist, hitU, dirKey, 1, angle, "door", doorState, doorKind, cellX, cellY);
      }
      if (renderer.wallOnCell(cellX, cellY, dirKey)) {
        return makeHit(dist, hitU, dirKey, 1, angle, doorState ? "door" : "wall", doorState, doorKind, cellX, cellY);
      }
      cellY += stepY;
      if (!renderer.inBounds(cellX, cellY)) return makeHit(dist, 0, dirKey, 1, angle);
      sideY += deltaY;
    }
  }
  return makeHit(MAX_DIST, 0, "N", 1, angle);
}

export function makeHit(dist, u, dirKey, side, angle, type = "wall", doorState = null, doorKind = null, cellX = null, cellY = null) {
  const corrected = Math.max(0.001, dist * Math.cos(angle - renderer.state.angle));
  return {
    dist,
    corrected,
    u: ((u % 1) + 1) % 1,
    side,
    dirKey,
    type,
    doorState,
    doorKind,
    cellX,
    cellY
  };
}

export function makeWallTexture(color = renderer.wallColor) {
  const palette = WALL_PALETTES[color] || WALL_PALETTES.default;
  const tex = document.createElement("canvas");
  tex.width = 96;
  tex.height = 160;
  const c = tex.getContext("2d");
  c.fillStyle = palette.base;
  c.fillRect(0, 0, tex.width, tex.height);
  for (let y = 0; y < tex.height; y += 20) {
    const offset = (y / 20) % 2 ? 20 : 0;
    c.fillStyle = y % 40 ? palette.rows[1] : palette.rows[0];
    c.fillRect(0, y, tex.width, 20);
    c.strokeStyle = palette.mortar;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(tex.width, y);
    c.stroke();
    for (let x = -offset; x < tex.width; x += 40) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y + 20);
      c.stroke();
    }
  }
  c.fillStyle = palette.speckle;
  for (let i = 0; i < 230; i++) {
    const x = Math.random() * tex.width;
    const y = Math.random() * tex.height;
    c.fillRect(x, y, Math.random() * 2 + .6, Math.random() * 2 + .6);
  }
  c.fillStyle = "rgba(0,0,0,.16)";
  for (let i = 0; i < 80; i++) {
    c.fillRect(Math.random() * tex.width, Math.random() * tex.height, Math.random() * 3 + 1, 1);
  }
  return tex;
}

export function makeDoorTexture(kind = "normal") {
  const tex = document.createElement("canvas");
  tex.width = 96;
  tex.height = 160;
  const c = tex.getContext("2d");
  const palette = {
    normal: { dark: "#3b2416", mid: "#7a4a28", deep: "#2f1c12", frame: "#cda14d" },
    boss: { dark: "#4b0909", mid: "#b32626", deep: "#310505", frame: "#f2c94c" },
    locked: { dark: "#050505", mid: "#292929", deep: "#010101", frame: "#9b9b9b" },
    special: { dark: "#050306", mid: "#211226", deep: "#010102", frame: "#6f3d82" }
  }[kind] || { dark: "#3b2416", mid: "#7a4a28", deep: "#2f1c12", frame: "#cda14d" };
  const grad = c.createLinearGradient(0, 0, tex.width, 0);
  grad.addColorStop(0, palette.dark);
  grad.addColorStop(.5, palette.mid);
  grad.addColorStop(1, palette.deep);
  c.fillStyle = grad;
  c.fillRect(0, 0, tex.width, tex.height);

  c.fillStyle = "rgba(0,0,0,.36)";
  c.fillRect(0, 0, 8, tex.height);
  c.fillRect(tex.width - 8, 0, 8, tex.height);
  c.fillRect(0, 0, tex.width, 10);
  c.fillRect(0, tex.height - 12, tex.width, 12);

  c.strokeStyle = palette.frame;
  c.lineWidth = 4;
  c.strokeRect(12, 14, tex.width - 24, tex.height - 28);

  c.fillStyle = palette.frame;
  c.beginPath();
  c.arc(tex.width * .73, tex.height * .52, 5, 0, Math.PI * 2);
  c.fill();

  return tex;
}

function loadDoorTexture(kinds, source) {
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    kinds.forEach(kind => {
      renderer.doorTextures[kind] = image;
    });
  };
  image.onerror = () => {
    console.warn(`Door texture failed to load: ${source}`);
  };
  image.src = source;
}

export function roundRect(x, y, w, h, r) {
  const { ctx } = renderer;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function isEdgeSample(u) {
  return u < 0.035 || u > 0.965;
}

export function isDoorEdgeSample(u) {
  return u < 0.12 || u > 0.88;
}

export function isDoorPanelSample(u) {
  return u >= 0.28 && u <= 0.72;
}

export function isDoorPanelEdgeSample(u) {
  return (u > 0.28 && u < 0.31) || (u > 0.69 && u < 0.72);
}

export function normalizeDoorSample(u) {
  return Math.max(0, Math.min(1, (u - 0.28) / 0.44));
}

export function getDoorOpeningProgress(hit) {
  const a = renderer.state?.anim;
  if (!a || a.type !== "door") return 0;
  if (a.x !== hit.cellX || a.y !== hit.cellY || a.dirKey !== hit.dirKey) return 0;
  const p = Math.max(0, Math.min(1, (performance.now() - a.start) / a.duration));
  return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

export function isDoorOpeningGap(doorU, opening) {
  if (opening <= 0) return false;
  return doorU < opening;
}

export function isDoorOpeningEdge(doorU, opening) {
  if (opening <= 0) return false;
  return Math.abs(doorU - opening) < .035;
}

export function getSlidingDoorSample(doorU, opening) {
  return Math.max(0, Math.min(1, doorU - opening));
}

export function isOpenDoorFrameSample(u) {
  return (u >= .28 && u <= .31) || u >= .69;
}

export function getOpenDoorSample(u) {
  return Math.max(0, Math.min(1, (u - .69) / .44));
}
