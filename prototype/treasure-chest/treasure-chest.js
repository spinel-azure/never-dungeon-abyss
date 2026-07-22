import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#chestScene");
const openButton = document.querySelector("#openButton");
const closeButton = document.querySelector("#closeButton");
const eventButton = document.querySelector("#eventButton");
const typeButton = document.querySelector("#typeButton");
const scaleSlider = document.querySelector("#scaleSlider");
const rotationSlider = document.querySelector("#rotationSlider");
const lidSlider = document.querySelector("#lidSlider");
const scaleValue = document.querySelector("#scaleValue");
const rotationValue = document.querySelector("#rotationValue");
const lidValue = document.querySelector("#lidValue");
const typeValue = document.querySelector("#typeValue");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050606);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const materials = {
  outer: new THREE.MeshStandardMaterial({ color: 0xf52a18, roughness: 0.58, metalness: 0 }),
  inner: new THREE.MeshStandardMaterial({ color: 0x7f211c, roughness: 0.72, metalness: 0 }),
};

const CHEST_TYPES = [
  { key: "red", label: "RED", outer: 0xf52a18, inner: 0x7f211c, glow: 0xffe27a },
  { key: "black", label: "BLACK", outer: 0x111111, inner: 0x030303, glow: 0xb44cff },
  { key: "gold", label: "GOLD", outer: 0xd7a72f, inner: 0x795510, glow: 0xfff4b0 },
];
const MAX_LID_ANGLE = 102;
const EVENT_SPIN_MS = 900;
const EVENT_OPEN_MS = 460;
const TREASURE_EFFECT_MS = 1800;
const PARTICLE_COUNT = 52;

const chest = new THREE.Group();
scene.add(chest);
let lidPivot;
let effectLight;
let effectGlow;
let effectParticles;
let effectParticleOrigins;
let effectParticleVelocities;

const dimensions = {
  width: 3.25,
  bodyHeight: 1.45,
  depth: 1.85,
  lidHeight: 0.48,
  wallThickness: 0.12,
};

buildChest();
buildTreasureEffect();

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.42 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
floor.receiveShadow = true;
scene.add(floor);

scene.add(new THREE.HemisphereLight(0xc8f4ff, 0x2d1008, 1.2));

const keyLight = new THREE.DirectionalLight(0xffedc0, 2.15);
keyLight.position.set(3.3, 4.6, 4.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x4bf5ff, 1.35, 9);
rimLight.position.set(-3.7, 2.3, -2.4);
scene.add(rimLight);

let targetLidValue = Number(lidSlider.value);
let currentLidValue = targetLidValue;
let targetScale = Number(scaleSlider.value) / 100;
let targetRotation = THREE.MathUtils.degToRad(Number(rotationSlider.value));
let chestTypeIndex = 0;
let eventAnimation = null;
let treasureEffect = null;

openButton.addEventListener("click", () => {
  cancelEventAnimation();
  stopTreasureEffect();
  targetLidValue = 100;
  lidSlider.value = String(targetLidValue);
});

closeButton.addEventListener("click", () => {
  cancelEventAnimation();
  stopTreasureEffect();
  targetLidValue = 0;
  lidSlider.value = String(targetLidValue);
});

eventButton.addEventListener("click", startEventAnimation);

typeButton.addEventListener("click", () => {
  chestTypeIndex = (chestTypeIndex + 1) % CHEST_TYPES.length;
  applyChestType();
});

scaleSlider.addEventListener("input", () => {
  cancelEventAnimation();
  targetScale = Number(scaleSlider.value) / 100;
  updateReadouts();
});

rotationSlider.addEventListener("input", () => {
  cancelEventAnimation();
  targetRotation = THREE.MathUtils.degToRad(Number(rotationSlider.value));
  updateReadouts();
});

lidSlider.addEventListener("input", () => {
  cancelEventAnimation();
  targetLidValue = Number(lidSlider.value);
  updateReadouts();
});

window.addEventListener("resize", resize);
resize();
applyChestType();
updateReadouts();
animate();

function buildChest() {
  const { width, bodyHeight, depth, lidHeight, wallThickness } = dimensions;
  const halfDepth = depth / 2;

  // Build the lower half as an open rectangular container instead of a
  // decorated solid block, so the empty interior is visible when opened.
  addBox(chest, width, wallThickness, depth, 0, wallThickness / 2, 0, materials.inner);
  addBox(chest, width, bodyHeight, wallThickness, 0, bodyHeight / 2, halfDepth - wallThickness / 2, materials.outer);
  addBox(chest, width, bodyHeight, wallThickness, 0, bodyHeight / 2, -halfDepth + wallThickness / 2, materials.inner);
  addBox(chest, wallThickness, bodyHeight, depth - wallThickness * 2, -width / 2 + wallThickness / 2, bodyHeight / 2, 0, materials.outer);
  addBox(chest, wallThickness, bodyHeight, depth - wallThickness * 2, width / 2 - wallThickness / 2, bodyHeight / 2, 0, materials.outer);

  lidPivot = new THREE.Group();
  lidPivot.position.set(0, bodyHeight, -halfDepth);
  chest.add(lidPivot);

  const lidGroup = new THREE.Group();
  lidGroup.position.z = halfDepth;
  lidPivot.add(lidGroup);

  addBox(
    lidGroup,
    width + 0.04,
    lidHeight,
    depth + 0.04,
    0,
    lidHeight / 2,
    0,
    materials.outer
  );
}

function addBox(parent, width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildTreasureEffect() {
  const { bodyHeight } = dimensions;

  effectLight = new THREE.PointLight(0xffe27a, 0, 7, 1.7);
  effectLight.position.set(0, bodyHeight + 0.35, 0.05);
  chest.add(effectLight);

  effectGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffe27a,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  }));
  effectGlow.position.set(0, bodyHeight + 0.38, 0.08);
  effectGlow.scale.set(1.4, 1.4, 1);
  effectGlow.visible = false;
  chest.add(effectGlow);

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
  effectParticles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xffe27a,
      size: 0.09,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  effectParticles.visible = false;
  chest.add(effectParticles);
  effectParticleOrigins = Array.from({ length: PARTICLE_COUNT }, () => new THREE.Vector3());
  effectParticleVelocities = Array.from({ length: PARTICLE_COUNT }, () => new THREE.Vector3());
}

function makeGlowTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 128;
  textureCanvas.height = 128;
  const context = textureCanvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(255,255,255,.86)");
  gradient.addColorStop(0.55, "rgba(255,255,255,.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(textureCanvas);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.set(width < 700 ? 4.8 : 4.2, width < 700 ? 2.9 : 2.6, width < 700 ? 7.2 : 6.2);
  camera.lookAt(0, 0.95, 0);
  camera.updateProjectionMatrix();
}

function animate(now = performance.now()) {
  requestAnimationFrame(animate);

  if (eventAnimation) {
    updateEventAnimation(now);
  } else {
    currentLidValue += (targetLidValue - currentLidValue) * 0.12;
    chest.rotation.y += (targetRotation - chest.rotation.y) * 0.12;
  }

  const openRatio = currentLidValue / 100;
  lidPivot.rotation.x = -THREE.MathUtils.degToRad(MAX_LID_ANGLE) * openRatio;

  const currentScale = chest.scale.x + (targetScale - chest.scale.x) * 0.1;
  chest.scale.setScalar(currentScale);
  updateTreasureEffect(now);
  updateReadouts(eventAnimation ? currentLidValue : targetLidValue);

  renderer.render(scene, camera);
}

function startEventAnimation() {
  stopTreasureEffect();
  targetLidValue = 0;
  currentLidValue = 0;
  lidSlider.value = "0";
  chest.rotation.y = targetRotation;
  eventAnimation = {
    start: performance.now(),
    rotation: targetRotation,
  };
}

function updateEventAnimation(now) {
  const elapsed = now - eventAnimation.start;
  if (elapsed < EVENT_SPIN_MS) {
    const progress = elapsed / EVENT_SPIN_MS;
    chest.rotation.y = eventAnimation.rotation + Math.PI * 4 * easeInOutCubic(progress);
    currentLidValue = 0;
    return;
  }

  const openProgress = Math.min(1, (elapsed - EVENT_SPIN_MS) / EVENT_OPEN_MS);
  chest.rotation.y = eventAnimation.rotation + Math.PI * 4;
  currentLidValue = 100 * easeOutCubic(openProgress);
  lidSlider.value = String(Math.round(currentLidValue));

  if (openProgress >= 1) {
    chest.rotation.y = eventAnimation.rotation;
    targetLidValue = 100;
    currentLidValue = 100;
    lidSlider.value = "100";
    eventAnimation = null;
    startTreasureEffect(now);
  }
}

function startTreasureEffect(now) {
  const positions = effectParticles.geometry.attributes.position;
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const origin = effectParticleOrigins[index];
    origin.set(
      (Math.random() - 0.5) * 1.45,
      dimensions.bodyHeight + 0.18 + Math.random() * 0.18,
      (Math.random() - 0.5) * 0.65
    );
    effectParticleVelocities[index].set(
      (Math.random() - 0.5) * 1.65,
      1.25 + Math.random() * 1.65,
      (Math.random() - 0.5) * 1.2
    );
    positions.setXYZ(index, origin.x, origin.y, origin.z);
  }
  positions.needsUpdate = true;
  treasureEffect = { start: now };
  effectGlow.visible = true;
  effectParticles.visible = true;
  applyEffectColor();
}

function updateTreasureEffect(now) {
  if (!treasureEffect) return;
  const elapsed = now - treasureEffect.start;
  const progress = Math.min(1, elapsed / TREASURE_EFFECT_MS);
  const seconds = elapsed / 1000;
  const fade = Math.pow(1 - progress, 1.55);
  const burst = Math.min(1, progress * 8);

  effectLight.intensity = 8.5 * fade * burst;
  effectGlow.material.opacity = 0.92 * fade * burst;
  const glowScale = 1.35 + progress * 3.6;
  effectGlow.scale.set(glowScale, glowScale, 1);
  effectParticles.material.opacity = fade;

  const positions = effectParticles.geometry.attributes.position;
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const origin = effectParticleOrigins[index];
    const velocity = effectParticleVelocities[index];
    positions.setXYZ(
      index,
      origin.x + velocity.x * seconds,
      origin.y + velocity.y * seconds - 0.42 * seconds * seconds,
      origin.z + velocity.z * seconds
    );
  }
  positions.needsUpdate = true;

  if (progress >= 1) stopTreasureEffect();
}

function stopTreasureEffect() {
  treasureEffect = null;
  if (!effectLight) return;
  effectLight.intensity = 0;
  effectGlow.visible = false;
  effectGlow.material.opacity = 0;
  effectParticles.visible = false;
  effectParticles.material.opacity = 0;
}

function cancelEventAnimation() {
  if (!eventAnimation) return;
  eventAnimation = null;
  targetRotation = chest.rotation.y;
  rotationSlider.value = String(Math.round(THREE.MathUtils.radToDeg(targetRotation) % 360));
}

function applyChestType() {
  const type = CHEST_TYPES[chestTypeIndex];
  materials.outer.color.setHex(type.outer);
  materials.inner.color.setHex(type.inner);
  typeValue.textContent = type.label;
  typeButton.setAttribute("aria-label", `Treasure chest type: ${type.label}`);
  applyEffectColor();
}

function applyEffectColor() {
  if (!effectLight) return;
  const color = CHEST_TYPES[chestTypeIndex].glow;
  effectLight.color.setHex(color);
  effectGlow.material.color.setHex(color);
  effectParticles.material.color.setHex(color);
}

function updateReadouts(displayLidValue = targetLidValue) {
  scaleValue.textContent = `${Math.round(targetScale * 100)}%`;
  lidValue.textContent = `${Math.round((displayLidValue / 100) * MAX_LID_ANGLE)}°`;
  rotationValue.textContent = `${Math.round(Number(rotationSlider.value))}°`;
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}
