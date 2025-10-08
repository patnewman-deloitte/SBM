import React from 'react';
import clsx from 'clsx';
import { rebalanceMix } from '../utils/planMath';
import { useOfferStore } from '../store/offerStore';

const ScenarioLevers: React.FC = () => {
  const {
    mode,
    setMode,
    plan,
    applyLever,
    objective,
    updateObjective
  } = useOfferStore((state) => ({
    mode: state.mode,
    setMode: state.setMode,
    plan: state.plan,
    applyLever: state.applyLever,
    objective: state.objective,
    updateObjective: state.updateObjective
  }));

  const [price, setPrice] = React.useState(plan.price);
  const [promoMonths, setPromoMonths] = React.useState(plan.promoMonths);
  const [mix, setMix] = React.useState({ ...plan.channelMix });
  const [assumptionsOpen, setAssumptionsOpen] = React.useState(false);
  const [deviceSubsidy, setDeviceSubsidy] = React.useState(plan.deviceSubsidy);

  const debounceRef = React.useRef<number | null>(null);
  const runDebounced = React.useCallback(
    (patch: Parameters<typeof applyLever>[0]) => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        applyLever(patch);
        debounceRef.current = null;
      }, 140);
    },
    [applyLever]
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    setPrice(plan.price);
    setPromoMonths(plan.promoMonths);
    setMix({ ...plan.channelMix });
    setDeviceSubsidy(plan.deviceSubsidy);
  }, [
    plan.price,
    plan.promoMonths,
    plan.channelMix.Search,
    plan.channelMix.Email,
    plan.channelMix.Social,
    plan.channelMix.Retail,
    plan.deviceSubsidy
  ]);

  const handleChannelSlider = (key: keyof typeof mix, value: number) => {
    const next = rebalanceMix(mix, key, value);
    setMix(next);
    runDebounced({ channelMix: next });
  };

  const confidenceCopy = 'Confidence blends data coverage, calendar coverage, and backtest alignment.';

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">Scenario levers</h3>
        <div className="inline-flex rounded-full border border-emerald-500/30 bg-slate-950 p-1 text-xs">
          {(['simple', 'advanced'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={clsx(
                'rounded-full px-3 py-1 font-semibold transition',
                mode === item ? 'bg-emerald-500 text-slate-950' : 'text-emerald-200 hover:text-white'
              )}
            >
              {item === 'simple' ? 'Simple' : 'Advanced'}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-400">Price (${price.toFixed(2)})</p>
          </div>
          <input
            type="range"
            min={60}
            max={110}
            step={1}
            value={price}
            onChange={(event) => {
              const next = Number(event.target.value);
              setPrice(next);
              runDebounced({ price: next });
            }}
            className="mt-3 w-full"
          />
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Promo months ({promoMonths})</p>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={promoMonths}
            onChange={(event) => {
              const next = Number(event.target.value);
              setPromoMonths(next);
              runDebounced({ promoMonths: next });
            }}
            className="mt-3 w-full"
          />
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-400">Channel mix (sum 100%)</p>
            <span className="text-xs text-emerald-300">Search heavy improves payback efficiency</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(Object.keys(mix) as (keyof typeof mix)[]).map((key) => (
              <label key={key} className="flex flex-col gap-1 text-xs text-slate-300">
                <span className="flex items-center justify-between">
                  <span>{key}</span>
                  <span className="font-semibold text-white">{mix[key].toFixed(0)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={mix[key]}
                  onChange={(event) => handleChannelSlider(key, Number(event.target.value))}
                  className="w-full"
                  aria-label={`${key} allocation`}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
      {mode === 'advanced' && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">CAC ceiling</p>
            <input
              type="number"
              value={objective.cacCeiling}
              onChange={(event) => updateObjective({ cacCeiling: Number(event.target.value) })}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Payback target</p>
            <input
              type="number"
              value={objective.paybackTarget}
              onChange={(event) => updateObjective({ paybackTarget: Number(event.target.value) })}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Margin target</p>
            <input
              type="number"
              value={objective.marginTarget}
              onChange={(event) => updateObjective({ marginTarget: Number(event.target.value) })}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Device subsidy (${deviceSubsidy.toFixed(0)})</p>
            <input
              type="range"
              min={0}
              max={80}
              step={1}
              value={deviceSubsidy}
              onChange={(event) => {
                const next = Number(event.target.value);
                setDeviceSubsidy(next);
                runDebounced({ deviceSubsidy: next });
              }}
              className="mt-3 w-full"
            />
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Inventory flag</p>
            <button
              type="button"
              onClick={() => applyLever({ inventoryHold: !plan.inventoryHold })}
              className={clsx(
                'mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
                plan.inventoryHold
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-600 text-slate-300 hover:border-emerald-400 hover:text-emerald-200'
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {plan.inventoryHold ? 'Holding inventory for margin' : 'No hold - clear stock'}
            </button>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Assumptions</p>
            <button
              type="button"
              onClick={() => setAssumptionsOpen(true)}
              className="mt-2 rounded-md border border-emerald-500/40 px-3 py-2 text-sm text-emerald-200 hover:border-emerald-400"
            >
              View defaults
            </button>
          </div>
        </div>
      )}
      {assumptionsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="max-w-lg rounded-xl border border-emerald-500/30 bg-slate-900 p-6 text-sm text-slate-200 shadow-2xl">
            <h4 className="text-lg font-semibold text-white">Model assumptions</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li>Guardrails assume historical elasticity curves per channel.</li>
              <li>{confidenceCopy}</li>
              <li>Promo dampening kicks in after 4 months to prevent churn drag.</li>
              <li>Retail allocation incurs store labor costs reducing margin.</li>
              <li>Email lift is capped at 12% per cohort saturation.</li>
            </ul>
            <div className="mt-4 text-right">
              <button
                type="button"
                onClick={() => setAssumptionsOpen(false)}
                className="rounded-md border border-emerald-500/40 px-3 py-2 text-sm text-emerald-200 hover:border-emerald-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioLevers;
