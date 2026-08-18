// Small HTML helpers shared by the generators.

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Serialize JSON-LD, escaping `<` so a value can never close the script tag. */
export function safeJsonLd(value) {
  return JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');
}
