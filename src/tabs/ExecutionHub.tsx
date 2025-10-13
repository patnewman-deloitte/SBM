import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mode, useAppState } from '../appState';
import InfoIcon from '../components/InfoIcon';
import ActionDrawer from '../components/ActionDrawer';

type ChannelKey = 'search' | 'social' | 'email' | 'retail' | 'field';

type MixState = Record<ChannelKey, number>;

type PricingState = {
  price: number;
  promoMonths: number;
  promoValue: number;
  subsidy: number;
};

const channelOrder: ChannelKey[] = ['search', 'social', 'email', 'retail', 'field'];

const channelLabels: Record<ChannelKey, string> = {
  search: 'Search',
  social: 'Social',
  email: 'Email',
  retail: 'Retail',
  field: 'Field',
};

const mixPresets: Record<Mode, MixState> = {
  acquire: { search: 32, social: 18, email: 24, retail: 14, field: 12 },
  grow: { search: 18, social: 24, email: 26, retail: 18, field: 14 },
  retain: { search: 14, social: 16, email: 32, retail: 12, field: 26 },
};

const pricingPresets: Record<Mode, PricingState> = {
  acquire: { price: 65, promoMonths: 6, promoValue: 160, subsidy: 120 },
  grow: { price: 78, promoMonths: 4, promoValue: 120, subsidy: 80 },
  retain: { price: 55, promoMonths: 3, promoValue: 90, subsidy: 60 },
};

const agentByMode: Record<Mode, string> = {
  acquire: 'Acquisition',
  grow: 'Upsell',
  retain: 'Retention',
};

const summaryBaselines: Record<Mode, { cvr: number; arpuDelta: number; gm12: number; netAdds: number; npsDelta: number; payback: number }> = {
  acquire: { cvr: 0.041, arpuDelta: 7.4, gm12: 520000, netAdds: 2400, npsDelta: 6.5, payback: 8.2 },
  grow: { cvr: 0.052, arpuDelta: 9.6, gm12: 610000, netAdds: 1850, npsDelta: 5.4, payback: 6.4 },
  retain: { cvr: 0.033, arpuDelta: 4.8, gm12: 470000, netAdds: 1620, npsDelta: 7.8, payback: 5.2 },
};

const channelCatalog: Record<Mode, Array<{ id: ChannelKey; label: string; notes: string[] }>> = {
  acquire: [
    { id: 'search', label: 'Search', notes: ['Bid curve tuned', 'Journey landing pages QA\'d'] },
    { id: 'social', label: 'Social', notes: ['Creative flight live', 'Lookalike seeded'] },
    { id: 'email', label: 'Email', notes: ['Journey automation synced', 'Deliverability 97%'] },
    { id: 'retail', label: 'Retail', notes: ['Associate toolkit refreshed'] },
    { id: 'field', label: 'Field', notes: ['Geo surge crew scheduled'] },
  ],
  grow: [
    { id: 'search', label: 'Search', notes: ['Upgrade keywords warming', 'Insights synced to DSP'] },
    { id: 'social', label: 'Social', notes: ['Bundle carousel approved'] },
    { id: 'email', label: 'Email', notes: ['Triggered nurture live', 'Segment scoring connected'] },
    { id: 'retail', label: 'Retail', notes: ['Associate incentive briefed'] },
    { id: 'field', label: 'Field', notes: ['Fiber pop-up crew prepped'] },
  ],
  retain: [
    { id: 'search', label: 'Search', notes: ['Help content promoted', 'Churn intercept live'] },
    { id: 'social', label: 'Social', notes: ['Care messaging rotation'] },
    { id: 'email', label: 'Email', notes: ['Win-back cadence staged', 'Save templates QA\'d'] },
    { id: 'retail', label: 'Retail', notes: ['Save desk hours extended'] },
    { id: 'field', label: 'Field', notes: ['Retention field team routed'] },
  ],
};

const guardrailCatalog: Record<Mode, Array<{ id: string; label: string; passed: boolean }>> = {
  acquire: [
    { id: 'eligibility', label: 'Eligibility coverage ≥ 88%', passed: true },
    { id: 'credit', label: 'Credit risk within limit', passed: true },
    { id: 'cannibal', label: 'Cannibalisation ≤ 4%', passed: false },
  ],
  grow: [
    { id: 'eligibility', label: 'Eligibility coverage ≥ 82%', passed: true },
    { id: 'credit', label: 'Credit holdouts cleared', passed: true },
    { id: 'cannibal', label: 'Cannibalisation ≤ 6%', passed: true },
  ],
  retain: [
    { id: 'eligibility', label: 'Eligibility coverage ≥ 78%', passed: true },
    { id: 'credit', label: 'Credit remediation complete', passed: false },
    { id: 'cannibal', label: 'Revenue erosion ≤ 3%', passed: true },
  ],
};

const timelineTemplate = [
  { id: 'submitted', label: 'Job submitted', state: 'idle' as 'idle' | 'active' | 'done' },
  { id: 'progress', label: 'In progress', state: 'idle' as 'idle' | 'active' | 'done' },
  { id: 'done', label: 'Launch complete', state: 'idle' as 'idle' | 'active' | 'done' },
];

const statusTone: Record<'idle' | 'active' | 'done', string> = {
  idle: 'border-slate-800 bg-slate-900/70 text-slate-400',
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 shadow-inner shadow-emerald-500/30',
  done: 'border-emerald-500/20 bg-slate-900 text-emerald-300',
};

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

const ExecutionHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, planId, selectedSegment, selectedSubsegments, setStep } = useAppState();
  const [statusFilter, setStatusFilter] = React.useState('Running');
  const [agentFilter, setAgentFilter] = React.useState(agentByMode[mode]);
  const [channelFilter, setChannelFilter] = React.useState('All channels');
  const [channelMix, setChannelMix] = React.useState<MixState>(() => mixPresets[mode]);
  const [pricing, setPricing] = React.useState<PricingState>(pricingPresets[mode]);
  const [autoOptimize, setAutoOptimize] = React.useState(true);
  const [timeline, setTimeline] = React.useState(timelineTemplate);
  const [launching, setLaunching] = React.useState(false);
  const [launched, setLaunched] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [planActions, setPlanActions] = React.useState<string[]>([]);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => {
    setAgentFilter(agentByMode[mode]);
    setChannelMix(mixPresets[mode]);
    setPricing(pricingPresets[mode]);
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setTimeline(timelineTemplate);
    setLaunching(false);
    setLaunched(false);
    setPlanActions([]);
  }, [mode]);

  React.useEffect(() => {
    const state = location.state as { presetMix?: Partial<MixState> } | null;
    if (state?.presetMix) {
      setChannelMix((prev) => {
        const next = { ...prev };
        channelOrder.forEach((key) => {
          const value = state.presetMix?.[key];
          if (typeof value === 'number' && !Number.isNaN(value)) {
            next[key] = Math.min(60, Math.max(0, value));
          }
        });
        return next;
      });
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  React.useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  const readinessPct = React.useMemo(() => {
    const total = channelOrder.reduce((sum, key) => sum + channelMix[key], 0);
    return Math.min(100, Math.round((total / (channelOrder.length * 30)) * 100));
  }, [channelMix]);

  const baseline = summaryBaselines[mode];
  const households = selectedSegment?.size ?? 36000;
  const mixLift = channelMix.email / 4500 + channelMix.search / 4800 + (autoOptimize ? 0.003 : 0);
  const cvr = Math.min(0.2, Math.max(0.01, baseline.cvr + mixLift));
  const arpuDelta = Number(
    (
      baseline.arpuDelta +
      pricing.price / 160 -
      pricing.promoValue / 4200 +
      channelMix.retail / 30 +
      (autoOptimize ? 0.8 : 0)
    ).toFixed(2)
  );
  const gm12 = Math.round(baseline.gm12 * (autoOptimize ? 1.05 : 1) + households * arpuDelta * 4.2);
  const netAdds = Math.round((baseline.netAdds + households * cvr * 0.16) * (1 + channelMix.field / 220));
  const npsDelta = Number((baseline.npsDelta + channelMix.social / 24 - pricing.subsidy / 260).toFixed(1));
  const payback = Number(
    Math.max(3.4, baseline.payback - channelMix.search / 90 - channelMix.email / 130 + pricing.promoMonths / 8).toFixed(1)
  );

  const quickCvr = `${(cvr * 100).toFixed(2)}%`;
  const quickGm12 = formatCurrency(gm12);
  const quickNetAdds = netAdds.toLocaleString();

  const performanceTiles = [
    { id: 'cvr', label: 'CVR %', value: quickCvr, helper: 'Converted last 7 days' },
    { id: 'arpu', label: 'ARPU Δ', value: `$${arpuDelta.toFixed(2)}`, helper: '12-mo lift' },
    { id: 'gm12', label: 'GM12 $', value: quickGm12, helper: 'Gross margin 12 mo' },
    { id: 'netAdds', label: 'NET ADDS', value: quickNetAdds, helper: 'Projected adds' },
    { id: 'nps', label: 'NPS Δ pts', value: `${npsDelta.toFixed(1)}`, helper: 'Pulse uplift' },
    { id: 'payback', label: 'PAYBACK mo', value: payback.toFixed(1), helper: 'Investment recovery' },
  ];

  const channelSeries = channelOrder.map((key) => ({
    key,
    allocation: channelMix[key],
    contribution: Number((cvr * (channelMix[key] / 100) * 100).toFixed(2)),
  }));

  const guardrails = guardrailCatalog[mode];

  const handleAddActionToPlan = React.useCallback((id: string) => {
    setPlanActions((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const downloadAudience = React.useCallback(() => {
    const rows: Array<[string, string, string]> = [['id', 'label', 'population']];
    if (selectedSubsegments.length) {
      selectedSubsegments.forEach((sub) => {
        rows.push([sub.id, sub.label, sub.population.toString()]);
      });
    } else if (selectedSegment) {
      rows.push([selectedSegment.id, selectedSegment.name, selectedSegment.size.toString()]);
    } else {
      rows.push(['n/a', 'No segment selected', '0']);
    }
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audience.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [selectedSegment, selectedSubsegments]);

  const downloadBrief = React.useCallback(() => {
    const channelSummary = channelOrder
      .map((key) => `${channelLabels[key]} ${channelMix[key]}%`)
      .join(', ');
    const estimatedBudget = Math.max(25000, Math.round(pricing.price * households * 0.05));
    const lines = [
      `Plan: ${planId ?? 'Lifecycle launch plan'}`,
      `Mode: ${mode}`,
      `Segment: ${selectedSegment?.name ?? 'Pending selection'}`,
      `Channels: ${channelSummary}`,
      `Budget assumption: ${formatCurrency(estimatedBudget)}`,
      `KPIs: CVR ${quickCvr}, ARPU ${arpuDelta.toFixed(2)}, GM12 ${quickGm12}, Net adds ${quickNetAdds}, NPS Δ ${npsDelta.toFixed(
        1,
      )} pts, Payback ${payback.toFixed(1)} mo`,
      `Guardrails: ${autoOptimize ? 'Auto-optimize enabled' : 'Manual optimization'}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'handoff_brief.txt';
    link.click();
    URL.revokeObjectURL(url);
  }, [autoOptimize, channelMix, households, mode, npsDelta, payback, planId, pricing.price, quickCvr, quickGm12, quickNetAdds, selectedSegment?.name, arpuDelta]);

  const handleLaunch = () => {
    if (launching || !planId || readinessPct < 34) return;
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setLaunching(true);
    setTimeline((prev) => prev.map((item, index) => ({ ...item, state: index === 0 ? 'active' : 'idle' })));

    const stageOne = window.setTimeout(() => {
      setTimeline((prev) =>
        prev.map((item, index) => ({ ...item, state: index === 0 ? 'done' : index === 1 ? 'active' : item.state }))
      );
    }, 700);

    const stageTwo = window.setTimeout(() => {
      setTimeline((prev) =>
        prev.map((item, index) => ({ ...item, state: index === 1 ? 'done' : index === 2 ? 'active' : item.state }))
      );
    }, 1400);

    const stageThree = window.setTimeout(() => {
      setTimeline((prev) => prev.map((item, index) => ({ ...item, state: index === 2 ? 'done' : item.state })));
      setLaunching(false);
      setLaunched(true);
    }, 2100);

    timers.current = [stageOne, stageTwo, stageThree];
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Execution Hub</h2>
            <p className="text-sm text-slate-300">
              {planId
                ? `Plan ${planId} staged for ${agentByMode[mode]} motion. Tune the mix and launch.`
                : 'Push a plan from Campaign Designer to activate lifecycle launch workflows.'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <button
              type="button"
              onClick={() => setActionsOpen(true)}
              className="rounded-full border border-slate-700 px-4 py-1 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Open agentic actions"
            >
              Actions
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              Mode: {mode}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="filter-status">
              Status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
            >
              <option>Running</option>
              <option>Queued</option>
              <option>Paused</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="filter-agent">
              Agent
            </label>
            <select
              id="filter-agent"
              value={agentFilter}
              onChange={(event) => setAgentFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
            >
              <option>Acquisition</option>
              <option>Upsell</option>
              <option>Retention</option>
              <option>Optimization</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="filter-channel">
              Channel
            </label>
            <select
              id="filter-channel"
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
            >
              <option>All channels</option>
              <option>Search</option>
              <option>Social</option>
              <option>Email</option>
              <option>Retail</option>
              <option>Field</option>
            </select>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
            <p className="mb-1 font-semibold">Agent roles</p>
            <p>
              Acquisition drives first-time growth, Upsell lifts ARPU, Retention protects base, and Optimization tunes mix based on
              live signals.
            </p>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="grid gap-4 text-sm text-slate-200 sm:grid-cols-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Campaign</p>
                <p className="mt-1 font-semibold text-white">
                  {planId ?? 'Lifecycle launch plan'}
                  <span className="ml-2 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    2 COHORTS
                  </span>
                </p>
                <p className="text-xs text-slate-400">{selectedSegment ? selectedSegment.name : 'Segment pending'}</p>
                {planActions.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-emerald-200">
                    {planActions.map((actionId) => (
                      <span
                        key={actionId}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-semibold"
                      >
                        {actionId.replace(/-/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  <span className={`h-2 w-2 rounded-full ${paused ? 'bg-amber-400' : 'bg-emerald-400'}`} aria-hidden="true" />
                  {paused ? 'Paused' : statusFilter}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Cohorts</p>
                <p className="mt-1 text-lg font-semibold text-white">2</p>
                <p className="text-xs text-slate-400">{households.toLocaleString()} households</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Agent</p>
                <p className="mt-1 text-lg font-semibold text-white">{agentByMode[mode]}</p>
                <p className="text-xs text-slate-400">{agentFilter}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">CVR %</p>
                <p className="mt-1 text-lg font-semibold text-white">{quickCvr}</p>
                <p className="text-xs text-emerald-300">Trending ▲ {(mixLift * 100).toFixed(1)} pts</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">ARPU Δ</p>
                <p className="mt-1 text-lg font-semibold text-white">${arpuDelta.toFixed(2)}</p>
                <p className="text-xs text-slate-400">vs last launch</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Performance snapshot</h3>
                <InfoIcon
                  title="Performance snapshot"
                  body="Blend of modeled projections and live telemetry. Use it to gauge readiness before launching or pausing channels."
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {performanceTiles.map((tile) => (
                <div key={tile.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{tile.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{tile.value}</p>
                  <p className="text-[11px] text-slate-500">{tile.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Channel breakdown</h3>
                <InfoIcon
                  title="Channel breakdown"
                  body="Compare allocation percentage against conversion contribution. Adjust mix in the console to shift impact."
                />
              </div>
              <p className="text-xs text-slate-400">Readiness {readinessPct}%</p>
            </div>
            <div className="mt-4">
              <svg viewBox="0 0 110 70" className="h-48 w-full" preserveAspectRatio="none">
                {channelSeries.map((item, index) => {
                  const barWidth = 14;
                  const x = 8 + index * 20;
                  const barHeight = (item.allocation / 60) * 50;
                  return (
                    <g key={item.key}>
                      <rect
                        x={x}
                        y={60 - barHeight}
                        width={barWidth}
                        height={barHeight}
                        rx={2}
                        className="fill-emerald-500/40"
                      />
                    </g>
                  );
                })}
                <polyline
                  points={channelSeries
                    .map((item, index) => {
                      const x = 15 + index * 20;
                      const y = 60 - (item.contribution / (cvr * 100 + 1)) * 50;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.8)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-2 grid grid-cols-5 text-center text-[11px] text-slate-400">
                {channelSeries.map((item) => (
                  <span key={item.key}>{channelLabels[item.key]}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Optimization console</h3>
                <InfoIcon
                  title="Optimization console"
                  body="Tune channel mix sliders and economic levers. Changes update readiness and KPIs instantly before you launch."
                />
              </div>
              <div className="mt-4 space-y-4">
                {channelOrder.map((key) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{channelLabels[key]} mix</span>
                      <span className="font-semibold text-slate-200">{channelMix[key]}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={1}
                      value={channelMix[key]}
                      onChange={(event) =>
                        setChannelMix((prev) => ({ ...prev, [key]: Number(event.target.value) }))
                      }
                      className="w-full accent-emerald-400"
                      aria-label={`${channelLabels[key]} allocation`}
                    />
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      {channelCatalog[mode]
                        .find((item) => item.id === key)?.notes.map((note) => (
                          <span key={note} className="rounded-full border border-slate-700 px-2 py-0.5">
                            {note}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                  Price
                  <input
                    type="number"
                    value={pricing.price}
                    onChange={(event) =>
                      setPricing((prev) => ({ ...prev, price: Number(event.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
                  />
                </label>
                <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                  Promo months
                  <input
                    type="number"
                    value={pricing.promoMonths}
                    onChange={(event) =>
                      setPricing((prev) => ({ ...prev, promoMonths: Number(event.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
                  />
                </label>
                <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                  Promo value ($)
                  <input
                    type="number"
                    value={pricing.promoValue}
                    onChange={(event) =>
                      setPricing((prev) => ({ ...prev, promoValue: Number(event.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
                  />
                </label>
                <label className="space-y-1 text-xs uppercase tracking-wide text-slate-400">
                  Device subsidy ($)
                  <input
                    type="number"
                    value={pricing.subsidy}
                    onChange={(event) =>
                      setPricing((prev) => ({ ...prev, subsidy: Number(event.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
                  />
                </label>
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={autoOptimize}
                  onChange={(event) => setAutoOptimize(event.target.checked)}
                  className="h-4 w-4 rounded border border-slate-700 bg-slate-900 accent-emerald-400"
                />
                Enable auto-optimize
              </label>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Launch timeline</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {timeline.map((item) => (
                    <li key={item.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${statusTone[item.state]}`}>
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                            item.state === 'done'
                              ? 'border-emerald-500/60 text-emerald-300'
                              : item.state === 'active'
                              ? 'border-emerald-500/40 text-emerald-200 animate-pulse'
                              : 'border-slate-700 text-slate-500'
                          }`}
                          aria-hidden="true"
                        >
                          {item.state === 'done' ? (
                            <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                              <path d="M2.5 6.5 4.5 9l5-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <span className={`h-2 w-2 rounded-full ${item.state === 'active' ? 'bg-emerald-300' : 'bg-slate-500'}`} />
                          )}
                        </span>
                        <span className="font-medium text-white">{item.label}</span>
                      </div>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {item.state === 'done' ? 'Done' : item.state === 'active' ? 'Running' : 'Queued'}
                      </span>
                    </li>
                  ))}
                </ul>
                {launched ? (
                  <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200">
                    Launch complete. Monitoring dashboard will refresh with live telemetry shortly.
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Guardrail checks</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {guardrails.map((item) => (
                    <span
                      key={item.id}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${
                        item.passed
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${item.passed ? 'bg-emerald-400' : 'bg-rose-400'}`} aria-hidden="true" />
                      {item.label}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                  onClick={() => {
                    setStep(5);
                    navigate('/monitoring');
                  }}
                >
                  View Monitoring Dashboard →
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Handoff pack</h3>
                <p className="text-xs text-slate-400">Shareable artifacts for audience ops and channel partners.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadAudience}
                  className="rounded-full border border-slate-700 px-4 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label="Download audience CSV"
                >
                  Download audience.csv
                </button>
                <button
                  type="button"
                  onClick={downloadBrief}
                  className="rounded-full border border-slate-700 px-4 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label="Download brief text"
                >
                  Download brief.txt
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div>
              <h3 className="text-lg font-semibold text-white">Launch readiness</h3>
              <p className="text-sm text-slate-400">Confirm mix, pricing, and guardrails before launching.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleLaunch}
                disabled={!planId || launching || readinessPct < 34 || paused}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  !planId || readinessPct < 34 || launching || paused
                    ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {launching ? 'Launching…' : 'Launch plan'}
              </button>
              <button
                type="button"
                onClick={() => setPaused((prev) => !prev)}
                className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
              >
                {paused ? 'Resume campaign' : 'Pause campaign'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const data = {
                    mode,
                    segment: selectedSegment,
                    planId,
                    mix: channelMix,
                    pricing,
                    autoOptimize,
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'execution_packet.json';
                  link.click();
                  URL.revokeObjectURL(link.href);
                }}
                className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
              >
                Export JSON
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Quick KPIs</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">CVR</dt>
                <dd className="font-semibold text-white">{quickCvr}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">GM12</dt>
                <dd className="font-semibold text-white">{quickGm12}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Net adds</dt>
                <dd className="font-semibold text-white">{quickNetAdds}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate-500">Auto-optimize is {autoOptimize ? 'enabled' : 'disabled'}.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Channel highlights</h3>
            <ul className="mt-3 space-y-3 text-xs text-slate-300">
              {channelCatalog[mode].map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-[11px] text-slate-400">{item.notes[0]}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <ActionDrawer
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        mode={mode}
        onAddToPlan={handleAddActionToPlan}
      />
    </div>
  );
};

export default ExecutionHub;
