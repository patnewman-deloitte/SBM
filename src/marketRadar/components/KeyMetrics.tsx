/**
 * Key metrics rail shows top metrics with a toggle for additional ones.
 */
import React, { useMemo, useState } from "react";
import { Archetype } from "../data/mockData";
import { Meter, Stat } from "./atoms";
import { signalStrength } from "../utils";

type KeyMetricsProps = {
  archetype: Archetype;
};

const KeyMetrics: React.FC<KeyMetricsProps> = ({ archetype }) => {
  const [expanded, setExpanded] = useState(false);

  const extra = useMemo(
    () => [
      { label: "ARPU delta", value: "+$38" },
      { label: "Confidence", value: archetype.conf.toUpperCase() },
      { label: "Signal strength", value: `${signalStrength(archetype.score)}` }
    ],
    [archetype]
  );

  return (
    <aside className="card sticky top-4 flex flex-col gap-4 border border-slate-800 p-6" aria-label="Key metrics">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Key metrics</h3>
        <button
          type="button"
          className="focus-outline rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          {expanded ? "Fewer metrics" : "More metrics"}
        </button>
      </header>
      <Meter label="Opportunity score" value={archetype.score} />
      <div className="grid grid-cols-1 gap-3">
        <Stat label="Reachable" value={archetype.reachable} />
        <Stat label="Expected CVR" value={archetype.cvr} />
        <Stat label="Payback" value={archetype.payback} />
      </div>
      {expanded && (
        <div className="grid grid-cols-1 gap-3">
          {extra.map((item) => (
            <Stat key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      )}
    </aside>
  );
};

export default KeyMetrics;
