import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlaybookPreview from '../../components/PlaybookPreview';
import { Mode, useAppState } from '../../appState';
import { offersAPI, execAPI } from '../../mocks';

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type StrategyOption = { id: string; label: string; description: string };

const strategyOptions: Record<Mode, StrategyOption[]> = {
  acquire: [
    { id: 'bundle', label: 'Bundle', description: 'Pair mobile + home internet at entry pricing.' },
    { id: 'price', label: 'Price incentive', description: 'Lean on limited-time bill credits.' },
    { id: 'channel', label: 'Channel surge', description: 'Heavy search + retail launch with warm transfers.' },
    { id: 'creative', label: 'Creative sprint', description: 'Test three offer narratives across social.' }
  ],
  grow: [
    { id: 'upgrade', label: 'Upgrade', description: 'Push higher tier speeds for high-usage homes.' },
    { id: 'addon', label: 'Add-on', description: 'Attach mobile lines to fiber base.' },
    { id: 'loyalty', label: 'Loyalty perk', description: 'Offer perks for tenure over 18 months.' },
    { id: 'cadence', label: 'Cadence tune', description: 'Re-balance nurture journey cadences.' }
  ],
  retain: [
    { id: 'downgrade', label: 'Smart downgrade', description: 'Step subscribers into lower tiers before churn.' },
    { id: 'pause', label: 'Pause plan', description: 'Offer short service pauses with save outreach.' },
    { id: 'loyalty', label: 'Loyalty save', description: 'Bring VIP perks to at-risk cohorts.' },
    { id: 'sequence', label: 'Outreach sequence', description: 'Layer call, SMS, and email follow-up.' }
  ]
};

const channelPresets: Record<Mode, string[]> = {
  acquire: ['Search heavy', 'Retail assist', 'Social boost'],
  grow: ['Email first', 'In-app upsell', 'Sales assist'],
  retain: ['Proactive call', 'SMS nudge', 'Service desk']
};

const cadencePresets: Record<Mode, string[]> = {
  acquire: ['6-week burst', '8-week learn + scale'],
  grow: ['Quarterly nurture', 'Bi-weekly drip'],
  retain: ['30-day rescue', '14-day triage']
};

const guardrailCopy = {
  acquire: 'CAC guardrail',
  grow: 'Cannibalization guardrail',
  retain: 'Retention guardrail'
} as const;

type SimulationState = {
  loading: boolean;
  data?: { payback: number; gm12: number; netAdds: number; flags: string[] };
};

const buildOfferDepth = (mode: Mode, value: number) => {
  if (mode === 'acquire') return Math.min(2, 1 + value / 120);
  if (mode === 'grow') return Math.min(2, 1 + value / 40);
  return Math.min(2, 1 + value / 160);
};

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

const CampaignDesigner: React.FC = () => {
  const navigate = useNavigate();
  const { mode, selectedSegment, setStep, setPlanId } = useAppState();

  const [planName, setPlanName] = React.useState('Lifecycle launch plan');
  const [strategy, setStrategy] = React.useState(strategyOptions[mode][0].id);
  const [channelFocus, setChannelFocus] = React.useState(channelPresets[mode][0]);
  const [cadence, setCadence] = React.useState(cadencePresets[mode][0]);
  const [priceDelta, setPriceDelta] = React.useState(20);
  const [incentiveCap, setIncentiveCap] = React.useState(80);
  const [loyaltyPerk, setLoyaltyPerk] = React.useState('Founders club benefits');
  const [creativeAngle, setCreativeAngle] = React.useState('Switch and save in 10 minutes.');
  const [notes, setNotes] = React.useState('Align measurement plan with Monitoring tiles.');
  const [budget, setBudget] = React.useState(250000);
  const [dailyCap, setDailyCap] = React.useState(14000);
  const [pacing, setPacing] = React.useState(cadencePresets[mode][0]);
  const [cannibalizationGuardrail, setCannibalizationGuardrail] = React.useState(true);
  const [simulation, setSimulation] = React.useState<SimulationState>({ loading: false });
  const [pushLoading, setPushLoading] = React.useState(false);

  React.useEffect(() => {
    setStrategy(strategyOptions[mode][0].id);
    setChannelFocus(channelPresets[mode][0]);
    setCadence(cadencePresets[mode][0]);
    setPacing(cadencePresets[mode][0]);
    setPriceDelta(mode === 'acquire' ? 120 : mode === 'grow' ? 18 : 60);
    setIncentiveCap(mode === 'retain' ? 90 : 60);
    setCreativeAngle(
      mode === 'acquire'
        ? 'Switch and save in 10 minutes.'
        : mode === 'grow'
        ? 'Upgrade to premium speed with loyalty perks.'
        : 'Call day 0, SMS day 2, email day 5.'
    );
  }, [mode]);

  React.useEffect(() => {
    if (selectedSegment) {
      setPlanName(`${capitalise(mode)} · ${selectedSegment.name}`);
    }
  }, [mode, selectedSegment]);

  const handleRunSimulation = async () => {
    if (!selectedSegment || simulation.loading) return;
    setSimulation({ loading: true });
    const intensitySource = mode === 'acquire' ? priceDelta : mode === 'grow' ? priceDelta : incentiveCap;
    const payload = {
      mode,
      segment: { id: selectedSegment.id, size: selectedSegment.size },
      params: {
        offerDepth: buildOfferDepth(mode, intensitySource),
        channelMix: channelFocus.includes('Search') || channelFocus.includes('In-app') ? 0.7 : 0.5
      }
    } as const;
    try {
      const result = await offersAPI.simulate(payload);
      setSimulation({ loading: false, data: result });
    } catch (error) {
      console.error('Simulation failed', error);
      setSimulation({ loading: false });
    }
  };

  const simulationFlags = simulation.data?.flags ?? [];

  const kpiCards = React.useMemo(() => {
    if (!selectedSegment) return [];
    const households = Math.max(selectedSegment.size, 1);
    const netAdds = simulation.data?.netAdds ?? Math.round(households * 0.08);
    if (mode === 'acquire') {
      const cvr = Math.min(0.18, netAdds / households);
      const cac = netAdds ? budget / netAdds : 0;
      const payback = simulation.data?.payback ?? 9;
      return [
        { id: 'cvr', label: 'CVR', value: `${(cvr * 100).toFixed(1)}%`, helper: 'Projected close rate' },
        { id: 'cac', label: 'CAC', value: formatCurrency(Math.round(cac)), helper: 'All-in acquisition cost' },
        { id: 'payback', label: 'Payback (mo)', value: payback.toFixed(1), helper: 'offersAPI.simulate' },
        { id: 'netAdds', label: 'Net adds', value: netAdds.toLocaleString(), helper: 'Lifecycle lift' }
      ];
    }
    if (mode === 'grow') {
      const arpuDelta = simulation.data ? simulation.data.gm12 / households / 12 : 6.4;
      const ltvDelta = simulation.data ? simulation.data.gm12 / households * 3 : 520;
      const cannibal = cannibalizationGuardrail ? 'Low' : 'Medium';
      return [
        { id: 'arpu', label: 'ARPU Δ', value: formatCurrency(Number(arpuDelta.toFixed(2))), helper: 'Monthly lift' },
        { id: 'ltv', label: 'LTV Δ', value: formatCurrency(Math.round(ltvDelta)), helper: 'Lifecycle value gain' },
        { id: 'cannibal', label: 'Cannibalization risk', value: cannibal, helper: 'Guardrail toggle' }
      ];
    }
    const saveRate = Math.min(0.4, netAdds / households);
    const survival30 = Math.min(0.92, 0.75 + saveRate / 2);
    const survival90 = Math.min(0.88, 0.68 + saveRate / 1.5);
    const costToSave = netAdds ? budget / netAdds : 0;
    return [
      { id: 'save', label: 'Save rate', value: `${(saveRate * 100).toFixed(1)}%`, helper: 'Modeled rescues' },
      { id: 'survival', label: '30 / 90 survival', value: `${(survival30 * 100).toFixed(0)}% / ${(survival90 * 100).toFixed(0)}%`, helper: 'Post-save health' },
      { id: 'cost', label: 'Cost-to-save vs LTV', value: formatCurrency(Math.round(costToSave)), helper: 'Spend per retained HH' }
    ];
  }, [budget, cannibalizationGuardrail, mode, selectedSegment, simulation.data]);

  const previewDraft = React.useMemo(() => {
    if (!selectedSegment) return undefined;
    const option = strategyOptions[mode].find((item) => item.id === strategy);
    const modeSpecificAction =
      mode === 'retain'
        ? `Save path: ${incentiveCap}% incentive cap.`
        : mode === 'grow'
        ? `Perk focus: ${loyaltyPerk}.`
        : `Offer depth tuned to ${priceDelta}.`;
    return {
      headline: `${capitalise(mode)} play for ${selectedSegment.name}`,
      summary: `${option?.label ?? 'Lifecycle'} strategy ready for execution across ${channelFocus.toLowerCase()}.`,
      actions: [
        `Plan: ${planName}.`,
        `Cadence: ${cadence}.`,
        modeSpecificAction
      ],
      kpiImpact: kpiCards
    };
  }, [cadence, channelFocus, incentiveCap, kpiCards, loyaltyPerk, mode, planName, priceDelta, selectedSegment, strategy]);

  const previewGuardrails = React.useMemo(() => {
    const flagItems = simulationFlags.map((flag) => ({ id: flag, label: flag.replace(/_/g, ' '), passed: false }));
    return [
      { id: 'guardrail', label: guardrailCopy[mode], passed: cannibalizationGuardrail },
      { id: 'budget', label: `Pacing: ${pacing}`, passed: true },
      ...flagItems
    ];
  }, [cannibalizationGuardrail, mode, pacing, simulationFlags]);

  const handlePushPlan = async () => {
    if (!selectedSegment || pushLoading) return;
    setPushLoading(true);
    const strategyMeta = strategyOptions[mode].find((item) => item.id === strategy);
    const resolvedPlanName = planName.trim() || `${capitalise(mode)} ${strategyMeta?.label ?? 'plan'}`;
    const digitalShare = channelFocus.includes('Search') || channelFocus.includes('In-app') ? 0.46 : 0.32;
    const humanShare = channelFocus.includes('Retail') || channelFocus.includes('Proactive call') || channelFocus.includes('Sales') ? 0.28 : 0.18;
    const lifecycleShare = Math.max(0, Number((1 - digitalShare - humanShare).toFixed(2)));
    const pacingWeeks = Number(pacing.match(/\d+/)?.[0] ?? 6);
    const planPayload = {
      id: `${strategy}-${Date.now().toString(36)}`,
      name: resolvedPlanName,
      cohorts: [selectedSegment],
      channels: {
        digital: Number(digitalShare.toFixed(2)),
        humanAssist: Number(humanShare.toFixed(2)),
        lifecycle: lifecycleShare,
        pacingWeeks,
        dailyCap
      },
      offer: {
        price: mode === 'acquire' ? 65 : 95,
        promoMonths: mode === 'retain' ? 2 : 4,
        promoValue: priceDelta,
        deviceSubsidy: mode === 'acquire' ? 400 : 200
      }
    };
    try {
      const response = await execAPI.push({ mode, plan: planPayload });
      setPlanId(response.planId);
      setStep(4);
      navigate('/execution-hub');
    } catch (error) {
      console.error('Push plan failed', error);
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Step 3 · Offer & Campaign Designer</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Shape the lifecycle play</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Select the lifecycle strategy, tune pricing and incentives, pace spend, then simulate impact before handing off to execution.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-right text-xs text-slate-300">
              <p className="uppercase tracking-[0.3em] text-slate-500">Mode lens</p>
              <p className="mt-1 text-sm font-semibold text-white">{capitalise(mode)}</p>
              <p className="text-[11px] text-slate-400">Strategies, inputs, and KPIs shift by lifecycle motion.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Plan name</span>
              <input
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Strategy</span>
              <select
                value={strategy}
                onChange={(event) => setStrategy(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {strategyOptions[mode].map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400">{strategyOptions[mode].find((item) => item.id === strategy)?.description}</span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Channel focus</span>
              <select
                value={channelFocus}
                onChange={(event) => setChannelFocus(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {channelPresets[mode].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Cadence</span>
              <select
                value={cadence}
                onChange={(event) => setCadence(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {cadencePresets[mode].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'grow' ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-slate-400">Loyalty perk</span>
                <input
                  value={loyaltyPerk}
                  onChange={(event) => setLoyaltyPerk(event.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </label>
            ) : null}
            {mode === 'retain' ? (
              <label className="flex flex-col gap-2 text-sm md:col-span-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Outreach sequence</span>
                <textarea
                  value={creativeAngle}
                  onChange={(event) => setCreativeAngle(event.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400">Layer proactive outreach by channel to prevent churn.</span>
              </label>
            ) : (
              <label className="flex flex-col gap-2 text-sm md:col-span-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Creative / messaging angle</span>
                <textarea
                  value={creativeAngle}
                  onChange={(event) => setCreativeAngle(event.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400">Keep copy aligned to lifecycle promise for this cohort.</span>
              </label>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white">Pricing & incentive levers</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Offer depth</span>
              <input
                type="number"
                value={priceDelta}
                onChange={(event) => setPriceDelta(Number(event.target.value) || 0)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">
                {mode === 'acquire' ? 'Promo value ($)' : mode === 'grow' ? 'Price delta ($)' : 'Save incentive (%)'}
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Incentive cap</span>
              <input
                type="number"
                value={incentiveCap}
                onChange={(event) => setIncentiveCap(Number(event.target.value) || 0)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">Protect margin across channels.</span>
            </label>
            {mode === 'grow' ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-slate-400">Loyalty perk</span>
                <input
                  value={loyaltyPerk}
                  onChange={(event) => setLoyaltyPerk(event.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </label>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400">
                Scale intensity gradually to keep guardrails within limits.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white">Budget & constraints</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm md:col-span-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Total budget</span>
              <input
                type="number"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value) || 0)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Daily cap</span>
              <input
                type="number"
                value={dailyCap}
                onChange={(event) => setDailyCap(Number(event.target.value) || 0)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Pacing</span>
              <select
                value={pacing}
                onChange={(event) => setPacing(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {cadencePresets[mode].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={cannibalizationGuardrail}
              onChange={(event) => setCannibalizationGuardrail(event.target.checked)}
              className="h-4 w-4 rounded border border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
            />
            <span>{guardrailCopy[mode]}</span>
          </label>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Simulation</h2>
              <p className="text-sm text-slate-300">Stress test KPIs before handing the plan to Execution Hub.</p>
            </div>
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={!selectedSegment || simulation.loading}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
            >
              {simulation.loading ? 'Running…' : 'Run simulation'}
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {kpiCards.map((kpi) => (
              <div key={kpi.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">{kpi.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{kpi.value}</p>
                <p className="text-xs text-slate-400">{kpi.helper}</p>
              </div>
            ))}
            {!kpiCards.length ? (
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
                Lock a segment in Segment Studio to view KPI projections.
              </div>
            ) : null}
          </div>
          {simulationFlags.length ? (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
              <p className="font-semibold uppercase tracking-wide">Simulation flags</p>
              <ul className="mt-2 space-y-1">
                {simulationFlags.map((flag) => (
                  <li key={flag}>{flag.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-400">Notes for execution</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-300">
              Push the plan to Execution Hub once simulation clears guardrails. Monitoring will pick up the planId automatically.
            </p>
            <button
              type="button"
              onClick={handlePushPlan}
              disabled={!selectedSegment || pushLoading}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
            >
              {pushLoading ? 'Pushing…' : 'Push plan → Execution Hub'}
            </button>
          </div>
        </div>
      </div>
      <div>
        <PlaybookPreview mode={mode} selectedSegment={selectedSegment} draftPlan={previewDraft} guardrails={previewGuardrails} />
      </div>
    </div>
  );
};

export default CampaignDesigner;
