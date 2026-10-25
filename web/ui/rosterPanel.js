// Panel lateral fuera de combate: party, caja, inventario y uso de ítems.
import { isAlive, pokemonLevel } from "../../src/engine/index.js";
import { levelTag } from "./levelTag.js";
import { bagButton, heldButton } from "./heldView.js";
import { deckStatus, setRow, swapPartyBox, useItem } from "../../src/run/index.js";
import { h } from "./dom.js";
import { errorText, statusInfo, typeColors, typeNames } from "./labels.js";
import { itemImage } from "./itemIcons.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";
import { t } from "../../src/shared/i18n.js";

const ui = { itemId: null, boxUid: null };

function expInfo(ctx, pokemon) {
  const evolutions = ctx.data.species[pokemon.speciesId].evolutions ?? [];
  // Si la especie tiene varias evoluciones, se muestra la de EXP (la de piedra se ve en el ítem).
  const evolution = evolutions.find((entry) => entry.method === "exp") ?? evolutions[0];
  if (!evolution) return t("EXP {exp}", { exp: pokemon.exp });
  if (evolution.method === "exp") {
    const minBadges = evolution.minBadges ?? 0;
    const locked = ctx.run.badges.length < minBadges;
    return t("EXP {exp}/{required}", { exp: pokemon.exp, required: evolution.expRequired }) + (locked ? t(" · EVO {minBadges} MED.", { minBadges }) : "");
  }
  return t("EXP {exp} · {name}", { exp: pokemon.exp, name: ctx.data.items[evolution.itemId].name });
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
      h("div", { class: "pname" }, pokemon.shiny ? "✦ " : "", pokemon.name, " ", levelTag(pokemonLevel(pokemon)), pokemon.status ? h("span", { class: `statusTag ${pokemon.status}`, title: statusInfo[pokemon.status].hint }, ` ${statusInfo[pokemon.status].short}`) : null),
      h("div", { class: "types" }, pokemon.types.map((type) => h("span", { class: "chip", style: `background:${typeColors[type]}` }, typeNames[type]))),
      alive ? h("div", { class: "hp" }, h("span", { class: "hpLabel" }, t("PS")), h("div", { class: "hpTrack" }, h("div", { class: `hpFill ${tone}`, style: `width:${percent}%` })), h("span", { class: "hpNum" }, `${pokemon.hp}/${pokemon.maxHp}`)) : h("div", { class: "fainted" }, t("DEBILITADO")),
      h("small", {}, expInfo(ctx, pokemon)),
      heldButton(ctx, pokemon)),
    inBox ? null : h("button", { class: "btn mini", onClick: (event) => { event.stopPropagation(); setRow(ctx.run, pokemon.uid, pokemon.row === "front" ? "back" : "front"); sfx.play("select"); ctx.rerender(); } }, pokemon.row === "front" ? t("FRENTE") : t("FONDO")));
}

export function renderRoster(ctx) {
  const { run, data } = ctx;
  const items = Object.entries(run.inventory);
  return h("aside", { class: "window roster" },
    h("div", { class: "stats" },
      h("span", {}, icon("coin", { scale: 2 }), ` ${run.gold}`),
      h("button", { class: `btn mini deckBtn ${deckStatus(run).valid ? "" : "danger"}`, title: t("Editar mazo"), onClick: () => { ctx.deckOpen = true; sfx.play("select"); ctx.rerender(); } },
        icon("cards", { scale: 2 }), ` ${deckStatus(run).size}/${deckStatus(run).max}`, run.chestCardIds.length ? ` +${run.chestCardIds.length}` : ""),
      h("span", { title: t("Piezas de estrella: se usan en el tutor de técnicas del campamento") }, icon("star", { scale: 2 }), ` ${run.starPieces ?? 0}`),
      bagButton(ctx),
      h("span", {}, icon("medal", { scale: 2 }), ` ${run.badges.length}/8`)),
    h("h3", {}, t("PARTY")),
    run.party.map((pokemon) => memberRow(ctx, pokemon, false)),
    run.box.length ? [h("h3", {}, t("CAJA")), h("small", {}, t("Tocá uno y luego un miembro para cambiar.")), run.box.map((pokemon) => memberRow(ctx, pokemon, true))] : null,
    h("h3", {}, t("ÍTEMS")),
    items.length === 0 ? h("small", {}, t("Sin ítems.")) : h("div", { class: "items" }, items.map(([itemId, count]) =>
      h("button", { class: `btn mini ${ui.itemId === itemId ? "on" : ""}`, title: data.items[itemId].description, onClick: () => { ui.itemId = ui.itemId === itemId ? null : itemId; sfx.play("select"); ctx.rerender(); } },
        itemImage(itemId, 22), ` ${data.items[itemId].name} x${count}`))),
    ui.itemId ? h("small", {}, t("{description} Tocá un Pokémon.", { description: data.items[ui.itemId].description })) : null);
}
