// Retrato de la profesora Amelie. Por defecto es un busto flat en capas (SVG propio, sin archivos externos).
// Para usar arte definitivo: dejar PNG/SVG/WebP en assets/story/ y listarlos en assets/story/manifest.json, por ejemplo
//   { "neutral": "amelie-neutral.png", "smile": "amelie-smile.png" }
// Las expresiones sin archivo usan "neutral" del manifest; si no hay manifest se dibuja el SVG de este módulo.
import { svgNode, flatInk } from "./flatArt.js";
import { h } from "./dom.js";

export const expressions = ["neutral", "smile", "worried", "glitch", "dark"];
// Expresiones del arte definitivo que el busto SVG de respaldo no dibuja: se aproximan con la más cercana.
const svgFallback = { happy: "smile", wink: "smile", grin: "smile", gentle: "smile", think: "neutral", surprised: "neutral", sick: "worried", cry: "worried", scared: "worried", confused: "worried", shock: "worried" };
const storyPath = "../assets/story/";
let customAssets = null;

export async function loadAmelieAssets() {
  try {
    const response = await fetch(`${storyPath}manifest.json`);
    if (!response.ok) return;
    const manifest = await response.json();
    customAssets = manifest && typeof manifest === "object" && Object.keys(manifest).length ? manifest : null;
    // Precarga para que el cambio de expresión no parpadee.
    for (const file of Object.values(customAssets ?? {})) new Image().src = `${storyPath}${file}`;
  } catch { customAssets = null; }
}

const palette = {
  skin: "#f6cfae", skinShade: "#e3a98a", hair: "#4a2f6b", hairLight: "#6a4691", coat: "#f4f4f4", coatShade: "#c9d3e6",
  knit: "#6fd3b4", clip: "#ffcd75", lens: "#ffffff", eye: "#3a2552", blush: "#ef7d57", glitchA: "#41a6f6", glitchB: "#ef4f8a", dark: "#b13e53"
};

const el = (tag, attrs) => svgNode(tag, { stroke: flatInk, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", ...attrs });

function hairBack() {
  return el("path", { d: "M26 62 C24 22 46 8 62 8 C80 8 98 22 94 62 C94 84 100 100 92 116 L28 116 C20 100 26 84 26 62 Z", fill: palette.hair, class: "amHair" });
}

function body() {
  return [
    el("path", { d: "M8 140 C10 116 28 106 48 104 L72 104 C92 106 110 116 112 140 Z", fill: palette.coat }),
    el("path", { d: "M48 104 L60 128 L72 104", fill: palette.knit }),
    el("path", { d: "M48 104 L38 122 L48 140 M72 104 L82 122 L72 140", fill: "none", stroke: flatInk, "stroke-width": 2 }),
    el("path", { d: "M12 128 C20 120 28 118 36 120", fill: "none", stroke: palette.coatShade, "stroke-width": 3 }),
    el("rect", { x: 53, y: 92, width: 14, height: 16, rx: 4, fill: palette.skinShade })
  ];
}

function head() {
  return [
    el("ellipse", { cx: 60, cy: 62, rx: 28, ry: 31, fill: palette.skin }),
    el("path", { d: "M30 58 C30 34 46 26 62 26 C80 26 92 38 90 58 C82 50 72 40 62 36 C56 46 42 54 30 58 Z", fill: palette.hair, class: "amHair" }),
    el("path", { d: "M62 36 C70 40 82 48 90 58", fill: "none", stroke: palette.hairLight, "stroke-width": 2, opacity: 0.8 })
  ];
}

// Luna creciente: marca propia de Amelie (psíquico/nocturno), sin parecido con accesorios de personajes oficiales.
function clip() {
  return [
    el("path", { d: "M84 30 C92 30 98 36 98 44 C94 40 88 40 84 44 C86 38 86 34 84 30 Z", fill: palette.clip }),
    el("circle", { cx: 90, cy: 48, r: 1.8, fill: palette.clip, "stroke-width": 1 })
  ];
}

function glasses(tint) {
  return [
    el("circle", { cx: 47, cy: 64, r: 10, fill: palette.lens, "fill-opacity": 0.28, stroke: tint ?? flatInk }),
    el("circle", { cx: 73, cy: 64, r: 10, fill: palette.lens, "fill-opacity": 0.28, stroke: tint ?? flatInk }),
    el("path", { d: "M57 63 H63", fill: "none", stroke: tint ?? flatInk })
  ];
}

const eyeDots = (color = palette.eye, dy = 0) => [
  el("ellipse", { cx: 47, cy: 65 + dy, rx: 3.2, ry: 4, fill: color, "stroke-width": 0 }),
  el("ellipse", { cx: 73, cy: 65 + dy, rx: 3.2, ry: 4, fill: color, "stroke-width": 0 }),
  el("circle", { cx: 48.2, cy: 63.4 + dy, r: 1.1, fill: "#fff", "stroke-width": 0 }),
  el("circle", { cx: 74.2, cy: 63.4 + dy, r: 1.1, fill: "#fff", "stroke-width": 0 })
];

const brows = (leftD, rightD) => [
  el("path", { d: leftD, fill: "none", stroke: palette.hair, "stroke-width": 2.4 }),
  el("path", { d: rightD, fill: "none", stroke: palette.hair, "stroke-width": 2.4 })
];

const cheeks = () => [
  el("ellipse", { cx: 40, cy: 76, rx: 5, ry: 3, fill: palette.blush, opacity: 0.35, "stroke-width": 0 }),
  el("ellipse", { cx: 80, cy: 76, rx: 5, ry: 3, fill: palette.blush, opacity: 0.35, "stroke-width": 0 })
];

const faceByExpression = {
  neutral: () => ({ eyes: eyeDots(), brows: brows("M40 51 Q47 48 54 51", "M66 51 Q73 48 80 51"), mouth: el("path", { d: "M54 82 Q60 85 66 82", fill: "none", "stroke-width": 2 }), cheeks: true }),
  smile: () => ({
    eyes: [el("path", { d: "M41 66 Q47 59 53 66", fill: "none", "stroke-width": 2.6 }), el("path", { d: "M67 66 Q73 59 79 66", fill: "none", "stroke-width": 2.6 })],
    brows: brows("M40 49 Q47 45 54 49", "M66 49 Q73 45 80 49"),
    mouth: el("path", { d: "M50 80 Q60 92 70 80 Q60 84 50 80 Z", fill: "#b13e53", "stroke-width": 2 }), cheeks: true
  }),
  worried: () => ({ eyes: eyeDots(palette.eye, 1), brows: brows("M40 53 Q47 50 54 46", "M66 46 Q73 50 80 53"), mouth: el("path", { d: "M54 84 Q60 80 66 84", fill: "none", "stroke-width": 2 }), cheeks: false }),
  glitch: () => ({ eyes: [...eyeDots(palette.glitchB), ...eyeDots(palette.glitchA, 0).map((node) => { node.setAttribute("transform", "translate(3 0)"); node.setAttribute("opacity", "0.7"); return node; })], brows: brows("M40 52 L54 50", "M66 50 L80 52"), mouth: el("path", { d: "M52 83 H68", fill: "none", "stroke-width": 2.4 }), cheeks: false, tint: palette.glitchA }),
  dark: () => ({ eyes: [el("path", { d: "M40 62 H54 V68 Q47 71 40 68 Z", fill: palette.dark, "stroke-width": 1.5 }), el("path", { d: "M66 62 H80 V68 Q73 71 66 68 Z", fill: palette.dark, "stroke-width": 1.5 })], brows: brows("M39 54 L55 59", "M65 59 L81 54"), mouth: el("path", { d: "M52 84 Q60 80 68 84", fill: "none", "stroke-width": 2 }), cheeks: false, tint: palette.dark })
};

function drawBust(expression) {
  const face = (faceByExpression[expression] ?? faceByExpression.neutral)();
  const svg = svgNode("svg", { viewBox: "0 0 120 140", class: `amelieBust ex-${expression}`, role: "img", "aria-label": `Profesora Amelie, expresión ${expression}` });
  const eyeGroup = svgNode("g", { class: "amEyes" });
  face.eyes.forEach((node) => eyeGroup.append(node));
  const layers = svgNode("g", { class: "amLayers" });
  layers.append(hairBack(), ...body(), ...head(), ...(face.cheeks ? cheeks() : []), ...glasses(face.tint), eyeGroup, ...face.brows, face.mouth, ...clip());
  svg.append(layers);
  return svg;
}

// Devuelve el retrato listo para insertar. size = alto en px. avatar = recorte circular de la cara (globos y paneles chicos).
export function amelieFace(expression = "neutral", size = 96, { avatar = false } = {}) {
  const file = customAssets?.[expression] ?? customAssets?.neutral;
  const holder = h("span", { class: `amelieFace ex-${expression} ${file ? "photo" : ""} ${avatar ? "avatar" : ""}`, style: `--amSize:${size}px` });
  if (file) holder.append(h("img", { src: `${storyPath}${file}`, alt: "Profesora Amelie", class: "amelieImg", draggable: "false" }));
  else holder.append(drawBust(svgFallback[expression] ?? expression));
  return holder;
}
