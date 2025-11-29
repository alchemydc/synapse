import { describe, it, expect } from 'vitest';

import { stripHtml } from '../src/services/discourse/index';

describe('stripHtml', () => {
    it('should leave quoted text in a confusing state', () => {
        const html = `
      <aside class="quote" data-username="outgoing-doze">
        <div class="title">outgoing-doze said:</div>
        <blockquote>Can I run this as a systemd service?</blockquote>
      </aside>
      <p>Yes, you can.</p>
    `;
        const result = stripHtml(html);
        // The quote should be removed, leaving only the reply
        expect(result).toBe('Yes, you can.');
    });
});
