export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export const currencyFormatter2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

export const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

export const formatDelta = (value: number) => {
  const formatted = value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  return `${formatted}%`;
};

export const formatPayback = (value: string) => (value === '>24' ? '> 24 mo' : `${value} mo`);
