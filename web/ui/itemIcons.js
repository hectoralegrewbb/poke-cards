// Sprites de ítems (assets/items/<id>.png, 32×32). Si falta el archivo, el ícono se oculta y queda solo el texto.
export function itemImage(itemId, size = 24) {
  const img = document.createElement("img");
  img.src = `../assets/items/${itemId}.png`;
  img.alt = "";
  img.width = size;
  img.height = size;
  img.className = "itemIcon";
  img.style.imageRendering = "pixelated";
  img.addEventListener("error", () => img.remove());
  return img;
}
