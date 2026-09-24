// Inert detail renderer: callers must explicitly provide a root and display entry.
// This module does not register menus, change ownership or write saves.
import { ITEM_COMPENDIUM_TABS, filterItemCompendiumEntries } from "../data/item-compendium.js";

export function mountItemCompendium(root, entries, onClose = () => {}) {
  let tab = "すべて", page = 0, currentEntry = null, cursor = 0;
  const pageSize = 8;
  root.classList.add("menu-panel", "item-compendium-panel");
  const button = (text, action) => {
    const node = document.createElement("button");
    node.type = "button"; node.textContent = text; node.addEventListener("click", action);
    return node;
  };
  function render(entry = null) {
    currentEntry=entry;cursor=0;
    root.replaceChildren();
    const title = document.createElement("h1"); title.className = "menu-title"; title.textContent = "ITEM COMPENDIUM"; root.append(title);
    const tabs = document.createElement("nav"); tabs.className = "item-compendium-tabs"; tabs.setAttribute("aria-label", "アイテム図鑑の分類");
    ITEM_COMPENDIUM_TABS.forEach(label => {
      const node = button(label, () => { tab = label; page = 0; render(); });
      node.setAttribute("aria-pressed", String(tab === label)); tabs.append(node);
    }); root.append(tabs);
    const content = document.createElement("section"); content.className = "item-compendium-content"; root.append(content);
    const filtered = filterItemCompendiumEntries(entries, tab);
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (entry) renderItemCompendiumDetail(content, entry);
    else {
      content.classList.add("item-compendium-list");
      filtered.slice(page * pageSize, (page + 1) * pageSize).forEach(item => { const node=button(item.locked ? "？？？？？？" : item.name, () => {if(!item.locked)render(item);});node.disabled=!!item.locked;content.append(node); });
      if (!filtered.length) { const empty = document.createElement("p"); empty.textContent = "この分類には、まだ登録がありません。"; content.append(empty); }
    }
    const footer = document.createElement("nav"); footer.className = "item-compendium-pager";
    footer.append(button(entry ? "一覧へ戻る" : "閉じる", entry ? () => render() : onClose));
    const prev = button("前へ", () => { page--; render(); }); prev.disabled = !!entry || page === 0; footer.append(prev);
    const count = document.createElement("span"); count.textContent = `${page + 1} / ${pages}`; footer.append(count);
    const next = button("次へ", () => { page++; render(); }); next.disabled = !!entry || page + 1 >= pages; footer.append(next);
    root.append(footer);
  }
  render();
  const dispose=()=>root.replaceChildren();
  dispose.handleInput=action=>{
    if(action==='cancel'){if(currentEntry)render();else onClose();return;}
    const buttons=[...root.querySelectorAll('button:not(:disabled)')];
    if(!buttons.length)return;
    const focused=buttons.indexOf(document.activeElement);if(focused>=0)cursor=focused;
    if(action==='up'||action==='left')cursor=(cursor-1+buttons.length)%buttons.length;
    if(action==='down'||action==='right')cursor=(cursor+1)%buttons.length;
    if(action==='confirm')buttons[cursor]?.click();else buttons[cursor]?.focus();
  };
  return dispose;
}
export function renderItemCompendiumDetail(root, entry) {
  root.replaceChildren();
  if (!entry || entry.locked) return;
  root.classList.add("item-compendium-detail");
  const add = (tag, className, text, parent = root) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    parent.append(node);
    return node;
  };
  const header = add("header", "item-compendium-header", "");
  add("span", "", "アイテム図鑑", header);
  add("span", "item-compendium-category", entry.category, header);
  const imageSource=entry.imageData || entry.imageSrc;
  if(imageSource){
    const image=document.createElement('img');image.className='item-compendium-image';
    image.alt=entry.name;image.width=100;image.height=100;
    image.addEventListener('error',()=>image.remove(),{once:true});image.src=imageSource;root.append(image);
  }
  add("h2", "item-compendium-name", entry.name);
  const facts = add("dl", "item-compendium-facts", "");
  add("dt", "", "入手方法", facts);
  add("dd", "", entry.acquisition, facts);
  add("dt", "", "販売価格", facts);
  add("dd", "", entry.purchasePrice === null ? "非売品" : `${entry.purchasePrice.toLocaleString()}G`, facts);
  add("p", "item-compendium-description", entry.description);
}
