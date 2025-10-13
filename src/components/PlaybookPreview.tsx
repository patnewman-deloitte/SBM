import React from 'react';
import { Mode } from '../appState';

type DraftPlan = {
  headline?: string;
  summary?: string;
  actions?: string[];
  kpiImpact?: Array<{ id: string; label: string; value: string; helper?: string }>;
};

type GuardrailCheck = {
  id: string;
  label: string;
  passed: boolean;
  note?: string;
};

type Props = {
  mode: Mode;
  selectedSegment?: { id: string; name: string; size: number };
  draftPlan?: DraftPlan;
  guardrails?: GuardrailCheck[];
};

const modeTone: Record<Mode, string> = {
  acquire: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
  grow: 'bg-sky-500/20 text-sky-200 border border-sky-500/40',
  retain: 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
};

const modeAccent: Record<Mode, string> = {
  acquire: 'bg-emerald-400',
  grow: 'bg-sky-400',
  retain: 'bg-violet-400'
};

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const hash = (input: string) => {
  let acc = 0;
  for (let index = 0; index < input.length; index += 1) {
    acc = (acc * 31 + input.charCodeAt(index)) & 0xffff;
  }
  return acc;
};

const formatNumber = (value: number) => value.toLocaleString('en-US');

const buildAudienceSnapshot = (segment?: { id: string; name: string; size: number }) => {
  if (!segment) {
    return {
      size: '—',
      reachable: '—',
      eligible: '—',
      consent: '—'
    };
  }
  const seed = hash(segment.id);
  const reach = 55 + (seed % 30);
  const eligible = 60 + ((seed >> 2) % 25);
  const consent = 52 + ((seed >> 3) % 20);
  return {
    size: `${formatNumber(segment.size)} HHs`,
    reachable: `${Math.min(95, reach)}%`,
    eligible: `${Math.min(96, eligible)}%`,
    consent: `${Math.min(92, consent)}%`
  };
};

const PlaybookPreview: React.FC<Props> = ({ mode, selectedSegment, draftPlan, guardrails }) => {
  const snapshot = React.useMemo(() => buildAudienceSnapshot(selectedSegment), [selectedSegment?.id, selectedSegment?.size]);
  const kpis = draftPlan?.kpiImpact ?? [
    { id: 'payback', label: 'Payback', value: selectedSegment ? '8.4 mo' : '—', helper: 'Blend of CAC + GM' },
    { id: 'gm', label: '12-mo GM', value: selectedSegment ? '$1.2M' : '—', helper: 'Modeled contribution' },
    { id: 'net', label: 'Net adds', value: selectedSegment ? '4.8k' : '—', helper: 'Projected lift' }
  ];
  const actionSummary = draftPlan?.summary ??
    (selectedSegment
      ? `Advance ${selectedSegment.name} into the lifecycle with a ${capitalise(mode)} play.`
      : 'Select a segment to preview the lifecycle play.');
  const actions = draftPlan?.actions ?? [
    'Sync guardrails across design and execution.',
    'Align channel mix with lifecycle intent.',
    'Prep KPI dashboard tiles for Monitoring.'
  ];
  const guardrailChecks = guardrails ?? [
    { id: 'cac', label: 'CAC ≤ $150', passed: true },
    { id: 'margin', label: 'Margin ≥ 28%', passed: true },
    { id: 'nps', label: 'NPS delta ≥ +4', passed: false }
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Mode</p>
          <span className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${modeTone[mode]}`}>
            <span className={`h-2 w-2 rounded-full ${modeAccent[mode]}`} aria-hidden="true" />
            {capitalise(mode)} lifecycle
          </span>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>Plan preview</p>
          <p className="font-semibold text-slate-200">{selectedSegment?.name ?? 'No segment selected'}</p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">Audience snapshot</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-300">
          <div>
            <p className="text-slate-400">Size</p>
            <p className="text-sm font-semibold text-white">{snapshot.size}</p>
          </div>
          <div>
            <p className="text-slate-400">Reachable</p>
            <p className="text-sm font-semibold text-white">{snapshot.reachable}</p>
          </div>
          <div>
            <p className="text-slate-400">Eligible</p>
            <p className="text-sm font-semibold text-white">{snapshot.eligible}</p>
          </div>
          <div>
            <p className="text-slate-400">Consent-ready</p>
            <p className="text-sm font-semibold text-white">{snapshot.consent}</p>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">Action summary</h3>
        <p className="mt-1 text-sm text-slate-300">{actionSummary}</p>
        <ul className="mt-3 space-y-1 text-xs text-slate-400">
          {actions.map((item, index) => (
            <li key={`${index}-${item}`}>• {item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">KPI impact</h3>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-slate-400">{kpi.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{kpi.value}</p>
              {kpi.helper ? <p className="text-[10px] uppercase tracking-wide text-slate-500">{kpi.helper}</p> : null}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">Guardrail checks</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {guardrailChecks.map((item) => (
            <span
              key={item.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                item.passed
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${item.passed ? 'bg-emerald-400' : 'bg-rose-400'}`}
                aria-hidden="true"
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlaybookPreview;
