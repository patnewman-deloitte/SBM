import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import KpiTile from '../../components/KpiTile';
import SelectionTray from '../../components/SelectionTray';
import { simulateCampaign, AudienceSimInput } from '../../sim/tinySim';
import { MicroSegment, useGlobalStore } from '../../store/global';

const CampaignDesigner: React.FC = () => {
  const assumptions = useGlobalStore((s) => s.assumptions);
  const channels = useGlobalStore((s) => s.channels);
  const offers = useGlobalStore((s) => s.offers);
  const segments = useGlobalStore((s) => s.segments);
  const microSegmentsByParent = useGlobalStore((s) => s.microSegmentsByParent);
  const campaign = useGlobalStore((s) => s.campaign);
  const updateCampaign = useGlobalStore((s) => s.updateCampaign);

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

  return (
    <div className="grid grid-cols-[280px_1fr_300px] gap-6">
      <aside className="flex flex-col gap-4">
        <div className="card border border-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-400">How to use</p>
          <p className="mt-2 text-sm text-slate-300">
            Design and simulate offers, bundles, and channel mixes for your selected sub-segments. Adjust inputs to see conversion, CAC payback, and margin update in real time.
          </p>
        </div>
        <div className="card border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-white">Audiences</h3>
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
          <p className="mt-3 text-[11px] uppercase tracking-wide text-emerald-400">Primary data sources (est.): Synth Cohort Econ / Campaign Designer Logs</p>
        </div>
        <div className="card border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-white">Budget & guardrails</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">Total budget</label>
              <input
                type="number"
                value={campaign.budgetTotal}
                onChange={(event) => updateCampaign({ budgetTotal: Number(event.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">CAC ceiling</label>
                <input
                  type="number"
                  value={campaign.guardrails.cacCeiling ?? ''}
                  onChange={(event) => updateCampaign({ guardrails: { ...campaign.guardrails, cacCeiling: Number(event.target.value) } })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Payback target</label>
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
            <summary className="cursor-pointer text-xs uppercase tracking-wide text-emerald-400">Advanced assumptions</summary>
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
      <section className="flex flex-col gap-6">
        {simResults ? (
          <div className="grid grid-cols-5 gap-3">
            <KpiTile
              label="CAC Payback (mo)"
              value={typeof simResults.blended.paybackMonths === 'number' ? simResults.blended.paybackMonths : simResults.blended.paybackMonths}
              info={{
                title: 'CAC Payback (months)',
                description: 'Months until fully-loaded CAC is covered by cumulative contribution.',
                primarySource: 'Synth Cohort Econ'
              }}
            />
            <KpiTile
              label="12-mo Incremental GM"
              value={`$${simResults.blended.gm12m.toLocaleString()}`}
              info={{
                title: '12-Month Incremental Gross Margin',
                description: 'Gross margin over first 12 months after servicing costs and device amortization.',
                primarySource: 'Synth Cohort Econ'
              }}
            />
            <KpiTile label="Conversion %" value={`${(simResults.blended.conversionRate * 100).toFixed(1)}%`} />
            <KpiTile label="Net adds" value={simResults.blended.netAdds.toLocaleString()} />
            <KpiTile label="Margin %" value={`${simResults.blended.marginPct}%`} />
          </div>
        ) : (
          <div className="card border border-slate-800 p-6 text-center text-sm text-slate-300">Add sub-segments to simulate.</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="card flex flex-col gap-4 border border-slate-800 p-4">
            <h3 className="text-lg font-semibold text-white">Performance dashboard</h3>
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
                  <p className="text-xs uppercase tracking-wide text-slate-500">CAC</p>
                  <p className="text-lg font-semibold text-white">${simResults.blended.breakdown.cac.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Promo cost</p>
                  <p className="text-lg font-semibold text-white">${simResults.blended.breakdown.promoCost.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Device subsidy</p>
                  <p className="text-lg font-semibold text-white">${simResults.blended.breakdown.deviceSubsidy.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Execution cost</p>
                  <p className="text-lg font-semibold text-white">${simResults.blended.breakdown.executionCost.toLocaleString()}</p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="card flex flex-col gap-4 border border-slate-800 p-4">
            <h3 className="text-lg font-semibold text-white">Offer & channel designer</h3>
            {campaign.audienceIds.map((audienceId) => {
              const entry = microMap.get(audienceId);
              const segment = entry ? segments.find((seg) => seg.id === entry.parentId) : undefined;
              const currentOffer = campaign.offerByAudience[audienceId] ?? offers[0];
              const mix = campaign.channelMixByAudience[audienceId] ?? {};
              return (
                <div key={audienceId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                  <h4 className="text-base font-semibold text-white">{segment?.name} — {entry?.data.name}</h4>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                      Monthly price (${currentOffer.monthlyPrice})
                      <input
                        type="range"
                        min={40}
                        max={90}
                        value={currentOffer.monthlyPrice}
                        onChange={(event) => handleOfferChange(audienceId, { monthlyPrice: Number(event.target.value) })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                      Promo months ({currentOffer.promoMonths})
                      <input
                        type="range"
                        min={0}
                        max={12}
                        value={currentOffer.promoMonths}
                        onChange={(event) => handleOfferChange(audienceId, { promoMonths: Number(event.target.value) })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                      Promo value (${currentOffer.promoValue})
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={currentOffer.promoValue}
                        onChange={(event) => handleOfferChange(audienceId, { promoValue: Number(event.target.value) })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                      Device subsidy (${currentOffer.deviceSubsidy})
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
                    <p className="text-xs uppercase tracking-wide text-slate-400">Channel allocation</p>
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
            <h3 className="text-lg font-semibold text-white">Scenario comparison</h3>
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
            <div>
              <p className="text-xs uppercase tracking-wide">Winning play</p>
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
        <header>
          <p className="text-xs uppercase tracking-wide text-emerald-400">AI narrative & insights</p>
          <h3 className="text-lg font-semibold text-white">Here’s how to optimize your campaign.</h3>
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
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer text-emerald-300">Supporting data</summary>
          <p className="mt-2">Primary data sources (est.): Synth Cohort Econ / Channel Benchmarks / Offer Lab</p>
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
          ctaLabel="Export JSON"
          onCta={() => {
            const payload = JSON.stringify({ campaign, results: simResults }, null, 2);
            const blob = new Blob([payload], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'campaign-plan.json';
            link.click();
            URL.revokeObjectURL(url);
          }}
          disabled={!simResults}
        />
      </div>
    </div>
  );
};

export default CampaignDesigner;
