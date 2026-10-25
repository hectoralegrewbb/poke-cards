// Vistas de la historia de Amelie: globo de diálogo, ofrecimiento del inicial y escena final.
import { chooseAmelieEnding, finalScene } from "../../src/run/index.js";
import { amelieFace } from "./amelieArt.js";
import { h } from "./dom.js";
import { sfx } from "./sfx.js";

// Globo no bloqueante. ctx.storyLine = { line, fresh }. onClose limpia el estado.
// Retrato: Amelie usa su busto; el resto de hablantes, una placa con inicial y color propios.
function speakerAvatar(ctx, line) {
  if (line.speaker === "amelie") return amelieFace(line.expression, 64, { avatar: true });
  const speaker = ctx.data.story.speakers[line.speaker] ?? {};
  return h("span", { class: "speakerBadge", style: `--badgeColor:${speaker.color ?? "#94b0c2"}`, "aria-hidden": "true" }, speaker.glyph ?? line.name.charAt(0));
}

export function storyToast(ctx, onClose) {
  const entry = ctx.storyLine;
  if (!entry) return null;
  const { line } = entry;
  const fresh = entry.fresh;
  entry.fresh = false;
  return h("aside", { class: `storyToast ex-${line.expression} speaker-${line.speaker} ${fresh ? "enter" : ""}`, role: "status", "aria-live": "polite" },
    speakerAvatar(ctx, line),
    h("div", { class: "storyBody" }, h("strong", {}, line.name), h("p", {}, line.text),
      line.gift ? h("span", { class: "giftTag" }, `REGALO: ${line.gift.label}`) : null),
    h("button", { class: "storyClose", "aria-label": "Cerrar mensaje", onClick: onClose }, "✕"));
}

export function starterOffer(story) {
  return h("div", { class: "storyOffer" },
    amelieFace(story.starter.expression, 84, { avatar: true }),
    h("div", { class: "storyBody" }, h("strong", {}, story.starter.title), h("p", {}, story.starter.text)));
}

// Escena tras vencer al campeón: diálogo paso a paso y, al final, la elección.
export function amelieScene(ctx) {
  const scene = finalScene(ctx.run);
  const step = Math.min(ctx.finalStep ?? 0, scene.intro.length - 1);
  const line = scene.intro[step];
  const last = step === scene.intro.length - 1;
  const choose = (choice) => {
    sfx.play(choice === "escape" ? "start" : "select");
    ctx.finalStep = 0;
    const result = chooseAmelieEnding(ctx.run, choice);
    ctx.lastEvents = result.events ?? [];
    ctx.rerender();
  };
  return h("section", { class: `window amelieScene ex-${line.expression}` },
    h("div", { class: "sceneStage" }, amelieFace(line.expression, 220)),
    h("div", { class: "sceneBox" },
      h("strong", {}, "AMELIE"),
      h("p", { class: "sceneText" }, line.text),
      last
        ? h("div", { class: "sceneChoices" },
            h("button", { class: "btn primary", onClick: () => choose("escape") }, scene.choices.escape),
            h("button", { class: "btn", onClick: () => choose("stay") }, scene.choices.stay))
        : h("button", { class: "btn primary", onClick: () => { sfx.play("select"); ctx.finalStep = step + 1; ctx.rerender(); } }, "SIGUIENTE ▶")));
}
