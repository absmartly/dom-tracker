export function debugLog(debug: boolean, ...args: unknown[]): void {
  if (debug) {
    console.log('[DOMTracker]', ...args);
  }
}
