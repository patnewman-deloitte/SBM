import React from 'react';
import { Mode } from '../appState';

export type DriverRationalePanelProps = {
  mode: Mode;
  segmentName?: string;
  traits?: string[];
};

const baseReasons: Record<Mode, string[]> = {
  acquire: ['Demand pockets heating up', 'Competitive promo fatigue signals opening'],
  grow: ['Existing base ready for higher tiers', 'Bundle attach potential unlocked'],
  retain: ['Churn exposure concentrated', 'Service reassurance moments needed'],
};

const normalizeTrait = (trait: string) => {
  const lower = trait.toLowerCase();
  if (lower.includes('price')) return 'Price sensitivity (local)';
  if (lower.includes('bundle')) return 'Bundle propensity trending up';
  if (lower.includes('device')) return 'Device upgrade interest';
  if (lower.includes('dma')) return 'Geo cluster momentum';
  if (lower.includes('mover') || lower.includes('new move')) return 'Recent movers spike';
  if (lower.includes('tenure')) return 'Tenure-based trigger';
  if (lower.includes('premium')) return 'Premium tier affinity';
  if (lower.includes('risk')) return 'Risk scoring elevated';
  if (lower.includes('promo')) return 'Promo responsive audience';
  return trait;
};

const DriverRationalePanel: React.FC<DriverRationalePanelProps> = ({ mode, segmentName, traits }) => {
  const reasons = React.useMemo(() => {
    const traitSignals = (traits ?? []).map(normalizeTrait);
    const unique = Array.from(new Set([...baseReasons[mode], ...traitSignals]));
    return unique.slice(0, 6);
  }, [mode, traits]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Driver rationale</p>
          <p className="mt-1 text-sm font-semibold text-white">Why this offer can work</p>
          {segmentName ? (
            <p className="text-xs text-slate-400">Anchored to {segmentName}</p>
          ) : null}
        </div>
      </header>
      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
          >
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DriverRationalePanel;
