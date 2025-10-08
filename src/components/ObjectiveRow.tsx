import React from 'react';
import clsx from 'clsx';
import { selectConfidenceLabel, useOfferStore } from '../store/offerStore';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const ObjectiveRow: React.FC = () => {
  const { objective, plan, updateObjective } = useOfferStore((state) => ({
    objective: state.objective,
    plan: state.plan,
    updateObjective: state.updateObjective
  }));

  const confidenceLabel = selectConfidenceLabel(plan.confidence);

  const handleNumberChange = (key: keyof typeof objective) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isNaN(value)) return;
    updateObjective({ [key]: value } as Partial<typeof objective>);
  };

  const handleGoalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateObjective({ goal: event.target.value as typeof objective.goal });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/20 bg-slate-900/60 p-4 text-sm text-slate-200 shadow">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-300">Goal
          <select
            value={objective.goal}
            onChange={handleGoalChange}
            className="rounded-md border border-emerald-500/40 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="Balanced">Balanced</option>
            <option value="Growth-first">Growth-first</option>
            <option value="Margin-first">Margin-first</option>
          </select>
        </label>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-950 px-3 py-1 text-xs uppercase tracking-wide text-emerald-200" title="Confidence blends data coverage and backtests." aria-label="Confidence score">
          <span className={clsx('h-2 w-2 rounded-full', confidenceLabel === 'High' ? 'bg-emerald-400' : confidenceLabel === 'Medium' ? 'bg-amber-400' : 'bg-rose-400')} />
          {confidenceLabel}
          <span className="text-slate-400">({numberFormatter.format(plan.confidence * 100)}%)</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Payback target (mo)</span>
          <input
            type="number"
            min={4}
            max={18}
            value={objective.paybackTarget}
            onChange={handleNumberChange('paybackTarget')}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Margin target (%)</span>
          <input
            type="number"
            min={10}
            max={60}
            value={objective.marginTarget}
            onChange={handleNumberChange('marginTarget')}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">CAC ceiling ($)</span>
          <input
            type="number"
            min={60}
            max={400}
            step={1}
            value={objective.cacCeiling}
            onChange={handleNumberChange('cacCeiling')}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Budget ($)</span>
          <input
            type="number"
            min={100000}
            step={1000}
            value={objective.budget}
            onChange={handleNumberChange('budget')}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </label>
      </div>
    </div>
  );
};

export default ObjectiveRow;
