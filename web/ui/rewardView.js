import { decideCapture, pickCard } from "../../src/run/index.js";
import { h } from "./dom.js";
import { cardEffectIcons, describeCard, errorText } from "./labels.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";

const ui = { removeCardId: "" };

export function bigCard(def, onClick) {
  const art = def.kind === "energy" ? (def.boostMultiplier > 1 ? [icon("star", { scale: 5 })] : Array.from({ length: def.energyValue }, () => icon("bolt", { scale: 5 }))) : [icon(cardEffectIcons[def.effects[0]?.type] ?? "star", { scale: 5 })];
  const kind = def.kind === "utility" ? "utility" : def.boostMultiplier > 1 ? "wild" : "energy";
  return h("button", { class: `card big ${kind}`, onClick }, h("div", { class: "cardTop" }, def.name), h("div", { class: "cardArt" }, art), h("div", { class: "cardText" }, describeCard(def)));
}

function deckSelect(ctx) {
  const { run, data } = ctx;
  if (run.deckCardIds.length < data.balance.deck.maxSize) return null;
  const distinct = [...new Set(run.deckCardIds)];
  return h("label", { class: "deckFull" }, "MAZO LLENO. DESCARTÁ: ",
    h("select", { onChange: (event) => { ui.removeCardId = event.target.value; } },
      h("option", { value: "" }, "— elegir —"), distinct.map((id) => h("option", { value: id, selected: ui.removeCardId === id }, data.cards[id].name))));
}

export function renderReward(ctx) {
  const { run, data } = ctx;
  const pending = run.pending;
  const summary = ctx.lastEvents.map((event) => {
    if (event.type === "goldGained") return [icon("coin", { scale: 2 }), ` +${event.amount} de oro`];
    if (event.type === "itemGained") return `Ítem: ${data.items[event.itemId].name}`;
    if (event.type === "badgeEarned") return [icon("medal", { scale: 2 }), ` ${event.badge}`];
    if (event.type === "evolved") return [icon("star", { scale: 2 }), ` ${data.species[event.from].name} evolucionó a ${data.species[event.to].name}`];
    return null;
  }).filter(Boolean);

  const attempt = (result) => {
    if (!result.ok) {
      sfx.play("deny");
      ctx.notify(errorText[result.error] ?? result.error);
    } else sfx.play("card");
    ctx.rerender();
  };

  return h("section", { class: "window reward" },
    h("h2", {}, "RECOMPENSAS"),
    h("div", { class: "summary" }, summary.map((line) => h("div", {}, line))),
    pending.cardChoices ? h("div", {}, h("h3", {}, "ELEGÍ UNA CARTA"), deckSelect(ctx),
      h("div", { class: "cardChoices" }, pending.cardChoices.map((cardId) => bigCard(data.cards[cardId], () => attempt(pickCard(run, cardId, ui.removeCardId || null))))),
      h("button", { class: "btn", onClick: () => attempt(pickCard(run, null)) }, "SALTAR")) : null,
    pending.capture ? h("div", { class: "capture" }, h("h3", {}, "¡UN POKÉMON QUIERE UNIRSE!"),
      ctx.sprites.element(pending.capture, { facing: "front", shiny: Boolean(pending.captureShiny) }), h("div", { class: "pname" }, pending.captureShiny ? "✦ " : "", data.species[pending.capture].name),
      pending.captureShiny ? h("small", { class: "shinyNote" }, "¡Es variocolor!") : null,
      h("small", {}, run.party.length >= data.balance.party.maxSize ? "Tu party está llena: irá a la caja." : "Se suma a tu party."),
      h("div", { class: "row" }, h("button", { class: "btn primary", onClick: () => attempt(decideCapture(run, true)) }, "CAPTURAR"),
        h("button", { class: "btn", onClick: () => attempt(decideCapture(run, false)) }, "DEJAR IR"))) : null);
}
