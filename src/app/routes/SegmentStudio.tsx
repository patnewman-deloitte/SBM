import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlaybookPreview from '../../components/PlaybookPreview';
import { useToast } from '../../components/ToastProvider';
import InfoIcon from '../../components/InfoIcon';
import { Mode, Subsegment, aggregateSubsegments, useAppState } from '../../appState';

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const LOGIC_STORAGE_KEY = 'sbm.segment.includeLogic';

const includeSeeds: Record<Mode, string[]> = {
  acquire: ['High intent', 'Switch ready'],
  grow: ['Upgrade friendly', 'Bundle curious'],
  retain: ['At risk', 'Contract expiring']
};

const excludeSeeds: Record<Mode, string[]> = {
  acquire: ['Credit friction'],
  grow: ['Low ARPU'],
  retain: ['Chronic churners']
};

type SegmentCandidate = {
  id: string;
  name: string;
  size: number;
  eligibility: boolean;
  consent: boolean;
  channelFit: string[];
  drivers: string[];
  propensity?: number;
  reachability?: number;
  offerableArpuLift?: number;
  takeRate?: number;
  riskScore?: number;
  saveProb?: number;
};

const segmentCatalog: Record<Mode, SegmentCandidate[]> = {
  acquire: [
    {
      id: 'seg-sunbelt',
      name: 'Sunbelt fiber switchers',
      size: 42000,
      eligibility: true,
      consent: true,
      channelFit: ['Search', 'Retail'],
      drivers: ['High intent', 'Switch ready', 'Promo sensitive'],
      propensity: 0.84,
      reachability: 0.82
    },
    {
      id: 'seg-metro',
      name: 'Metro cord-cutting families',
      size: 36000,
      eligibility: true,
      consent: false,
      channelFit: ['Social', 'Email'],
      drivers: ['Switch ready', 'Device bundle curious'],
      propensity: 0.78,
      reachability: 0.74
    },
    {
      id: 'seg-rural',
      name: 'Rural fixed wireless prospects',
      size: 28000,
      eligibility: false,
      consent: true,
      channelFit: ['Field', 'Retail'],
      drivers: ['Coverage hungry', 'Promo sensitive'],
      propensity: 0.7,
      reachability: 0.66
    }
  ],
  grow: [
    {
      id: 'seg-hybrid',
      name: 'Hybrid mobile + fiber households',
      size: 31000,
      eligibility: true,
      consent: true,
      channelFit: ['Email', 'In-app'],
      drivers: ['Upgrade friendly', 'Bundle curious'],
      offerableArpuLift: 16,
      takeRate: 0.26
    },
    {
      id: 'seg-gamer',
      name: 'High bandwidth gamers',
      size: 24000,
      eligibility: true,
      consent: false,
      channelFit: ['Social', 'Influencer'],
      drivers: ['Latency sensitive', 'Upgrade friendly'],
      offerableArpuLift: 18,
      takeRate: 0.22
    },
    {
      id: 'seg-remote',
      name: 'Remote worker bundles',
      size: 27000,
      eligibility: true,
      consent: true,
      channelFit: ['In-app', 'Retail'],
      drivers: ['Bundle curious', 'Device bundle curious'],
      offerableArpuLift: 14,
      takeRate: 0.28
    }
  ],
  retain: [
    {
      id: 'seg-premium',
      name: 'Premium loyalty tier expiring',
      size: 18000,
      eligibility: true,
      consent: true,
      channelFit: ['Email', 'SMS'],
      drivers: ['At risk', 'Contract expiring'],
      riskScore: 0.76,
      saveProb: 0.64
    },
    {
      id: 'seg-defend',
      name: 'Defend core fiber households',
      size: 22000,
      eligibility: true,
      consent: false,
      channelFit: ['Outbound call', 'Email'],
      drivers: ['Service complaint', 'At risk'],
      riskScore: 0.7,
      saveProb: 0.6
    },
    {
      id: 'seg-paygo',
      name: 'Pay-as-you-go cohorts churning',
      size: 26000,
      eligibility: false,
      consent: true,
      channelFit: ['SMS', 'Retail'],
      drivers: ['Contract expiring', 'Price sensitive'],
      riskScore: 0.68,
      saveProb: 0.58
    }
  ]
};

const computeScore = (candidate: SegmentCandidate, mode: Mode) => {
  if (mode === 'acquire') {
    const base = (candidate.propensity ?? 0) * (candidate.reachability ?? 0);
    return Math.round(base * 100);
  }
  if (mode === 'grow') {
    const value = (candidate.offerableArpuLift ?? 0) * (candidate.takeRate ?? 0);
    return Number(value.toFixed(1));
  }
  const retainValue = (candidate.riskScore ?? 0) * (candidate.saveProb ?? 0);
  return Math.round(retainValue * 100);
};

const scoreLabel = (candidate: SegmentCandidate, mode: Mode) => {
  const score = computeScore(candidate, mode);
  if (mode === 'acquire') {
    return `${score} index`;
  }
  if (mode === 'grow') {
    return `$${score} ARPU`;
  }
  return `${score}% save lift`;
};

const InlineSpark: React.FC<{ seed: string; base: number }> = ({ seed, base }) => {
  const values = React.useMemo(() => {
    const code = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return Array.from({ length: 8 }, (_, index) => {
      const angle = ((code % 240) / 240 + index / 6) * Math.PI * 2;
      const swing = Math.sin(angle) * 0.08;
      return Number(Math.max(0.2, base + swing).toFixed(3));
    });
  }, [base, seed]);

  if (!values.length) {
    return <div className="mt-2 h-8 rounded bg-slate-900/70" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="mt-2 h-8 w-full text-emerald-400/70" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const matchToken = (value: string, tokens: string[]) => {
  const lower = value.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
};

const SegmentStudio: React.FC = () => {
  const navigate = useNavigate();
  const { mode, selectedSegment, selectedSubsegments, setSelectedSegment, setSelectedSubsegments, setPlanId } = useAppState();
  const { pushToast } = useToast();
  const segments = React.useMemo(() => segmentCatalog[mode], [mode]);

  const [includeTags, setIncludeTags] = React.useState<string[]>(includeSeeds[mode]);
  const [excludeTags, setExcludeTags] = React.useState<string[]>(excludeSeeds[mode]);
  const [includeInput, setIncludeInput] = React.useState('');
  const [excludeInput, setExcludeInput] = React.useState('');
  const [includeLogic, setIncludeLogic] = React.useState<'AND' | 'OR'>(() => {
    if (typeof window === 'undefined') return 'AND';
    const stored = window.sessionStorage.getItem(LOGIC_STORAGE_KEY);
    return stored === 'OR' ? 'OR' : 'AND';
  });
  const [subsegments, setSubsegments] = React.useState<Subsegment[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    selectedSubsegments.map((item) => item.id)
  );

  React.useEffect(() => {
    setIncludeTags(includeSeeds[mode]);
    setExcludeTags(excludeSeeds[mode]);
    setIncludeInput('');
    setExcludeInput('');
    setIncludeLogic('AND');
  }, [mode]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(LOGIC_STORAGE_KEY, includeLogic);
  }, [includeLogic]);

  const [activeId, setActiveId] = React.useState<string>(() => selectedSegment?.id ?? segments[0]?.id ?? '');

  React.useEffect(() => {
    if (segments.some((item) => item.id === activeId)) return;
    const fallback = selectedSegment && segments.some((item) => item.id === selectedSegment.id)
      ? selectedSegment.id
      : segments[0]?.id ?? '';
    setActiveId(fallback);
  }, [activeId, segments, selectedSegment]);

  const filteredSegments = React.useMemo(() => {
    return segments.filter((candidate) => {
      const includeTerms = includeTags.filter(Boolean);
      const excludeTerms = excludeTags.filter(Boolean);
      const candidateTokens = [...candidate.drivers, ...candidate.channelFit];
      const includePass = includeTerms.length
        ? includeLogic === 'AND'
          ? includeTerms.every((term) => matchToken(term, candidateTokens))
          : includeTerms.some((term) => matchToken(term, candidateTokens))
        : true;
      if (!includePass) return false;
      if (!excludeTerms.length) return true;
      return !excludeTerms.some((term) => matchToken(term, candidateTokens));
    });
  }, [segments, includeTags, excludeTags, includeLogic]);

  React.useEffect(() => {
    if (!filteredSegments.length) return;
    if (!filteredSegments.some((candidate) => candidate.id === activeId)) {
      setActiveId(filteredSegments[0].id);
    }
  }, [activeId, filteredSegments]);

  const activeCandidate = React.useMemo(
    () => filteredSegments.find((candidate) => candidate.id === activeId) ?? filteredSegments[0],
    [activeId, filteredSegments]
  );

  React.useEffect(() => {
    if (!activeCandidate) {
      setSubsegments([]);
      setSelectedIds([]);
      return;
    }
    const seed = (activeCandidate.id ?? 'segment').length;
    const labels = [
      'Top 20 DMAs',
      'Rural DMAs',
      'High price sensitivity',
      'Device age > 24m',
      'Premium plan',
      'Light data',
      'Heavy video',
      'New movers',
      'Tenure < 6m',
      'Multi-line'
    ];
    const generated = Array.from({ length: 8 }, (_, index) => {
      const traits = [labels[(index + 1) % labels.length], labels[(index + 3) % labels.length]];
      const population = Math.max(
        800,
        Math.round(activeCandidate.size * (0.05 + ((index + seed) % 7) / 90))
      );
      const score = Number((0.55 + ((index + seed) % 5) * 0.04).toFixed(2));
      return {
        id: `${activeCandidate.id}-${index}`,
        label: labels[index % labels.length],
        population,
        traits,
        score
      } satisfies Subsegment;
    });
    setSubsegments(generated);
    const persisted = selectedSubsegments
      .filter((item) => generated.some((candidate) => candidate.id === item.id))
      .map((item) => item.id);
    if (persisted.length) {
      setSelectedIds(persisted);
    } else {
      setSelectedIds((prev) => prev.filter((id) => generated.some((item) => item.id === id)));
    }
  }, [activeCandidate, selectedSubsegments]);

  const toggleSubsegment = React.useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  }, []);

  const selectedSubs = React.useMemo(
    () => subsegments.filter((item) => selectedIds.includes(item.id)),
    [selectedIds, subsegments]
  );

  const selectedSummary = React.useMemo(() => aggregateSubsegments(selectedSubs), [selectedSubs]);

  const eligibilityPreview = React.useMemo(() => {
    const baseSize = activeCandidate?.size ?? 0;
    if (baseSize <= 0) {
      return { value: 0, delta: 0 };
    }
    const includeCount = includeTags.filter(Boolean).length;
    const excludeCount = excludeTags.filter(Boolean).length;
    const includeBoost = includeLogic === 'AND' ? includeCount * 0.01 : includeCount * 0.006;
    const excludeDrag = excludeCount * 0.008;
    const min = 1000;
    const max = Math.round(baseSize * 1.25);
    let projected = Math.round(baseSize * (1 + includeBoost - excludeDrag));
    projected = Math.min(max, Math.max(min, projected));
    return { value: projected, delta: projected - baseSize };
  }, [activeCandidate?.size, includeLogic, includeTags, excludeTags]);

  const baselineSize = activeCandidate?.size ?? 0;
  const previewValueLabel = baselineSize ? `${eligibilityPreview.value.toLocaleString()} ppl` : '0 ppl';
  const previewDeltaLabel = baselineSize
    ? `${eligibilityPreview.delta >= 0 ? '+' : '-'}${Math.abs(eligibilityPreview.delta).toLocaleString()} ppl`
    : '+0 ppl';
  const baselineLabel = baselineSize ? `${baselineSize.toLocaleString()} ppl` : '0 ppl';

  const segmentScore = React.useMemo(() => {
    const includeCount = includeTags.filter(Boolean).length;
    const excludeCount = excludeTags.filter(Boolean).length;
    let score = 62 + includeCount * 0.8 - excludeCount * 0.5;
    if (includeLogic === 'AND' && includeCount >= 2) {
      score += 1;
    }
    score = Math.max(0, Math.min(100, score));
    return Number(score.toFixed(1));
  }, [includeLogic, includeTags, excludeTags]);

  const hasRules = React.useMemo(() => {
    const includeCount = includeTags.filter(Boolean).length;
    const excludeCount = excludeTags.filter(Boolean).length;
    if (includeCount + excludeCount > 0) return true;
    return (activeCandidate?.drivers?.length ?? 0) > 0;
  }, [activeCandidate, excludeTags, includeTags]);

  const canSend = Boolean(
    activeCandidate &&
      activeCandidate.size >= 5000 &&
      hasRules &&
      selectedSubs.length > 0
  );

  const lockedSegment = selectedSegment;

  const handleAddToken = React.useCallback((value: string, target: 'include' | 'exclude') => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (target === 'include') {
      setIncludeTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setIncludeInput('');
    } else {
      setExcludeTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setExcludeInput('');
    }
  }, []);

  const handleRemoveTag = React.useCallback((target: 'include' | 'exclude', value: string) => {
    if (target === 'include') {
      setIncludeTags((prev) => prev.filter((item) => item !== value));
    } else {
      setExcludeTags((prev) => prev.filter((item) => item !== value));
    }
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, target: 'include' | 'exclude') => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddToken(target === 'include' ? includeInput : excludeInput, target);
    }
  };

  const handleSend = React.useCallback(() => {
    if (!activeCandidate || !canSend) return;
    const summaryId = selectedSummary.id || 'audience';
    const compositeId = selectedSubs.length ? `${activeCandidate.id}:${summaryId}` : activeCandidate.id;
    const summaryName = selectedSubs.length ? selectedSummary.name || 'custom mix' : '';
    const label = selectedSubs.length ? `${activeCandidate.name} (${summaryName})` : activeCandidate.name;
    const size = selectedSummary.size || activeCandidate.size;
    setSelectedSegment({ id: compositeId, name: label, size });
    setSelectedSubsegments(selectedSubs);
    setPlanId(undefined);
    pushToast({ description: 'Segment sent to Campaign Designer', variant: 'success' });
    navigate('/campaign-designer');
  }, [activeCandidate, canSend, navigate, pushToast, selectedSubs, selectedSummary.id, selectedSummary.name, selectedSummary.size, setPlanId, setSelectedSegment, setSelectedSubsegments]);

  const previewDraft = React.useMemo(() => {
    if (!lockedSegment) return undefined;
    const candidate = segments.find((item) => item.id === lockedSegment.id);
    const logicLabel = includeLogic === 'AND' ? 'strict AND filters' : 'broader OR filters';
    const includeSummary = includeTags.length ? includeTags.join(', ') : 'base cohort traits';
    const excludeSummary = excludeTags.length ? excludeTags.join(', ') : 'no exclusions applied';
    const score = candidate ? scoreLabel(candidate, mode) : undefined;
    const helper = candidate ? `Lifecycle value: ${score}` : undefined;
    return {
      headline: `${capitalise(mode)} motion ready`,
      summary: `Lock ${lockedSegment.name} with ${logicLabel} to hand off a clean cohort into design.`,
      actions: [
        `Include signals: ${includeSummary}.`,
        `Exclude signals: ${excludeSummary}.`,
        'Prep guardrails before pushing to Execution Hub.'
      ],
      kpiImpact: score
        ? [
            { id: 'value', label: 'Risk / value', value: score, helper },
            { id: 'size', label: 'Audience size', value: lockedSegment.size.toLocaleString(), helper: 'Households' },
            { id: 'mode', label: 'Lifecycle mode', value: capitalise(mode) }
          ]
        : undefined
    };
  }, [lockedSegment, segments, includeLogic, includeTags, excludeTags, mode]);

  const previewGuardrails = React.useMemo(() => {
    if (!lockedSegment) return undefined;
    const candidate = segments.find((item) => item.id === lockedSegment.id);
    if (!candidate) {
      return [
        { id: 'logic', label: includeLogic === 'AND' ? 'Include logic: AND' : 'Include logic: OR', passed: includeLogic === 'AND' }
      ];
    }
    return [
      { id: 'eligibility', label: 'Credit ready', passed: candidate.eligibility },
      { id: 'consent', label: 'Consent on file', passed: candidate.consent },
      { id: 'logic', label: includeLogic === 'AND' ? 'Using AND logic' : 'Using OR logic', passed: includeLogic === 'AND' }
    ];
  }, [includeLogic, lockedSegment, segments]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Step 2 · Segment Studio</p>
              <div className="mt-2 flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-white">Refine the audience for design</h1>
                <InfoIcon
                  title="Segment Studio"
                  body="Inspect include and exclude signals, choose a qualified cohort, and curate subsegments that will flow into Campaign Designer."
                />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Split shortlisted cohorts into include and exclude buckets, inspect delivery fit, and lock the right audience for the
                {" "}
                next stage.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-right text-xs text-slate-300">
              <p className="uppercase tracking-[0.3em] text-slate-500">Mode lens</p>
              <p className="mt-1 text-sm font-semibold text-white">{capitalise(mode)}</p>
              <p className="text-[11px] text-slate-400">Filtering signals and KPIs for this lifecycle motion.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Include
              </span>
              <InfoIcon
                title="Include signals"
                body="Add traits that must be present for the cohort to pass into design. Toggle AND/OR logic to tighten or broaden coverage."
              />
              {includeTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag('include', tag)}
                    className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-label={`Remove include tag ${tag}`}
                  >
                    x
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
                <input
                  value={includeInput}
                  onChange={(event) => setIncludeInput(event.target.value)}
                  onKeyDown={(event) => handleKeyDown(event, 'include')}
                  placeholder="Add"
                  className="w-24 bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddToken(includeInput, 'include')}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label="Add include tag"
                >
                  Add
                </button>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                <span>Logic</span>
                <button
                  type="button"
                  onClick={() => setIncludeLogic((prev) => (prev === 'AND' ? 'OR' : 'AND'))}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    includeLogic === 'AND' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900'
                  }`}
                  aria-pressed={includeLogic === 'AND'}
                  aria-label="Toggle include logic"
                >
                  {includeLogic}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200">
                Exclude
              </span>
              <InfoIcon
                title="Exclude signals"
                body="Layer out traits that would muddy campaign performance—credit risk, churn-prone behaviours, or off-target plans."
              />
              {excludeTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag('exclude', tag)}
                    className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-label={`Remove exclude tag ${tag}`}
                  >
                    x
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
                <input
                  value={excludeInput}
                  onChange={(event) => setExcludeInput(event.target.value)}
                  onKeyDown={(event) => handleKeyDown(event, 'exclude')}
                  placeholder="Add"
                  className="w-24 bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddToken(excludeInput, 'exclude')}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label="Add exclude tag"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold text-white">Net eligible preview</span>
              <span className="text-sm font-semibold text-emerald-200">{previewValueLabel}</span>
              <span>vs baseline: {previewDeltaLabel}</span>
              <span className="text-slate-500">Baseline {baselineLabel}</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Segment</th>
                <th className="px-4 py-3 text-left font-semibold">Size</th>
                <th className="px-4 py-3 text-left font-semibold">Eligibility</th>
                <th className="px-4 py-3 text-left font-semibold">Consent</th>
                <th className="px-4 py-3 text-left font-semibold">Channel fit</th>
                <th className="px-4 py-3 text-left font-semibold">Drivers</th>
                <th className="px-4 py-3 text-left font-semibold">Risk / value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
              {filteredSegments.map((candidate) => {
                const active = candidate.id === activeCandidate?.id;
                return (
                  <tr
                    key={candidate.id}
                    className={`cursor-pointer transition hover:bg-slate-900/60 ${active ? 'bg-slate-900/80' : ''}`}
                    onClick={() => setActiveId(candidate.id)}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-white">{candidate.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{candidate.size.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{candidate.eligibility ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{candidate.consent ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <div className="flex flex-wrap gap-2">
                        {candidate.channelFit.map((item) => (
                          <span key={item} className="rounded-full border border-slate-700 px-2 py-0.5">
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <div className="flex flex-wrap gap-2">
                        {candidate.drivers.map((item) => (
                          <span key={item} className="rounded-full border border-slate-700 px-2 py-0.5">
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-300">{scoreLabel(candidate, mode)}</td>
                  </tr>
                );
              })}
              {!filteredSegments.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                    No cohorts match the current include and exclude logic.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>Active candidate</span>
              <InfoIcon
                title="Active candidate"
                body="Review eligibility, consent, and cohort scale before you choose the subsegments that will progress into campaign design."
              />
            </div>
            <h2 className="text-xl font-semibold text-white">{activeCandidate?.name ?? 'No candidate selected'}</h2>
            <p className="text-sm text-slate-300">
              Size {activeCandidate ? activeCandidate.size.toLocaleString() : '—'} households · Risk / value {activeCandidate ? scoreLabel(activeCandidate, mode) : '—'}
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-wide text-slate-400">Eligibility</p>
              <p className="mt-2 text-base font-semibold text-white">{activeCandidate?.eligibility ? 'Credit ready' : 'Credit friction'}</p>
              <p className="mt-1 text-xs text-slate-400">Credit signal tied to lifecycle guardrails.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-wide text-slate-400">Consent</p>
              <p className="mt-2 text-base font-semibold text-white">{activeCandidate?.consent ? 'Opt-in verified' : 'Opt-in lagging'}</p>
              <p className="mt-1 text-xs text-slate-400">Ensure consent workflow clears before design.</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Subsegment builder</h3>
                <InfoIcon
                  title="Subsegments"
                  body="Auto-suggested slices by DMA, tenure, device age, and price sensitivity. Check the ones you want to design for and see the combined reach update."
                />
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Selected: {selectedSubs.length} • {selectedSummary.size.toLocaleString()} ppl
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {subsegments.map((subsegment) => {
                const checked = selectedIds.includes(subsegment.id);
                return (
                  <label
                    key={subsegment.id}
                    className={`rounded-lg border px-4 py-3 transition ${
                      checked ? 'border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/20' : 'border-slate-800 bg-slate-950/70 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                          checked={checked}
                          onChange={() => toggleSubsegment(subsegment.id)}
                          aria-label={`Select ${subsegment.label}`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">{subsegment.label}</p>
                          <p className="text-xs text-slate-400">{subsegment.population.toLocaleString()} ppl</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {subsegment.traits.map((trait) => (
                              <span
                                key={trait}
                                className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300"
                              >
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                        {(subsegment.score ?? 0.6).toFixed(2)} fit
                      </span>
                    </div>
                    <InlineSpark seed={subsegment.id} base={subsegment.score ?? 0.6} />
                  </label>
                );
              })}
              {!subsegments.length ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                  Select a candidate cohort to generate subsegment ideas.
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-300">
              Bundle the right slices to design against different value pools. Only selected subsegments will flow into Campaign Designer.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Score {segmentScore}
              </span>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
                disabled={!canSend}
              >
                Send selected subsegments to Campaign Designer
              </button>
              <span className="text-xs text-slate-400 sm:ml-3">Requires ≥ 5,000 ppl and guardrail rules.</span>
            </div>
          </div>
        </div>
      </div>
      <div>
        <PlaybookPreview mode={mode} selectedSegment={lockedSegment} draftPlan={previewDraft} guardrails={previewGuardrails} />
      </div>
    </div>
  );
};

export default SegmentStudio;
