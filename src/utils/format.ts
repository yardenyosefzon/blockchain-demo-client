export function shorten(value: string | undefined | null, visible = 6): string {
  if (!value) return '';
  const str = String(value);
  if (str.length <= visible * 2) return str;
  return `${str.slice(0, visible)}...${str.slice(-visible)}`;
}

export function formatAmount(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}
