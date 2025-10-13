import React from 'react';
import { Mode, useAppState } from '../appState';
import { simulateCampaign } from '../sim/tinySim';
import { assumptionsSeed, channelsSeed, microSegmentsSeed, offersSeed } from '../data/seeds';

export type ScenarioModalProps = {
  open: boolean;
  onClose: () => void;
};

type Goal = 'reach' | 'conversion' | 'arpu';

const goalLabels: Record<Goal, string> = {
  reach: 'Reach growth',
  conversion: 'Conversion lift',
  arpu: 'ARPU expansion',
};

const offerByGoal: Record<Goal, number> = {
  reach: 0,
  conversion: 1,
  arpu: 2,
};

const mixByGoal: Record<Goal, Record<string, number>> = {
  reach: { 'ch-search': 0.32, 'ch-social': 0.26, 'ch-email': 0.14, 'ch-retail': 0.16, 'ch-field': 0.12 },
  conversion: { 'ch-search': 0.24, 'ch-social': 0.22, 'ch-email': 0.24, 'ch-retail': 0.16, 'ch-field': 0.14 },
  arpu: { 'ch-search': 0.22, 'ch-social': 0.2, 'ch-email': 0.28, 'ch-retail': 0.14, 'ch-field': 0.16 },
};

const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

const deriveTraits = (mode: Mode, fallback: string[]): string[] => {
  if (fallback.length) return fallback.slice(0, 3);
  if (mode === 'acquire') return ['Promo responsive', 'Search active', 'Switch ready'];
  if (mode === 'grow') return ['Bundle curious', 'Upgrade prone', 'High usage'];
  return ['Service sensitive', 'At risk', 'Needs reassurance'];
};

const ScenarioModal: React.FC<ScenarioModalProps> = ({ open, onClose }) => {
  const { mode, selectedSegment, selectedSubsegments } = useAppState();
  const [goal, setGoal] = React.useState<Goal>('reach');
  const [budget, setBudget] = React.useState(250000);
  const [guardrailCannibalMax, setGuardrailCannibalMax] = React.useState(6);

  const derivedTraits = React.useMemo(() => {
    const traitPool = selectedSubsegments.flatMap((sub) => sub.traits);
    return deriveTraits(mode, traitPool);
  }, [mode, selectedSubsegments]);

  const scenarioResult = React.useMemo(() => {
    const offerIndex = offerByGoal[goal] ?? 0;
    const offer = offersSeed[offerIndex] ?? offersSeed[0];
    const budgetFactor = Math.min(1.45, Math.max(0.65, budget / 250000));
    const guardrailFactor = Math.max(0.5, 1 - guardrailCannibalMax / 120);
    const baseSize = selectedSegment?.size ?? 42000;
    const segmentSize = Math.round(baseSize * guardrailFactor * (0.9 + budgetFactor * 0.2));
    const supportingSize = Math.round(segmentSize * 0.6);
    const microPoolKey = selectedSegment?.id && microSegmentsSeed[selectedSegment.id]
      ? selectedSegment.id
      : 'seg-value-seekers';
    const microPool = microSegmentsSeed[microPoolKey] ?? microSegmentsSeed['seg-value-seekers'];
    const primary = microPool[0];
    const secondary = microPool[1] ?? microPool[0];
    const primaryMicro = {
      id: `${microPoolKey}-scenario-primary`,
      parentSegmentId: microPoolKey,
      name: primary?.name ?? 'Scenario Focus',
      sizeShare: 0.55,
      traits: derivedTraits,
      attractiveness: goal === 'reach' ? 0.72 : goal === 'conversion' ? 0.78 : 0.74,
    };
    const secondaryMicro = {
      id: `${microPoolKey}-scenario-support`,
      parentSegmentId: microPoolKey,
      name: secondary?.name ?? 'Supporters',
      sizeShare: 0.45,
      traits: secondary?.traits.slice(0, 3) ?? derivedTraits,
      attractiveness: goal === 'reach' ? 0.68 : goal === 'conversion' ? 0.73 : 0.7,
    };
    const baseMix: Record<string, number> = { ...mixByGoal[goal] };
    const supportMix: Record<string, number> =
      goal === 'arpu'
        ? { ...baseMix, 'ch-email': (baseMix['ch-email'] ?? 0.2) * 1.1 }
        : { ...baseMix, 'ch-social': (baseMix['ch-social'] ?? 0.2) * 1.05 };
    Object.keys(baseMix).forEach((key) => {
      baseMix[key] = Number((baseMix[key] * budgetFactor).toFixed(3));
    });
    Object.keys(supportMix).forEach((key) => {
      supportMix[key] = Number((supportMix[key] * (budgetFactor * 0.92)).toFixed(3));
    });
    const assumptions = {
      ...assumptionsSeed,
      executionCost: assumptionsSeed.executionCost + guardrailCannibalMax * 0.8,
    };
    const audiences = [
      {
        micro: primaryMicro,
        segmentSize,
        offer,
        channelMix: baseMix,
        assumptions,
        channels: channelsSeed,
      },
      {
        micro: secondaryMicro,
        segmentSize: supportingSize,
        offer,
        channelMix: supportMix,
        assumptions,
        channels: channelsSeed,
      },
    ];
    const simulation = simulateCampaign({ audiences });
    const blended = simulation.blended;
    const expectedLift = goal === 'reach'
      ? `${blended.netAdds.toLocaleString()} net adds`
      : goal === 'conversion'
        ? `${(blended.conversionRate * 100).toFixed(2)}% CVR`
        : `$${Math.round(blended.gm12m / 12).toLocaleString()} GM/mo`;
    const reasonBase = goalLabels[goal];
    const reasons = [
      `${reasonBase} tuned for ${mode} mode cohorts`,
      `Budget ${formatCurrency(budget)} fuels ${goal === 'arpu' ? 'premium positioning' : 'scaled reach mix'}`,
      `Guardrail ${guardrailCannibalMax}% keeps cannibalisation in check`,
    ];
    return { expectedLift, reasons };
  }, [budget, guardrailCannibalMax, goal, mode, derivedTraits, selectedSegment?.id, selectedSegment?.size]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Scenario sandbox</p>
            <p className="text-xs text-slate-400">Tweak guardrails and preview modeled lift.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Close scenario sandbox"
          >
            Close
          </button>
        </div>
        <form className="mt-4 grid gap-4 md:grid-cols-3" aria-label="Scenario form">
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            <span>Goal</span>
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value as Goal)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="reach">Reach</option>
              <option value="conversion">Conversion</option>
              <option value="arpu">ARPU</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            <span>Budget</span>
            <input
              type="number"
              min={50000}
              step={5000}
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value) || 0)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            <span>Guardrail max %</span>
            <input
              type="number"
              min={0}
              max={20}
              step={1}
              value={guardrailCannibalMax}
              onChange={(event) => setGuardrailCannibalMax(Number(event.target.value) || 0)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </form>
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Expected lift</p>
          <p className="mt-1 text-2xl font-semibold text-white">{scenarioResult.expectedLift}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-emerald-100">
            {scenarioResult.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScenarioModal;
