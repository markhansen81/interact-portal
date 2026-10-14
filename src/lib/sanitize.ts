/**
 * Basic HTML sanitizer that strips dangerous elements and attributes.
 * Allows safe formatting tags but removes scripts, event handlers, etc.
 */
export function sanitizeHTML(html: string): string {
  return html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove on* event handlers
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"')
    .replace(/src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'src=""')
    // Remove data: URLs in src (potential XSS)
    .replace(/src\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, 'src=""')
    // Remove iframe, embed, object tags
    .replace(/<(iframe|embed|object|applet|form)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(iframe|embed|object|applet|form)\b[^>]*\/?>/gi, '')
    // Remove style attributes that could execute JS
    .replace(/style\s*=\s*(?:"[^"]*expression\s*\([^"]*"|'[^']*expression\s*\([^']*')/gi, '');
}
