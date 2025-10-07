import React from 'react';

export type TrendChipProps = {
  value: number;
  suffix?: string;
};

const TrendChip: React.FC<TrendChipProps> = ({ value, suffix }) => {
  const positive = value >= 0;
  const tone = positive
    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
    : 'border-rose-500/60 bg-rose-500/15 text-rose-200';
  const icon = positive ? '▲' : '▼';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <span className="text-[10px] leading-none">{icon}</span>
      <span>
        {positive ? '+' : ''}
        {value.toLocaleString(undefined, { maximumFractionDigits: Math.abs(value) < 10 ? 2 : 0 })}
        {suffix ?? ''}
      </span>
    </span>
  );
};

export default TrendChip;

