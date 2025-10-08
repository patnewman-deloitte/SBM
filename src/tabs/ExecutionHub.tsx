import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useAppStore, Campaign, ChannelKey } from '../store/AppStore';
import KpiTile from '../components/KpiTile';
import Info from '../components/Info';
import Section from '../components/Section';
import MiniBadge from '../components/MiniBadge';
import TrendChip from '../components/TrendChip';
import { useToast } from '../components/ToastProvider';

const statusTone: Record<Campaign['status'], string> = {
  Planned: 'bg-slate-500/20 text-slate-200',
  Running: 'bg-emerald-500/20 text-emerald-200',
  Paused: 'bg-amber-500/20 text-amber-100',
  Completed: 'bg-slate-700/40 text-slate-300'
};

type ExecLocationState = {
  selectedCampaignId?: string;
  fromLaunch?: boolean;
  pendingDeltas?: {
    channels?: Partial<Record<ChannelKey, number>>;
    offer?: Partial<Campaign['offer']>;
  };
};

const channelKeys: ChannelKey[] = ['Search', 'Social', 'Email', 'Retail', 'Field'];

const ExecutionHub: React.FC = () => {
  const {
    campaigns,
    monitoring,
    toggleStatus,
    tuneCampaign,
    estimateImpact,
    agentActions,
    logAction,
    setAutoOptimize,
    autoOptimize
  } = useAppStore();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as ExecLocationState) ?? {};

  const [statusFilter, setStatusFilter] = React.useState<'all' | Campaign['status']>('all');
  const [agentFilter, setAgentFilter] = React.useState<'all' | Campaign['agent']>('all');
  const [channelFilter, setChannelFilter] = React.useState<'all' | ChannelKey>('all');
  const [selectedId, setSelectedId] = React.useState<string>(() => locationState.selectedCampaignId ?? campaigns[0]?.id ?? '');
  const [showLaunchChip, setShowLaunchChip] = React.useState<boolean>(Boolean(locationState.fromLaunch));
  const [pendingPrefill, setPendingPrefill] = React.useState(locationState.pendingDeltas);

  React.useEffect(() => {
    if (locationState.selectedCampaignId) {
      setSelectedId(locationState.selectedCampaignId);
    }
    if (locationState.fromLaunch) {
      setShowLaunchChip(true);
      window.setTimeout(() => setShowLaunchChip(false), 2800);
    }
    if (locationState.pendingDeltas) {
      setPendingPrefill(locationState.pendingDeltas);
    }
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCampaigns = React.useMemo(() => {
    return campaigns.filter((campaign) => {
      if (statusFilter !== 'all' && campaign.status !== statusFilter) return false;
      if (agentFilter !== 'all' && campaign.agent !== agentFilter) return false;
      if (channelFilter !== 'all' && (campaign.channels[channelFilter] ?? 0) <= 0.01) return false;
      return true;
    });
  }, [agentFilter, campaigns, channelFilter, statusFilter]);

  React.useEffect(() => {
    if (filteredCampaigns.length === 0) return;
    if (!filteredCampaigns.some((campaign) => campaign.id === selectedId)) {
      setSelectedId(filteredCampaigns[0].id);
    }
  }, [filteredCampaigns, selectedId]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId);

  const [channelDraft, setChannelDraft] = React.useState<Record<ChannelKey, number>>(() => {
    const base = selectedCampaign?.channels ?? {
      Search: 0.22,
      Social: 0.22,
      Email: 0.18,
      Retail: 0.2,
      Field: 0.18
    };
    return channelKeys.reduce(
      (acc, key) => {
        acc[key] = Number(((base[key] ?? 0) * 100).toFixed(1));
        return acc;
      },
      {} as Record<ChannelKey, number>
    );
  });
  const [offerDraft, setOfferDraft] = React.useState(() => selectedCampaign?.offer ?? {
    price: 79,
    promoMonths: 3,
    promoValue: 150,
    deviceSubsidy: 200
  });
  const [preview, setPreview] = React.useState<ReturnType<typeof estimateImpact> | null>(null);

  React.useEffect(() => {
    if (!selectedCampaign) return;
    setChannelDraft(
      channelKeys.reduce((acc, key) => {
        acc[key] = Number(((selectedCampaign.channels[key] ?? 0) * 100).toFixed(1));
        return acc;
      }, {} as Record<ChannelKey, number>)
    );
    setOfferDraft(selectedCampaign.offer);
  }, [selectedCampaign?.id]);

  React.useEffect(() => {
    if (!selectedCampaign || !pendingPrefill) return;
    if (pendingPrefill.channels) {
      setChannelDraft((prev) => {
        const next = { ...prev };
        channelKeys.forEach((key) => {
          if (pendingPrefill.channels && pendingPrefill.channels[key] !== undefined) {
            next[key] = Number(((pendingPrefill.channels[key] ?? 0) * 100).toFixed(1));
          }
        });
        return rebalance(next);
      });
    }
    if (pendingPrefill.offer) {
      setOfferDraft((prev) => ({ ...prev, ...pendingPrefill.offer }));
    }
    setPendingPrefill(undefined);
  }, [pendingPrefill, selectedCampaign]);

  if (!selectedCampaign) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 text-slate-200">
        <h2 className="text-lg font-semibold">Execution Hub</h2>
        <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">No campaigns available yet.</p>
      </div>
    );
  }

  const rebalance = (draft: Record<ChannelKey, number>) => {
    const total = channelKeys.reduce((sum, key) => sum + draft[key], 0);
    if (total === 0) return draft;
    const scale = 100 / total;
    const scaled = channelKeys.reduce((acc, key) => {
      acc[key] = Number((draft[key] * scale).toFixed(1));
      return acc;
    }, {} as Record<ChannelKey, number>);
    const adjustTotal = channelKeys.reduce((sum, key) => sum + scaled[key], 0);
    if (Math.abs(adjustTotal - 100) > 0.5) {
      const diff = 100 - adjustTotal;
      scaled[channelKeys[0]] = Number((scaled[channelKeys[0]] + diff).toFixed(1));
    }
    return scaled;
  };

  const handleChannelChange = (key: ChannelKey, value: number) => {
    setChannelDraft((prev) => rebalance({ ...prev, [key]: value }));
  };

  const handlePreview = () => {
    if (!selectedCampaign) return;
    const previewResult = estimateImpact(selectedCampaign, {
      channels: channelKeys.reduce((acc, key) => {
        acc[key] = channelDraft[key] / 100;
        return acc;
      }, {} as Record<ChannelKey, number>),
      offer: offerDraft
    });
    setPreview(previewResult);
  };

  const handleApply = () => {
    if (!selectedCampaign) return;
    const updated = tuneCampaign(selectedCampaign.id, {
      channels: channelKeys.reduce((acc, key) => {
        acc[key] = channelDraft[key] / 100;
        return acc;
      }, {} as Record<ChannelKey, number>),
      offer: offerDraft
    });
    if (!updated) return;
    logAction(selectedCampaign.id, {
      summary: 'Manual optimisation applied from console.',
      lift: preview ? Number(preview.delta.gm12 / 1000) : 0.3,
      status: 'Applied',
      details: preview ? `GM12 Δ ${preview.delta.gm12.toLocaleString('en-US')}` : 'Mix and offer refreshed.'
    });
    setPreview(null);
    pushToast({ description: 'Optimisation saved to campaign.', variant: 'success' });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(selectedCampaign, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCampaign.name.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    pushToast({ description: 'Campaign JSON exported.', variant: 'default' });
  };

  const channelChartData = channelKeys.map((key) => ({
    channel: key,
    allocation: channelDraft[key],
    cvr: Number((selectedCampaign.kpis.cvr * (selectedCampaign.channels[key] ?? 0)).toFixed(2))
  }));

  const telemetry = monitoring.streams[selectedCampaign.id] ?? [];
  const latestTelemetry = telemetry[telemetry.length - 1];
  const actionLog = agentActions[selectedCampaign.id] ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
      <aside className="space-y-5">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">Filters</p>
            <Info
              title="Campaign filters"
              body={(
                <>
                  <p><strong>How it is used:</strong> Narrow the table to focus on campaigns by lifecycle, owning agent, or the channels deployed.</p>
                  <p><strong>What it means:</strong> Filters reference live execution metadata gathered from 1P CRM activation logs and synthetic telemetry.</p>
                </>
              )}
            />
          </div>
          <div className="mt-4 space-y-4 text-sm">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatusFilter(event.target.value as typeof statusFilter)
                }
              >
                <option value="all">All</option>
                <option value="Running">Running</option>
                <option value="Paused">Paused</option>
                <option value="Planned">Planned</option>
                <option value="Completed">Completed</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Agent</span>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
                value={agentFilter}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setAgentFilter(event.target.value as typeof agentFilter)
                }
              >
                <option value="all">All</option>
                <option value="Acquisition">Acquisition</option>
                <option value="Upsell">Upsell</option>
                <option value="Retention">Retention</option>
                <option value="Optimization">Optimization</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-400">Channel</span>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
                value={channelFilter}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setChannelFilter(event.target.value as typeof channelFilter)
                }
              >
                <option value="all">All</option>
                {channelKeys.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">Agent roles</p>
          <p className="mt-2 leading-relaxed">
            Acquisition drives first-time growth, Upsell lifts ARPU, Retention protects base, and Optimization tunes mix based on live
            signals.
          </p>
        </div>
      </aside>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-lg shadow-slate-950/40">
          <div className="overflow-hidden rounded-2xl border border-slate-800/80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Campaign</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Cohorts</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-right">CVR %</th>
                  <th className="px-4 py-3 text-right">ARPU Δ</th>
                  <th className="px-4 py-3 text-right">GM12</th>
                  <th className="px-4 py-3 text-right">Payback</th>
                  <th className="px-4 py-3 text-right">Last update</th>
                  <th className="px-4 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className={`border-t border-slate-800/60 transition hover:bg-slate-900/70 ${
                      campaign.id === selectedId ? 'bg-slate-900/80' : ''
                    }`}
                    onClick={() => setSelectedId(campaign.id)}
                  >
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center gap-2">
                        <MiniBadge tone="emerald">{campaign.cohorts.length} cohorts</MiniBadge>
                        <span className="font-medium text-slate-100">{campaign.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium ${statusTone[campaign.status]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{campaign.cohorts.length}</td>
                    <td className="px-4 py-3 text-left">{campaign.agent}</td>
                    <td className="px-4 py-3 text-right">{campaign.kpis.cvr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right">{campaign.kpis.arpuDelta.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${campaign.kpis.gm12.toLocaleString('en-US')}</td>
                    <td className="px-4 py-3 text-right">{campaign.kpis.paybackMo.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {new Date(campaign.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-full border border-emerald-500/60 px-3 py-1 text-xs font-semibold text-emerald-200"
                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          setSelectedId(campaign.id);
                        }}
                      >
                        Focus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-6">
          <Section
            title="Performance snapshot"
            info={{
              title: 'Performance snapshot',
              body: (
                <>
                  <p><strong>How it is used:</strong> Scan the conversion, value, profitability, and loyalty signals the team monitors hourly.</p>
                  <p><strong>What it means:</strong> KPIs combine 1P CRM contribution, synthetic activation curves, and modeled service perceptions.</p>
                </>
              )
            }}
            actions={
              showLaunchChip ? (
                <span className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                  In flight
                </span>
              ) : null
            }
          >
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiTile label="CVR" value={selectedCampaign.kpis.cvr.toFixed(2)} suffix="%" />
              <KpiTile label="ARPU Δ" value={selectedCampaign.kpis.arpuDelta.toFixed(2)} suffix="$" />
              <KpiTile label="GM12" value={`$${selectedCampaign.kpis.gm12.toLocaleString('en-US')}`} />
              <KpiTile label="Net adds" value={selectedCampaign.kpis.netAdds} />
              <KpiTile label="NPS Δ" value={selectedCampaign.kpis.npsDelta.toFixed(1)} suffix="pts" />
              <KpiTile label="Payback" value={selectedCampaign.kpis.paybackMo.toFixed(1)} suffix="mo" />
            </div>
          </Section>

          <Section
            title="Channel breakdown"
            info={{
              title: 'Channel breakdown',
              body: (
                <>
                  <p><strong>How it is used:</strong> See how delivery mix and channel-led conversion are trending before you tune allocations.</p>
                  <p><strong>What it means:</strong> Delivery % reflects booked spend share; CVR is modeled from activation logs and demo telemetry.</p>
                </>
              )
            }}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelChartData}>
                  <XAxis dataKey="channel" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip cursor={{ fill: 'rgba(15,23,42,0.6)' }} contentStyle={{ background: '#020617', borderRadius: 12 }} />
                  <Legend />
                  <Bar dataKey="allocation" name="Allocation %" fill="#34d399" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cvr" name="CVR contribution" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section
            title="Optimization console"
            info={{
              title: 'Optimization console',
              body: (
                <>
                  <p><strong>How it is used:</strong> Adjust channel weights and offer levers, preview the modeled impact, then commit the change.</p>
                  <p><strong>What it means:</strong> Estimates blend synthetic propensity models with live telemetry heuristics to show directional lift.</p>
                </>
              )
            }}
            actions={
              <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
                  checked={autoOptimize[selectedCampaign.id] ?? false}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setAutoOptimize(selectedCampaign.id, event.target.checked);
                    pushToast({ description: event.target.checked ? 'Auto-optimize enabled.' : 'Auto-optimize disabled.', variant: 'default' });
                  }}
                />
                Enable auto-optimize
              </label>
            }
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Channel mix</p>
                  <div className="mt-3 space-y-3">
                    {channelKeys.map((key) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>{key}</span>
                          <span>{channelDraft[key].toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          step={1}
                          value={channelDraft[key]}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            handleChannelChange(key, Number(event.target.value))
                          }
                          className="w-full accent-emerald-400"
                          aria-label={`${key} allocation`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-400/60 hover:text-emerald-200"
                    onClick={handlePreview}
                  >
                    Preview impact
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100"
                    onClick={handleApply}
                  >
                    Apply &amp; save
                  </button>
                </div>
                {preview ? (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    <p className="font-semibold uppercase tracking-wide text-xs text-emerald-200">Projected lift</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <TrendChip value={preview.delta.cvr} suffix="pp" />
                      <TrendChip value={preview.delta.arpuDelta} suffix="$" />
                      <TrendChip value={preview.delta.gm12} suffix="$" />
                      <TrendChip value={preview.delta.netAdds} />
                      <TrendChip value={-preview.delta.paybackMo} suffix="mo" />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Price</span>
                    <input
                      type="number"
                      value={offerDraft.price}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setOfferDraft((prev) => ({ ...prev, price: Number(event.target.value) }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Promo months</span>
                    <input
                      type="number"
                      value={offerDraft.promoMonths}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setOfferDraft((prev) => ({ ...prev, promoMonths: Number(event.target.value) }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Promo value ($)</span>
                    <input
                      type="number"
                      value={offerDraft.promoValue}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setOfferDraft((prev) => ({ ...prev, promoValue: Number(event.target.value) }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Device subsidy ($)</span>
                    <input
                      type="number"
                      value={offerDraft.deviceSubsidy}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setOfferDraft((prev) => ({ ...prev, deviceSubsidy: Number(event.target.value) }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2"
                    />
                  </label>
                </div>
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Latest telemetry</p>
                  {latestTelemetry ? (
                    <ul className="mt-2 space-y-2">
                      <li>CVR {latestTelemetry.cvr.toFixed(2)}%</li>
                      <li>ARPU Δ {latestTelemetry.arpuDelta.toFixed(2)}</li>
                      <li>Net adds {latestTelemetry.netAdds.toLocaleString('en-US')}</li>
                      <li>Churn Δ {latestTelemetry.churnDelta.toFixed(2)} pts</li>
                    </ul>
                  ) : (
                    <p className="mt-2 text-slate-500">Telemetry initialising…</p>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Agent workflow"
            info={{
              title: 'Agent workflow',
              body: (
                <>
                  <p><strong>How it is used:</strong> Review the human and AI interventions taken on this campaign to keep leadership informed.</p>
                  <p><strong>What it means:</strong> Entries combine manual actions and synthetic auto-optimiser nudges with projected lift estimates.</p>
                </>
              )
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recent actions</span>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-400/60 hover:text-emerald-200"
                  onClick={() => {
                    navigate('/monitoring', { state: { focusCampaignId: selectedCampaign.id } });
                  }}
                >
                  View in Monitoring
                </button>
              </div>
              <ul className="space-y-3 text-sm">
                {actionLog.map((action) => (
                  <li key={action.id} className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-semibold text-slate-200">{action.status}</span>
                    </div>
                    <p className="mt-2 text-slate-100">{action.summary}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Lift ~{action.lift.toFixed(1)}%</span>
                      {action.details ? <span>{action.details}</span> : null}
                    </div>
                  </li>
                ))}
                {actionLog.length === 0 ? (
                  <li className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-slate-400">No logged actions yet.</li>
                ) : null}
              </ul>
            </div>
          </Section>
        </div>
      </div>
      <aside className="space-y-5">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">Quick KPIs</p>
            <Info
              title="Right rail utilities"
              body={(
                <>
                  <p><strong>How it is used:</strong> Keep the headline metrics and operational controls close while you orchestrate changes.</p>
                  <p><strong>What it means:</strong> KPIs, status toggles, and exports reflect the latest synthetic telemetry and plan metadata.</p>
                </>
              )}
            />
          </div>
          <div className="mt-4 space-y-3">
            <div className="grid gap-3">
              <KpiTile label="CVR" value={selectedCampaign.kpis.cvr.toFixed(2)} suffix="%" />
              <KpiTile label="GM12" value={`$${selectedCampaign.kpis.gm12.toLocaleString('en-US')}`} />
              <KpiTile label="Net adds" value={selectedCampaign.kpis.netAdds} />
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-full border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100"
              onClick={() => toggleStatus(selectedCampaign.id)}
            >
              {selectedCampaign.status === 'Running' ? 'Pause campaign' : 'Resume campaign'}
            </button>
            <button
              type="button"
              className="w-full rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-400/60 hover:text-emerald-200"
              onClick={handleExport}
            >
              Export JSON
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ExecutionHub;

