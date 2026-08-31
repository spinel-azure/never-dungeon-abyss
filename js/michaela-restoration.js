export const MICHAELA_RESTORATION_DIALOGUE = Object.freeze([
  "わたくしはミカエラ。このカッツェンラントの女王です。よくぞアマイェナクから真実の杖を取り戻してくれましたね。深く感謝いたします。",
  "この世の全ての叡智を欲していたアマイェナクはその源泉であるアカシックレコードに触れたがっておりました。その為に真実の杖を必要としていたのです。",
  "アカシックレコードへのアクセスに必要な真実の杖は王家の血統とリンクしています。\n\n杖が所有者と認めた者が死ねば、アクセスキーとしての機能を失うのです。",
  "だからアマイェナクは、わたくしを殺すことができなかったのでしょう。けれど、自由にしておくわけにもいかなかった。\n\nそこで……わたくしから真実の杖を奪った上に、無力な猫の姿へ変えたのです。",
  "アマイェナクが、なぜそこまで全ての叡智を渇望したのか……わたくしにも分かりません。\n\nけれど、そのために平和の象徴たる真実の杖を奪うことは、決して許されることではありません。あなたは、それを阻止してくださいました。",
  "さあ、戻りましょう！皆が待つカッツェンシュタットへ…！"
]);

const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

export function createMichaelaRestorationController({ root, flash, onMessage, onComplete }) {
  let active = false;
  let phase = "idle";
  let page = 0;
  let lastAdvanceAt = 0;

  async function start() {
    if (active || !root) return false;
    active = true;
    phase = "transform";
    page = 0;
    root.hidden = false;
    root.className = "michaela-restoration is-cat-rising";
    await wait(2450);
    if (!active) return false;
    flash.classList.add("is-active");
    await wait(150);
    root.classList.add("is-human-start");
    await wait(180);
    flash.classList.remove("is-active");
    await wait(3400);
    if (!active) return false;
    await wait(3000);
    root.classList.add("is-crossfade");
    await wait(1800);
    if (!active) return false;
    phase = "dialogue";
    showPage();
    return true;
  }

  function showPage() {
    const message = MICHAELA_RESTORATION_DIALOGUE[page] || "";
    onMessage?.(`女王ミカエラ「${message}」\n＊Aボタンで次へ`);
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
    document.body.classList.remove("michaela-message-active");
    onMessage?.("");
    await onComplete?.();
    root.hidden = true;
    root.className = "michaela-restoration";
    active = false;
    phase = "idle";
  }

  root?.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void handleAction("confirm");
  }, true);

  return Object.freeze({ start, handleAction, isActive: () => active, getPhase: () => phase });
}
