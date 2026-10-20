export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sumAmounts(items: ReadonlyArray<{ amount: number }>): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function formatCurrency(value: number, currency = 'CAD', locale = 'en-CA'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    const sign = value < 0 ? '-' : '';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  }
}
