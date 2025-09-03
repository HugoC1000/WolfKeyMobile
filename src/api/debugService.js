import api from './config';

/**
 * Send a client-side debug log to the backend. Tries POST to /debug/logs/ first.
 * Falls back to a GET request with the message encoded in the URL so it appears in access logs.
 */
export async function sendClientLog(level = 'info', message = '', meta = {}) {
  try {
    const payload = {
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      meta,
      timestamp: new Date().toISOString(),
    };

    // Try POST (preferred)
    try {
      await api.post('debug/logs/', payload);
      return { success: true };
    } catch (postErr) {
      // POST might not exist on server; fall through to GET fallback
      // eslint-disable-next-line no-console
      console.warn('sendClientLog: POST failed, falling back to GET', postErr?.message || postErr);
    }

    // Fallback to GET so the request appears in server access logs even if there's no endpoint
    try {
      const base = api.defaults?.baseURL || '';
      const qs = `level=${encodeURIComponent(level)}&msg=${encodeURIComponent(payload.message)}`;
      // include a small JSON blob of meta if present
      const metaStr = Object.keys(meta || {}).length ? `&meta=${encodeURIComponent(JSON.stringify(meta))}` : '';
      const url = `${base.replace(/\/+$/, '')}/debug/log?${qs}${metaStr}`;
      await fetch(url, { method: 'GET' });
      return { success: true, fallback: true };
    } catch (getErr) {
      // eslint-disable-next-line no-console
      console.error('sendClientLog: GET fallback failed', getErr?.message || getErr);
      return { success: false, error: getErr?.message || String(getErr) };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('sendClientLog error', e?.message || e);
    return { success: false, error: e?.message || String(e) };
  }
}
