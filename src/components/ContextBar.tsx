import React from 'react';
import { Mode } from '../appState';

const modeLabels: Record<Mode, string> = {
  acquire: 'Acquire',
  grow: 'Grow',
  retain: 'Retain',
};

const rangeLabels: Record<'7d' | '30d' | '90d', string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const periodLabels: Record<'w/w' | 'm/m', string> = {
  'w/w': 'Week over week',
  'm/m': 'Month over month',
};

const ContextItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-950/60 px-3 py-1.5">
    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</span>
    <span className="text-xs font-semibold text-slate-100">{value}</span>
  </div>
);

export type ContextBarProps = {
  mode: Mode;
  segmentName?: string;
  marketLabel?: string;
  period: 'w/w' | 'm/m';
  range: '7d' | '30d' | '90d';
};

const ContextBar: React.FC<ContextBarProps> = ({ mode, segmentName, marketLabel, period, range }) => {
  const segmentValue = segmentName?.trim() ? segmentName : 'None';
  const marketValue = marketLabel?.trim() ? marketLabel : 'All markets';
  const periodValue = periodLabels[period] ?? period;
  const rangeValue = rangeLabels[range] ?? range;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2"
      role="region"
      aria-label="Context summary"
    >
      <ContextItem label="Mode" value={modeLabels[mode]} />
      <ContextItem label="Segment" value={segmentValue} />
      <ContextItem label="Market view" value={marketValue} />
      <ContextItem label="Period" value={periodValue} />
      <ContextItem label="Range" value={rangeValue} />
    </div>
  );
};

export default ContextBar;
