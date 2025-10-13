import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlaybookPreview from '../../components/PlaybookPreview';
import { useToast } from '../../components/ToastProvider';
import { Mode, useAppState } from '../../appState';

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

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

const matchToken = (value: string, tokens: string[]) => {
  const lower = value.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
};

const SegmentStudio: React.FC = () => {
  const navigate = useNavigate();
  const { mode, selectedSegment, setSelectedSegment, setStep } = useAppState();
  const { pushToast } = useToast();
  const segments = React.useMemo(() => segmentCatalog[mode], [mode]);

  const [includeTags, setIncludeTags] = React.useState<string[]>(includeSeeds[mode]);
  const [excludeTags, setExcludeTags] = React.useState<string[]>(excludeSeeds[mode]);
  const [includeInput, setIncludeInput] = React.useState('');
  const [excludeInput, setExcludeInput] = React.useState('');
  const [includeLogic, setIncludeLogic] = React.useState<'and' | 'or'>('and');

  React.useEffect(() => {
    setIncludeTags(includeSeeds[mode]);
    setExcludeTags(excludeSeeds[mode]);
    setIncludeInput('');
    setExcludeInput('');
    setIncludeLogic('and');
  }, [mode]);

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
        ? includeLogic === 'and'
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

  const hasRules = React.useMemo(() => {
    const includeCount = includeTags.filter(Boolean).length;
    const excludeCount = excludeTags.filter(Boolean).length;
    if (includeCount + excludeCount > 0) return true;
    return (activeCandidate?.drivers?.length ?? 0) > 0;
  }, [activeCandidate, excludeTags, includeTags]);

  const canSend = Boolean(activeCandidate && activeCandidate.size >= 5000 && hasRules);

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, target: 'include' | 'exclude') => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddToken(target === 'include' ? includeInput : excludeInput, target);
    }
  };

  const handleLock = React.useCallback(() => {
    if (!activeCandidate || !canSend) return;
    setSelectedSegment({ id: activeCandidate.id, name: activeCandidate.name, size: activeCandidate.size });
    setStep(3);
    pushToast({ description: 'Segment sent to Campaign Designer', variant: 'success' });
    navigate('/campaign-designer');
  }, [activeCandidate, canSend, navigate, pushToast, setSelectedSegment, setStep]);

  const previewDraft = React.useMemo(() => {
    if (!lockedSegment) return undefined;
    const candidate = segments.find((item) => item.id === lockedSegment.id);
    const logicLabel = includeLogic === 'and' ? 'strict AND filters' : 'broader OR filters';
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
        { id: 'logic', label: includeLogic === 'and' ? 'Include logic: AND' : 'Include logic: OR', passed: includeLogic === 'and' }
      ];
    }
    return [
      { id: 'eligibility', label: 'Credit ready', passed: candidate.eligibility },
      { id: 'consent', label: 'Consent on file', passed: candidate.consent },
      { id: 'logic', label: includeLogic === 'and' ? 'Using AND logic' : 'Using OR logic', passed: includeLogic === 'and' }
    ];
  }, [includeLogic, lockedSegment, segments]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Step 2 · Segment Studio</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Refine the audience for design</h1>
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
              {includeTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200"
                >
                  {tag}
                </span>
              ))}
              <input
                value={includeInput}
                onChange={(event) => setIncludeInput(event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, 'include')}
                placeholder="+Add"
                className="h-8 rounded-full border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddToken(includeInput, 'include')}
                className="h-8 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-200"
              >
                Add
              </button>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                <span>Logic</span>
                <button
                  type="button"
                  onClick={() => setIncludeLogic((prev) => (prev === 'and' ? 'or' : 'and'))}
                  className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 font-semibold text-slate-200"
                >
                  {includeLogic.toUpperCase()}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200">
                Exclude
              </span>
              {excludeTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200"
                >
                  {tag}
                </span>
              ))}
              <input
                value={excludeInput}
                onChange={(event) => setExcludeInput(event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, 'exclude')}
                placeholder="+Add"
                className="h-8 rounded-full border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddToken(excludeInput, 'exclude')}
                className="h-8 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-200"
              >
                Add
              </button>
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
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active candidate</p>
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
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-300">
              Send the highlighted cohort forward when the audience meets guardrails and has enough scale for campaign design.
            </p>
            <button
              type="button"
              onClick={handleLock}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
              disabled={!canSend}
            >
              Send segment to Campaign Designer
            </button>
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
