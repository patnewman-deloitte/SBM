import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { InfoPopover } from './InfoPopover';

interface KpiCardProps {
  title: string;
  value: string;
  deltaLabel?: string;
  trend?: 'up' | 'down' | 'flat';
  info: { description: string; source: string; formula?: string };
  onFocus?: () => void;
}

export const KpiCard = ({ title, value, deltaLabel, trend = 'flat', info, onFocus }: KpiCardProps) => {
  return (
    <div
      tabIndex={0}
      onFocus={onFocus}
      onMouseEnter={onFocus}
      className="group relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <InfoPopover title={title} plainDescription={info.description} primarySourceHint={info.source}>
          {info.formula ? <p className="text-xs text-slate-500">Formula: {info.formula}</p> : null}
        </InfoPopover>
      </div>
      {deltaLabel ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
          {trend === 'up' ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : null}
          {trend === 'down' ? <ArrowDownRight className="h-4 w-4 text-rose-500" /> : null}
          <span>{deltaLabel}</span>
        </div>
      ) : null}
    </div>
  );
};
