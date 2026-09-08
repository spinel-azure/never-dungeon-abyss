const DEFAULT_BREAK_CHARACTERS = new Set(["\n", "。", "！", "？", "…", "」"]);

function fits(element) {
  return element.scrollHeight <= element.clientHeight + 1;
}

function findNaturalBreak(text, limit, minimumRatio = .52) {
  const minimum = Math.max(1, Math.floor(limit * minimumRatio));
  for (let index = limit; index >= minimum; index -= 1) {
    if (DEFAULT_BREAK_CHARACTERS.has(text[index - 1])) return index;
  }
  return limit;
}

// Measures the actual message element so font, width, and device layout all use
// the same safe boundary. Callers opt in and keep control of dialogue state.
export function paginateMessageToFit({ element, text, formatPage = value => value } = {}) {
  const source = String(text || "").trim();
  if (!source || !element || element.clientHeight <= 0) return source ? [source] : [];
  const original = element.textContent;
  const pages = [];
  let remaining = source;
  let guard = 0;
  try {
    while (remaining && guard < 100) {
      guard += 1;
      element.textContent = formatPage(remaining);
      if (fits(element)) {
        pages.push(remaining);
        break;
      }
      let low = 1;
      let high = remaining.length;
      let limit = 1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        element.textContent = formatPage(remaining.slice(0, middle).trimEnd());
        if (fits(element)) {
          limit = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      const end = findNaturalBreak(remaining, limit);
      const page = remaining.slice(0, end).trim();
      pages.push(page || remaining.slice(0, Math.max(1, limit)));
      remaining = remaining.slice(end || Math.max(1, limit)).trimStart();
    }
  } finally {
    element.textContent = original;
  }
  return pages;
}
