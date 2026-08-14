const MODES = new Set(['never', 'no-go', 'go-with-risks']);

export function shouldFailQualityGate(recommendation, mode = 'never') {
  if (!MODES.has(mode)) throw new Error('fail-on must be never, no-go, or go-with-risks.');
  if (mode === 'never') return false;
  if (mode === 'no-go') return recommendation === 'NO-GO';
  return recommendation !== 'GO';
}
