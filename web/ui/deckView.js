// Editor de mazo: dos listas (mazo activo / cofre) con movimiento carta a carta.
import { countCards, deckStatus, moveCardToChest, moveCardToDeck } from "../../src/run/index.js";
import { h } from "./dom.js";
import { describeCard, errorText } from "./labels.js";
import { sfx } from "./sfx.js";
import { t } from "../../src/shared/i18n.js";

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
    h("button", { class: `btn mini ${direction === "toChest" ? "" : "primary"}`, onClick, "aria-label": direction === "toChest" ? t("Guardar {name} en el cofre", { name: def.name }) : t("Usar {name} en el mazo", { name: def.name }) },
      direction === "toChest" ? t("→ COFRE") : t("← MAZO")));
}

function column(ctx, title, ids, direction, active) {
  const counts = countCards(ids);
  const entries = Object.entries(counts).sort(([a], [b]) => ctx.data.cards[a].name.localeCompare(ctx.data.cards[b].name));
  return h("div", { class: `deckColumn ${active ? "active" : ""}` },
    h("h3", {}, `${title} (${ids.length})`),
    entries.length === 0 ? h("small", { class: "muted" }, direction === "toChest" ? t("Mazo vacío.") : t("El cofre está vacío.")) :
      h("div", { class: "deckList" }, entries.map(([cardId, count]) => cardLine(ctx, cardId, count, direction))));
}

export function renderDeckEditor(ctx) {
  const status = deckStatus(ctx.run);
  const close = () => { ctx.deckOpen = false; sfx.play("select"); ctx.rerender(); };
  const tone = status.valid ? "good" : "bad";
  const note = status.valid ? t("Listo para combatir.") : status.size < status.min ? t("Faltan {size} cartas para poder avanzar.", { size: status.min - status.size }) : t("Sobran {status} cartas.", { status: status.size - status.max });
  return h("div", { class: "modalBackdrop", onClick: (event) => { if (event.target === event.currentTarget) close(); } },
    h("section", { class: "window deckModal", role: "dialog", "aria-label": t("Editar mazo") },
      h("div", { class: "deckHead" },
        h("h2", {}, t("MAZO")),
        h("span", { class: `deckCount ${tone}` }, `${status.size} / ${status.max}`),
        h("button", { class: "btn mini", onClick: close }, t("CERRAR ✕"))),
      h("small", { class: `deckNote ${tone}` }, t("{note} Mínimo {status}, máximo {status2}. Las cartas del cofre quedan guardadas; no se usan en combate.", { note, status: status.min, status2: status.max })),
      h("div", { class: "deckTabs" },
        h("button", { class: `btn mini ${ui.tab === "deck" ? "on" : ""}`, onClick: () => { ui.tab = "deck"; ctx.rerender(); } }, t("MAZO {size}", { size: status.size })),
        h("button", { class: `btn mini ${ui.tab === "chest" ? "on" : ""}`, onClick: () => { ui.tab = "chest"; ctx.rerender(); } }, t("COFRE {chestSize}", { chestSize: status.chestSize }))),
      h("div", { class: "deckColumns" },
        column(ctx, t("MAZO ACTIVO"), ctx.run.deckCardIds, "toChest", ui.tab === "deck"),
        column(ctx, t("COFRE"), ctx.run.chestCardIds, "toDeck", ui.tab === "chest"))));
}
