/**
 * WeakMap to cache TextNodes for HTMLElements to avoid expensive DOM operations
 * during high-frequency updates like streaming.
 */
const textNodeMap = new WeakMap<HTMLElement, Text>();

/**
 * Optimally updates the text content of an element using a persistent TextNode.
 * This avoids unnecessary DOM churn and improves performance during streaming.
 * 
 * @param el The container element
 * @param value The new text value
 */
export function setTextNode(el: HTMLElement, value: string): void {
  let textNode = textNodeMap.get(el);

  // ✅ Defensive: If text node exists but is no longer in el (e.g., React unmounted/remounted content), re-attach it
  if (textNode) {
    if (textNode.parentElement !== el) {
      // Clean up el and re-attach the cached Text node
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(textNode);
    }
    
    // Only update if value actually changed
    if (textNode.nodeValue !== value) {
      textNode.nodeValue = value;
    }
    return;
  }

  // ✅ Case: No text node yet or content is "polluted"
  // Thoroughly clean el before attaching a single imperative node
  if (el.firstChild) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  textNode = document.createTextNode(value);
  el.appendChild(textNode);
  textNodeMap.set(el, textNode);
}

/**
 * Retrieves the persistent TextNode associated with an element.
 */
export function getTextNode(el: HTMLElement): Text | undefined {
  return textNodeMap.get(el);
}
