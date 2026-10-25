// Vistas de la historia de Amelie: globo de diálogo, ofrecimiento del inicial y escena final.
import { chooseAmelieEnding, chooseGardevoirFight, finalScene } from "../../src/run/index.js";
import { amelieFace } from "./amelieArt.js";
import { h } from "./dom.js";
import { sfx } from "./sfx.js";

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

// Retrato de escena: "amelie:<expresión>" usa su arte; "sprite:<especie>" el sprite del Pokémon.
export function scenePortrait(ctx, spec, size = 220) {
  const [kind, value] = spec.split(":");
  if (kind === "sprite") return h("div", { class: "spritePortrait" }, ctx.sprites.element(value, { facing: "front" }));
  return amelieFace(value, size);
}

// Final secreto: Amelie se revela como Gardevoir y Lina ofrece su ayuda antes del combate.
export function gardevoirScene(ctx) {
  const scene = ctx.data.story.gardevoir;
  const step = Math.min(ctx.finalStep ?? 0, scene.intro.length - 1);
  const line = scene.intro[step];
  const last = step === scene.intro.length - 1;
  const fight = () => {
    sfx.play("start");
    ctx.finalStep = 0;
    ctx.lastEvents = chooseGardevoirFight(ctx.run).events ?? [];
    ctx.rerender();
  };
  return h("section", { class: `window amelieScene gardevoirScene portrait-${line.portrait.replace(":", "-")}` },
    h("div", { class: "sceneStage" }, scenePortrait(ctx, line.portrait)),
    h("div", { class: "sceneBox" },
      h("strong", {}, line.name),
      h("p", { class: "sceneText" }, line.text),
      last
        ? h("button", { class: "btn primary", onClick: fight }, scene.button)
        : h("button", { class: "btn primary", onClick: () => { sfx.play("select"); ctx.finalStep = step + 1; ctx.rerender(); } }, "SIGUIENTE ▶")));
}
