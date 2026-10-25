// Objetos equipables: botón en cada miembro del equipo y ventana para equiparlos antes del combate.
import { equipHeldItem, freeHeldItems, holderOf, unequipHeldItem } from "../../src/run/index.js";
import { h } from "./dom.js";
import { errorText } from "./labels.js";
import { sfx } from "./sfx.js";

const tierMarks = { 1: "●", 2: "●●", 3: "●●●" };

export function heldButton(ctx, pokemon) {
  const { run, data } = ctx;
  if (!run.heldOwned?.length && !pokemon.heldItem) return null;
  const item = pokemon.heldItem ? data.heldItems[pokemon.heldItem] : null;
  return h("button", { class: `btn mini heldBtn ${item ? "on" : ""}`, title: item ? `${item.name}: ${item.description}` : "Equipar un objeto",
    onClick: (event) => { event.stopPropagation(); sfx.play("select"); ctx.equipUid = pokemon.uid; ctx.rerender(); } },
    item ? `◆ ${item.name}` : "＋ OBJETO");
}

export function bagButton(ctx) {
  const { run } = ctx;
  if (!run.heldOwned?.length) return null;
  const free = freeHeldItems(run).length;
  return h("button", { class: "btn mini", title: "Objetos equipables", onClick: () => { sfx.play("select"); ctx.equipUid = run.party[0]?.uid ?? null; ctx.rerender(); } },
    `◆ ${run.heldOwned.length}`, free ? h("span", { class: "freeDot", title: `${free} sin equipar` }, ` ·${free}`) : null);
}

export function heldModal(ctx) {
  const { run, data } = ctx;
  if (!ctx.equipUid) return null;
  const roster = [...run.party, ...run.box];
  const pokemon = roster.find((member) => member.uid === ctx.equipUid);
  if (!pokemon) { ctx.equipUid = null; return null; }
  const close = () => { ctx.equipUid = null; ctx.rerender(); };
  const act = (result) => {
    if (!result.ok) { sfx.play("deny"); ctx.notify(errorText[result.error] ?? result.error); } else sfx.play("heal");
    ctx.rerender();
  };
  const rows = run.heldOwned.map((itemId) => {
    const item = data.heldItems[itemId];
    const holder = holderOf(run, itemId);
    const mine = holder === pokemon;
    return h("li", { class: `heldRow ${mine ? "mine" : ""}` },
      h("div", { class: "heldInfo" }, h("strong", {}, item.name, h("small", { class: "tier" }, ` ${tierMarks[item.tier]}`)), h("p", {}, item.description),
        holder && !mine ? h("small", { class: "muted" }, `Lo lleva ${holder.name}`) : null),
      mine ? h("button", { class: "btn mini", onClick: () => act(unequipHeldItem(run, pokemon.uid)) }, "QUITAR")
        : h("button", { class: "btn mini primary", onClick: () => act(equipHeldItem(run, itemId, pokemon.uid)) }, holder ? "TOMAR" : "EQUIPAR"));
  });
  return h("div", { class: "modalBackdrop", onClick: (event) => { if (event.target === event.currentTarget) close(); } },
    h("section", { class: "window heldModal", role: "dialog", "aria-label": "Objetos equipables" },
      h("div", { class: "deckHead" }, h("h2", {}, "◆ OBJETOS"), h("button", { class: "btn mini", onClick: close }, "CERRAR ✕")),
      h("p", { class: "muted" }, "Cada objeto es único: lo lleva un solo Pokémon. Equipalos antes de combatir."),
      h("div", { class: "heldTabs" }, roster.map((member) => h("button", { class: `btn mini ${member.uid === pokemon.uid ? "on" : ""}`, onClick: () => { ctx.equipUid = member.uid; sfx.play("select"); ctx.rerender(); } },
        member.name, member.heldItem ? " ◆" : ""))),
      h("h3", {}, `${pokemon.name} lleva: ${pokemon.heldItem ? data.heldItems[pokemon.heldItem].name : "nada"}`),
      rows.length ? h("ul", { class: "heldList" }, rows) : h("small", {}, "Todavía no tenés objetos. Se consiguen al ganar combates importantes y en las tiendas.")));
}
