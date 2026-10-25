// Campamento, tienda y Centro Pokémon.
import { isAlive } from "../../src/engine/index.js";
import { buyFromShop, leaveCenter, leaveShop, playCamp } from "../../src/run/index.js";
import { h } from "./dom.js";
import { describeCard, errorText } from "./labels.js";
import { itemImage } from "./itemIcons.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";
import { tutorBlock } from "./tutorView.js";

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
    h("p", { class: "muted" }, "Elegí una sola opción de arriba. El tutor de técnicas es aparte y no gasta tu elección."),
    h("div", { class: "campOptions" },
      h("div", { class: "campBlock" }, h("strong", {}, "DESCANSAR"), h("small", {}, `Cura ${Math.round(camp.restHealFraction * 100)}% de los PS máximos a todos los que siguen en pie.`),
        h("button", { class: "btn primary", onClick: () => check(ctx, playCamp(run, "rest")) }, "DESCANSAR")),
      h("div", { class: "campBlock" }, h("strong", {}, "REVIVIR"), h("small", {}, `Un debilitado vuelve con ${Math.round(camp.reviveHpFraction * 100)}% de PS.`), pick(fainted, "Revivir a", "revive")),
      h("div", { class: "campBlock" }, h("strong", {}, "ENTRENAR"), h("small", {}, `+${camp.trainExp} EXP a un Pokémon.`), pick(living, "Entrenar a", "train"))),
    tutorBlock(ctx));
}

export function renderShop(ctx) {
  const { run, data } = ctx;
  return h("section", { class: "window shop" },
    h("h2", {}, icon("coin", { scale: 3 }), " TIENDA"),
    h("p", { class: "muted" }, `Tenés ${run.gold} de oro.`),
    h("div", { class: "stock" }, run.shop.stock.map((entry, index) => {
      const def = entry.kind === "item" ? data.items[entry.id] : entry.kind === "held" ? data.heldItems[entry.id] : data.cards[entry.id];
      return h("button", { class: `stockItem ${entry.sold ? "sold" : ""}`, disabled: entry.sold, onClick: () => check(ctx, buyFromShop(run, index), "card") },
        h("strong", {}, entry.kind === "item" ? itemImage(entry.id, 28) : entry.kind === "held" ? "◆" : null, entry.kind !== "card" ? " " : "", def.name), h("small", {}, entry.kind === "card" ? describeCard(def) : def.description),
        h("span", { class: "price" }, entry.sold ? "VENDIDO" : [icon("coin", { scale: 2 }), ` ${entry.price}`]));
    })),
    h("button", { class: "btn primary", onClick: () => { leaveShop(run); sfx.play("select"); ctx.rerender(); } }, "SALIR ▶"));
}

// Centro Pokémon: la cura ya se aplicó al entrar (usePokeCenter); acá se muestra el resultado.
export function renderCenter(ctx) {
  const { run } = ctx;
  const event = [...run.log].reverse().find((entry) => entry.type === "centerHealed");
  const lines = event ? [
    event.revived ? (event.revived === 1 ? "1 Pokémon revivió." : `${event.revived} Pokémon revivieron.`) : null,
    event.healed ? (event.healed === 1 ? "1 Pokémon recuperó sus PS y se curó de estados." : `${event.healed} Pokémon recuperaron sus PS y se curaron de estados.`) : null,
    !event.revived && !event.healed ? "Tu equipo ya estaba en perfecto estado." : null
  ].filter(Boolean) : [];
  return h("section", { class: "window center" },
    h("h2", {}, icon("pokeBall", { scale: 3 }), " CENTRO POKÉMON"),
    h("p", {}, "«¡Bienvenido al Centro Pokémon! Dejaremos a tus Pokémon como nuevos. …¡Listo! Esperamos verte pronto.»"),
    h("ul", { class: "centerLines" }, lines.map((line) => h("li", {}, line))),
    h("button", { class: "btn primary", onClick: () => { sfx.play("start"); check(ctx, leaveCenter(run)); } }, "CONTINUAR ▶"));
}
