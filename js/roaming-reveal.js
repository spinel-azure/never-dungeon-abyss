// Pure presentation timing shared by the renderer and regression tests.
export function getRoamingRevealFrame(elapsedMs, durationMs = 1800, reducedMotion = false) {
  const progress = reducedMotion ? 1 : Math.max(0, Math.min(1, Number(elapsedMs) / Math.max(1, durationMs)));
  const opacity = progress * progress * (3 - 2 * progress);
  return { progress, opacity, silhouetteOpacity: 1 - opacity, blur: 9 * Math.sin(progress * Math.PI), complete: progress >= 1 };
}