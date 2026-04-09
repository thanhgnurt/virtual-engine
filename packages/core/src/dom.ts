const TEXT_NODE_PROP = "__vBoardTextNode";

interface VBoardElement extends HTMLElement {
  [TEXT_NODE_PROP]?: Text;
}

/**
 * Optimally sets the text content of an element by manipulating its Text node directly.
 * Bypasses innerHTML/innerText/textContent overhead and avoids layout thrashing.
 */
export const setTextNode = (el: HTMLElement, value: string): void => {
  const vEl = el as VBoardElement;
  let textNode = vEl[TEXT_NODE_PROP];

  if (textNode) {
    if (textNode.parentElement !== el) {
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(textNode);
    }
    if (textNode.nodeValue !== value) {
      textNode.nodeValue = value;
    }
    return;
  }

  if (el.firstChild) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  textNode = document.createTextNode(value);
  el.appendChild(textNode);
  vEl[TEXT_NODE_PROP] = textNode;
};
