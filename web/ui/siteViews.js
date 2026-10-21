// Campamento y tienda.
import { isAlive } from "../../src/engine/index.js";
import { buyFromShop, leaveShop, playCamp } from "../../src/run/index.js";
import { h } from "./dom.js";
import { describeCard, errorText } from "./labels.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";

function check(ctx, result, sound = "heal") {
  if (!result.ok) {
    sfx.play("deny");
    ctx.notify(errorText[result.error] ?? result.error);
  } else {
    sfx.play(sound);
    if (result.events?.some((event) => event.to === "chest")) ctx.notify("Mazo lleno: la carta fue al COFRE.");
  }
  ctx.rerender();
}

export function renderCamp(ctx) {
  const { run, data } = ctx;
  const { camp } = run.campaign;
  const fainted = run.party.filter((pokemon) => !isAlive(pokemon));
  const living = run.party.filter(isAlive);
  const pick = (list, label, action) => list.length === 0 ? h("small", {}, "Nadie disponible.") :
    h("div", { class: "pickRow" }, list.map((pokemon) => h("button", { class: "btn", onClick: () => check(ctx, playCamp(run, action, pokemon.uid)) }, `${label} ${pokemon.name}`)));

  return h("section", { class: "window camp" },
    h("h2", {}, icon("tent", { scale: 3 }), " CAMPAMENTO"),
    h("p", { class: "muted" }, "Elegí una sola opción."),
    h("div", { class: "campOptions" },
      h("div", { class: "campBlock" }, h("strong", {}, "DESCANSAR"), h("small", {}, `Cura ${Math.round(camp.restHealFraction * 100)}% de los PS máximos a todos los que siguen en pie.`),
        h("button", { class: "btn primary", onClick: () => check(ctx, playCamp(run, "rest")) }, "DESCANSAR")),
      h("div", { class: "campBlock" }, h("strong", {}, "REVIVIR"), h("small", {}, `Un debilitado vuelve con ${Math.round(camp.reviveHpFraction * 100)}% de PS.`), pick(fainted, "Revivir a", "revive")),
      h("div", { class: "campBlock" }, h("strong", {}, "ENTRENAR"), h("small", {}, `+${camp.trainExp} EXP a un Pokémon.`), pick(living, "Entrenar a", "train"))));
}

export function renderShop(ctx) {
  const { run, data } = ctx;
  return h("section", { class: "window shop" },
    h("h2", {}, icon("coin", { scale: 3 }), " TIENDA"),
    h("p", { class: "muted" }, `Tenés ${run.gold} de oro.`),
    h("div", { class: "stock" }, run.shop.stock.map((entry, index) => {
      const def = entry.kind === "item" ? data.items[entry.id] : data.cards[entry.id];
      return h("button", { class: `stockItem ${entry.sold ? "sold" : ""}`, disabled: entry.sold, onClick: () => check(ctx, buyFromShop(run, index), "card") },
        h("strong", {}, def.name), h("small", {}, entry.kind === "item" ? def.description : describeCard(def)),
        h("span", { class: "price" }, entry.sold ? "VENDIDO" : [icon("coin", { scale: 2 }), ` ${entry.price}`]));
    })),
    h("button", { class: "btn primary", onClick: () => { leaveShop(run); sfx.play("select"); ctx.rerender(); } }, "SALIR ▶"));
}
