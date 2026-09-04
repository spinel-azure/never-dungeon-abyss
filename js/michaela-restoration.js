export const MICHAELA_RESTORATION_DIALOGUE = Object.freeze([
  "わたくしはミカエラ。このカッツェンラントの女王です。よくぞアマイェナクから真実の杖を取り戻してくれましたね。深く感謝いたします。",
  "この世の全ての叡智を欲していたアマイェナクはその源泉であるアカシックレコードに触れたがっておりました。その為に真実の杖を必要としていたのです。",
  "アカシックレコードへのアクセスに必要な真実の杖は王家の血統とリンクしています。\n\n杖が所有者と認めた者が死ねば、アクセスキーとしての機能を失うのです。",
  "だからアマイェナクは、わたくしを殺すことができなかったのでしょう。けれど、自由にしておくわけにもいかなかった。\n\nそこで……わたくしから真実の杖を奪った上に、無力な猫の姿へ変えたのです。",
  "アマイェナクが、なぜそこまで全ての叡智を渇望したのか……わたくしにも分かりません。\n\nけれど、そのために平和の象徴たる真実の杖を奪うことは、決して許されることではありません。あなたは、それを阻止してくださいました。",
  "さぁ、戻りましょう。皆が待つカッツェンシュタットへ！"
]);

export function createMichaelaRestorationController({ root, flash, onMessage, onComplete }) {
  let active = false;
  let phase = "idle";
  let page = 0;
  let lastAdvanceAt = 0;
  let dialogueTimer = 0;
  const waits = new Map();
  const wait = milliseconds => new Promise(resolve => {
    const timer = window.setTimeout(() => { waits.delete(timer); resolve(true); }, milliseconds);
    waits.set(timer, resolve);
  });

  async function start() {
    if (active || !root) return false;
    active = true;
    phase = "transform";
    page = 0;
    root.hidden = false;
    root.className = "michaela-restoration is-cat-rising";
    if (!await wait(2450)) return false;
    if (!active) return false;
    flash.classList.add("is-active");
    if (!await wait(150)) return false;
    root.classList.add("is-human-start");
    if (!await wait(180)) return false;
    flash.classList.remove("is-active");
    if (!await wait(3400)) return false;
    if (!active) return false;
    if (!await wait(3000)) return false;
    root.classList.add("is-crossfade");
    if (!await wait(1800)) return false;
    if (!active) return false;
    phase = "dialogue";
    showPage();
    return true;
  }

  function showPage() {
    const message = MICHAELA_RESTORATION_DIALOGUE[page] || "";
    onMessage?.(`女王ミカエラ「${message}」`);
    clearTimeout(dialogueTimer);
    dialogueTimer = window.setTimeout(() => {
      if (phase === "dialogue") handleAction("confirm");
    }, Math.max(4500, message.length * 100));
    document.body.classList.add("michaela-message-active");
    lastAdvanceAt = performance.now();
  }

  function handleAction(action) {
    if (!active) return false;
    if (action !== "confirm" || phase !== "dialogue") return true;
    if (performance.now() - lastAdvanceAt < 220) return true;
    if (page < MICHAELA_RESTORATION_DIALOGUE.length - 1) {
      page += 1;
      showPage();
      return true;
    }
    void finish();
    return true;
  }

  async function finish() {
    phase = "finishing";
    clearTimeout(dialogueTimer);
    document.body.classList.remove("michaela-message-active");
    onMessage?.("");
    root.hidden = true;
    await onComplete?.();
    root.className = "michaela-restoration";
    active = false;
    phase = "idle";
  }

  root?.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void handleAction("confirm");
  }, true);

  function dispose() {
    active = false; phase = "idle"; clearTimeout(dialogueTimer); dialogueTimer = 0;
    for (const [timer, resolve] of waits) { clearTimeout(timer); resolve(false); }
    waits.clear(); root.hidden = true; root.className = "michaela-restoration";
    flash.classList.remove("is-active"); document.body.classList.remove("michaela-message-active");
  }
  return Object.freeze({ start, handleAction, dispose, isActive: () => active, getPhase: () => phase });
}
