/**
 * Runtime tracing utility — always bundled, opt-in via console.
 *
 * Enable:  window.enableTracing()   (persists across reloads via localStorage)
 * Disable: window.disableTracing()
 *
 * Usage: trace('Router', 'onPathChange', { path })
 */

const LS_KEY = 'biliardino_tracing';

let _enabled = localStorage.getItem(LS_KEY) === '1';

declare global {
  interface Window {
    enableTracing: () => void;
    disableTracing: () => void;
  }
}

window.enableTracing = () => {
  _enabled = true;
  localStorage.setItem(LS_KEY, '1');
  console.info('[Trace] Tracing ENABLED — will persist across reloads. Use window.disableTracing() to stop.');
};

window.disableTracing = () => {
  _enabled = false;
  localStorage.removeItem(LS_KEY);
  console.info('[Trace] Tracing DISABLED.');
};

if (_enabled) {
  console.info('[Trace] Tracing is ON (persisted). Use window.disableTracing() to stop.');
}

/**
 * Emit a trace log. No-op when tracing is disabled.
 * @param module  Short module name, e.g. 'Router', 'Bootstrap', 'State'
 * @param step    Human-readable step label
 * @param data    Optional extra data to log
 */
export function trace(module: string, step: string, data?: unknown): void {
  if (!_enabled) return;
  const ts = performance.now().toFixed(1);
  if (data !== undefined) {
    console.debug(`[Trace +${ts}ms] [${module}] ${step}`, data);
  } else {
    console.debug(`[Trace +${ts}ms] [${module}] ${step}`);
  }
}
