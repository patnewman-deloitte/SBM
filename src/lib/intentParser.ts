const regionRegex = /(national|urban|suburban|rural|midwest|west|south|northeast)/i;
const sizeRegex = /(\d{2,3})k/gi;
const priceRegex = /(price|pay)\s*(under|below|less than)\s*\$(\d{2,3})/i;

export type IntentResult = {
  filters: Record<string, unknown>;
  summary: string;
};

export const parseIntent = (input: string): IntentResult => {
  const filters: Record<string, unknown> = {};
  let summary: string[] = [];

  const regionMatch = input.match(regionRegex);
  if (regionMatch) {
    filters.region = regionMatch[0].toLowerCase();
    summary.push(`Region → ${regionMatch[0]}`);
  }

  const sizes: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = sizeRegex.exec(input)) !== null) {
    sizes.push(Number(match[1]) * 1000);
  }
  if (sizes.length) {
    filters.minSize = Math.min(...sizes);
    summary.push(`Min size ≥ ${Math.min(...sizes).toLocaleString()}`);
  }

  const priceMatch = input.match(priceRegex);
  if (priceMatch) {
    filters.priceCeiling = Number(priceMatch[3]);
    summary.push(`Price ceiling $${priceMatch[3]}`);
  }

  if (/high\s+value/i.test(input)) {
    filters.valueSensitivity = 'high';
    summary.push('Value sensitivity high');
  }

  if (/switch(ers|ing)/i.test(input)) {
    filters.switchLikelihood = 'elevated';
    summary.push('Switch likelihood elevated');
  }

  if (summary.length === 0) {
    summary.push('No automatic changes; try "urban cohorts over 200k size"');
  }

  return { filters, summary: summary.join(' • ') };
};
