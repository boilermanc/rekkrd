import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML from CMS content before rendering with dangerouslySetInnerHTML.
 * Allows common formatting tags only — strips scripts, iframes, and event handlers.
 */
export function sanitizeCmsHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4',
      'ul', 'ol', 'li', 'a', 'blockquote', 'hr', 'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}
