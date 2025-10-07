/**
 * Competitive strip visualizes rival pressure for the selected archetype and opens a drawer with details.
 */
import React, { useMemo, useState } from "react";
import { competitors, overlap } from "../data/mockData";
import Drawer from "./Drawer";
import { Meter } from "./atoms";

export type CompetitiveStripProps = {
  selectedIndex: number;
};

const CompetitiveStrip: React.FC<CompetitiveStripProps> = ({ selectedIndex }) => {
  const [open, setOpen] = useState(false);

  const data = useMemo(() => {
    const row = overlap[selectedIndex] ?? [];
    const parsed = row.map((value, index) => ({
      name: competitors[index],
      value: parseInt(value.replace("%", ""), 10)
    }));
    parsed.sort((a, b) => b.value - a.value);
    const top = parsed[0];
    const second = parsed[1];
    const pressure = top ? top.value : 0;
    const whiteSpace = 100 - ((top?.value ?? 0) + (second?.value ?? 0));
    return { parsed, top, pressure, whiteSpace };
  }, [selectedIndex]);

  return (
    <section className="card mt-6 flex flex-col gap-4 border border-slate-800 p-4" aria-label="Competitive strip">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Competitive strip</h3>
        <button
          className="focus-outline rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          onClick={() => setOpen(true)}
        >
          See all
        </button>
      </header>
      <div className="grid grid-cols-3 gap-4 text-xs text-slate-200">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Top rival</p>
          <p className="mt-1 text-base font-semibold text-white">{data.top?.name ?? "N/A"}</p>
          <p className="text-xs text-emerald-300">Overlap {data.top?.value ?? 0}%</p>
        </div>
        <div className="col-span-1">
          <Meter label="Pressure index" value={data.pressure} helper="0=blue ocean, 100=full heat" />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">White space</p>
          <p className="mt-1 text-base font-semibold text-emerald-200">{Math.max(data.whiteSpace, 0)}%</p>
          <p className="text-xs text-slate-400">Uncontested vs top 2 rivals</p>
        </div>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title="Competitive landscape">
        <p className="text-sm text-slate-300">
          Overlap shows the percent of your cohort that currently leans toward each rival.
        </p>
        <div className="mt-4 space-y-3">
          {data.parsed.map((entry, index) => (
            <div key={entry.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span className="font-semibold text-white">{entry.name}</span>
                <span>{entry.value}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                  style={{ width: `${entry.value}%` }}
                  aria-label={`${entry.name} overlap ${entry.value}%`}
                />
              </div>
              {index === 0 && (
                <p className="text-[11px] text-emerald-300">Top threat - focus counter positioning</p>
              )}
            </div>
          ))}
        </div>
      </Drawer>
    </section>
  );
};

export default CompetitiveStrip;
