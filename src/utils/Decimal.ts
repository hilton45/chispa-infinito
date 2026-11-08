import Decimal from 'break_infinity.js';

export { Decimal };
export type DecimalSource = Decimal | number | string;

export function D(val: DecimalSource): Decimal {
  if (val instanceof Decimal) return val;
  return new Decimal(val);
}

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);
export const TWO = new Decimal(2);

const STANDARD_SUFFIXES = [
  '',
  ' K',
  ' M',
  ' B',
  ' T',
  ' Qa',
  ' Qi',
  ' Sx',
  ' Sp',
  ' Oc',
  ' No',
  ' Dc',
  ' Ud',
  ' Dd',
  ' Td',
  ' Qad',
  ' Qid',
  ' Sxd',
  ' Spd',
  ' Ocd',
  ' Nod',
  ' Vg',
];

/**
 * Format a Decimal with standard suffixes or scientific notation.
 * Examples:
 *   12.34 -> "12.3"
 *   1234 -> "1.23 K"
 *   1234567 -> "1.23 M"
 *   1e66+ -> "1.23e66"
 */
export function formatDecimal(
  value: DecimalSource,
  options?: {
    decimals?: number;
    mode?: 'standard' | 'scientific';
    showPlus?: boolean;
  }
): string {
  const d = D(value);
  const decimals = options?.decimals ?? 2;
  const mode = options?.mode ?? 'standard';

  if (Number.isNaN(d.mantissa) || !Number.isFinite(d.mantissa)) return '∞';
  if (d.eq(0)) return '0';

  const isNeg = d.lt(0);
  const abs = d.abs();
  const prefix = isNeg ? '-' : options?.showPlus ? '+' : '';

  if (mode === 'scientific' || abs.gte(1e66)) {
    if (abs.lt(1000) && abs.gte(0.01)) {
      return prefix + abs.toNumber().toFixed(decimals);
    }
    const exp = abs.exponent;
    const mantissa = abs.mantissa;
    return `${prefix}${mantissa.toFixed(decimals)}e${exp}`;
  }

  // Under 1000, show integer or 1 decimal if small
  if (abs.lt(1000)) {
    if (abs.lt(10)) {
      return prefix + abs.toNumber().toFixed(1).replace(/\.0$/, '');
    }
    return prefix + Math.floor(abs.toNumber()).toString();
  }

  // Standard notation
  const tier = Math.floor(abs.exponent / 3);
  if (tier < STANDARD_SUFFIXES.length) {
    const scale = Math.pow(10, abs.exponent % 3);
    const scaledVal = abs.mantissa * scale;
    return `${prefix}${scaledVal.toFixed(decimals)}${STANDARD_SUFFIXES[tier]}`;
  }

  // Fallback to scientific
  return `${prefix}${abs.mantissa.toFixed(decimals)}e${abs.exponent}`;
}

/**
 * Format time in seconds to human readable string (e.g. 1h 24m 10s).
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0 s';
  if (seconds < 60) return `${Math.floor(seconds)} s`;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600) % 24;
  const d = Math.floor(seconds / 86400);
  const s = Math.floor(seconds % 60);

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}
