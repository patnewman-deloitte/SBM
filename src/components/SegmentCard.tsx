import { CheckCircle2, Sparkles, Star } from 'lucide-react';
import { useMemo } from 'react';
import { type Segment } from '../data/seeds';
import { formatPayback, currencyFormatter } from '../lib/format';
import { summariseCohort } from '../sim/tinySim';

interface SegmentCardProps {
  segment: Segment;
  active: boolean;
  comparing: boolean;
  onSelect: () => void;
  onToggleCompare: (checked: boolean) => void;
}

export const SegmentCard = ({ segment, active, comparing, onSelect, onToggleCompare }: SegmentCardProps) => {
  const summary = useMemo(() => summariseCohort(segment), [segment]);

  return (
    <article
      tabIndex={0}
      role="button"
      aria-pressed={active}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`flex h-full min-w-[340px] snap-center flex-col rounded-3xl border bg-white p-6 shadow-sm transition focus-visible:ring-2 focus-visible:ring-primary ${
        active ? 'border-primary/70 shadow-md' : 'border-transparent hover:border-primary/40'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{segment.name}</h3>
          <p className="text-sm text-slate-500">{segment.notes}</p>
        </div>
        {active ? <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden /> : <Sparkles className="h-6 w-6 text-slate-300" aria-hidden />}
      </header>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-slate-600">Segment size</p>
          <p className="text-lg font-semibold text-slate-900">{segment.size.toLocaleString()}</p>
        </div>
        <div>
          <p className="font-medium text-slate-600">Growth rate</p>
          <p className="text-lg font-semibold text-slate-900">{(segment.growthRate * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="font-medium text-slate-600">CAC payback</p>
          <p className="text-lg font-semibold text-slate-900">{formatPayback(summary.paybackMonths)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-600">12-mo gross margin</p>
          <p className="text-lg font-semibold text-slate-900">{currencyFormatter.format(summary.grossMargin12Mo)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            checked={comparing}
            onChange={(event) => {
              event.stopPropagation();
              onToggleCompare(event.target.checked);
            }}
            onClick={(event) => event.stopPropagation()}
          />
          Compare
        </label>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Star className="h-3 w-3" /> KPI ready
        </span>
      </div>
    </article>
  );
};
