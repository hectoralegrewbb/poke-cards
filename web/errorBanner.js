// Cartel de diagnóstico: si algo falla al cargar o en ejecución, lo muestra en pantalla (útil en móvil, sin consola).
(function () {
  var shown = 0;
  var lang = "es";
  try { lang = localStorage.getItem("pokemon-dream.lang") || ((navigator.language || "es").slice(0, 2) === "es" ? "es" : "en"); } catch (e) {}
  var en = lang !== "es";
  function show(text) {
    if (shown >= 3) return;
    shown += 1;
    var box = document.createElement("div");
    box.setAttribute("role", "alert");
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:#b13e53;color:#fff;font:13px/1.35 monospace;padding:10px;border:3px solid #1a1c2c;border-radius:10px;max-height:40vh;overflow:auto;box-shadow:0 4px 0 rgba(0,0,0,.3)";
    var message = document.createElement("div");
    message.textContent = "v0.12.2 · Error: " + text;
    var reset = document.createElement("button");
    reset.textContent = en ? "DELETE SAVE AND RELOAD" : "BORRAR GUARDADO Y RECARGAR";
    reset.style.cssText = "margin:8px 6px 0 0;padding:6px 10px;font:bold 12px monospace";
    reset.onclick = function () { try { localStorage.removeItem("pokecards-dungeon-v2"); } catch (e) {} location.reload(); };
    var close = document.createElement("button");
    close.textContent = en ? "CLOSE" : "CERRAR";
    close.style.cssText = "margin-top:8px;padding:6px 10px;font:bold 12px monospace";
    close.onclick = function () { box.remove(); };
    box.append(message, reset, close);
    document.body.append(box);
  }
  window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target !== window && (target.src || target.href)) {
      var url = target.src || target.href;
      if (/tracks\.json|manifest/.test(url)) return;
      show((en ? "failed to load " : "no cargó ") + url.split("/").slice(-3).join("/"));
      return;
    }
    show((event.message || "error") + (event.filename ? " (" + event.filename.split("/").slice(-2).join("/") + ":" + event.lineno + ")" : ""));
  }, true);
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    show((en ? "promise: " : "promesa: ") + (reason && reason.message ? reason.message : String(reason)));
  });
})();
