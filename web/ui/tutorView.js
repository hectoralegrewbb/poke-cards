// Tutor de movimientos del campamento: cambia una técnica por otra que el Pokémon pueda aprender, a cambio de Piezas de estrella.
import { learnableMoves, moveChangeCost, teachMove } from "../../src/run/index.js";
import { h } from "./dom.js";
import { describeEffects, errorText, typeColors, typeNames } from "./labels.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";

const categoryLabel = { physical: "FÍSICO", special: "ESPECIAL", status: "APOYO" };

function moveSummary(move) {
  const parts = [move.category === "status" ? "APOYO" : `POD ${move.power}`, move.cost === 0 ? "LIBRE" : `COSTO ${move.cost}`, `CD ${move.cooldown}`, categoryLabel[move.category]];
  const effects = describeEffects(move.effects);
  return [parts.join(" · "), effects ? ` · ${effects}` : ""].join("");
}

const typeChip = (type) => h("span", { class: "chip", style: `background:${typeColors[type]}` }, typeNames[type]);

export function tutorBlock(ctx) {
  const { run, data } = ctx;
  const tutor = (ctx.tutor ??= { uid: null, slot: 0 });
  const roster = [...run.party, ...run.box];
  const open = Boolean(tutor.uid);
  const pokemon = roster.find((member) => member.uid === tutor.uid) ?? null;
  const stars = h("span", { class: "starCount" }, icon("star", { scale: 2 }), ` ${run.starPieces ?? 0}`);

  const head = h("div", { class: "tutorHead" }, h("strong", {}, "TUTOR DE TÉCNICAS ", stars),
    h("small", {}, "Cambiá una técnica por otra que pueda aprender. Cuesta 1-5 Piezas de estrella por cambio, sin límite. No gasta tu acción del campamento."),
    h("div", { class: "pickRow" }, roster.map((member) => h("button", { class: `btn ${member.uid === tutor.uid ? "on" : ""}`, onClick: () => {
      sfx.play("select");
      tutor.uid = tutor.uid === member.uid ? null : member.uid;
      tutor.slot = 0;
      ctx.rerender();
    } }, member.name))));
  if (!open || !pokemon) return h("div", { class: "campBlock tutorPanel" }, head);

  const options = learnableMoves(data, pokemon);
  const learn = (moveId) => {
    const result = teachMove(run, pokemon.uid, tutor.slot, moveId);
    if (!result.ok) { sfx.play("deny"); ctx.notify(errorText[result.error] ?? result.error); } else sfx.play("heal");
    ctx.rerender();
  };
  return h("div", { class: "campBlock tutorPanel" }, head,
    h("h3", {}, `${pokemon.name}: elegí la técnica a reemplazar`),
    h("div", { class: "tutorSlots" }, pokemon.moves.map((moveId, index) => {
      const move = data.moves[moveId];
      return h("button", { class: `tutorSlot ${tutor.slot === index ? "selected" : ""}`, onClick: () => { sfx.play("select"); tutor.slot = index; ctx.rerender(); } },
        h("span", { class: "mname" }, move.name, " ", typeChip(move.type)), h("small", {}, moveSummary(move)));
    })),
    h("h3", {}, "PUEDE APRENDER"),
    h("div", { class: "tutorOptions" }, options.map((moveId) => {
      const move = data.moves[moveId];
      const cost = moveChangeCost(data, moveId);
      const affordable = (run.starPieces ?? 0) >= cost;
      return h("button", { class: `tutorOption ${affordable ? "" : "poor"}`, title: moveSummary(move), onClick: () => learn(moveId) },
        h("span", { class: "mname" }, move.name, " ", typeChip(move.type)), h("small", {}, moveSummary(move)),
        h("span", { class: "price" }, icon("star", { scale: 2 }), ` ${cost}`));
    })));
}
