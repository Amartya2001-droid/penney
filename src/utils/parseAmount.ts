interface ParseAmountOptions {
  /** Accept 0 as valid (for savings goals and fixed expenses). */
  allowZero?: boolean;
}

export function parseAmount(raw: string, options: ParseAmountOptions = {}): number | null {
  let s = raw.replace(/[\s$]/g, '');
  if (s === '') return null;

  if (/^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }

  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;

  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  if (value < 0) return null;
  if (value === 0 && !options.allowZero) return null;
  return value;
}
