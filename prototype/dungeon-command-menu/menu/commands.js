export const COMMANDS = Object.freeze([
  Object.freeze({ id: "items", label: "アイテム", implemented: false }),
  Object.freeze({ id: "status", label: "ステータス", implemented: true, href: "../status-screen/?return=../dungeon-command-menu/" }),
  Object.freeze({ id: "deck", label: "デッキ確認", implemented: true, href: "../card-system/card-deck/?return=../../dungeon-command-menu/" }),
  Object.freeze({ id: "skills", label: "スキル", implemented: false }),
  Object.freeze({ id: "save", label: "セーブ", implemented: false }),
  Object.freeze({ id: "options", label: "オプション", implemented: true, href: "../options-screen/?return=../dungeon-command-menu/" }),
]);
