import { flatSvg, hasFlatArt } from "./flatArt.js";
// Íconos de pixel art dibujados como grillas de texto -> SVG con rects (sin suavizado).
// Convenciones: "o" contorno, "#" color principal, "a" tono secundario, "w" brillo, "." vacío.
const outline = "#1a1c2c";
const white = "#f4f4f4";

const icons = {
  bolt: { main: "#ffcd75", alt: "#ef7d57", rows: [
    "....ooo..",
    "...o##o..",
    "..o##ao..",
    ".o##aoo..",
    "o###aaao.",
    "oooo##ao.",
    "...o##ao.",
    "..o#aao..",
    "..oao....",
    "...o....."
  ] },
  heart: { main: "#b13e53", alt: "#ef7d57", rows: [
    ".ooo.ooo.",
    "o###o#wwo",
    "o#########o".slice(0, 9),
    "o#######ao",
    ".o#####ao.",
    "..o###ao..",
    "...o#ao...",
    "....oo...."
  ].map((r) => r.slice(0, 9).padEnd(9, ".")) },
  shield: { main: "#41a6f6", alt: "#3b5dc9", rows: [
    "ooooooooo",
    "o#w#####o",
    "o#w#####o",
    "o#######o",
    "oa######o",
    ".oa####ao",
    ".oaa##aao",
    "..oaaaao.",
    "...ooaoo.",
    "....ooo.."
  ].map((r) => r.slice(0, 9).padEnd(9, ".")) },
  star: { main: "#ffcd75", alt: "#ef7d57", rows: [
    "....o....",
    "...o#o...",
    "...o#o...",
    "ooo#w#ooo",
    "o#######o",
    ".o#####ao",
    ".o##o##ao",
    "o#ao.oaao",
    "oo.....oo"
  ] },
  clock: { main: "#73eff7", alt: "#41a6f6", rows: [
    "..ooooo..",
    ".o#####o.",
    "o###o###o",
    "o###o###o",
    "o###oo##o",
    "o#######o",
    ".oa###ao.",
    "..ooooo.."
  ] },
  cards: { main: "#f4f4f4", alt: "#94b0c2", rows: [
    "..oooooo.",
    ".o#####ao",
    "oooooo#ao",
    "o####o#ao",
    "o####o#ao",
    "o####oaao",
    "o####ooo.",
    "oooooo..."
  ] },
  clover: { main: "#38b764", alt: "#a7f070", rows: [
    ".oo...oo.",
    "o##o.o##o",
    "o#aoooa#o",
    ".oo###oo.",
    ".oo###oo.",
    "o#aoooa#o",
    "o##o.o##o",
    ".oo..#oo.",
    ".....#..."
  ] },
  sword: { main: "#94b0c2", alt: "#ef7d57", rows: [
    "......oo.",
    ".....o#wo",
    "....o#wo.",
    "...o#wo..",
    "o.o#wo...",
    "oo#wo....",
    ".ooo.....",
    ".oao.....",
    "oa.ao....",
    "o...o...."
  ] },
  leaf: { main: "#38b764", alt: "#a7f070", rows: [
    "......ooo",
    "....oo##o",
    "..oo###ao",
    ".o####aao",
    "o####aao.",
    "o###aao..",
    "oo#aao...",
    "o.ooo....",
    "o........"
  ] },
  skull: { main: "#f4f4f4", alt: "#94b0c2", rows: [
    "..ooooo..",
    ".o#####o.",
    "o#######o",
    "oo#ooo#oo",
    "oo#ooo#oo",
    "o###o###o",
    ".o#####o.",
    "..o#o#o..",
    "..ooooo.."
  ] },
  tent: { main: "#ef7d57", alt: "#b13e53", rows: [
    "....o....",
    "...o#o...",
    "..o###o..",
    ".o#####o.",
    "o###o###o",
    "o##oao##o",
    "oooooaooo"
  ] },
  coin: { main: "#ffcd75", alt: "#ef7d57", rows: [
    "..ooooo..",
    ".o#####o.",
    "o##wo###o",
    "o##o#o##o",
    "o###o###o",
    "o##o#o#ao",
    ".oa###ao.",
    "..ooooo.."
  ] },
  medal: { main: "#ffcd75", alt: "#ef7d57", rows: [
    "oo.....oo",
    ".o#...#o.",
    "..o#.#o..",
    "..ooooo..",
    ".o#####o.",
    "o##w####o",
    "o#######o",
    "oa#####ao",
    ".oaaaaao.",
    "..ooooo.."
  ] },
  crown: { main: "#ffcd75", alt: "#ef7d57", rows: [
    "o...o...o",
    "oo.o#o.oo",
    "o#o###o#o",
    "o#######o",
    "o#######o",
    "oaaaaaaao",
    "ooooooooo"
  ] },
  ball: { main: "#b13e53", alt: "#f4f4f4", rows: [
    "..ooooo..",
    ".o#####o.",
    "o###w###o",
    "ooooooooo",
    "oaaaoaaao",
    "oaaaoaaao".replace("o", "o"),
    ".oaaaaao.",
    "..ooooo.."
  ] },
  arrow: { main: "#1a1c2c", alt: "#1a1c2c", rows: [
    "#.....",
    "##....",
    "###...",
    "####..",
    "###...",
    "##....",
    "#....."
  ] }
};

const SVG_NS = "http://www.w3.org/2000/svg";

// Devuelve un <svg> escalado en múltiplos de "scale" px por pixel del ícono.
export function icon(name, { color, scale = 3 } = {}) {
  if (hasFlatArt(name)) return flatSvg(name, Math.round(6 * scale), `pixIcon ${name}`);
  const spec = icons[name];
  const rows = spec.rows;
  const width = Math.max(...rows.map((row) => row.length));
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${rows.length}`);
  svg.setAttribute("width", String(width * scale));
  svg.setAttribute("height", String(rows.length * scale));
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("class", `pixIcon ${name}`);
  const fills = { o: outline, "#": color ?? spec.main, a: spec.alt, w: white };
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (!fills[cell]) return;
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", "1");
      rect.setAttribute("height", "1");
      rect.setAttribute("fill", fills[cell]);
      svg.append(rect);
    });
  });
  return svg;
}

export const iconNames = Object.keys(icons);
