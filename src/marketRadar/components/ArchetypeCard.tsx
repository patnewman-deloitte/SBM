/**
 * Archetype card summarises an AI pick with actions for selection, details, and plan add.
 */
import React from "react";
import { Archetype } from "../data/mockData";
import { Badge, Meter } from "./atoms";

export type ArchetypeCardProps = {
  item: Archetype;
  selected: boolean;
  onSelect: (item: Archetype) => void;
  onViewDetails: (item: Archetype) => void;
  onAddToPlan: (item: Archetype) => void;
};

const confColor: Record<Archetype["conf"], string> = {
  high: "bg-emerald-500/30 text-emerald-100",
  med: "bg-amber-500/30 text-amber-100",
  low: "bg-slate-500/30 text-slate-100"
};

const ArchetypeCard: React.FC<ArchetypeCardProps> = ({ item, selected, onSelect, onViewDetails, onAddToPlan }) => {
  return (
    <article
      className={`card flex flex-col gap-4 border ${selected ? "border-emerald-400" : "border-slate-800"} p-4 transition hover:border-emerald-400/80`}
      aria-label={`${item.title} archetype card`}
    >
      <header className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{item.title}</h3>
          <p className="text-xs text-slate-400">Rival focus: {item.rival}</p>
        </div>
        <Badge className="bg-emerald-500/30 text-emerald-100">AI pick</Badge>
      </header>
      <Meter label="Opportunity score" value={item.score} helper={`Confidence ${item.conf}`} />
      <div className="flex flex-wrap gap-2 text-xs text-slate-200">
        <Badge color="slate">CVR {item.cvr}</Badge>
        <Badge color="slate">Payback {item.payback}</Badge>
        <span className={`inline-flex items-center rounded-full px-3 py-1 ${confColor[item.conf]} text-xs font-semibold`}>
          Conf {item.conf}
        </span>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
        <p className="font-semibold text-slate-100">Motivations to switch</p>
        <ul className="list-disc space-y-1 pl-4">
          {item.drivers.slice(0, 2).map((driver) => (
            <li key={driver}>{driver}</li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-200">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="font-semibold text-white">{item.rival}</p>
          <p className="text-[11px] text-slate-400">{item.rivalNote}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-[11px] uppercase tracking-wide text-emerald-200">Gaps to exploit</p>
          <ul className="mt-1 space-y-1 text-emerald-100">
            {item.gaps.slice(0, 2).map((gap) => (
              <li key={gap}>• {gap}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="focus-outline rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
          onClick={() => onViewDetails(item)}
        >
          View
        </button>
        <button
          type="button"
          className="focus-outline rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-400"
          onClick={() => onSelect(item)}
        >
          Select
        </button>
        <button
          type="button"
          className="focus-outline rounded-full border border-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
          onClick={() => onAddToPlan(item)}
        >
          Add to plan
        </button>
      </div>
    </article>
  );
};

export default ArchetypeCard;
