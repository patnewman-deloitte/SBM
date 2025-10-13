import React from 'react';
import { useNavigate } from 'react-router-dom';
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

const recommendedCreativeCopy: Record<
  Mode,
  (segmentName?: string) => {
    subject: string;
    headline: string;
    subhead: string;
    bullets: string[];
    cta: string;
    offer: string;
  }
> = {
  acquire: (segmentName) => ({
    subject: 'Unlock $20/mo when you move to 5G Family',
    headline: 'Unlock $20/mo when you move to 5G Family',
    subhead: `${segmentName ?? 'High-value households'} get priority activation plus device credits.`,
    bullets: [
      'Priority install within 72 hours',
      'Waived activation and upgrade fees',
      'Bundle mobile + home for extra $15/mo off',
    ],
    cta: 'Claim your 5G Family offer',
    offer: 'Limited-time credit applied to your first 6 months.',
  }),
  grow: (segmentName) => ({
    subject: 'Upgrade to Premium 5G — add Home Internet & save',
    headline: 'Upgrade to Premium 5G — add Home Internet & save',
    subhead: `${segmentName ?? 'Members'} unlock bundled savings with premium care.`,
    bullets: [
      'Premium speed upgrade in minutes',
      'Add Home Internet for $25/mo less',
      'Loyalty perk: priority support & device savings',
    ],
    cta: 'Build my premium bundle',
    offer: 'Bundle mobile + home internet and save $25/mo.',
  }),
  retain: (segmentName) => ({
    subject: 'We’ve got you — stay and save with priority care',
    headline: 'We’ve got you — stay and save with priority care',
    subhead: `${segmentName ?? 'Members'} keep perks, credits, and fast-track support.`,
    bullets: [
      'Immediate bill relief credit',
      'Dedicated care hotline & callbacks',
      'Device protection included for 12 months',
    ],
    cta: 'Stay with priority care',
    offer: 'Keep your plan and unlock a loyalty credit this cycle.',
  }),
};

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

type PredictForm = { priceDelta: number; incentiveCap: number; budget: number; dailyCap: number; loyaltySignal: number; pacingWeeks: number };

function predict(mode: 'acquire', pop: number, form: PredictForm): { reach: number; conv: number; cpa: number; payback: number };
function predict(mode: 'grow', pop: number, form: PredictForm): { reach: number; arpu: number; attach: number; clv: number };
function predict(mode: 'retain', pop: number, form: PredictForm): { atRisk: number; saves: number; saveRate: number; churnDeltaBps: number };
function predict(mode: Mode, pop: number, form: PredictForm) {
  const base = Math.max(pop, 0);
  const intensity = Math.max(0.6, Math.min(1.8, form.priceDelta / 60 || 1));
  const budgetFactor = Math.max(0.7, Math.min(1.5, form.budget / 250000));
  if (mode === 'acquire') {
    const reach = Math.round(base * 0.35 * intensity);
    const conv = Math.round(base * 0.035 * intensity);
    const cpa = Math.max(60, Math.round(form.budget / Math.max(conv, 1)));
    const payback = Number((8.5 - intensity * 0.6 + Math.min(1.2, form.dailyCap / 25000)).toFixed(1));
    return { reach, conv, cpa, payback } as const;
  }
  if (mode === 'grow') {
    const reach = Math.round(base * 0.45 * intensity * 0.9);
    const arpu = Number((5.2 + form.priceDelta / 120 + form.loyaltySignal / 160).toFixed(2));
    const attach = Number(Math.min(0.48, 0.24 + form.incentiveCap / 4000 + form.dailyCap / 160000).toFixed(2));
    const clv = Math.round((210 + form.loyaltySignal * 6) * budgetFactor);
    return { reach, arpu, attach, clv } as const;
  }
  const atRisk = Math.round(base * 0.22 * Math.max(0.7, Math.min(1.3, form.pacingWeeks / 8)));
  const saveRate = Math.max(0.4, Math.min(0.78, 0.62 + form.incentiveCap / 300 - form.dailyCap / 200000));
  const saves = Math.round(atRisk * saveRate);
  const churnDeltaBps = Math.round(-35 - saveRate * 18);
  return { atRisk, saves, saveRate, churnDeltaBps } as const;
}

const CampaignDesigner: React.FC = () => {
  const navigate = useNavigate();
  const { mode, selectedSegment, setStep, setPlanId } = useAppState();

  const [designMode, setDesignMode] = React.useState<'recommend' | 'customize'>('recommend');
  const [activeChannel, setActiveChannel] = React.useState<'Email' | 'SMS' | 'Ad' | 'Landing'>('Email');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [creativeImage, setCreativeImage] = React.useState<string | null>(null);
  const [subjectLine, setSubjectLine] = React.useState('');
  const [headlineCopy, setHeadlineCopy] = React.useState('');
  const [subheadCopy, setSubheadCopy] = React.useState('');
  const [ctaCopy, setCtaCopy] = React.useState('');
  const [offerCopy, setOfferCopy] = React.useState('');
  const [bulletCopy, setBulletCopy] = React.useState<string[]>(['', '', '']);
  const [editingField, setEditingField] = React.useState<string | null>(null);
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

  const applyRecommendedCreative = React.useCallback(() => {
    const template = recommendedCreativeCopy[mode](selectedSegment?.name);
    setSubjectLine(template.subject);
    setHeadlineCopy(template.headline);
    setSubheadCopy(template.subhead);
    setCtaCopy(template.cta);
    setOfferCopy(template.offer);
    setBulletCopy(() => {
      const base = template.bullets.slice(0, 3);
      while (base.length < 3) {
        base.push('');
      }
      return base;
    });
  }, [mode, selectedSegment?.name]);

  React.useEffect(() => {
    if (designMode === 'recommend') {
      applyRecommendedCreative();
    }
  }, [applyRecommendedCreative, designMode]);

  React.useEffect(() => {
    setCreativeImage(null);
  }, [mode]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCreativeImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBulletChange = (index: number, value: string) => {
    setBulletCopy((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const renderEditable = (
    id: string,
    label: string,
    value: string,
    onChange: (next: string) => void,
    multiline = false
  ) => {
    const isEditing = editingField === id;
    return (
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
            {isEditing ? (
              multiline ? (
                <textarea
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <input
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              )
            ) : (
              <p className="mt-2 text-sm text-white">{value || '—'}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditingField(isEditing ? null : id)}
            aria-pressed={isEditing}
            className="rounded-full px-2 py-1 text-xs text-slate-400 transition hover:text-emerald-300"
            title="Edit copy"
          >
            ✎
          </button>
        </div>
      </div>
    );
  };

  const renderBullet = (index: number) => {
    const id = `bullet-${index}`;
    const value = bulletCopy[index] ?? '';
    const isEditing = editingField === id;
    return (
      <div key={id} className="mt-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Bullet {index + 1}</p>
            {isEditing ? (
              <input
                value={value}
                onChange={(event) => handleBulletChange(index, event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <p className="mt-2 text-sm text-white">• {value || 'Add highlight'}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditingField(isEditing ? null : id)}
            aria-pressed={isEditing}
            className="rounded-full px-2 py-1 text-xs text-slate-400 transition hover:text-emerald-300"
            title="Edit bullet"
          >
            ✎
          </button>
        </div>
      </div>
    );
  };

  const formSnapshot = React.useMemo(
    () => ({
      priceDelta,
      incentiveCap,
      budget,
      dailyCap,
      loyaltySignal: loyaltyPerk.trim().length,
      pacingWeeks: Number(pacing.match(/\d+/)?.[0] ?? 6),
    }),
    [budget, dailyCap, incentiveCap, loyaltyPerk, pacing, priceDelta]
  );

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

  const scoreTiles = React.useMemo(() => {
    if (!selectedSegment) return [];
    if (mode === 'acquire') {
      const projection = predict('acquire', selectedSegment.size, formSnapshot);
      return [
        { id: 'reach', label: 'Projected reach', value: projection.reach.toLocaleString(), helper: 'Households touched' },
        { id: 'conv', label: 'Modeled conversions', value: projection.conv.toLocaleString(), helper: 'First-cycle closes' },
        { id: 'cpa', label: 'Blended CPA', value: formatCurrency(projection.cpa), helper: 'Spend per add' },
        { id: 'payback', label: 'Payback (mo)', value: projection.payback.toFixed(1), helper: 'Payback horizon' },
      ];
    }
    if (mode === 'grow') {
      const projection = predict('grow', selectedSegment.size, formSnapshot);
      return [
        { id: 'reach', label: 'Reachable base', value: projection.reach.toLocaleString(), helper: 'Households engaged' },
        { id: 'arpu', label: 'ARPU lift', value: `$${projection.arpu.toFixed(2)}`, helper: 'Incremental monthly lift' },
        { id: 'attach', label: 'Attach rate', value: `${(projection.attach * 100).toFixed(1)}%`, helper: 'Expected attaches' },
        { id: 'clv', label: 'CLV delta', value: formatCurrency(projection.clv), helper: 'Total lifetime gain' },
      ];
    }
    const projection = predict('retain', selectedSegment.size, formSnapshot);
    return [
      { id: 'atRisk', label: 'At-risk reached', value: projection.atRisk.toLocaleString(), helper: 'Households engaged' },
      { id: 'saves', label: 'Expected saves', value: projection.saves.toLocaleString(), helper: 'Rescues modeled' },
      { id: 'saveRate', label: 'Save rate', value: `${(projection.saveRate * 100).toFixed(1)}%`, helper: 'Stabilized share' },
      { id: 'churnDelta', label: 'Churn delta', value: `${projection.churnDeltaBps} bps`, helper: 'Net churn shift' },
    ];
  }, [formSnapshot, mode, selectedSegment]);

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
    <div className="space-y-4">
    {!selectedSegment ? (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <span>Select and send a segment from Segment Studio.</span>
        <button
          type="button"
          onClick={() => navigate('/segment-studio')}
          className="rounded-full border border-amber-400/50 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
        >
          Go to Segment Studio
        </button>
      </div>
    ) : null}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
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
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setDesignMode('recommend')}
              aria-pressed={designMode === 'recommend'}
              className={`rounded-full px-3 py-1 text-sm transition ${
                designMode === 'recommend'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'border border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              Recommend for me
            </button>
            <button
              type="button"
              onClick={() => setDesignMode('customize')}
              aria-pressed={designMode === 'customize'}
              className={`rounded-full px-3 py-1 text-sm transition ${
                designMode === 'customize'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'border border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              Customize
            </button>
          </div>
          <div className="mb-4 mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs capitalize text-slate-300">Mode: {mode}</span>
            {selectedSegment ? (
              <span className="rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-100">
                Segment: {selectedSegment.name} • {selectedSegment.size.toLocaleString()} ppl
              </span>
            ) : null}
          </div>
          {designMode === 'recommend' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                We’ll generate campaign copy, offers, and guardrails based on this lifecycle mode. You can launch directly or jump into full customization.
              </p>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Plan name</p>
                <p className="mt-1 text-sm font-semibold text-white">{planName}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Hero headline</p>
                <p className="mt-2 text-lg font-semibold text-white">{headlineCopy}</p>
                <p className="mt-2 text-sm text-slate-300">{subheadCopy}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-200">
                  {bulletCopy.map((bullet, index) => (
                    <li key={`bullet-summary-${index}`}>• {bullet || 'Add highlight'}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-emerald-200">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold">{ctaCopy}</span>
                  <span className="text-slate-300">{offerCopy}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          )}
        </div>

        {designMode === 'customize' ? (
          <>
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
          </>
        ) : null}

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          {designMode === 'customize' ? (
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Notes for execution</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </label>
          ) : (
            <p className="text-sm text-slate-300">
              We’ve prefed the campaign with lifecycle-aligned copy and guardrails. Launch as-is or edit the details before pushing to Execution Hub.
            </p>
          )}
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-300">
              {designMode === 'recommend'
                ? 'Build the auto-generated plan and hand off to Execution Hub, or switch to Customize for granular control.'
                : 'Push the plan to Execution Hub once simulation clears guardrails. Monitoring will pick up the planId automatically.'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePushPlan}
                disabled={!selectedSegment || pushLoading}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
              >
                {pushLoading
                  ? designMode === 'recommend'
                    ? 'Building…'
                    : 'Pushing…'
                  : designMode === 'recommend'
                  ? 'Build my plan'
                  : 'Push plan → Execution Hub'}
              </button>
              {designMode === 'recommend' ? (
                <button
                  type="button"
                  onClick={() => setDesignMode('customize')}
                  className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
                >
                  Edit details
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <aside className="mt-6 space-y-4 lg:mt-0 lg:sticky lg:top-28">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Creative preview</h3>
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Channel: {activeChannel}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['Email', 'SMS', 'Ad', 'Landing'] as const).map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => setActiveChannel(channel)}
                aria-pressed={activeChannel === channel}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeChannel === channel
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                    : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {channel}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-3 flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-950 text-slate-400">
              {creativeImage ? (
                <img src={creativeImage} alt={`${activeChannel} creative preview`} className="h-full w-full rounded-lg object-cover" />
              ) : (
                <span className="text-xs">
                  Placeholder image — Drop here or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-semibold text-emerald-300 underline"
                  >
                    Upload
                  </button>
                </span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {renderEditable('subject', 'Subject line', subjectLine, setSubjectLine)}
            {renderEditable('headline', 'Headline', headlineCopy, setHeadlineCopy)}
            {renderEditable('subhead', 'Subhead', subheadCopy, setSubheadCopy, true)}
            {renderEditable('offer', 'Offer detail', offerCopy, setOfferCopy, true)}
            {renderEditable('cta', 'CTA', ctaCopy, setCtaCopy)}
            {renderBullet(0)}
            {renderBullet(1)}
            {renderBullet(2)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Impact scorecard</h3>
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Live preview</span>
          </div>
          {scoreTiles.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {scoreTiles.map((tile) => (
                <div key={tile.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{tile.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{tile.value}</p>
                  <p className="text-xs text-slate-400">{tile.helper}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Select a segment to unlock projected impact.</p>
          )}
        </div>
      </aside>
    </div>
  </div>
  );
};

export default CampaignDesigner;
