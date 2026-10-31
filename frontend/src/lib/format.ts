/** RTT values: up to 5 significant digits (0.01497, 0.05693, 97.209, 4.685) without trailing zeros. */
export function fmtRtt(ms: number): string {
  return String(Number(ms.toPrecision(5)));
}

/** Durations in milliseconds, two decimals (1013.60). */
export function fmtDurationMs(ms: number): string {
  return ms.toFixed(2);
}

export function fmtSeconds(s: number): string {
  return s.toFixed(3);
}

export function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export function fmtPercent(n: number): string {
  return `${Number(n.toFixed(3))}`;
}
