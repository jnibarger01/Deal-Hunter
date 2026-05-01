import { describe, expect, it, vi } from 'vitest';
import { installClientErrorReporting } from './observability';

describe('client observability', () => {
  it('reports browser errors when a dsn is configured', () => {
    const report = vi.fn();
    const cleanup = installClientErrorReporting({ dsn: 'https://example@sentry.io/123', report });

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));

    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'boom',
      })
    );

    cleanup();
  });

  it('does nothing when dsn is missing', () => {
    const report = vi.fn();
    const cleanup = installClientErrorReporting({ dsn: '', report });

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));

    expect(report).not.toHaveBeenCalled();
    cleanup();
  });
});
