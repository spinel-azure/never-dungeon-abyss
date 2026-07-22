const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const EVENT_SPIN_MS = 900;
const EVENT_OPEN_MS = 460;
const TREASURE_EFFECT_MS = 1800;
const MIMIC_LID_STEP_MS = 260;
const MAX_LID_ANGLE = 102;
const PARTICLE_COUNT = 52;

const TYPES = {
  red: { outer: 0xf52a18, inner: 0x7f211c, glow: 0xffe27a },
  black: { outer: 0x111111, inner: 0x030303, glow: 0xb44cff },
  gold: { outer: 0xd7a72f, inner: 0x795510, glow: 0xfff4b0 }
};

const treasure = {
  canvas: null,
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  chest: null,
  lidPivot: null,
  materials: null,
  effectLight: null,
  effectGlow: null,
  effectParticles: null,
  outlines: null,
  origins: [],
  velocities: [],
  type: "red",
  visible: false,
  loading: null,
  animation: null,
  completion: null,
  frame: 0
};

export function configureTreasure({ canvas }) {
  treasure.canvas = canvas;
  window.addEventListener("resize", resize);
}

export async function showTreasure(type = "red") {
  treasure.type = TYPES[type] ? type : "red";
  if (!treasure.canvas) return;
  treasure.canvas.style.visibility = "visible";
  treasure.visible = true;
  try {
    await ensureThree();
    resetChest();
    applyType();
    startLoop();
  } catch (error) {
    console.warn("Three.js treasure failed to load:", error);
  }
}

export async function playTreasureOpening(type = "red", onComplete = () => {}) {
  treasure.completion = onComplete;
  await showTreasure(type);
  if (!treasure.renderer) {
    finishOpening();
    return;
  }
  treasure.animation = { start: performance.now(), effectStarted: false };
}

export function hideTreasure() {
  treasure.visible = false;
  treasure.animation = null;
  treasure.completion = null;
  if (treasure.frame) cancelAnimationFrame(treasure.frame);
  treasure.frame = 0;
  stopEffect();
  if (treasure.canvas) treasure.canvas.style.visibility = "hidden";
}

async function ensureThree() {
  if (treasure.renderer) return;
  if (treasure.loading) return treasure.loading;
  treasure.loading = import(THREE_URL).then(THREE => {
    treasure.THREE = THREE;
    treasure.scene = new THREE.Scene();
    treasure.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
    treasure.renderer = new THREE.WebGLRenderer({
      canvas: treasure.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    treasure.renderer.setClearColor(0x000000, 0);
    treasure.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    treasure.renderer.shadowMap.enabled = true;
    buildChest();
    buildEffect();
    addLights();
    resize();
  }).finally(() => {
    treasure.loading = null;
  });
  return treasure.loading;
}

function buildChest() {
  const THREE = treasure.THREE;
  treasure.materials = {
    outer: new THREE.MeshStandardMaterial({ color: 0xf52a18, roughness: .58 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x7f211c, roughness: .72 })
  };
  treasure.chest = new THREE.Group();
  treasure.outlines = new THREE.Group();
  treasure.scene.add(treasure.chest);
  const width = 3.25;
  const bodyHeight = 1.45;
  const depth = 1.85;
  const lidHeight = .48;
  const wall = .12;
  const halfDepth = depth / 2;
  treasure.chest.add(treasure.outlines);
  addBox(width, wall, depth, 0, wall / 2, 0, treasure.materials.inner, treasure.chest);
  addBox(width, bodyHeight, wall, 0, bodyHeight / 2, halfDepth - wall / 2, treasure.materials.outer, treasure.chest);
  addBox(width, bodyHeight, wall, 0, bodyHeight / 2, -halfDepth + wall / 2, treasure.materials.inner, treasure.chest);
  addBox(wall, bodyHeight, depth - wall * 2, -width / 2 + wall / 2, bodyHeight / 2, 0, treasure.materials.outer, treasure.chest);
  addBox(wall, bodyHeight, depth - wall * 2, width / 2 - wall / 2, bodyHeight / 2, 0, treasure.materials.outer, treasure.chest);
  treasure.lidPivot = new THREE.Group();
  treasure.lidPivot.position.set(0, bodyHeight, -halfDepth);
  treasure.chest.add(treasure.lidPivot);
  const lid = new THREE.Group();
  lid.position.z = halfDepth;
  treasure.lidPivot.add(lid);
  addBox(width + .04, lidHeight, depth + .04, 0, lidHeight / 2, 0, treasure.materials.outer, lid);
}

function addBox(width, height, depth, x, y, z, material, parent) {
  const geometry = new treasure.THREE.BoxGeometry(width, height, depth);
  const mesh = new treasure.THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  const outline = new treasure.THREE.LineSegments(
    new treasure.THREE.EdgesGeometry(geometry),
    new treasure.THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .72 })
  );
  outline.position.copy(mesh.position);
  outline.visible = false;
  parent.add(outline);
  outline.userData.treasureOutline = true;
}

function addLights() {
  const THREE = treasure.THREE;
  treasure.scene.add(new THREE.HemisphereLight(0xc8f4ff, 0x2d1008, 1.2));
  const key = new THREE.DirectionalLight(0xffedc0, 2.15);
  key.position.set(3.3, 4.6, 4.2);
  treasure.scene.add(key);
  const rim = new THREE.PointLight(0x4bf5ff, 1.35, 9);
  rim.position.set(-3.7, 2.3, -2.4);
  treasure.scene.add(rim);
}

function buildEffect() {
  const THREE = treasure.THREE;
  treasure.effectLight = new THREE.PointLight(0xffe27a, 0, 7, 1.7);
  treasure.effectLight.position.set(0, 1.8, .05);
  treasure.chest.add(treasure.effectLight);
  treasure.effectGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false
  }));
  treasure.effectGlow.position.set(0, 1.83, .08);
  treasure.effectGlow.visible = false;
  treasure.chest.add(treasure.effectGlow);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
  treasure.effectParticles = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: .09,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  treasure.effectParticles.visible = false;
  treasure.chest.add(treasure.effectParticles);
  treasure.origins = Array.from({ length: PARTICLE_COUNT }, () => new THREE.Vector3());
  treasure.velocities = Array.from({ length: PARTICLE_COUNT }, () => new THREE.Vector3());
}

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(.2, "rgba(255,255,255,.86)");
  gradient.addColorStop(.55, "rgba(255,255,255,.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new treasure.THREE.CanvasTexture(canvas);
}

function resetChest() {
  treasure.animation = null;
  treasure.chest.rotation.y = 0;
  treasure.lidPivot.rotation.x = 0;
  treasure.chest.scale.setScalar(1.08);
  stopEffect();
}

function applyType() {
  const type = TYPES[treasure.type];
  treasure.materials.outer.color.setHex(type.outer);
  treasure.materials.inner.color.setHex(type.inner);
  treasure.effectLight.color.setHex(type.glow);
  treasure.effectGlow.material.color.setHex(type.glow);
  treasure.effectParticles.material.color.setHex(type.glow);
  treasure.chest.traverse(object => {
    if (object.userData?.treasureOutline) object.visible = treasure.type === "black";
  });
}

function startLoop() {
  if (treasure.frame) return;
  treasure.frame = requestAnimationFrame(renderFrame);
}

function renderFrame(now) {
  treasure.frame = 0;
  if (!treasure.visible || !treasure.renderer) return;
  updateAnimation(now);
  treasure.renderer.render(treasure.scene, treasure.camera);
  treasure.frame = requestAnimationFrame(renderFrame);
}

function updateAnimation(now) {
  const animation = treasure.animation;
  if (!animation) return;
  const elapsed = now - animation.start;
  if (treasure.type === "red") {
    const openProgress = Math.min(1, elapsed / EVENT_OPEN_MS);
    treasure.lidPivot.rotation.x = -treasure.THREE.MathUtils.degToRad(MAX_LID_ANGLE) * easeOutCubic(openProgress);
    if (openProgress >= 1) finishOpening();
    return;
  }
  if (elapsed < EVENT_SPIN_MS) {
    treasure.chest.rotation.y = Math.PI * 4 * easeInOutCubic(elapsed / EVENT_SPIN_MS);
    return;
  }
  if (treasure.type === "black") {
    treasure.chest.rotation.y = Math.PI * 4;
    const lidElapsed = elapsed - EVENT_SPIN_MS;
    const segment = Math.min(4, Math.floor(lidElapsed / MIMIC_LID_STEP_MS));
    const segmentProgress = Math.min(1, (lidElapsed % MIMIC_LID_STEP_MS) / MIMIC_LID_STEP_MS);
    const eased = easeInOutCubic(segmentProgress);
    const opening = segment % 2 === 0;
    const lidRatio = opening ? eased : 1 - eased;
    treasure.lidPivot.rotation.x = -treasure.THREE.MathUtils.degToRad(MAX_LID_ANGLE) * lidRatio;
    if (lidElapsed >= MIMIC_LID_STEP_MS * 5) {
      treasure.lidPivot.rotation.x = -treasure.THREE.MathUtils.degToRad(MAX_LID_ANGLE);
      finishOpening();
    }
    return;
  }
  const openProgress = Math.min(1, (elapsed - EVENT_SPIN_MS) / EVENT_OPEN_MS);
  treasure.chest.rotation.y = Math.PI * 4;
  treasure.lidPivot.rotation.x = -treasure.THREE.MathUtils.degToRad(MAX_LID_ANGLE) * easeOutCubic(openProgress);
  if (openProgress >= 1 && !animation.effectStarted) {
    animation.effectStarted = true;
    animation.effectStart = now;
    startEffect();
  }
  if (animation.effectStarted) {
    updateEffect(now, animation.effectStart);
    if (now - animation.effectStart >= TREASURE_EFFECT_MS) finishOpening();
  }
}

function startEffect() {
  const positions = treasure.effectParticles.geometry.attributes.position;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const origin = treasure.origins[i];
    origin.set((Math.random() - .5) * 1.45, 1.63 + Math.random() * .18, (Math.random() - .5) * .65);
    treasure.velocities[i].set((Math.random() - .5) * 1.65, 1.25 + Math.random() * 1.65, (Math.random() - .5) * 1.2);
    positions.setXYZ(i, origin.x, origin.y, origin.z);
  }
  positions.needsUpdate = true;
  treasure.effectGlow.visible = true;
  treasure.effectParticles.visible = true;
}

function updateEffect(now, start) {
  const elapsed = now - start;
  const progress = Math.min(1, elapsed / TREASURE_EFFECT_MS);
  const seconds = elapsed / 1000;
  const fade = Math.pow(1 - progress, 1.55);
  const burst = Math.min(1, progress * 8);
  treasure.effectLight.intensity = 8.5 * fade * burst;
  treasure.effectGlow.material.opacity = .92 * fade * burst;
  const glowScale = 1.35 + progress * 3.6;
  treasure.effectGlow.scale.set(glowScale, glowScale, 1);
  treasure.effectParticles.material.opacity = fade;
  const positions = treasure.effectParticles.geometry.attributes.position;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const origin = treasure.origins[i];
    const velocity = treasure.velocities[i];
    positions.setXYZ(i, origin.x + velocity.x * seconds, origin.y + velocity.y * seconds - .42 * seconds * seconds, origin.z + velocity.z * seconds);
  }
  positions.needsUpdate = true;
}

function stopEffect() {
  if (!treasure.effectLight) return;
  treasure.effectLight.intensity = 0;
  treasure.effectGlow.visible = false;
  treasure.effectGlow.material.opacity = 0;
  treasure.effectParticles.visible = false;
  treasure.effectParticles.material.opacity = 0;
}

function finishOpening() {
  const complete = treasure.completion;
  treasure.animation = null;
  treasure.completion = null;
  if (complete) complete();
}

function resize() {
  if (!treasure.renderer || !treasure.canvas) return;
  const rect = treasure.canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width || 960);
  const height = Math.max(1, rect.height || 540);
  treasure.renderer.setSize(width, height, false);
  treasure.camera.aspect = width / height;
  treasure.camera.position.set(width < 700 ? 4.8 : 4.2, width < 700 ? 2.9 : 2.6, width < 700 ? 7.2 : 6.2);
  treasure.camera.lookAt(0, .95, 0);
  treasure.camera.updateProjectionMatrix();
}

function easeInOutCubic(value) {
  return value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}
