// Diálogos de la historia como "videollamada": ventanita con el retrato del personaje, subtítulos y barra de tiempo.
// No bloquea el juego. Si nadie la atiende se corta sola y queda en el registro (campanita) como no leída.
import { unreadStoryCount } from "../../src/run/index.js";
import { amelieFace } from "./amelieArt.js";
import { h } from "./dom.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";

// Retrato: Amelie usa su arte; el resto de personajes, una placa con inicial y color propios.
export function speakerAvatar(ctx, line, size = 64) {
  if (line.speaker === "amelie") return amelieFace(line.expression, size, { avatar: true });
  const speaker = ctx.data.story.speakers[line.speaker] ?? {};
  return h("span", { class: "speakerBadge", style: `--badgeColor:${speaker.color ?? "#94b0c2"}`, "aria-hidden": "true" }, speaker.glyph ?? line.name.charAt(0));
}

function videoFeed(ctx, line) {
  const speaker = ctx.data.story.speakers[line.speaker] ?? {};
  const feed = line.speaker === "amelie"
    ? amelieFace(line.expression, 104)
    : h("span", { class: "speakerBadge big", style: `--badgeColor:${speaker.color ?? "#94b0c2"}`, "aria-hidden": "true" }, speaker.glyph ?? line.name.charAt(0));
  return h("div", { class: "callVideo" }, feed, h("span", { class: "callLive" }, "● EN VIVO"));
}

// ctx.call = { line, shownAt, ms, fresh }. onAnswer: el jugador la atendió (queda leída). 
export function callPanel(ctx, { onAnswer }) {
  const call = ctx.call;
  if (!call) return null;
  const { line } = call;
  const fresh = call.fresh;
  call.fresh = false;
  const elapsed = Math.min(call.ms, Date.now() - call.shownAt);
  return h("aside", { class: `callPanel ex-${line.expression} speaker-${line.speaker} ${fresh ? "enter" : ""}`, role: "status", "aria-live": "polite", "aria-label": `Llamada de ${line.name}` },
    h("div", { class: "callBar" }, h("span", { class: "callDot" }), h("span", { class: "callTitle" }, `LLAMADA · ${line.name}`),
      h("button", { class: "storyClose", "aria-label": "Cerrar llamada", onClick: onAnswer }, "✕")),
    h("div", { class: "callBody" }, videoFeed(ctx, line),
      h("div", { class: "callText" }, h("p", {}, line.text),
        line.gift ? h("span", { class: "giftTag" }, `REGALO: ${line.gift.label}`) : null)),
    h("div", { class: "callFoot" },
      h("div", { class: "callTimer", title: "La llamada se corta sola; la encontrás en la campanita" }, h("i", { style: `animation-duration:${call.ms}ms;animation-delay:-${elapsed}ms` })),
      h("button", { class: "btn mini", onClick: onAnswer }, "OK ✓")));
}

// Campanita: avisa cuántas llamadas quedaron sin atender y abre el registro.
export function storyBell(ctx) {
  const run = ctx.run;
  if (!run || !(run.storyLog?.length)) return null;
  const unread = unreadStoryCount(run);
  return h("button", { class: `btn mini callBell ${unread ? "ringing" : ""}`, title: unread ? `${unread} llamada(s) sin atender` : "Registro de llamadas", "aria-label": "Registro de llamadas",
    onClick: () => { sfx.play("select"); ctx.logOpen = true; ctx.rerender(); } },
    icon("bell", { scale: 2 }), unread ? h("span", { class: "bellCount" }, String(unread)) : null);
}

export function callLog(ctx, onClose) {
  if (!ctx.logOpen) return null;
  const entries = [...(ctx.run.storyLog ?? [])].reverse();
  return h("div", { class: "modalBackdrop", onClick: (event) => { if (event.target === event.currentTarget) onClose(); } },
    h("section", { class: "window callLog", role: "dialog", "aria-label": "Registro de llamadas" },
      h("div", { class: "deckHead" }, h("h2", {}, icon("bell", { scale: 3 }), " LLAMADAS"), h("button", { class: "btn mini", onClick: onClose }, "CERRAR ✕")),
      entries.length === 0 ? h("small", {}, "Todavía no recibiste ninguna llamada.") :
        h("ul", { class: "callList" }, entries.map((entry) => h("li", { class: `callItem ${entry.read ? "" : "unread"}` },
          speakerAvatar(ctx, entry, 48),
          h("div", { class: "storyBody" }, h("strong", {}, entry.name, entry.read ? null : h("span", { class: "newTag" }, " NUEVO")), h("p", {}, entry.text),
            entry.gift ? h("span", { class: "giftTag" }, `REGALO: ${entry.gift.label}`) : null))))));
}
