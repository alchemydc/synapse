import { describe, it, expect } from 'vitest';
import { stripHtml } from '../../src/services/discourse/utils';

describe('Utils Service', () => {
  describe('stripHtml', () => {
    it('should remove script tags', () => {
      const html = '<script>alert("xss")</script><p>Content</p>';
      expect(stripHtml(html)).toBe('Content');
    });

    it('should remove style tags', () => {
      const html = '<style>body { color: red; }</style><p>Content</p>';
      expect(stripHtml(html)).toBe('Content');
    });

    it('should remove discourse quotes', () => {
      const html = `
        <aside class="quote" data-username="user">
          <div class="title">user said:</div>
          <blockquote>Quote content</blockquote>
        </aside>
        <p>Reply content</p>
      `;
      expect(stripHtml(html)).toBe('Reply content');
    });

    it('should remove generic HTML tags', () => {
      const html = '<p><b>Bold</b> and <i>Italic</i></p>';
      expect(stripHtml(html)).toBe('Bold and Italic');
    });

    it('should handle empty or undefined input', () => {
      expect(stripHtml('')).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });

    it('should collapse whitespace', () => {
      const html = '<p>  Multiple   Spaces  </p>';
      expect(stripHtml(html)).toBe('Multiple Spaces');
    });
  });
});
