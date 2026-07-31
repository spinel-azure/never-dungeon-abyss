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
  })
]);

export function configureTownPassersby({ canvas, root }) {
  if (!canvas || !root) return () => {};
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const passersby = PASSERBY_CONFIGS.map(createPasserby);
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
      passersby.forEach(passerby => {
        if (!passerby.initialized) {
          passerby.initialized = true;
          passerby.nextSpawnAt = now + passerby.config.initialDelay;
        }
        updateAndDrawPasserby(
          passerby,
          context,
          canvas.width,
          canvas.height,
          deltaSeconds,
          now
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
  return {
    config,
    image,
    initialized: false,
    active: false,
    direction: config.initialDirection,
    x: 0,
    nextSpawnAt: Number.POSITIVE_INFINITY
  };
}

function updateAndDrawPasserby(passerby, context, width, height, deltaSeconds, now) {
  const { config, image } = passerby;
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) return;
  const drawHeight = Math.max(1, Math.round(height * config.heightRatio));
  const drawWidth = Math.max(1, Math.round(drawHeight * image.naturalWidth / image.naturalHeight));

  if (!passerby.active) {
    if (now < passerby.nextSpawnAt) return;
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
  const bobPattern = config.bobAmplitude >= 2
    ? [0, -1, -2, -1, 0, -1, -2, -1]
    : [0, -1, -1, 0, 0, -1, -1, 0];
  const bobOffset = bobPattern[walkStep];
  const drawX = Math.round(passerby.x);
  const drawY = Math.round(height - drawHeight + bobOffset);
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
