import sanitizeHtml from "sanitize-html";

/**
 * HTML sanitizer using sanitize-html (proper HTML parser, not regex).
 * Allows safe formatting tags but removes scripts, event handlers, iframes, etc.
 */
export function sanitizeHTML(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "b", "i", "em", "strong", "u", "s", "strike",
      "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "pre", "code",
      "a", "span", "div",
      "table", "thead", "tbody", "tr", "th", "td",
      "hr",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      "*": ["class"],
    },
    allowedSchemes: ["https", "http", "mailto"],
  });
}
