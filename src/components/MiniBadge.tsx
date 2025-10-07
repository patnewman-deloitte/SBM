import React from 'react';

type MiniBadgeProps = {
  tone?: 'emerald' | 'slate' | 'amber';
  children: React.ReactNode;
};

const toneMap: Record<NonNullable<MiniBadgeProps['tone']>, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40',
  slate: 'bg-slate-800/80 text-slate-200 border-slate-600/60',
  amber: 'bg-amber-500/15 text-amber-100 border-amber-400/40'
};

const MiniBadge: React.FC<MiniBadgeProps> = ({ tone = 'slate', children }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
};

export default MiniBadge;

