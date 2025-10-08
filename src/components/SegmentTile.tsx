import { CheckCircle2, Pin, Send } from 'lucide-react';
import InfoPopover from './InfoPopover';

export type SegmentTileProps = {
  name: string;
  size: number;
  payback: number | string;
  gm12: number;
  traits: string[];
  rationale: string;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onAddToCart?: () => void;
  onSendToStudio?: () => void;
  onPin?: () => void;
};

const SegmentTile = ({
  name,
  size,
  payback,
  gm12,
  traits,
  rationale,
  selected,
  onSelect,
  onAddToCart,
  onSendToStudio,
  onPin
}: SegmentTileProps) => {
  return (
    <article className={`card flex flex-col gap-4 border border-slate-800 p-5 transition hover:border-emerald-500/40`}>
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{name}</h3>
            <InfoPopover title="Cohort tile" description="Review the cohort summary, shortlist it, or send it forward." />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{size.toLocaleString()} households</span>
            <InfoPopover title="Cohort size" description="Shows the estimated audience count for this cohort." />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onPin}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-1 text-emerald-300 hover:bg-emerald-500/20"
            aria-label={`Pin ${name}`}
          >
            <Pin className="h-4 w-4" />
          </button>
          <label className="flex items-center gap-1 text-emerald-300">
            <input
              type="checkbox"
              checked={selected}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSelect(event.target.checked)}
              className="h-4 w-4 rounded border border-emerald-500/40 bg-slate-900 text-emerald-500"
            />
            Select
          </label>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3">
        <div className="card border border-slate-800/60 bg-slate-900/70 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CAC Payback</span>
            <InfoPopover
              title="CAC Payback (months)"
              description="Months until fully-loaded CAC is covered by cumulative contribution."
            />
          </div>
          <p className="mt-1 text-xl font-semibold text-white">{typeof payback === 'number' ? `${payback}` : payback}</p>
        </div>
        <div className="card border border-slate-800/60 bg-slate-900/70 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>12-mo Incremental GM</span>
            <InfoPopover
              title="12-Month Incremental Gross Margin"
              description="Gross margin over first 12 months after servicing costs and device amortization."
            />
          </div>
          <p className="mt-1 text-xl font-semibold text-white">${gm12.toLocaleString()}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {traits.slice(0, 4).map((trait) => (
          <span key={trait} className="info-chip">
            {trait}
          </span>
        ))}
        <InfoPopover title="Trait chips" description="Quick cues that explain why this cohort behaves the way it does." />
      </div>
      <p className="flex items-start gap-2 text-sm text-slate-300">
        <InfoPopover title="Why it matters" description="One-line rationale to help you remember the opportunity." />
        <span>{rationale}</span>
      </p>
      <footer className="flex flex-wrap items-center gap-3 text-sm">
        <button
          onClick={onAddToCart}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
        >
          Shortlist cohort
        </button>
        <button
          onClick={onSendToStudio}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-900 px-4 py-1.5 text-emerald-200 transition hover:bg-emerald-500/10"
        >
          <Send className="h-4 w-4" /> Advance now
        </button>
        {selected ? (
          <span className="ml-auto inline-flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> In Cart
          </span>
        ) : null}
      </footer>
    </article>
  );
};

export default SegmentTile;
