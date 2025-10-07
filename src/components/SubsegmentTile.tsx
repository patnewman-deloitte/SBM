import { CheckSquare, Sparkles } from 'lucide-react';
import InfoPopover from './InfoPopover';

export type SubsegmentTileProps = {
  name: string;
  rank: number;
  sizeShare: number;
  payback: number | string;
  gm12: number;
  traits: string[];
  rationale: string;
  selected: boolean;
  highlight?: boolean;
  onSelect: (checked: boolean) => void;
};

const SubsegmentTile = ({
  name,
  rank,
  sizeShare,
  payback,
  gm12,
  traits,
  rationale,
  selected,
  highlight,
  onSelect
}: SubsegmentTileProps) => {
  return (
    <article
      className={`card relative flex min-w-0 flex-col gap-4 border p-5 transition ${
        highlight
          ? 'border-emerald-500/60 shadow-emerald-500/20 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-emerald-500'
          : 'border-slate-800 hover:border-emerald-500/40'
      }`}
    >
      {highlight ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
          <Sparkles className="h-3.5 w-3.5" /> Top pick #{rank}
        </span>
      ) : null}
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 break-words text-lg font-semibold text-white">{name}</h3>
            <InfoPopover title="Micro-segment tile" description="Review this sub-audience and decide if it belongs in your plan." />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>{(sizeShare * 100).toFixed(1)}% of cohort</span>
            <InfoPopover title="Size share" description="Portion of the parent cohort represented by this micro-segment." />
          </div>
        </div>
        <label className="flex items-center gap-1 text-emerald-300">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
            className="h-4 w-4 rounded border border-emerald-500/40 bg-slate-900 text-emerald-500"
          />
          Select for campaign
        </label>
      </header>
      <div className="grid grid-cols-2 gap-3">
        <div className="card border border-slate-800/60 bg-slate-900/70 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CAC Payback</span>
            <InfoPopover title="CAC Payback (months)" description="Months until fully-loaded CAC is covered by cumulative contribution." />
          </div>
          <p className="mt-1 text-xl font-semibold text-white">{typeof payback === 'number' ? `${payback}` : payback}</p>
        </div>
        <div className="card border border-slate-800/60 bg-slate-900/70 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>12-mo Incremental GM</span>
            <InfoPopover title="12-Month Incremental Gross Margin" description="Gross margin over first 12 months after servicing costs and device amortization." />
          </div>
          <p className="mt-1 text-xl font-semibold text-white">${gm12.toLocaleString()}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {traits.slice(0, 3).map((trait) => (
          <span key={trait} className="info-chip">
            {trait}
          </span>
        ))}
        <InfoPopover title="Trait highlights" description="Use these cues to align messaging and offer levers." />
      </div>
      <p className="flex items-start gap-2 text-sm text-slate-300">
        <InfoPopover title="Rationale" description="Quick reminder of why this micro-segment matters." />
        <span className="break-words">{rationale}</span>
      </p>
      {highlight ? (
        <p className="text-xs uppercase tracking-wide text-emerald-300">
          Why highlighted: optimal mix of economics, reach, and signal richness.
        </p>
      ) : null}
      <div className="flex items-center gap-2 text-xs text-emerald-300">
        <CheckSquare className="h-4 w-4" /> AI recommendation active
      </div>
    </article>
  );
};

export default SubsegmentTile;
