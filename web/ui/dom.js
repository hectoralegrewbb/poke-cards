// Helper mínimo para armar DOM sin librerías: h("div", { class: "x", onClick }, hijos...)
export function h(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") element.className = value;
    else if (key === "style") element.style.cssText = value;
    else if (key.startsWith("on")) element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "disabled" || key === "value" || key === "selected" || key === "checked") element[key] = value;
    else element.setAttribute(key, value === true ? "" : value);
  }
  const append = (child) => {
    if (Array.isArray(child)) child.forEach(append);
    else if (child !== null && child !== undefined && child !== false) {
      element.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  };
  children.forEach(append);
  return element;
}
