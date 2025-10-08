import React from 'react';
import clsx from 'clsx';
import { useOfferStore } from '../store/offerStore';
import { normaliseMix } from '../utils/planMath';

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

type ScalarField = 'price' | 'promoDepthPct' | 'promoMonths' | 'deviceSubsidy';

const fieldLabels: Record<ScalarField | 'channelMix', string> = {
  price: 'Bundle price',
  promoDepthPct: 'Promo depth',
  promoMonths: 'Promo months',
  channelMix: 'Channel mix',
  deviceSubsidy: 'Device subsidy'
};

type EditingField = ScalarField | 'channelMix' | null;

type ChannelDraft = {
  Search: number;
  Social: number;
  Email: number;
  Retail: number;
};

const AutoPlanCard: React.FC = () => {
  const { plan, objective, applyLever, applyPreset, lastOptimizerChanges } = useOfferStore((state) => ({
    plan: state.plan,
    objective: state.objective,
    applyLever: state.applyLever,
    applyPreset: state.applyPreset,
    lastOptimizerChanges: state.lastOptimizerChanges
  }));

  const [editing, setEditing] = React.useState<EditingField>(null);
  const [draftValue, setDraftValue] = React.useState<string>('');
  const [mixDraft, setMixDraft] = React.useState<ChannelDraft | null>(null);

  const presets: { goal: typeof objective.goal; headline: string; description: string }[] = [
    { goal: 'Balanced', headline: 'Balanced', description: 'Stays on guardrails with steady channel split.' },
    { goal: 'Growth-first', headline: 'Growth-first', description: 'Push harder on promo and upper funnel.' },
    { goal: 'Margin-first', headline: 'Margin-first', description: 'Protect unit economics and device costs.' }
  ];

  const openField = (field: EditingField) => {
    setEditing(field);
    if (field === 'channelMix') {
      setMixDraft({ ...plan.channelMix });
    } else if (field) {
      setDraftValue(String(plan[field] as number));
    }
  };

  const closeEdit = () => {
    setEditing(null);
    setMixDraft(null);
    setDraftValue('');
  };

  const handleFieldSubmit = () => {
    if (!editing) return;
    if (editing === 'channelMix' && mixDraft) {
      applyLever({ channelMix: normaliseMix(mixDraft) });
    } else {
      const value = Number(draftValue);
      if (!Number.isNaN(value)) {
        applyLever({ [editing]: editing === 'promoMonths' ? Math.round(value) : value } as Partial<typeof plan>);
      }
    }
    closeEdit();
  };

  const handleChannelChange = (key: keyof ChannelDraft, value: number) => {
    if (!mixDraft) return;
    const next = { ...mixDraft, [key]: value };
    setMixDraft(normaliseMix(next));
  };

  React.useEffect(() => {
    closeEdit();
  }, [plan.price, plan.promoDepthPct, plan.promoMonths, plan.channelMix.Search, plan.deviceSubsidy]);

  const heroKpis = [
    {
      label: 'Payback',
      value: `${plan.kpis.paybackMo.toFixed(2)} mo`,
      range: `${plan.kpis.paybackRange[0]}-${plan.kpis.paybackRange[1]} mo`
    },
    {
      label: 'Conversion',
      value: formatPercent(plan.kpis.conversionPct),
      range: `${plan.kpis.conversionRange[0]}-${plan.kpis.conversionRange[1]}%`
    },
    {
      label: 'Margin',
      value: formatPercent(plan.kpis.marginPct),
      range: `${plan.kpis.marginRange[0]}-${plan.kpis.marginRange[1]}%`
    }
  ];

  return (
    <div
      id="auto-plan-card"
      className="relative grid gap-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-emerald-900/30 p-6 shadow-xl"
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Auto-generated plan</h2>
              <p className="text-sm text-slate-300">{plan.creativeBrief.subtext}</p>
            </div>
            <div className="text-right text-xs text-emerald-300">
              <p>{plan.creativeBrief.headline}</p>
              <p className="text-slate-400">{plan.creativeBrief.heroHint}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(['price', 'promoDepthPct', 'promoMonths', 'deviceSubsidy'] as ScalarField[]).map((field) => {
              const value = plan[field];
              const display =
                field === 'price' || field === 'deviceSubsidy'
                  ? formatCurrency(value)
                  : field === 'promoDepthPct'
                  ? `${value.toFixed(1)}%`
                  : `${value}`;
              return (
                <div key={field} className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-4 shadow-inner">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{fieldLabels[field]}</p>
                      <p className="text-lg font-semibold text-white">{display}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-emerald-500/50 px-2 text-xs text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
                      onClick={() => openField(field)}
                      aria-label={`Edit ${fieldLabels[field]}`}
                    >
                      ✎
                    </button>
                  </div>
                  {editing === field && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="number"
                        value={draftValue}
                        onChange={(event) => setDraftValue(event.target.value)}
                        className="w-full rounded-md border border-emerald-500/40 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-300 focus:outline-none"
                      />
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={handleFieldSubmit}
                          className="rounded-md bg-emerald-500 px-2 py-1 font-semibold text-slate-950 hover:bg-emerald-400"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={closeEdit}
                          className="rounded-md border border-transparent px-2 py-1 text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-4 shadow-inner">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Channel mix</p>
                  <p className="text-lg font-semibold text-white">
                    {Object.entries(plan.channelMix)
                      .map(([key, value]) => `${key.slice(0, 2)} ${value.toFixed(0)}%`)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-emerald-500/50 px-2 text-xs text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
                  onClick={() => openField('channelMix')}
                  aria-label="Edit channel mix"
                >
                  ✎
                </button>
              </div>
              {editing === 'channelMix' && mixDraft && (
                <div className="mt-3 space-y-2">
                  {Object.entries(mixDraft).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between text-xs text-slate-300">
                      <span>{key}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={Number(value.toFixed(0))}
                        onChange={(event) => handleChannelChange(key as keyof ChannelDraft, Number(event.target.value))}
                        className="ml-2 w-20 rounded-md border border-emerald-500/40 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 focus:border-emerald-300 focus:outline-none"
                      />
                    </label>
                  ))}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleFieldSubmit}
                      className="rounded-md bg-emerald-500 px-2 py-1 font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={closeEdit}
                      className="rounded-md border border-transparent px-2 py-1 text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {heroKpis.map((item) => (
              <div key={item.label} className="rounded-lg border border-emerald-500/30 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="text-xl font-semibold text-white">{item.value}</p>
                <p className="text-xs text-emerald-300">{item.range}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {plan.drivers.map((driver) => (
              <span
                key={driver.label}
                className="rounded-full border border-emerald-500/40 bg-slate-900 px-3 py-1 text-xs text-emerald-200"
                title={`${driver.delta > 0 ? '+' : ''}${driver.delta} mo vs baseline`}
              >
                {driver.label} {driver.delta > 0 ? '+' : ''}{driver.delta}
              </span>
            ))}
          </div>
          {lastOptimizerChanges.length > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-slate-950/70 p-3 text-xs text-emerald-200">
              <p className="mb-1 font-semibold text-emerald-300">Optimizer nudges</p>
              <ul className="space-y-1">
                {lastOptimizerChanges.map((change, idx) => (
                  <li key={`${change.field}-${idx}`}>
                    {change.field}: {change.from} → {change.to}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <aside className="flex w-full flex-col gap-3 lg:w-60">
          <h3 className="text-sm font-semibold text-emerald-200">Strategy presets</h3>
          {presets.map((preset) => (
            <button
              key={preset.goal}
              type="button"
              onClick={() => applyPreset(preset.goal)}
              className={clsx(
                'rounded-xl border px-4 py-3 text-left transition',
                objective.goal === preset.goal
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                  : 'border-emerald-500/20 bg-slate-950/50 text-slate-200 hover:border-emerald-400/60 hover:text-emerald-200'
              )}
            >
              <p className="text-sm font-semibold">{preset.headline}</p>
              <p className="text-xs text-slate-400">{preset.description}</p>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
};

export default AutoPlanCard;
