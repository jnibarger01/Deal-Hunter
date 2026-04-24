export type ClientErrorPayload = {
  type: 'error' | 'unhandledrejection';
  message: string;
};

export function installClientErrorReporting({
  dsn,
  report = (payload: ClientErrorPayload) => console.error('[client-observability]', payload),
}: {
  dsn?: string;
  report?: (payload: ClientErrorPayload) => void;
}) {
  if (!dsn) {
    return () => {};
  }

  const handleError = (event: ErrorEvent) => {
    report({ type: 'error', message: event.message || 'Unknown client error' });
  };
  const handleRejection = (event: PromiseRejectionEvent) => {
    report({
      type: 'unhandledrejection',
      message: event.reason instanceof Error ? event.reason.message : String(event.reason),
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}
