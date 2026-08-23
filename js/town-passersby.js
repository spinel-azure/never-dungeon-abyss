import { isAnastasiaFestivalSunday } from "../data/anastasia-event.js";
import {
  getQuestProgress,
  JIRENE_SONG_INVESTIGATION_ACCEPTED_FLAG,
  JIRENE_SONG_INVESTIGATION_QUEST_ID
} from "../data/quests.js";

const PASSERBY_CONFIGS = Object.freeze([
  Object.freeze({
    id: "energeticTownGirl",
    src: "images/npc/NPC_15.avif",
    speed: 54,
    bobAmplitude: 2,
    walkPeriod: 480,
    spawnInterval: Object.freeze([5200, 8800]),
    initialDelay: 900,
    initialPhase: 0,
    initialDirection: 1,
    heightRatio: 0.72,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "quietTownGirl",
    src: "images/npc/NPC_16.avif",
    hiddenAfterFlag: JIRENE_SONG_INVESTIGATION_ACCEPTED_FLAG,
    speed: 34,
    bobAmplitude: 1,
    walkPeriod: 660,
    spawnInterval: Object.freeze([8200, 13800]),
    initialDelay: 3800,
    initialPhase: 170,
    initialDirection: -1,
    heightRatio: 0.7,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "glamorousWoman",
    src: "images/npc/NPC_17.avif",
    speed: 22,
    bobAmplitude: 1,
    walkPeriod: 820,
    spawnInterval: Object.freeze([12000, 19000]),
    initialDelay: 7200,
    initialPhase: 390,
    initialDirection: 1,
    heightRatio: 0.74,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "innkeeper",
    src: "images/npc/NPC_11b.avif",
    speed: 14,
    bobAmplitude: 1,
    walkPeriod: 1080,
    spawnInterval: Object.freeze([18000, 28000]),
    initialDelay: 11600,
    initialPhase: 610,
    initialDirection: -1,
    heightRatio: 0.76,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "shopkeeper",
    src: "images/npc/NPC_13b.avif",
    alternateSrc: "images/npc/NPC_13g.avif",
    alternateFlag: "helen_hidden_event_seen",
    speed: 27,
    bobAmplitude: 1,
    walkPeriod: 750,
    spawnInterval: Object.freeze([10500, 16800]),
    initialDelay: 5400,
    initialPhase: 280,
    initialDirection: -1,
    heightRatio: 0.75,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "guildMaster",
    src: "images/npc/NPC_10b.avif",
    speed: 24,
    bobAmplitude: 1,
    walkPeriod: 790,
    spawnInterval: Object.freeze([12500, 19500]),
    initialDelay: 9100,
    initialPhase: 470,
    initialDirection: 1,
    heightRatio: 0.77,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "librarian",
    src: "images/npc/NPC_14b.avif",
    speed: 18,
    bobAmplitude: 1,
    walkPeriod: 940,
    spawnInterval: Object.freeze([15500, 23800]),
    initialDelay: 13800,
    initialPhase: 730,
    initialDirection: -1,
    heightRatio: 0.73,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "priest",
    src: "images/npc/NPC_12b.avif",
    alternateSrc: "images/npc/NPC_12e.avif",
    alternateFlag: "tavern_rumor_004_base_read",
    speed: 10,
    bobAmplitude: 1,
    walkPeriod: 1240,
    spawnInterval: Object.freeze([22000, 34000]),
    initialDelay: 16800,
    initialPhase: 920,
    initialDirection: 1,
    heightRatio: 0.78,
    drawOrder: 0,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "rareTownVisitor",
    src: "images/npc/NPC_21b.avif",
    speed: 14,
    bobAmplitude: 1,
    walkPeriod: 1100,
    spawnInterval: Object.freeze([240000, 480000]),
    initialDelay: 90000,
    initialPhase: 540,
    initialDirection: -1,
    heightRatio: 0.76,
    sourceFacing: "left"
  }),
  Object.freeze({
    id: "horseAndChicken",
    src: "images/npc/NPC_18b.avif",
    speed: 38,
    bobAmplitude: 3,
    walkPeriod: 520,
    spawnInterval: Object.freeze([45000, 85000]),
    initialDelay: 18000,
    initialPhase: 0,
    initialDirection: 1,
    heightRatio: 0.76,
    sourceFacing: "left",
    gait: "trot"
  })
]);

const MAX_VISIBLE_PASSERSBY = 4;

export function configureTownPassersby({ canvas, root, getCharacter = () => null }) {
  if (!canvas || !root) return () => {};
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const passersby = PASSERBY_CONFIGS
    .map(createPasserby)
    .sort((left, right) => (
      (left.config.drawOrder ?? 1) - (right.config.drawOrder ?? 1)
    ));
  let previousTime = performance.now();
  let animationFrame = 0;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = false;
    }
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const render = now => {
    const visible = document.body.classList.contains("town-active")
      && root.classList.contains("is-town-view")
      && !root.hidden;
    const deltaSeconds = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (visible) {
      const character = getCharacter();
      const hideAnastasia = isAnastasiaFestivalSunday(character);
      passersby.forEach(passerby => {
        if ((hideAnastasia && passerby.config.id === "priest")
          || !isTownPasserbyVisible(passerby.config.id, character)) {
          passerby.active = false;
          passerby.nextSpawnAt = now + randomBetween(...passerby.config.spawnInterval);
          return;
        }
        if (!passerby.initialized) {
          passerby.initialized = true;
          passerby.nextSpawnAt = now + passerby.config.initialDelay;
        }
      });
      const activeCount = passersby.filter(passerby => passerby.active).length;
      const availableSlots = Math.max(0, MAX_VISIBLE_PASSERSBY - activeCount);
      const spawnCandidates = passersby
        .filter(passerby => (
          !passerby.active
          && !(hideAnastasia && passerby.config.id === "priest")
          && isTownPasserbyVisible(passerby.config.id, character)
          && passerby.image.complete
          && passerby.image.naturalWidth > 0
          && now >= passerby.nextSpawnAt
        ))
        .sort((left, right) => left.nextSpawnAt - right.nextSpawnAt)
        .slice(0, availableSlots);
      const allowedToSpawn = new Set(spawnCandidates);
      passersby.forEach(passerby => {
        updateAndDrawPasserby(
          passerby,
          context,
          canvas.width,
          canvas.height,
          deltaSeconds,
          now,
          allowedToSpawn.has(passerby),
          Boolean(character?.eventFlags?.[passerby.config.alternateFlag])
        );
      });
    }
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
    context.clearRect(0, 0, canvas.width, canvas.height);
  };
}

function createPasserby(config) {
  const image = new Image();
  image.decoding = "async";
  image.src = config.src;
  image.decode().catch(() => {});
  const alternateImage = config.alternateSrc ? new Image() : null;
  if (alternateImage) {
    alternateImage.decoding = "async";
    alternateImage.src = config.alternateSrc;
    alternateImage.decode().catch(() => {});
  }
  return {
    config,
    image,
    alternateImage,
    initialized: false,
    active: false,
    direction: config.initialDirection,
    x: 0,
    nextSpawnAt: Number.POSITIVE_INFINITY
  };
}

function updateAndDrawPasserby(passerby, context, width, height, deltaSeconds, now, allowSpawn, useAlternate) {
  const { config } = passerby;
  const image = useAlternate && passerby.alternateImage ? passerby.alternateImage : passerby.image;
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) return;
  const drawHeight = Math.max(1, Math.round(height * config.heightRatio));
  const drawWidth = Math.max(1, Math.round(drawHeight * image.naturalWidth / image.naturalHeight));

  if (!passerby.active) {
    if (!allowSpawn || now < passerby.nextSpawnAt) return;
    passerby.active = true;
    passerby.x = passerby.direction > 0 ? -drawWidth : width;
  }

  passerby.x += config.speed * passerby.direction * deltaSeconds;
  if ((passerby.direction > 0 && passerby.x > width)
    || (passerby.direction < 0 && passerby.x + drawWidth < 0)) {
    passerby.active = false;
    passerby.direction *= -1;
    passerby.nextSpawnAt = now + randomBetween(...config.spawnInterval);
    return;
  }

  const walkStep = Math.floor((now + config.initialPhase) / (config.walkPeriod / 8)) % 8;
  const bobPattern = config.gait === "trot"
    ? [0, -3, -1, -2, 0, -3, -1, -2]
    : config.bobAmplitude >= 2
    ? [0, -1, -2, -1, 0, -1, -2, -1]
    : [0, -1, -1, 0, 0, -1, -1, 0];
  const bobOffset = bobPattern[walkStep];
  const bottomOverscan = Math.max(0, -Math.min(...bobPattern));
  const drawX = Math.round(passerby.x);
  const drawY = Math.round(height - drawHeight + bottomOverscan + bobOffset);
  const facesRight = config.sourceFacing === "left" && passerby.direction > 0;

  context.save();
  context.imageSmoothingEnabled = false;
  if (facesRight) {
    context.translate(drawX + drawWidth, 0);
    context.scale(-1, 1);
    context.drawImage(image, 0, drawY, drawWidth, drawHeight);
  } else {
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }
  context.restore();
}

function randomBetween(minimum, maximum) {
  return Math.round(minimum + Math.random() * (maximum - minimum));
}

export function getTownPasserbyImageSource(id, character) {
  const config = PASSERBY_CONFIGS.find(entry => entry.id === id);
  if (!config) return "";
  return config.alternateSrc && character?.eventFlags?.[config.alternateFlag]
    ? config.alternateSrc
    : config.src;
}

export function isTownPasserbyVisible(id, character) {
  const config = PASSERBY_CONFIGS.find(entry => entry.id === id);
  if (!config) return false;
  if (!config.hiddenAfterFlag) return true;
  const quest = getQuestProgress(character, JIRENE_SONG_INVESTIGATION_QUEST_ID);
  return !character?.eventFlags?.[config.hiddenAfterFlag] && !quest.active && !quest.completed;
}
