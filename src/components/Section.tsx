import React from 'react';
import Info from './Info';

type SectionProps = {
  title: string;
  info?: {
    title: string;
    body: React.ReactNode;
  };
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ title, info, actions, children }) => {
  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h2>
            {info ? <Info title={info.title} body={info.body} /> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-inner shadow-slate-950/40">
        {children}
      </div>
    </section>
  );
};

export default Section;

