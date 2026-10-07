import { getItemCompendiumEntry } from "../data/item-compendium.js";

// Presentation only: ownership and reward processing remain with the caller.
export function renderItemGetItems(root, names, { itemIds = [], amounts = [], acquisitionMessage = false } = {}) {
  const document = root.ownerDocument;
  root.classList.toggle("is-multiple", names.length > 1);
  root.classList.remove("has-images");
  const rows = names.map((name, index) => {
    const row = document.createElement("div");
    row.className = "item-get-row";
    const label = document.createElement("span");
    const amount = Math.max(1, Math.floor(Number(amounts[index]) || 1));
    label.textContent = acquisitionMessage ? `「${name}」を手に入れた！` : `${name} ×${amount}`;
    const id = itemIds[index];
    const catalogId = /^red_rust_key_b\d+f$/.test(id || "") ? "red_rust_key_b9f" : id;
    const entry = getItemCompendiumEntry(catalogId);
    const source = entry?.imageData || entry?.imageSrc;
    if (source) {
      const image = document.createElement("img");
      image.className = "item-get-image";
      image.alt = "";
      image.addEventListener("error", () => {
        image.remove();
        row.classList.remove("has-image");
        root.classList.toggle("has-images", Boolean(root.querySelector(".item-get-image")));
      }, { once: true });
      image.src = source;
      row.append(image);
      row.classList.add("has-image");
      root.classList.add("has-images");
    }
    row.append(label);
    return row;
  });
  root.replaceChildren(...rows);
}
