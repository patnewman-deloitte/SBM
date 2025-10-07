export const midRangePercent = (range: string): number => {
  const match = range.match(/([0-9]+\.?[0-9]*)-([0-9]+\.?[0-9]*)%/);
  if (!match) return 0;
  const low = parseFloat(match[1]);
  const high = parseFloat(match[2]);
  return (low + high) / 2;
};

export const midMonths = (range: string): number => {
  const match = range.match(/([0-9]+\.?[0-9]*)-([0-9]+\.?[0-9]*)\s*mo/);
  if (!match) return 0;
  const low = parseFloat(match[1]);
  const high = parseFloat(match[2]);
  return (low + high) / 2;
};

export const reachK = (value: string): number => {
  const match = value.match(/([0-9]+\.?[0-9]*)k/);
  if (!match) return 0;
  return parseFloat(match[1]);
};

export const signalStrength = (score: number): number => {
  const normalized = Math.max(0, Math.min(100, score));
  return Math.round(60 + (normalized / 100) * 40);
};
