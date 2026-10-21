// Editor de mazo: dos listas (mazo activo / cofre) con movimiento carta a carta.
import { countCards, deckStatus, moveCardToChest, moveCardToDeck } from "../../src/run/index.js";
import { h } from "./dom.js";
import { describeCard, errorText } from "./labels.js";
import { sfx } from "./sfx.js";

const ui = { tab: "deck" };

function cardLine(ctx, cardId, count, direction) {
  const def = ctx.data.cards[cardId];
  const move = direction === "toChest" ? moveCardToChest : moveCardToDeck;
  const onClick = () => {
    const result = move(ctx.run, cardId);
    if (!result.ok) {
      sfx.play("deny");
      ctx.notify(errorText[result.error] ?? result.error);
    } else sfx.play("select");
    ctx.rerender();
  };
  return h("div", { class: `deckLine ${def.kind}` },
    h("div", { class: "deckLineInfo" }, h("strong", {}, `${def.name} ×${count}`), h("small", {}, describeCard(def))),
    h("button", { class: `btn mini ${direction === "toChest" ? "" : "primary"}`, onClick, "aria-label": direction === "toChest" ? `Guardar ${def.name} en el cofre` : `Usar ${def.name} en el mazo` },
      direction === "toChest" ? "→ COFRE" : "← MAZO"));
}

function column(ctx, title, ids, direction, active) {
  const counts = countCards(ids);
  const entries = Object.entries(counts).sort(([a], [b]) => ctx.data.cards[a].name.localeCompare(ctx.data.cards[b].name));
  return h("div", { class: `deckColumn ${active ? "active" : ""}` },
    h("h3", {}, `${title} (${ids.length})`),
    entries.length === 0 ? h("small", { class: "muted" }, direction === "toChest" ? "Mazo vacío." : "El cofre está vacío.") :
      h("div", { class: "deckList" }, entries.map(([cardId, count]) => cardLine(ctx, cardId, count, direction))));
}

export function renderDeckEditor(ctx) {
  const status = deckStatus(ctx.run);
  const close = () => { ctx.deckOpen = false; sfx.play("select"); ctx.rerender(); };
  const tone = status.valid ? "good" : "bad";
  const note = status.valid ? "Listo para combatir." : status.size < status.min ? `Faltan ${status.min - status.size} cartas para poder avanzar.` : `Sobran ${status.size - status.max} cartas.`;
  return h("div", { class: "modalBackdrop", onClick: (event) => { if (event.target === event.currentTarget) close(); } },
    h("section", { class: "window deckModal", role: "dialog", "aria-label": "Editar mazo" },
      h("div", { class: "deckHead" },
        h("h2", {}, "MAZO"),
        h("span", { class: `deckCount ${tone}` }, `${status.size} / ${status.max}`),
        h("button", { class: "btn mini", onClick: close }, "CERRAR ✕")),
      h("small", { class: `deckNote ${tone}` }, `${note} Mínimo ${status.min}, máximo ${status.max}. Las cartas del cofre quedan guardadas; no se usan en combate.`),
      h("div", { class: "deckTabs" },
        h("button", { class: `btn mini ${ui.tab === "deck" ? "on" : ""}`, onClick: () => { ui.tab = "deck"; ctx.rerender(); } }, `MAZO ${status.size}`),
        h("button", { class: `btn mini ${ui.tab === "chest" ? "on" : ""}`, onClick: () => { ui.tab = "chest"; ctx.rerender(); } }, `COFRE ${status.chestSize}`)),
      h("div", { class: "deckColumns" },
        column(ctx, "MAZO ACTIVO", ctx.run.deckCardIds, "toChest", ui.tab === "deck"),
        column(ctx, "COFRE", ctx.run.chestCardIds, "toDeck", ui.tab === "chest"))));
}
