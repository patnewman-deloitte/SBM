import React from 'react';
import InfoPopover, { InfoProps } from './InfoPopover';

export type RightRailSection = {
  id: string;
  title: string;
  body: React.ReactNode;
  info?: InfoProps;
  defaultOpen?: boolean;
};

type Props = {
  title: string;
  subtitle?: string;
  kpis?: { label: string; value: string | number; info?: InfoProps }[];
  sections: RightRailSection[];
  action?: React.ReactNode;
};

const RightRail: React.FC<Props> = ({ title, subtitle, kpis = [], sections, action }) => {
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() => {
    return sections.reduce((acc, section) => {
      acc[section.id] = section.defaultOpen ?? true;
      return acc;
    }, {} as Record<string, boolean>);
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="card flex h-full flex-col gap-4 border border-slate-800 p-4">
      <header>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
      </header>
      {kpis.length ? (
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card border border-slate-800/70 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{kpi.label}</span>
                {kpi.info ? <InfoPopover {...kpi.info} placement="left" /> : null}
              </div>
              <p className="mt-1 text-lg font-semibold text-white">
                {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        {sections.map((section) => {
          const isOpen = openSections[section.id];
          return (
            <div key={section.id} className="border border-slate-800/80 rounded-xl bg-slate-900/70">
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-white"
                onClick={() => toggleSection(section.id)}
              >
                <span>{section.title}</span>
                <span className="text-xs text-emerald-300">{isOpen ? 'Hide' : 'Show'}</span>
              </button>
              {isOpen ? <div className="space-y-3 border-t border-slate-800 px-3 py-3 text-sm text-slate-300">{section.body}</div> : null}
            </div>
          );
        })}
      </div>
      {action ? <div className="mt-auto">{action}</div> : null}
      <p className="text-[11px] uppercase tracking-wide text-emerald-400">
        Primary data sources (est.): Synth Cohort Econ / Recon Signals / Competitive Pulse
      </p>
    </aside>
  );
};

export default RightRail;
