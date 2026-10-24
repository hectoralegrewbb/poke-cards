// Arte flat propio en SVG inline (sin archivos externos). Reglas del set:
// grilla 32×32, trazo tinta de 2 px con uniones redondeadas, 3 tonos por objeto y brillo blanco arriba a la izquierda.
const svgNs = "http://www.w3.org/2000/svg";
const ink = "#1f2a4d";
const shine = "#ffffff";

function node(tag, attrs = {}) {
  const element = document.createElementNS(svgNs, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  return element;
}

const shape = (tag, attrs) => [tag, attrs];
const path = (d, fill, extra = {}) => shape("path", { d, fill, ...extra });
const gloss = (d) => shape("path", { d, fill: "none", stroke: shine, "stroke-width": 2, opacity: 0.75 });
const sparkle = (x, y, r, fill = shine) => path(`M${x} ${y - r} L${x + r * 0.32} ${y - r * 0.32} L${x + r} ${y} L${x + r * 0.32} ${y + r * 0.32} L${x} ${y + r} L${x - r * 0.32} ${y + r * 0.32} L${x - r} ${y} L${x - r * 0.32} ${y - r * 0.32} Z`, fill, { stroke: "none" });

// Frasco: líquido + tapa + marca en la etiqueta.
function bottle(liquid, cap, mark, tall = false) {
  const top = tall ? 2 : 4;
  return [
    shape("rect", { x: 11, y: top, width: 10, height: 5, rx: 2, fill: cap }),
    path(`M12 ${top + 5} H20 L26 16 V25 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V16 Z`, liquid),
    shape("rect", { x: 9.5, y: 18, width: 13, height: 7.5, rx: 2, fill: shine, "stroke-width": 1.5 }),
    ...mark,
    gloss("M9 16.5 V23.5")
  ];
}
const dots = (count) => Array.from({ length: count }, (_, i) => shape("circle", { cx: 16 + (i - (count - 1) / 2) * 3.4, cy: 21.7, r: 1.2, fill: ink, stroke: "none" }));
const drop = path("M16 18.6 C14.4 20.6 13.6 21.6 13.6 22.8 a2.4 2.4 0 0 0 4.8 0 C18.4 21.6 17.6 20.6 16 18.6 Z", "#8b4fe0", { "stroke-width": 1 });
const flame = path("M16 18.4 C17.6 20 18.6 21 18.6 22.6 a2.6 2.6 0 0 1 -5.2 0 C13.4 21.8 13.8 21.2 14.4 20.6 C14.6 21.4 15 21.6 15.4 21.6 C15 20.4 15.4 19.4 16 18.4 Z", "#ef6b1e", { "stroke-width": 1 });
const bolt = path("M17.4 18.4 L13.6 22.2 H16 L15 25 L18.8 21 H16.4 Z", "#f7c52b", { "stroke-width": 1 });
const cross = path("M15 18.8 H17 V21 H19.2 V23 H17 V25.2 H15 V23 H12.8 V21 H15 Z", "#2fb3a3", { "stroke-width": 1 });
const heart = path("M16 25 C12.6 22.6 12.6 19.4 14.4 19.4 C15.2 19.4 15.8 19.9 16 20.4 C16.2 19.9 16.8 19.4 17.6 19.4 C19.4 19.4 19.4 22.6 16 25 Z", "#e0405e", { "stroke-width": 1 });

const gemPoints = "16,3 26,10 26,22 16,29 6,22 6,10";
const gem = (main, facet, spark) => [
  shape("polygon", { points: gemPoints, fill: main }),
  shape("polygon", { points: "16,3 26,10 16,15 6,10", fill: facet, "stroke-width": 1.5 }),
  shape("path", { d: "M16 15 V29 M6 22 L16 15 L26 22", fill: "none", "stroke-width": 1.5, opacity: 0.55 }),
  sparkle(11.5, 9.5, 3.4, spark)
];

const items = {
  healBerry: () => [
    path("M16 9 C16 5 20 3 25 4 C24 8.5 20.5 10.5 16 9 Z", "#4fc46b"),
    shape("circle", { cx: 16, cy: 19, r: 9, fill: "#ff5f7a" }),
    path("M16 10 C15 9 14 8 13 7", "none", { "stroke-width": 2 }),
    gloss("M10.5 17 C11 14.5 12.5 13.5 14 13")
  ],
  revive: () => [
    shape("polygon", { points: "16,3 28,16 16,29 4,16", fill: "#ffe27a" }),
    shape("polygon", { points: "16,9 22,16 16,23 10,16", fill: "#fff6c8", "stroke-width": 1.5 }),
    sparkle(16, 16, 3.2, "#f2a31b")
  ],
  maxRevive: () => [
    shape("polygon", { points: "16,2 29,16 16,30 3,16", fill: "#ffb43a" }),
    shape("polygon", { points: "16,8 23,16 16,24 9,16", fill: "#ffe27a", "stroke-width": 1.5 }),
    sparkle(16, 16, 4.4, shine),
    sparkle(25, 6, 2.6)
  ],
  rareCandy: () => [
    path("M9 16 L2 9 V23 Z", "#bcdcff"),
    path("M23 16 L30 9 V23 Z", "#bcdcff"),
    shape("circle", { cx: 16, cy: 16, r: 9, fill: "#4f9bff" }),
    path("M9.5 21 C14 18 18 14 22.5 11", "none", { stroke: "#d6e9ff", "stroke-width": 2.4 }),
    gloss("M11 12 C12 10.5 13.4 9.6 15 9.2")
  ],
  shinyStone: () => gem("#ffd54a", "#fff0a0", shine),
  duskStone: () => gem("#5b4a8f", "#8a74c9", "#d9ccff"),
  linkCable: () => [
    path("M9 10 C1 14 2 26 12 26 H20 C30 26 31 14 23 10", "none", { stroke: ink, "stroke-width": 6.5 }),
    path("M9 10 C1 14 2 26 12 26 H20 C30 26 31 14 23 10", "none", { stroke: "#8fa2d6", "stroke-width": 3 }),
    shape("rect", { x: 5.5, y: 3, width: 7, height: 8, rx: 1.8, fill: "#ffcd3c" }),
    shape("rect", { x: 19.5, y: 3, width: 7, height: 8, rx: 1.8, fill: "#ffcd3c" })
  ],
  potion: () => bottle("#c79bff", "#ef7d57", dots(1)),
  superPotion: () => bottle("#ff9ec1", "#ef7d57", dots(2)),
  maxPotion: () => bottle("#6fa8ff", "#ffcd3c", dots(3), true),
  antidote: () => bottle("#c79bff", "#8b4fe0", [drop]),
  burnHeal: () => bottle("#ffb066", "#ef6b1e", [flame]),
  paralyzeHeal: () => bottle("#ffe27a", "#f2a31b", [bolt]),
  fullHeal: () => bottle("#8ee3d6", "#2fb3a3", [cross]),
  fullRestore: () => bottle("#8fe38f", "#ffcd3c", [heart], true),
  sitrusBerry: () => [
    path("M16 9 C16 5 20 3 25 4 C24 8.5 20.5 10.5 16 9 Z", "#4fc46b"),
    shape("circle", { cx: 16, cy: 19, r: 9, fill: "#ffb43a" }),
    path("M16 10.5 V13", "none"),
    path("M11 20 C12 23 14 24.5 16 24.7", "none", { stroke: "#ef7d57", "stroke-width": 2 }),
    gloss("M10.5 17 C11 14.5 12.5 13.5 14 13")
  ],
  lupa: () => [
    shape("circle", { cx: 13, cy: 13, r: 8.5, fill: "#cfeaff" }),
    path("M19.5 19.5 L28 28", "none", { stroke: ink, "stroke-width": 6.5 }),
    path("M19.5 19.5 L28 28", "none", { stroke: "#ef7d57", "stroke-width": 3 }),
    shape("circle", { cx: 13, cy: 13, r: 8.5, fill: "none" }),
    gloss("M8.5 11.5 C9 9.5 10.5 8.3 12.5 7.9")
  ],
  pokeBall: () => [
    shape("circle", { cx: 16, cy: 16, r: 12, fill: "#f4f4f4" }),
    path("M4 16 A12 12 0 0 1 28 16 Z", "#e0405e"),
    shape("path", { d: "M4 16 H28", fill: "none" }),
    shape("circle", { cx: 16, cy: 16, r: 4.2, fill: "#f4f4f4" }),
    gloss("M8.5 11 C10 8.5 12 7.2 14.5 6.6")
  ],
  wild: () => [
    shape("circle", { cx: 16, cy: 16, r: 12, fill: "url(#flatRainbow)" }),
    shape("circle", { cx: 16, cy: 16, r: 5, fill: shine, "stroke-width": 1.5, opacity: 0.9 }),
    gloss("M8.5 13 C9.5 10.5 11.5 8.8 14 8")
  ]
};

const gradients = {
  flatRainbow: [["0", "#ff5f7a"], ["0.25", "#ffcd3c"], ["0.5", "#5be37d"], ["0.75", "#4f9bff"], ["1", "#b36bff"]]
};

export function hasFlatArt(id) { return Boolean(items[id]); }

export function flatSvg(id, size = 24, className = "flatArt") {
  const svg = node("svg", { viewBox: "0 0 32 32", width: size, height: size, class: className, "aria-hidden": "true", focusable: "false", fill: "none", stroke: ink, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" });
  const defs = node("defs");
  for (const [gradientId, stops] of Object.entries(gradients)) {
    const gradient = node("linearGradient", { id: gradientId, x1: 0, y1: 0, x2: 1, y2: 1 });
    for (const [offset, color] of stops) gradient.append(node("stop", { offset, "stop-color": color }));
    defs.append(gradient);
  }
  svg.append(defs);
  for (const [tag, attrs] of items[id]()) svg.append(node(tag, attrs));
  return svg;
}
export { node as svgNode, ink as flatInk };
