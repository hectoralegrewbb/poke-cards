// Arrastrar y soltar con eventos de puntero (mouse y táctil). Un clic sin mover no arrastra:
// el clic normal sigue funcionando como alternativa.
//
// attachDrag(element, {
//   root,                       // contenedor donde buscar [data-drop]
//   ghost(),                    // elemento que sigue al puntero (por defecto, clon del original)
//   isValid(dropElement),       // ¿este destino acepta lo que arrastro?
//   hint(dropElement),          // texto flotante sobre el destino bajo el puntero
//   onDrop(dropElement),        // se llama al soltar sobre un destino válido
//   onReject(),                 // soltar fuera de destinos válidos (opcional)
//   onStart(),                  // opcional
//   kind                        // "energy" | "technique" | "utility": se publica en body[data-drag] para el CSS
// })
import { h } from "./dom.js";

const dragThreshold = 6;

export function attachDrag(element, spec) {
  // En la mano táctil dejamos deslizar horizontalmente las cartas.
  // Arrastrar en vertical sigue funcionando; en el menú de técnicas se mantiene libre.
  element.style.touchAction = spec.kind === "technique" ? "none" : "pan-x";
  element.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    let ghost = null;
    let hintBox = null;
    let hovered = null;
    let validTargets = [];

    const targetUnder = (x, y) => {
      const under = document.elementFromPoint(x, y)?.closest("[data-drop]") ?? null;
      return under && validTargets.includes(under) ? under : null;
    };

    function begin() {
      dragging = true;
      spec.onStart?.();
      ghost = spec.ghost ? spec.ghost() : element.cloneNode(true);
      ghost.classList.add("dragGhost");
      document.body.append(ghost);
      hintBox = h("div", { class: "dragHint" });
      document.body.append(hintBox);
      element.classList.add("dragging");
      validTargets = [...(spec.root ?? document).querySelectorAll("[data-drop]")].filter((candidate) => spec.isValid(candidate));
      validTargets.forEach((candidate) => candidate.classList.add("dropValid"));
      document.body.classList.add("isDragging");
      document.body.dataset.drag = spec.kind ?? "";
    }

    function move(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) > dragThreshold) begin();
      if (!dragging) return;
      ghost.style.transform = `translate(${moveEvent.clientX}px, ${moveEvent.clientY}px) translate(-50%, -60%) rotate(${Math.max(-12, Math.min(12, dx / 14))}deg) scale(1.08)`;
      const target = targetUnder(moveEvent.clientX, moveEvent.clientY);
      if (target !== hovered) {
        hovered?.classList.remove("dropHover");
        target?.classList.add("dropHover");
        hovered = target;
      }
      hintBox.textContent = target ? spec.hint?.(target) ?? "" : "";
      hintBox.style.display = hintBox.textContent ? "block" : "none";
      hintBox.style.transform = `translate(${moveEvent.clientX + 16}px, ${moveEvent.clientY - 36}px)`;
    }

    function end(upEvent) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (!dragging) return;

      const target = upEvent.type === "pointercancel" ? null : targetUnder(upEvent.clientX, upEvent.clientY);
      validTargets.forEach((candidate) => candidate.classList.remove("dropValid", "dropHover"));
      document.body.classList.remove("isDragging");
      delete document.body.dataset.drag;
      hintBox.remove();
      element.classList.remove("dragging");
      // El clic que sigue a un arrastre no debe activar el botón original. El bloqueo se retira por
      // tiempo: si el clic nunca llega (el DOM se redibujó), no puede quedar "pegado" al próximo clic real.
      const swallow = (clickEvent) => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
      };
      window.addEventListener("click", swallow, true);
      setTimeout(() => window.removeEventListener("click", swallow, true), 60);

      if (target) {
        ghost.remove();
        spec.onDrop(target);
      } else {
        ghost.classList.add("returning");
        ghost.style.transform = `translate(${element.getBoundingClientRect().left + element.offsetWidth / 2}px, ${element.getBoundingClientRect().top + element.offsetHeight / 2}px) translate(-50%, -50%)`;
        setTimeout(() => ghost.remove(), 200);
        spec.onReject?.();
      }
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
}
