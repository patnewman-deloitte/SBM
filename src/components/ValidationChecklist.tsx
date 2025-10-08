import React from 'react';
import clsx from 'clsx';
import { selectChecklistStatus, useOfferStore } from '../store/offerStore';

const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const ValidationChecklist: React.FC = () => {
  const { status, fixIssue } = useOfferStore((state) => ({
    status: selectChecklistStatus(state),
    fixIssue: state.fixIssue
  }));
  const plan = useOfferStore((state) => state.plan);
  const objective = useOfferStore((state) => state.objective);

  const items = [
    {
      key: 'budget' as const,
      label: 'Budget fit',
      pass: status.budgetOk,
      description: `${formatCurrency(status.spend)} of ${formatCurrency(objective.budget)}`
    },
    {
      key: 'cac' as const,
      label: 'CAC within ceiling',
      pass: status.cacOk,
      description: `${formatCurrency(status.cac)} vs ${formatCurrency(objective.cacCeiling)}`
    },
    {
      key: 'payback' as const,
      label: 'Payback on target',
      pass: status.paybackOk,
      description: `${plan.kpis.paybackMo.toFixed(2)} mo ≤ ${objective.paybackTarget} mo`
    },
    {
      key: 'margin' as const,
      label: 'Margin above guardrail',
      pass: status.marginOk,
      description: `${formatPercent(plan.kpis.marginPct)} ≥ ${objective.marginTarget}%`
    },
    {
      key: 'calendar' as const,
      label: 'Calendar coverage',
      pass: status.calendarOk,
      description: `${(status.coverage * 100).toFixed(0)}% coverage`
    },
    {
      key: 'confidence' as const,
      label: 'Confidence medium+',
      pass: status.confidenceOk,
      description: `${(plan.confidence * 100).toFixed(0)}% confidence`
    }
  ];

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5 shadow-lg">
      <h3 className="text-base font-semibold text-white">Validation checklist</h3>
      <p className="mt-1 text-xs text-slate-400">Every box must be green before export. Use “Fix for me” to auto-correct.</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.key}
            className={clsx(
              'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-inner',
              item.pass
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                : 'border-emerald-500/20 bg-slate-950/60 text-slate-200'
            )}
          >
            <div>
              <p className="font-semibold">{item.label}</p>
              <p className="text-xs text-slate-400">{item.description}</p>
            </div>
            {!item.pass && (
              <button
                type="button"
                onClick={() => fixIssue(item.key)}
                className="rounded-md border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-200 hover:border-emerald-400"
              >
                Fix for me
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationChecklist;
