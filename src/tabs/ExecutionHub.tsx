import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mode, useAppState } from '../appState';

const channelCatalog: Record<Mode, Array<{ id: string; label: string; notes: string[]; readiness: string[] }>> = {
  acquire: [
    {
      id: 'crm',
      label: 'CRM',
      notes: ['Lifecycle sync enabled', 'Promo codes verified'],
      readiness: ['Audience 48k', 'Consent 93%', 'Creative ready', 'Budget on track']
    },
    {
      id: 'ivr',
      label: 'IVR / Agent',
      notes: ['Agent scripting refreshed'],
      readiness: ['Audience 35k', 'Consent 89%', 'Creative pending', 'Budget on track']
    },
    {
      id: 'email',
      label: 'Email / SMS',
      notes: ['Deliverability 97%'],
      readiness: ['Audience 52k', 'Consent 95%', 'Creative ready', 'Budget ramping']
    },
    {
      id: 'web',
      label: 'Web / App',
      notes: ['Personalisation toggle live'],
      readiness: ['Audience 61k', 'Consent 88%', 'Creative staging', 'Budget aligned']
    },
    {
      id: 'pos',
      label: 'POS',
      notes: ['Offer placards printed'],
      readiness: ['Audience 22k', 'Consent 82%', 'Creative ready', 'Budget gated']
    }
  ],
  grow: [
    {
      id: 'crm',
      label: 'CRM',
      notes: ['Upgrade heuristics synced'],
      readiness: ['Audience 38k', 'Consent 91%', 'Creative ready', 'Budget on track']
    },
    {
      id: 'ivr',
      label: 'IVR / Agent',
      notes: ['Enable bundle cross-sell'],
      readiness: ['Audience 19k', 'Consent 84%', 'Creative pending', 'Budget on track']
    },
    {
      id: 'email',
      label: 'Email / SMS',
      notes: ['Triggered journeys mapped'],
      readiness: ['Audience 44k', 'Consent 94%', 'Creative ready', 'Budget pacing']
    },
    {
      id: 'web',
      label: 'Web / App',
      notes: ['Product tiles ready'],
      readiness: ['Audience 57k', 'Consent 87%', 'Creative staging', 'Budget aligned']
    },
    {
      id: 'pos',
      label: 'POS',
      notes: ['Associate briefings set'],
      readiness: ['Audience 18k', 'Consent 79%', 'Creative ready', 'Budget gated']
    }
  ],
  retain: [
    {
      id: 'crm',
      label: 'CRM',
      notes: ['Save-play template loaded'],
      readiness: ['Audience 29k', 'Consent 92%', 'Creative ready', 'Budget pacing']
    },
    {
      id: 'ivr',
      label: 'IVR / Agent',
      notes: ['Retention specialists staffed'],
      readiness: ['Audience 17k', 'Consent 86%', 'Creative ready', 'Budget on watch']
    },
    {
      id: 'email',
      label: 'Email / SMS',
      notes: ['Win-back sequencing ready'],
      readiness: ['Audience 33k', 'Consent 93%', 'Creative ready', 'Budget pacing']
    },
    {
      id: 'web',
      label: 'Web / App',
      notes: ['Churn intercept active'],
      readiness: ['Audience 41k', 'Consent 85%', 'Creative staging', 'Budget aligned']
    },
    {
      id: 'pos',
      label: 'POS',
      notes: ['Save-offer collateral queued'],
      readiness: ['Audience 11k', 'Consent 76%', 'Creative pending', 'Budget gated']
    }
  ]
};

const guardrailCatalog: Record<Mode, Array<{ id: string; label: string; passed: boolean }>> = {
  acquire: [
    { id: 'eligibility', label: 'Eligibility coverage >= 88%', passed: true },
    { id: 'credit', label: 'Credit risk within limit', passed: true },
    { id: 'cannibal', label: 'Cannibalisation <= 4%', passed: false }
  ],
  grow: [
    { id: 'eligibility', label: 'Eligibility coverage >= 82%', passed: true },
    { id: 'credit', label: 'Credit holdouts cleared', passed: true },
    { id: 'cannibal', label: 'Cannibalisation <= 6%', passed: true }
  ],
  retain: [
    { id: 'eligibility', label: 'Eligibility coverage >= 78%', passed: true },
    { id: 'credit', label: 'Credit remediation complete', passed: false },
    { id: 'cannibal', label: 'Revenue erosion <= 3%', passed: true }
  ]
};

const timelineTemplate = [
  { id: 'submitted', label: 'Job submitted', state: 'idle' as 'idle' | 'active' | 'done' },
  { id: 'progress', label: 'In progress', state: 'idle' as 'idle' | 'active' | 'done' },
  { id: 'done', label: 'Launch complete', state: 'idle' as 'idle' | 'active' | 'done' }
];

const statusTone: Record<'idle' | 'active' | 'done', string> = {
  idle: 'border-slate-800 bg-slate-900/70 text-slate-400',
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 shadow-inner shadow-emerald-500/30',
  done: 'border-emerald-500/20 bg-slate-900 text-emerald-300'
};

const ExecutionHub: React.FC = () => {
  const { mode, planId, selectedSegment, setStep } = useAppState();
  const navigate = useNavigate();
  const [channelToggles, setChannelToggles] = React.useState<Record<string, boolean>>(() => {
    const entries = channelCatalog[mode].map((channel) => [channel.id, true]);
    return Object.fromEntries(entries);
  });
  const [timeline, setTimeline] = React.useState(timelineTemplate);
  const [launching, setLaunching] = React.useState(false);
  const [launched, setLaunched] = React.useState(false);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => {
    setChannelToggles(() => Object.fromEntries(channelCatalog[mode].map((channel) => [channel.id, true])));
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setTimeline(timelineTemplate);
    setLaunching(false);
    setLaunched(false);
  }, [mode]);

  React.useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  const handleToggle = (id: string) => {
    setChannelToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLaunch = () => {
    const total = Object.keys(channelToggles).length || 1;
    const enabled = Object.values(channelToggles).filter(Boolean).length;
    const readiness = Math.round((enabled / total) * 100);
    if (launching || !planId || readiness < 34) return;
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setLaunching(true);
    setTimeline((prev) =>
      prev.map((item, index) => ({
        ...item,
        state: index === 0 ? 'active' : 'idle'
      }))
    );

    const stageOne = window.setTimeout(() => {
      setTimeline((prev) =>
        prev.map((item, index) => ({
          ...item,
          state: index === 0 ? 'done' : index === 1 ? 'active' : item.state
        }))
      );
    }, 600);

    const stageTwo = window.setTimeout(() => {
      setTimeline((prev) =>
        prev.map((item, index) => ({
          ...item,
          state: index === 1 ? 'done' : index === 2 ? 'active' : item.state
        }))
      );
    }, 1200);

    const stageThree = window.setTimeout(() => {
      setTimeline((prev) =>
        prev.map((item, index) => ({
          ...item,
          state: index === 2 ? 'done' : item.state
        }))
      );
      setLaunching(false);
      setLaunched(true);
    }, 1800);

    timers.current = [stageOne, stageTwo, stageThree];
  };

  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const guardrails = guardrailCatalog[mode];
  const channels = channelCatalog[mode];
  const readinessPct = React.useMemo(() => {
    const total = Object.keys(channelToggles).length || 1;
    const enabled = Object.values(channelToggles).filter(Boolean).length;
    return Math.round((enabled / total) * 100);
  }, [channelToggles]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Execution Hub</h2>
          <p className="mt-1 text-sm text-slate-300">
            {planId ? `Plan ${planId} staged for ${modeLabel.toLowerCase()} play.` : 'Push a plan from the designer to unlock launch.'}
          </p>
        </div>
      <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          {modeLabel} lifecycle
        </span>
        {selectedSegment ? (
          <p className="text-xs text-slate-400">
            Locked segment: <span className="font-semibold text-slate-200">{selectedSegment.name}</span>
          </p>
        ) : null}
      </div>
    </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Mode</p>
          <p className="mt-1 text-base font-semibold text-white capitalize">{mode}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Segment</p>
          <p className="mt-1 text-base font-semibold text-white">{selectedSegment ? selectedSegment.name : '—'}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Readiness</p>
          <p className="mt-1 text-base font-semibold text-white">{readinessPct}% channels enabled</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {channels.map((channel) => {
          const enabled = channelToggles[channel.id];
          return (
            <div
              key={channel.id}
              className={`flex flex-col gap-3 rounded-xl border p-5 transition ${
                enabled ? 'border-slate-800 bg-slate-900/70' : 'border-slate-900 bg-slate-950/60 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{channel.label}</h3>
                  <ul className="mt-1 space-y-1 text-xs text-slate-400">
                    {channel.notes.map((note) => (
                      <li key={note}>• {note}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(channel.id)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    enabled
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                  aria-pressed={enabled}
                >
                  {enabled ? 'Included' : 'Excluded'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {channel.readiness.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-slate-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    {chip}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {guardrails.map((rule) => (
                  <span
                    key={`${channel.id}-${rule.id}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${
                      rule.passed ? 'border-emerald-500/30 text-emerald-200' : 'border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${rule.passed ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      aria-hidden="true"
                    />
                    {rule.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Launch readiness</h3>
          <p className="mt-1 text-sm text-slate-400">
            Confirm included channels and trigger the lifecycle launch workflow. Timeline updates as jobs move.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleLaunch}
            disabled={!planId || launching || readinessPct < 34}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              !planId || readinessPct < 34 || launching
                ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            }`}
          >
            {launching ? 'Launching...' : 'Launch plan'}
          </button>
          <button
            type="button"
            onClick={() => {
              const payload = {
                mode,
                segment: selectedSegment,
                channels: Object.entries(channelToggles)
                  .filter(([, value]) => value)
                  .map(([key]) => key),
                planId,
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = 'activation-packet.json';
              link.click();
              URL.revokeObjectURL(link.href);
            }}
            className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
          >
            Export activation packet
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Status timeline</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {timeline.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${statusTone[item.state]}`}
              >
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
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.state === 'active' ? 'bg-emerald-300' : 'bg-slate-500'
                        }`}
                      />
                    )}
                  </span>
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {item.state === 'done' ? 'Done' : item.state === 'active' ? 'Running' : 'Idle'}
                </span>
              </li>
            ))}
          </ul>
          {launched ? (
            <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200">
              Launch complete. Monitoring tiles will refresh with live telemetry.
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
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
                <span
                  className={`h-2 w-2 rounded-full ${item.passed ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  aria-hidden="true"
                />
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
            {'View Monitoring Dashboard ->'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionHub;
