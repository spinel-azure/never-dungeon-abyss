// Visual only: opening mechanics and resource ownership remain in battle state.
export function showZentaurinArrow(root, broken) {
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '20', overflow: 'hidden' });
  root.append(layer);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animations = [];
  for (let i = 0; i < 6; i++) {
    const piece = document.createElement('span');
    Object.assign(piece.style, { position: 'absolute', left: `${31 + i * 6}%`, top: '48%', width: '6%', height: '3px', background: broken ? '#fff0a0' : '#bca4ff', boxShadow: '0 0 10px currentColor', color: broken ? '#ffe26b' : '#a77cff' });
    if (i === 5) { piece.style.clipPath = 'polygon(0 35%,65% 35%,65% 0,100% 50%,65% 100%,65% 65%,0 65%)'; piece.style.height = '16px'; piece.style.marginTop = '-6px'; }
    layer.append(piece);
    if (!reduce && piece.animate) animations.push(piece.animate(broken
      ? [{ opacity: 1, transform: 'translate(0,0) rotate(0)' }, { opacity: 1, offset: .25, transform: 'translate(0,0) rotate(0)' }, { opacity: 0, transform: `translate(${(i - 2.5) * 35}px,${i % 2 ? 80 : -80}px) rotate(${i % 2 ? 120 : -120}deg)` }]
      : [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, offset: .3, transform: 'scale(1)' }, { opacity: 0, transform: 'translateY(110px) scale(2)' }],
      { duration: 1100, fill: 'forwards' }));
  }
  return () => { animations.forEach(animation => animation.cancel()); layer.remove(); };
}
