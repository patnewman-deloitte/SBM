import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import InfoPopover from '../../components/InfoPopover';
import KpiTile from '../../components/KpiTile';
import SelectionTray from '../../components/SelectionTray';
import Info from '../../components/Info';
import { useToast } from '../../components/ToastProvider';
import { simulateCampaign, AudienceSimInput } from '../../sim/tinySim';
import { MicroSegment, useGlobalStore } from '../../store/global';
import { ChannelKey, useAppStore } from '../../store/AppStore';

const channelKeyList: ChannelKey[] = ['Search', 'Social', 'Email', 'Retail', 'Field'];
const channelIdToKey: Record<string, ChannelKey> = {
  'ch-search': 'Search',
  'ch-social': 'Social',
  'ch-email': 'Email',
  'ch-retail': 'Retail',
  'ch-field': 'Field'
};

const CampaignDesigner: React.FC = () => {
  const assumptions = useGlobalStore((s) => s.assumptions);
  const channels = useGlobalStore((s) => s.channels);
  const offers = useGlobalStore((s) => s.offers);
  const segments = useGlobalStore((s) => s.segments);
  const microSegmentsByParent = useGlobalStore((s) => s.microSegmentsByParent);
  const campaign = useGlobalStore((s) => s.campaign);
  const updateCampaign = useGlobalStore((s) => s.updateCampaign);
  const navigate = useNavigate();
  const { campaigns: liveCampaigns, launchCampaign, scoreImpact } = useAppStore();
  const { pushToast } = useToast();

  const [launchOpen, setLaunchOpen] = React.useState(false);

  const [savedScenarios, setSavedScenarios] = React.useState<
    {
      id: string;
      label: string;
      payback: number | string;
      gm12: number;
      conversion: number;
      netAdds: number;
    }[]
  >([]);

  const microMap = React.useMemo(() => {
    const map = new Map<string, { parentId: string; data: MicroSegment }>();
    Object.entries(microSegmentsByParent).forEach(([parentId, items]) => {
      items.forEach((item) => {
        map.set(item.id, { parentId, data: item });
      });
    });
    return map;
  }, [microSegmentsByParent]);

  const audiences = React.useMemo(() => {
    return campaign.audienceIds.map((audienceId) => {
      const entry = microMap.get(audienceId);
      if (!entry) return null;
      const segment = segments.find((seg) => seg.id === entry.parentId);
      if (!segment) return null;
      const mix = campaign.channelMixByAudience[audienceId] ?? {};
      return {
        micro: entry.data,
        segment,
        offer: campaign.offerByAudience[audienceId] ?? offers[0],
        channelMix: mix,
        assumptions,
        channels
      };
    }).filter(Boolean) as AudienceSimInput[];
  }, [assumptions, campaign, channels, microMap, offers, segments]);

  const simResults = React.useMemo(() => {
    if (!audiences.length) {
      return null;
    }
    return simulateCampaign({ audiences });
  }, [audiences]);

  const handleOfferChange = (audienceId: string, patch: Partial<typeof offers[number]>) => {
    const next = { ...campaign.offerByAudience };
    const base = next[audienceId] ?? offers[0];
    next[audienceId] = { ...base, ...patch };
    updateCampaign({ offerByAudience: next });
  };

  const handleChannelChange = (audienceId: string, channelId: string, value: number) => {
    const baseMix =
      campaign.channelMixByAudience[audienceId] ??
      channels.reduce((acc, channel) => {
        acc[channel.id] = 1 / Math.max(1, channels.length);
        return acc;
      }, {} as Record<string, number>);
    const mix = { ...baseMix };
    mix[channelId] = value;
    const total = Object.values(mix).reduce((sum, weight) => sum + weight, 0) || 1;
    const normalised = Object.fromEntries(Object.entries(mix).map(([id, weight]) => [id, weight / total]));
    updateCampaign({ channelMixByAudience: { ...campaign.channelMixByAudience, [audienceId]: normalised } });
  };

  const saveScenario = () => {
    if (!simResults) return;
    const label = `Scenario ${savedScenarios.length + 1}`;
    setSavedScenarios([
      ...savedScenarios,
      {
        id: `${Date.now()}`,
        label,
        payback: simResults.blended.paybackMonths,
        gm12: simResults.blended.gm12m,
        conversion: simResults.blended.conversionRate,
        netAdds: simResults.blended.netAdds
      }
    ]);
  };

  const winning = React.useMemo(() => {
    if (!simResults) return null;
    const options = [
      {
        id: 'current',
        label: 'Current plan',
        payback: simResults.blended.paybackMonths,
        gm12: simResults.blended.gm12m,
        conversion: simResults.blended.conversionRate,
        netAdds: simResults.blended.netAdds
      },
      ...savedScenarios
    ];
    return options.reduce((best, scenario) => {
      const bestPayback = typeof best.payback === 'number' ? best.payback : 25;
      const scenarioPayback = typeof scenario.payback === 'number' ? scenario.payback : 25;
      return scenarioPayback < bestPayback ? scenario : best;
    });
  }, [savedScenarios, simResults]);

  const aggregatedCohorts = React.useMemo(() => {
    return campaign.audienceIds
      .map((id) => {
        const entry = microMap.get(id);
        if (!entry) return null;
        const segment = segments.find((seg) => seg.id === entry.parentId);
        if (!segment) return null;
        return {
          id,
          name: `${segment.name} — ${entry.data.name}`,
          size: Math.round(segment.size * entry.data.sizeShare)
        };
      })
      .filter(Boolean) as { id: string; name: string; size: number }[];
  }, [campaign.audienceIds, microMap, segments]);

  const aggregatedChannels = React.useMemo(() => {
    const totals: Record<ChannelKey, number> = {
      Search: 0,
      Social: 0,
      Email: 0,
      Retail: 0,
      Field: 0
    };
    let weightSum = 0;
    campaign.audienceIds.forEach((id) => {
      const entry = microMap.get(id);
      if (!entry) return;
      const mix = campaign.channelMixByAudience[id] ?? {};
      const weight = entry.data.sizeShare;
      weightSum += weight;
      Object.entries(mix).forEach(([channelId, value]) => {
        const key = channelIdToKey[channelId];
        if (!key) return;
        totals[key] += value * weight;
      });
    });
    if (weightSum === 0) return totals;
    return channelKeyList.reduce((acc, key) => {
      acc[key] = Number((totals[key] / weightSum).toFixed(3));
      return acc;
    }, {} as Record<ChannelKey, number>);
  }, [campaign.audienceIds, campaign.channelMixByAudience, microMap]);

  const aggregatedOffer = React.useMemo(() => {
    let totalWeight = 0;
    let price = 0;
    let promoMonths = 0;
    let promoValue = 0;
    let deviceSubsidy = 0;
    campaign.audienceIds.forEach((id) => {
      const entry = microMap.get(id);
      if (!entry) return;
      const offer = campaign.offerByAudience[id] ?? offers[0];
      const weight = entry.data.sizeShare;
      totalWeight += weight;
      price += offer.monthlyPrice * weight;
      promoMonths += offer.promoMonths * weight;
      promoValue += offer.promoValue * weight;
      deviceSubsidy += offer.deviceSubsidy * weight;
    });
    if (totalWeight === 0) {
      const fallback = offers[0];
      return {
        price: fallback.monthlyPrice,
        promoMonths: fallback.promoMonths,
        promoValue: fallback.promoValue,
        deviceSubsidy: fallback.deviceSubsidy
      };
    }
    return {
      price: Number((price / totalWeight).toFixed(2)),
      promoMonths: Math.round(promoMonths / totalWeight),
      promoValue: Math.round(promoValue / totalWeight),
      deviceSubsidy: Math.round(deviceSubsidy / totalWeight)
    };
  }, [campaign.audienceIds, campaign.offerByAudience, microMap, offers]);

  const launchReady = Boolean(simResults && campaign.audienceIds.length);
  const viewMonitoringDisabled = liveCampaigns.length === 0;

  const exportSummary = React.useCallback(() => {
    if (!simResults) return;
    const audienceLines = campaign.audienceIds
      .map((id) => {
        const entry = microMap.get(id);
        if (!entry) return null;
        const segment = segments.find((seg) => seg.id === entry.parentId);
        if (!segment) return null;
        return `- ${segment.name} • ${entry.data.name}`;
      })
      .filter(Boolean) as string[];
    const summaryLines = [
      'Campaign Summary',
      `Total budget: $${campaign.budgetTotal.toLocaleString()}`,
      'Audiences:',
      ...audienceLines,
      '',
      `Payback: ${typeof simResults.blended.paybackMonths === 'number' ? `${simResults.blended.paybackMonths} months` : simResults.blended.paybackMonths}`,
      `12-month GM: $${simResults.blended.gm12m.toLocaleString()}`,
      `Conversion: ${(simResults.blended.conversionRate * 100).toFixed(1)}%`,
      `Net adds: ${simResults.blended.netAdds.toLocaleString()}`,
      '',
      `Winning plan: ${winning ? winning.label : 'Current plan'}`
    ];
    const blob = new Blob([summaryLines.join('\n')], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign-summary.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }, [campaign.audienceIds, campaign.budgetTotal, microMap, segments, simResults, winning]);

  const confirmLaunch = React.useCallback(() => {
    if (!simResults || !aggregatedCohorts.length) return;
    const heuristics = scoreImpact(aggregatedChannels, {
      price: aggregatedOffer.price,
      promoMonths: aggregatedOffer.promoMonths,
      promoValue: aggregatedOffer.promoValue,
      deviceSubsidy: aggregatedOffer.deviceSubsidy
    });
    const paybackValue =
      typeof simResults.blended.paybackMonths === 'number'
        ? simResults.blended.paybackMonths
        : heuristics.paybackMo;
    const launched = launchCampaign({
      name: `${winning ? winning.label : 'Studio Activation'} Launch`,
      cohorts: aggregatedCohorts.map((cohort) => ({
        id: cohort.id,
        name: cohort.name,
        size: cohort.size
      })),
      channels: aggregatedChannels,
      offer: {
        price: aggregatedOffer.price,
        promoMonths: aggregatedOffer.promoMonths,
        promoValue: aggregatedOffer.promoValue,
        deviceSubsidy: aggregatedOffer.deviceSubsidy
      },
      agent: 'Acquisition',
      kpis: {
        cvr: Number((simResults.blended.conversionRate * 100).toFixed(2)),
        arpuDelta: heuristics.arpuDelta,
        gm12: simResults.blended.gm12m,
        netAdds: simResults.blended.netAdds,
        paybackMo: Number(paybackValue.toFixed(2)),
        npsDelta: heuristics.npsDelta
      }
    });
    setLaunchOpen(false);
    pushToast({ description: 'Campaign launched to Execution Hub.', variant: 'success' });
    navigate('/execution-hub', { state: { selectedCampaignId: launched.id, fromLaunch: true } });
  }, [
    aggregatedChannels,
    aggregatedCohorts,
    aggregatedOffer,
    launchCampaign,
    navigate,
    pushToast,
    scoreImpact,
    simResults,
    winning
  ]);

  return (
    <div className="space-y-6">
      <div className="card border border-emerald-500/20 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Offering & Campaign Designer</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Design offers, channel mixes, and budgets for selected micro-segments, then simulate impact before exporting a leadership-ready summary.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Info
              title="Campaign Designer overview"
              body={(
                <>
                  <p><strong>How it is used:</strong> Tune pricing, promotions, and channel mix until guardrails are met.</p>
                  <p><strong>What it means:</strong> tinySim powers the live KPIs using synthetic economics and telemetry.</p>
                </>
              )}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  launchReady
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                    : 'border-slate-700 bg-slate-900/60 text-slate-500'
                }`}
                onClick={() => setLaunchOpen(true)}
                disabled={!launchReady}
              >
                Launch to Execution Hub
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  viewMonitoringDisabled
                    ? 'border-slate-700 bg-slate-900/60 text-slate-500'
                    : 'border-slate-700 text-slate-200 hover:border-emerald-400/60 hover:text-emerald-200'
                }`}
                onClick={() => navigate('/monitoring')}
                disabled={viewMonitoringDisabled}
              >
                View Monitoring
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
          <div className="flex items-start gap-2">
            <InfoPopover title="Align inputs" description="Adjust offer and channel levers to hit guardrails." />
            <span>Use the left rail controls to tweak pricing, promos, and channel allocations.</span>
          </div>
          <div className="flex items-start gap-2">
            <InfoPopover title="Simulate instantly" description="KPIs update as soon as you change assumptions." />
            <span>Watch payback, margin, and conversion respond immediately in the dashboard.</span>
          </div>
          <div className="flex items-start gap-2">
            <InfoPopover title="Share the story" description="Export a polished summary for stakeholders." />
            <span>Capture the winning play and export a PDF summary for leadership.</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[280px_1fr_300px] gap-6">
        <aside className="flex flex-col gap-4">
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-emerald-400">How to use</p>
              <InfoPopover title="How to use" description="Start with guardrails, then iterate on offers and channels." />
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Design and simulate offers, bundles, and channel mixes for your selected sub-segments. Adjust inputs to see conversion, CAC payback, and margin update in real time.
            </p>
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Audiences</h3>
              <InfoPopover title="Audiences" description="Micro-segments currently in scope for this campaign." />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {campaign.audienceIds.map((id) => {
                const entry = microMap.get(id);
                const segment = entry ? segments.find((seg) => seg.id === entry.parentId) : undefined;
                return (
                  <span key={id} className="info-chip">
                    {segment?.name} • {entry?.data.name}
                  </span>
                );
              })}
            </div>
          </div>
        <div className="card border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Budget & guardrails</h3>
            <Info
              title="Budget & guardrails"
              body={(
                <>
                  <p><strong>How it is used:</strong> Anchor the simulation to the spend envelope and CAC guardrails leadership approved.</p>
                  <p><strong>What it means:</strong> Synthetic values mirror CRM finance baselines for this demo environment.</p>
                </>
              )}
            />
          </div>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            <div>
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Total budget</span>
                <InfoPopover title="Total budget" description="Allocate your overall spend for this campaign." placement="left" />
              </div>
              <input
                type="number"
                value={campaign.budgetTotal}
                onChange={(event) => updateCampaign({ budgetTotal: Number(event.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>CAC ceiling</span>
                  <InfoPopover title="CAC ceiling" description="Upper limit for fully-loaded acquisition costs." placement="left" />
                </div>
                <input
                  type="number"
                  value={campaign.guardrails.cacCeiling ?? ''}
                  onChange={(event) => updateCampaign({ guardrails: { ...campaign.guardrails, cacCeiling: Number(event.target.value) } })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>Payback target</span>
                  <InfoPopover title="Payback target" description="Desired timeline to recoup CAC." placement="left" />
                </div>
                <input
                  type="number"
                  value={campaign.guardrails.paybackTarget ?? ''}
                  onChange={(event) => updateCampaign({ guardrails: { ...campaign.guardrails, paybackTarget: Number(event.target.value) } })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <details className="mt-3 space-y-2 text-sm text-slate-300">
            <summary className="flex cursor-pointer items-center gap-2 text-xs uppercase tracking-wide text-emerald-400">
              Advanced assumptions
              <InfoPopover title="Advanced assumptions" description="Prototype keeps these fixed; adjust offline for deeper what-ifs." />
            </summary>
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
              Margin %
              <input
                type="number"
                step={0.01}
                value={assumptions.grossMarginRate}
                onChange={(event) => updateCampaign({})}
                disabled
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <p className="text-xs text-slate-500">Assumptions fixed for prototype; adjust in tinySim for deeper what-ifs.</p>
          </details>
        </div>
      </aside>
      <section className="flex min-w-0 flex-col gap-6">
        <div className="card border border-slate-800 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Campaign concept placeholder</h3>
              <p className="mt-1 text-sm text-slate-300">Use this visual as a stand-in for the eventual creative cover your team will produce.</p>
            </div>
            <InfoPopover title="Campaign concept" description="Placeholder showing how a finalized cover could appear." />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-6 text-white shadow-inner shadow-emerald-500/20">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Winning Play</p>
              <h4 className="mt-3 text-2xl font-semibold">{winning ? winning.label : 'Current plan'}</h4>
              <p className="mt-2 max-w-md text-sm text-emerald-100">
                Digital-first bundles for priority micro-segments with tight promo discipline and high-margin channel mix.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs uppercase text-emerald-200">
                    <span>Payback</span>
                    <InfoPopover title="Payback highlight" description="Shows the timeline to recover acquisition costs for the leading scenario." />
                  </div>
                  <p className="text-lg font-semibold">{simResults ? (typeof simResults.blended.paybackMonths === 'number' ? `${simResults.blended.paybackMonths} mo` : simResults.blended.paybackMonths) : '–'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs uppercase text-emerald-200">
                    <span>12-mo GM</span>
                    <InfoPopover title="Gross margin highlight" description="Captures first-year gross margin after servicing and subsidies." />
                  </div>
                  <p className="text-lg font-semibold">{simResults ? `$${simResults.blended.gm12m.toLocaleString()}` : '–'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs uppercase text-emerald-200">
                    <span>Conversion</span>
                    <InfoPopover title="Conversion highlight" description="Percent of targeted audience expected to activate." />
                  </div>
                  <p className="text-lg font-semibold">{simResults ? `${(simResults.blended.conversionRate * 100).toFixed(1)}%` : '–'}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
              <InfoPopover title="Cover checklist" description="What to include when you produce the real campaign cover." />
              <ul className="list-disc space-y-2 pl-4">
                <li>Headline promise and supporting subtext.</li>
                <li>Audience highlight with hero imagery.</li>
                <li>Offer snapshot and KPIs for leadership.</li>
              </ul>
            </div>
          </div>
        </div>
        {simResults ? (
          <div className="grid grid-cols-5 gap-3">
            <KpiTile
              label="CAC Payback (mo)"
              value={typeof simResults.blended.paybackMonths === 'number' ? simResults.blended.paybackMonths : simResults.blended.paybackMonths}
              info={{
                title: 'CAC Payback (months)',
                description: 'Months until fully-loaded CAC is covered by cumulative contribution.'
              }}
            />
            <KpiTile
              label="12-mo Incremental GM"
              value={`$${simResults.blended.gm12m.toLocaleString()}`}
              info={{
                title: '12-Month Incremental Gross Margin',
                description: 'Gross margin over first 12 months after servicing costs and device amortization.'
              }}
            />
            <KpiTile
              label="Conversion %"
              value={`${(simResults.blended.conversionRate * 100).toFixed(1)}%`}
              info={{
                title: 'Conversion rate',
                description: 'Share of the audience expected to take the offer.'
              }}
            />
            <KpiTile
              label="Net adds"
              value={simResults.blended.netAdds.toLocaleString()}
              info={{
                title: 'Net subscriber adds',
                description: 'Projected incremental subscribers gained from this plan.'
              }}
            />
            <KpiTile
              label="Margin %"
              value={`${simResults.blended.marginPct}%`}
              info={{
                title: 'Margin %',
                description: 'Fully loaded contribution margin percentage for the plan.'
              }}
            />
          </div>
        ) : (
          <div className="card border border-slate-800 p-6 text-center text-sm text-slate-300">Add sub-segments to simulate.</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="card flex flex-col gap-4 border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Performance dashboard</h3>
              <Info
                title="Performance dashboard"
                body={(
                  <>
                    <p><strong>How it is used:</strong> Read the payback curve and cost breakdowns to validate if the play meets finance expectations.</p>
                    <p><strong>What it means:</strong> Sparkline reflects synthetic contribution by month using the same logic as Execution Hub.</p>
                  </>
                )}
              />
            </div>
            {simResults ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simResults.blended.timeline}>
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="card border border-emerald-500/20 p-2 text-xs">
                            Month {payload[0].payload.month}: {payload[0].payload.cumulativeContribution} per sub
                          </div>
                        );
                      }}
                    />
                    <Line type="monotone" dataKey="cumulativeContribution" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Run a simulation to see the payback curve.</p>
            )}
            {simResults ? (
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                    <span>CAC</span>
                    <InfoPopover title="Fully-loaded CAC" description="Acquisition costs including channel spend and execution." />
                  </div>
                  <p className="mt-1 text-lg font-semibold text-white">${simResults.blended.breakdown.cac.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                    <span>Promo cost</span>
                    <InfoPopover title="Promo cost" description="Value of incentives applied over the promo window." />
                  </div>
                  <p className="mt-1 text-lg font-semibold text-white">${simResults.blended.breakdown.promoCost.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                    <span>Device subsidy</span>
                    <InfoPopover title="Device subsidy" description="Upfront device incentives amortized over the term." />
                  </div>
                  <p className="mt-1 text-lg font-semibold text-white">${simResults.blended.breakdown.deviceSubsidy.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                    <span>Execution cost</span>
                    <InfoPopover title="Execution cost" description="One-time cost to launch and manage the campaign." />
                  </div>
                  <p className="mt-1 text-lg font-semibold text-white">${simResults.blended.breakdown.executionCost.toLocaleString()}</p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="card flex flex-col gap-4 border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Offer & channel designer</h3>
              <Info
                title="Offer & channel designer"
                body={(
                  <>
                    <p><strong>How it is used:</strong> Slide pricing, promo depth, and channel allocation to re-balance the play per micro-segment.</p>
                    <p><strong>What it means:</strong> Sliders feed tinySim’s synthetic take-rate and CAC models instantly.</p>
                  </>
                )}
              />
            </div>
            {campaign.audienceIds.map((audienceId) => {
              const entry = microMap.get(audienceId);
              const segment = entry ? segments.find((seg) => seg.id === entry.parentId) : undefined;
              const currentOffer = campaign.offerByAudience[audienceId] ?? offers[0];
              const mix = campaign.channelMixByAudience[audienceId] ?? {};
              return (
                <div key={audienceId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-white">{segment?.name} — {entry?.data.name}</h4>
                    <InfoPopover title="Audience card" description="Tweak offer and channel weightings for this audience." placement="left" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                      <span className="flex items-center justify-between">
                        <span>Monthly price (${currentOffer.monthlyPrice})</span>
                        <InfoPopover title="Monthly price" description="Drag to set the customer-facing price point." placement="left" />
                      </span>
                      <input
                        type="range"
                        min={40}
                        max={90}
                        value={currentOffer.monthlyPrice}
                        onChange={(event) => handleOfferChange(audienceId, { monthlyPrice: Number(event.target.value) })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                      <span className="flex items-center justify-between">
                        <span>Promo months ({currentOffer.promoMonths})</span>
                        <InfoPopover title="Promo months" description="Number of months the promotional rate applies." placement="left" />
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={12}
                        value={currentOffer.promoMonths}
                        onChange={(event) => handleOfferChange(audienceId, { promoMonths: Number(event.target.value) })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                      <span className="flex items-center justify-between">
                        <span>Promo value (${currentOffer.promoValue})</span>
                        <InfoPopover title="Promo value" description="Adjust incentive depth applied during the promo window." placement="left" />
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={currentOffer.promoValue}
                        onChange={(event) => handleOfferChange(audienceId, { promoValue: Number(event.target.value) })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                      <span className="flex items-center justify-between">
                        <span>Device subsidy (${currentOffer.deviceSubsidy})</span>
                        <InfoPopover title="Device subsidy" description="Controls the equipment incentive amortized in the sim." placement="left" />
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={400}
                        step={20}
                        value={currentOffer.deviceSubsidy}
                        onChange={(event) => handleOfferChange(audienceId, { deviceSubsidy: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                      <span>Channel allocation</span>
                      <InfoPopover title="Channel allocation" description="Drag sliders to rebalance spend across touchpoints." placement="left" />
                    </div>
                    {channels.map((channel) => (
                      <div key={channel.id} className="flex items-center gap-3 text-xs text-slate-300">
                        <span className="w-24 text-slate-400">{channel.name}</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={mix[channel.id] ?? 0}
                          onChange={(event) => handleChannelChange(audienceId, channel.id, Number(event.target.value))}
                        />
                        <span className="w-10 text-right">{Math.round((mix[channel.id] ?? 0) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card flex flex-col gap-4 border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Scenario comparison</h3>
              <InfoPopover title="Scenario comparison" description="Save variations and compare outcomes." />
            </div>
            <button
              onClick={saveScenario}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-600"
            >
              Save Scenario
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-400">Scenario</span>
            <span className="text-xs uppercase tracking-wide text-slate-400">Payback</span>
            <span className="text-xs uppercase tracking-wide text-slate-400">12-mo GM</span>
            <span className="text-xs uppercase tracking-wide text-slate-400">Net adds</span>
            {savedScenarios.map((scenario) => (
              <React.Fragment key={scenario.id}>
                <span className="font-semibold text-white">{scenario.label}</span>
                <span>{typeof scenario.payback === 'number' ? `${scenario.payback} mo` : scenario.payback}</span>
                <span>${scenario.gm12.toLocaleString()}</span>
                <span>{scenario.netAdds.toLocaleString()}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
        {winning ? (
          <div className="card flex items-center justify-between border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-wide">Winning play</p>
                <InfoPopover title="Winning play" description="Snapshot of the scenario delivering the fastest payback." />
              </div>
              <p className="text-lg font-semibold text-white">{winning.label}</p>
              <p>
                {typeof winning.payback === 'number' ? `${winning.payback} mo` : winning.payback} payback • ${winning.gm12.toLocaleString()} GM • {(winning.conversion * 100).toFixed(1)}% conversion
              </p>
            </div>
            <button className="rounded-full border border-emerald-500 bg-slate-900 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20">
              Set as Recommended Plan
            </button>
          </div>
        ) : null}
      </section>
      <aside className="card flex h-full flex-col gap-4 border border-slate-800 p-4">
        <header className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-400">AI narrative & insights</p>
            <h3 className="text-lg font-semibold text-white">Here’s how to optimize your campaign.</h3>
          </div>
          <Info
            title="AI narrative"
            body={(
              <>
                <p><strong>How it is used:</strong> Digest coaching notes that summarize the best moves to reach guardrails.</p>
                <p><strong>What it means:</strong> Insights combine synthetic telemetry, channel heuristics, and offer economics.</p>
              </>
            )}
          />
        </header>
        {simResults ? (
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Increase Search +5% to approach ≤ {typeof simResults.blended.paybackMonths === 'number' ? simResults.blended.paybackMonths - 1 : 8} mo payback.</li>
            <li>Lower promo depth by $5 to lift margin {Math.round(simResults.blended.marginPct * 0.1)} bps.</li>
            <li>Shift 3% from Retail to Email to boost reach efficiently.</li>
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Run a simulation to unlock insights.</p>
        )}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-emerald-200">
          Confidence: {simResults ? 'High — rich digital signals' : 'Awaiting simulation'}
        </div>
        <button
          type="button"
          className={`w-full rounded-full border px-4 py-2 text-sm font-semibold transition ${
            launchReady
              ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
              : 'border-slate-700 bg-slate-900/60 text-slate-500'
          }`}
          onClick={() => setLaunchOpen(true)}
          disabled={!launchReady}
        >
          Launch to Execution Hub
        </button>
        <details className="text-xs text-slate-400">
          <summary className="flex cursor-pointer items-center gap-2 text-emerald-300">
            Supporting data
            <InfoPopover title="Supporting data" description="Lists the synthetic sources informing this view." />
          </summary>
          <p className="mt-2">Synth Cohort Econ / Channel Benchmarks / Offer Lab</p>
        </details>
      </aside>
      <div className="col-span-3">
        <SelectionTray
          title="Campaign summary"
          items={campaign.audienceIds.map((id) => {
            const entry = microMap.get(id);
            const segment = entry ? segments.find((seg) => seg.id === entry.parentId) : undefined;
            return {
              id,
              label: segment ? `${segment.name} — ${entry?.data.name}` : id,
              subtitle: entry ? `${(entry.data.sizeShare * 100).toFixed(1)}% of cohort` : ''
            };
          })}
          metrics={simResults ? [
            { label: 'Payback', value: typeof simResults.blended.paybackMonths === 'number' ? `${simResults.blended.paybackMonths} mo` : simResults.blended.paybackMonths },
            { label: '12-mo GM', value: `$${simResults.blended.gm12m.toLocaleString()}` },
            { label: 'Net adds', value: simResults.blended.netAdds.toLocaleString() }
          ] : [
            { label: 'Payback', value: '–' },
            { label: '12-mo GM', value: '–' },
            { label: 'Net adds', value: '–' }
          ]}
          ctaLabel="Export Summary (PDF)"
          onCta={exportSummary}
          disabled={!simResults}
        />
      </div>
      {launchOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-emerald-500/40 bg-slate-950/95 p-6 shadow-emerald-500/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Launch to Execution Hub</h3>
                <p className="text-sm text-slate-300">Confirm the cohorts, mix, and guardrails you are sending into activation.</p>
              </div>
              <button
                type="button"
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={() => setLaunchOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm text-slate-200">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Cohorts</p>
                <ul className="mt-1 space-y-1">
                  {aggregatedCohorts.map((cohort) => (
                    <li key={cohort.id} className="flex items-center justify-between gap-3">
                      <span>{cohort.name}</span>
                      <span className="text-xs text-slate-400">{cohort.size.toLocaleString()} ppl</span>
                    </li>
                  ))}
                  {aggregatedCohorts.length === 0 ? <li>No cohorts selected.</li> : null}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Channel mix</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {channelKeyList.map((key) => (
                    <span key={key} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                      <span>{key}</span>
                      <span>{Math.round((aggregatedChannels[key] ?? 0) * 100)}%</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Offer snapshot</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">Price ${aggregatedOffer.price.toFixed(2)}</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">Promo {aggregatedOffer.promoMonths} mo / ${aggregatedOffer.promoValue}</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">Device subsidy ${aggregatedOffer.deviceSubsidy}</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">Budget ${campaign.budgetTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                Guardrails: CAC ≤ {campaign.guardrails.cacCeiling ? `$${campaign.guardrails.cacCeiling.toLocaleString()}` : '—'} • Payback target {campaign.guardrails.paybackTarget ? `${campaign.guardrails.paybackTarget} mo` : '—'}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
                onClick={() => setLaunchOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  launchReady
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                    : 'border-slate-700 bg-slate-900/60 text-slate-500'
                }`}
                onClick={confirmLaunch}
                disabled={!launchReady}
              >
                Launch campaign
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CampaignDesigner;
