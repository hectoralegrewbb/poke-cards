// Sprites animados de Black/White (Gen 5), con reverso para aliados.
// Prioridad: remoto por defecto; local cuando se instaló un pack offline.
// Fallbacks: GIF animado > PNG estático > pack local > marcador.
import { h } from "./dom.js";
import { typeColors } from "./labels.js";
import { spriteCandidates } from "./spriteSources.js";

export function createAnimatedSpriteProvider({ data, basePath = "../assets/sprites", preferLocal = false } = {}) {
  const imageCache = new Map();
  function placeholder(speciesId) {
    const species = data.species[speciesId];
    return h("div", { class: "sprite placeholder", style: `background:${typeColors[species.types[0]]}`, role: "img", "aria-label": species.name }, species.name.slice(0, 2));
  }

  function element(speciesId, { facing = "front", spriteKey = null } = {}) {
    // Reutilizar el mismo <img> evita reiniciar el GIF en cada clic del combate.
    const cacheKey = spriteKey ? `${spriteKey}:${speciesId}:${facing}` : null;
    if (cacheKey && imageCache.has(cacheKey)) return imageCache.get(cacheKey);
    const species = data.species[speciesId];
    const urls = spriteCandidates(speciesId, { facing, basePath, preferLocal });
    if (!urls.length) return placeholder(speciesId);

    let index = 0;
    const image = h("img", {
      class: "sprite spriteAnimated", src: urls[index], alt: species.name,
      draggable: "false", decoding: "async", loading: "eager"
    });
    image.addEventListener("error", () => {
      index += 1;
      if (index < urls.length) image.src = urls[index];
      else {
        if (cacheKey) imageCache.delete(cacheKey);
        image.replaceWith(placeholder(speciesId));
      }
    });
    if (cacheKey) {
      if (imageCache.size >= 200) imageCache.delete(imageCache.keys().next().value);
      imageCache.set(cacheKey, image);
    }
    return image;
  }

  return { element };
}

// Alias para consumidores anteriores del provider.
export const createLocalSpriteProvider = createAnimatedSpriteProvider;
