import React from 'react';
import InfoPopover from './InfoPopover';

export type SelectionTrayProps = {
  title: string;
  items: { id: string; label: string; subtitle?: string }[];
  metrics: { label: string; value: string | number }[];
  ctaLabel: string;
  onCta: () => void;
  disabled?: boolean;
};

const SelectionTray: React.FC<SelectionTrayProps> = ({ title, items, metrics, ctaLabel, onCta, disabled }) => {
  return (
    <div className="sticky bottom-4 z-20 mt-8 rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-4 shadow-lg shadow-emerald-500/10">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-400">{title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {items.length ? (
              items.map((item) => (
                <span key={item.id} className="info-chip">
                  <span className="font-semibold text-emerald-200">{item.label}</span>
                  {item.subtitle ? <span className="text-slate-300"> • {item.subtitle}</span> : null}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">No selections yet.</span>
            )}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-sm text-slate-300">
              <span className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</span>
              <p className="text-lg font-semibold text-white">{metric.value}</p>
            </div>
          ))}
          <button
            onClick={onCta}
            disabled={disabled}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
      {metrics.length ? (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
          {metrics.map((metric) => (
            <div key={`info-${metric.label}`} className="flex items-center gap-2">
              <InfoPopover
                title={metric.label}
                description={`This metric summarizes ${metric.label.toLowerCase()} across the current selection.`}
              />
              <span>Use to communicate progress for {metric.label.toLowerCase()}.</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default SelectionTray;
