let messageEl = null;

export function configureEvents({ messageEl: element }) {
  messageEl = element;
}

export function messageFor(x, y, cellType = "floor") {
  if (cellType === "stairsUp") {
    return "上り階段がある。帰還しますか？\n＊Aボタンで帰還　Bボタンでやめる";
  }
  if (cellType === "stairsDown") {
    return "下り階段がある。次の階層に向かいますか？\n＊Aボタンで次の階層へ　Bボタンでやめる";
  }
  return "";
}

export function say(text) {
  if (messageEl) messageEl.textContent = text;
}
