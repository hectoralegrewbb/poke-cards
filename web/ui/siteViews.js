// Campamento, tienda y Centro Pokémon.
import { isAlive } from "../../src/engine/index.js";
import { buyFromShop, leaveCenter, leaveShop, playCamp } from "../../src/run/index.js";
import { h } from "./dom.js";
import { describeCard, errorText } from "./labels.js";
import { itemImage } from "./itemIcons.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";
import { tutorBlock } from "./tutorView.js";
import { t } from "../../src/shared/i18n.js";

function check(ctx, result, sound = "heal") {
  if (!result.ok) {
    sfx.play("deny");
    ctx.notify(errorText[result.error] ?? result.error);
  } else {
    sfx.play(sound);
    if (result.events?.some((event) => event.to === "chest")) ctx.notify(t("Mazo lleno: la carta fue al COFRE."));
  }
  ctx.rerender();
}

export function renderCamp(ctx) {
  const { run, data } = ctx;
  const { camp } = run.campaign;
  const fainted = run.party.filter((pokemon) => !isAlive(pokemon));
  const living = run.party.filter(isAlive);
  const pick = (list, label, action) => list.length === 0 ? h("small", {}, t("Nadie disponible.")) :
    h("div", { class: "pickRow" }, list.map((pokemon) => h("button", { class: "btn", onClick: () => check(ctx, playCamp(run, action, pokemon.uid)) }, `${label} ${pokemon.name}`)));

  return h("section", { class: "window camp" },
    h("h2", {}, icon("tent", { scale: 3 }), t(" CAMPAMENTO")),
    h("p", { class: "muted" }, t("Elegí una sola opción de arriba. El tutor de técnicas es aparte y no gasta tu elección.")),
    h("div", { class: "campOptions" },
      h("div", { class: "campBlock" }, h("strong", {}, t("DESCANSAR")), h("small", {}, t("Cura {restHealFraction}% de los PS máximos a todos los que siguen en pie.", { restHealFraction: Math.round(camp.restHealFraction * 100) })),
        h("button", { class: "btn primary", onClick: () => check(ctx, playCamp(run, "rest")) }, t("DESCANSAR"))),
      h("div", { class: "campBlock" }, h("strong", {}, t("REVIVIR")), h("small", {}, t("Un debilitado vuelve con {reviveHpFraction}% de PS.", { reviveHpFraction: Math.round(camp.reviveHpFraction * 100) })), pick(fainted, t("Revivir a"), "revive")),
      h("div", { class: "campBlock" }, h("strong", {}, t("ENTRENAR")), h("small", {}, t("+{trainExp} EXP a un Pokémon.", { trainExp: camp.trainExp })), pick(living, t("Entrenar a"), "train"))),
    tutorBlock(ctx));
}

export function renderShop(ctx) {
  const { run, data } = ctx;
  return h("section", { class: "window shop" },
    h("h2", {}, icon("coin", { scale: 3 }), t(" TIENDA")),
    h("p", { class: "muted" }, t("Tenés {gold} de oro.", { gold: run.gold })),
    h("div", { class: "stock" }, run.shop.stock.map((entry, index) => {
      const def = entry.kind === "item" ? data.items[entry.id] : entry.kind === "held" ? data.heldItems[entry.id] : data.cards[entry.id];
      return h("button", { class: `stockItem ${entry.sold ? "sold" : ""}`, disabled: entry.sold, onClick: () => check(ctx, buyFromShop(run, index), "card") },
        h("strong", {}, entry.kind === "item" ? itemImage(entry.id, 28) : entry.kind === "held" ? "◆" : null, entry.kind !== "card" ? " " : "", def.name), h("small", {}, entry.kind === "card" ? describeCard(def) : def.description),
        h("span", { class: "price" }, entry.sold ? t("VENDIDO") : [icon("coin", { scale: 2 }), ` ${entry.price}`]));
    })),
    h("button", { class: "btn primary", onClick: () => { leaveShop(run); sfx.play("select"); ctx.rerender(); } }, t("SALIR ▶")));
}

// Centro Pokémon: la cura ya se aplicó al entrar (usePokeCenter); acá se muestra el resultado.
export function renderCenter(ctx) {
  const { run } = ctx;
  const event = [...run.log].reverse().find((entry) => entry.type === "centerHealed");
  const lines = event ? [
    event.revived ? (event.revived === 1 ? t("1 Pokémon revivió.") : t("{revived} Pokémon revivieron.", { revived: event.revived })) : null,
    event.healed ? (event.healed === 1 ? t("1 Pokémon recuperó sus PS y se curó de estados.") : t("{healed} Pokémon recuperaron sus PS y se curaron de estados.", { healed: event.healed })) : null,
    !event.revived && !event.healed ? t("Tu equipo ya estaba en perfecto estado.") : null
  ].filter(Boolean) : [];
  return h("section", { class: "window center" },
    h("h2", {}, icon("pokeBall", { scale: 3 }), t(" CENTRO POKÉMON")),
    h("p", {}, t("«¡Bienvenido al Centro Pokémon! Dejaremos a tus Pokémon como nuevos. …¡Listo! Esperamos verte pronto.»")),
    h("ul", { class: "centerLines" }, lines.map((line) => h("li", {}, line))),
    h("button", { class: "btn primary", onClick: () => { sfx.play("start"); check(ctx, leaveCenter(run)); } }, t("CONTINUAR ▶")));
}
