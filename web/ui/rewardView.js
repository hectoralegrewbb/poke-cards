import { decideCapture, pickCard } from "../../src/run/index.js";
import { h } from "./dom.js";
import { cardEffectIcons, describeCard, errorText } from "./labels.js";
import { itemImage } from "./itemIcons.js";
import { icon } from "./pixelIcons.js";
import { cardImage, hasSprite } from "./cardSprite.js";
import { sfx } from "./sfx.js";
import { t } from "../../src/shared/i18n.js";

export function bigCard(def, onClick) {
  const kind = def.kind === "utility" ? "utility" : def.boostMultiplier > 1 ? "wild" : "energy";
  // Al elegir una recompensa hace falta leer el efecto: el texto va debajo del sprite.
  if (hasSprite(def)) {
    return h("button", { class: `card big sprite ${kind}`, onClick }, cardImage(def), h("strong", { class: "cardCaption" }, def.name), h("span", { class: "cardCaptionText" }, describeCard(def)));
  }
  const art = def.kind === "energy" ? (def.boostMultiplier > 1 ? [icon("wild", { scale: 5 })] : Array.from({ length: def.energyValue }, () => icon("bolt", { scale: 5 }))) : [icon(cardEffectIcons[def.effects[0]?.type] ?? "star", { scale: 5 })];
  return h("button", { class: `card big ${kind}`, onClick }, h("div", { class: "cardTop" }, def.name), h("div", { class: "cardArt" }, art), h("div", { class: "cardText" }, describeCard(def)));
}

export function renderReward(ctx) {
  const { run, data } = ctx;
  const pending = run.pending;
  const summary = ctx.lastEvents.map((event) => {
    if (event.type === "goldGained") return [icon("coin", { scale: 2 }), t(" +{amount} de oro", { amount: event.amount })];
    if (event.type === "itemGained") return [itemImage(event.itemId, 24), ` ${data.items[event.itemId].name}`];
    if (event.type === "heldItemGained") return [icon("star", { scale: 2 }), t(" ¡Objeto nuevo: {name}! (equipalo en el panel de equipo)", { name: data.heldItems[event.itemId].name })];
    if (event.type === "starPiecesGained") return [icon("star", { scale: 2 }), event.amount > 1 ? t(" +{amount} Piezas de estrella", { amount: event.amount }) : t(" +{amount} Pieza de estrella", { amount: event.amount })];
    if (event.type === "badgeEarned") return [icon("medal", { scale: 2 }), ` ${event.badge}`];
    if (event.type === "evolved") return [icon("star", { scale: 2 }), t(" {name} evolucionó a {name2}", { name: data.species[event.from].name, name2: data.species[event.to].name })];
    return null;
  }).filter(Boolean);

  const attempt = (result) => {
    if (!result.ok) {
      sfx.play("deny");
      ctx.notify(errorText[result.error] ?? result.error);
    } else {
      sfx.play("card");
      if (result.events?.some((event) => event.to === "chest")) ctx.notify(t("Mazo lleno: la carta fue al COFRE."));
    }
    ctx.rerender();
  };

  return h("section", { class: "window reward" },
    h("h2", {}, t("RECOMPENSAS")),
    h("div", { class: "summary" }, summary.map((line) => h("div", {}, line))),
    pending.cardChoices ? h("div", {}, h("h3", {}, t("ELEGÍ UNA CARTA")),
      h("div", { class: "cardChoices" }, pending.cardChoices.map((cardId) => bigCard(data.cards[cardId], () => attempt(pickCard(run, cardId))))),
      h("button", { class: "btn", onClick: () => attempt(pickCard(run, null)) }, t("SALTAR"))) : null,
    pending.capture ? h("div", { class: "capture" }, h("h3", {}, t("¡UN POKÉMON QUIERE UNIRSE!")),
      ctx.sprites.element(pending.capture, { facing: "front", shiny: Boolean(pending.captureShiny) }), h("div", { class: "pname" }, pending.captureShiny ? "✦ " : "", data.species[pending.capture].name),
      pending.captureShiny ? h("small", { class: "shinyNote" }, t("¡Es variocolor!")) : null,
      h("small", {}, run.party.length >= data.balance.party.maxSize ? t("Tu party está llena: irá a la caja.") : t("Se suma a tu party.")),
      h("div", { class: "row" }, h("button", { class: "btn primary", onClick: () => attempt(decideCapture(run, true)) }, t("CAPTURAR")),
        h("button", { class: "btn", onClick: () => attempt(decideCapture(run, false)) }, t("DEJAR IR")))) : null);
}
