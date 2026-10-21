// Panel lateral fuera de combate: party, caja, inventario y uso de ítems.
import { isAlive } from "../../src/engine/index.js";
import { deckStatus, setRow, swapPartyBox, useItem } from "../../src/run/index.js";
import { h } from "./dom.js";
import { errorText, statusInfo, typeColors, typeNames } from "./labels.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";

const ui = { itemId: null, boxUid: null };

function expInfo(ctx, pokemon) {
  const evolutions = ctx.data.species[pokemon.speciesId].evolutions ?? [];
  // Si la especie tiene varias evoluciones, se muestra la de EXP (la de piedra se ve en el ítem).
  const evolution = evolutions.find((entry) => entry.method === "exp") ?? evolutions[0];
  if (!evolution) return `EXP ${pokemon.exp}`;
  if (evolution.method === "exp") {
    const minBadges = evolution.minBadges ?? 0;
    const locked = ctx.run.badges.length < minBadges;
    return `EXP ${pokemon.exp}/${evolution.expRequired}${locked ? ` · EVO ${minBadges} MED.` : ""}`;
  }
  return `EXP ${pokemon.exp} · ${ctx.data.items[evolution.itemId].name}`;
}

function memberRow(ctx, pokemon, inBox) {
  const alive = isAlive(pokemon);
  const percent = Math.round((pokemon.hp / pokemon.maxHp) * 100);
  const tone = percent > 50 ? "good" : percent > 25 ? "warn" : "low";
  const onClick = () => {
    if (ui.itemId && !inBox) {
      const result = useItem(ctx.run, ui.itemId, pokemon.uid);
      if (!result.ok) {
        sfx.play("deny");
        ctx.notify(errorText[result.error] ?? result.error);
      } else {
        sfx.play("heal");
        if (!ctx.run.inventory[ui.itemId]) ui.itemId = null;
      }
      return ctx.rerender();
    }
    if (ui.boxUid && !inBox) {
      swapPartyBox(ctx.run, pokemon.uid, ui.boxUid);
      ui.boxUid = null;
      return ctx.rerender();
    }
    if (inBox) {
      ui.boxUid = ui.boxUid === pokemon.uid ? null : pokemon.uid;
      sfx.play("select");
      ctx.rerender();
    }
  };
  return h("div", { class: `member ${alive ? "" : "dead"} ${ui.boxUid === pokemon.uid ? "selected" : ""}`, onClick },
    ctx.sprites.element(pokemon.speciesId, { facing: "front", spriteKey: `roster:${pokemon.uid}`, shiny: Boolean(pokemon.shiny) }),
    h("div", { class: "memberInfo" },
      h("div", { class: "pname" }, pokemon.shiny ? "✦ " : "", pokemon.name, pokemon.status ? h("span", { class: `statusTag ${pokemon.status}`, title: statusInfo[pokemon.status].hint }, ` ${statusInfo[pokemon.status].short}`) : null),
      h("div", { class: "types" }, pokemon.types.map((type) => h("span", { class: "chip", style: `background:${typeColors[type]}` }, typeNames[type]))),
      alive ? h("div", { class: "hp" }, h("span", { class: "hpLabel" }, "PS"), h("div", { class: "hpTrack" }, h("div", { class: `hpFill ${tone}`, style: `width:${percent}%` })), h("span", { class: "hpNum" }, `${pokemon.hp}/${pokemon.maxHp}`)) : h("div", { class: "fainted" }, "DEBILITADO"),
      h("small", {}, expInfo(ctx, pokemon))),
    inBox ? null : h("button", { class: "btn mini", onClick: (event) => { event.stopPropagation(); setRow(ctx.run, pokemon.uid, pokemon.row === "front" ? "back" : "front"); sfx.play("select"); ctx.rerender(); } }, pokemon.row === "front" ? "FRENTE" : "FONDO"));
}

export function renderRoster(ctx) {
  const { run, data } = ctx;
  const items = Object.entries(run.inventory);
  return h("aside", { class: "window roster" },
    h("div", { class: "stats" },
      h("span", {}, icon("coin", { scale: 2 }), ` ${run.gold}`),
      h("button", { class: `btn mini deckBtn ${deckStatus(run).valid ? "" : "danger"}`, title: "Editar mazo", onClick: () => { ctx.deckOpen = true; sfx.play("select"); ctx.rerender(); } },
        icon("cards", { scale: 2 }), ` ${deckStatus(run).size}/${deckStatus(run).max}`, run.chestCardIds.length ? ` +${run.chestCardIds.length}` : ""),
      h("span", {}, icon("medal", { scale: 2 }), ` ${run.badges.length}/8`)),
    h("h3", {}, "PARTY"),
    run.party.map((pokemon) => memberRow(ctx, pokemon, false)),
    run.box.length ? [h("h3", {}, "CAJA"), h("small", {}, "Tocá uno y luego un miembro para cambiar."), run.box.map((pokemon) => memberRow(ctx, pokemon, true))] : null,
    h("h3", {}, "ÍTEMS"),
    items.length === 0 ? h("small", {}, "Sin ítems.") : h("div", { class: "items" }, items.map(([itemId, count]) =>
      h("button", { class: `btn mini ${ui.itemId === itemId ? "on" : ""}`, title: data.items[itemId].description, onClick: () => { ui.itemId = ui.itemId === itemId ? null : itemId; sfx.play("select"); ctx.rerender(); } },
        `${data.items[itemId].name} x${count}`))),
    ui.itemId ? h("small", {}, `${data.items[ui.itemId].description} Tocá un Pokémon.`) : null);
}
