/**
 * Playbook view holds planned cohorts and summarizes reach and lift.
 */
import React, { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Archetype } from "../data/mockData";
import { midRangePercent, midMonths, reachK } from "../utils";

export type PlaybookHandle = {
  addToPlan: (item: Archetype) => void;
};

const maxPlan = 3;

const PlaybookView = forwardRef<PlaybookHandle, { selected: Archetype | null }>((props, ref) => {
  const { selected } = props;
  const [plan, setPlan] = useState<Archetype[]>([]);

  useImperativeHandle(ref, () => ({
    addToPlan: (item: Archetype) => {
      setPlan((prev) => {
        if (prev.find((p) => p.id === item.id) || prev.length >= maxPlan) {
          return prev;
        }
        return [...prev, item];
      });
    }
  }));

  const totals = useMemo(() => {
    if (plan.length === 0) {
      return { reach: 0, cvr: 0, payback: 0 };
    }
    const reachSum = plan.reduce((sum, item) => sum + reachK(item.reachable), 0);
    const cvrAvg = plan.reduce((sum, item) => sum + midRangePercent(item.cvr), 0) / plan.length;
    const paybackAvg = plan.reduce((sum, item) => sum + midMonths(item.payback), 0) / plan.length;
    return { reach: reachSum, cvr: cvrAvg, payback: paybackAvg };
  }, [plan]);

  const remove = (id: number) => setPlan((prev) => prev.filter((item) => item.id !== id));

  const liftEstimate = (item: Archetype) => {
    const base = midRangePercent(item.cvr);
    return (base * 1.4).toFixed(1);
  };

  return (
    <section className="card flex flex-col gap-4 border border-slate-800 p-4" aria-label="Playbook plan">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Playbook</h3>
        <span className="text-xs text-slate-400">{plan.length}/{maxPlan} planned</span>
      </header>
      <p className="text-xs text-slate-300">
        Click "Add to plan" on any AI Pick to track it here. {selected ? `Current focus: ${selected.title}.` : "Pick a segment to see more detail."}
      </p>
      <div className="space-y-3">
        {plan.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
            No cohorts yet. Add up to three high-confidence plays.
          </div>
        )}
        {plan.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-4 shadow-soft"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                <p className="text-xs text-slate-400">Lift est. {liftEstimate(item)}%</p>
              </div>
              <button
                type="button"
                className="focus-outline rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                onClick={() => remove(item.id)}
              >
                Remove
              </button>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200">
              <div>
                <dt className="text-slate-400">Reach</dt>
                <dd className="font-semibold">{item.reachable}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Expected CVR</dt>
                <dd className="font-semibold">{item.cvr}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Payback</dt>
                <dd className="font-semibold">{item.payback}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Confidence</dt>
                <dd className="font-semibold capitalize">{item.conf}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <footer className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-200">
        <div className="flex items-center justify-between">
          <span>Total reachable</span>
          <strong>{totals.reach.toFixed(0)}k</strong>
        </div>
        <div className="flex items-center justify-between">
          <span>Blended CVR</span>
          <strong>{totals.cvr.toFixed(1)}%</strong>
        </div>
        <div className="flex items-center justify-between">
          <span>Avg. payback</span>
          <strong>{totals.payback.toFixed(1)} mo</strong>
        </div>
      </footer>
    </section>
  );
});

PlaybookView.displayName = "PlaybookView";

export default PlaybookView;
