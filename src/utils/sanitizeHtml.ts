import DOMPurify from 'dompurify';

/**
 * 🛡️ Nexus Mind Vault — DOMPurify XSS Sanitization Pipeline
 * Protects against stored XSS, reflected XSS, and malicious markdown injections.
 */

const DEFAULT_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre',
    'blockquote', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'table',
    'thead', 'tbody', 'tr', 'th', 'td', 'div', 'mark', 'kbd', 'del', 'sup', 'sub'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'title', 'id'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target', 'rel'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link', 'svg', 'math'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'srcdoc'],
};

/**
 * Sanitizes rich text or Markdown-rendered HTML.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  
  return DOMPurify.sanitize(dirtyHtml, {
    ...DEFAULT_PURIFY_CONFIG,
    RETURN_TRUSTED_TYPE: false,
  });
}

/**
 * Sanitizes plain text input by stripping all HTML tags.
 */
export function sanitizePlainText(dirtyText: string): string {
  if (!dirtyText || typeof dirtyText !== 'string') return '';
  return DOMPurify.sanitize(dirtyText, { ALLOWED_TAGS: [] });
}

/**
 * React helper for safe dangerouslySetInnerHTML rendering
 */
export function createSafeHtml(dirtyHtml: string): { __html: string } {
  return { __html: sanitizeHtml(dirtyHtml) };
}
