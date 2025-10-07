import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { useAppStore, ChannelKey, TelemetryPoint } from '../store/AppStore';
import Info from '../components/Info';
import Section from '../components/Section';
import MiniBadge from '../components/MiniBadge';
import TrendChip from '../components/TrendChip';
import { useToast } from '../components/ToastProvider';

const channelKeys: ChannelKey[] = ['Search', 'Social', 'Email', 'Retail', 'Field'];

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const averageSeries = (streams: TelemetryPoint[][]) => {
  if (streams.length === 0) return [] as TelemetryPoint[];
  const minLength = Math.min(...streams.map((stream) => stream.length));
  const trimmed = streams.map((stream) => stream.slice(stream.length - minLength));
  return trimmed[0].map((_, index) => {
    const samples = trimmed.map((stream) => stream[index]);
    const base = samples[0];
    const aggregate = samples.reduce(
      (acc, point) => {
        acc.cvr += point.cvr;
        acc.arpuDelta += point.arpuDelta;
        acc.netAdds += point.netAdds;
        acc.churnDelta += point.churnDelta;
        return acc;
      },
      { cvr: 0, arpuDelta: 0, netAdds: 0, churnDelta: 0 }
    );
    const count = samples.length;
    return {
      t: base.t,
      cvr: Number((aggregate.cvr / count).toFixed(2)),
      arpuDelta: Number((aggregate.arpuDelta / count).toFixed(2)),
      netAdds: Math.round(aggregate.netAdds / count),
      churnDelta: Number((aggregate.churnDelta / count).toFixed(2))
    };
  });
};

const MonitoringDashboard: React.FC = () => {
  const { campaigns, monitoring } = useAppStore();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const focusCampaignId = (location.state as { focusCampaignId?: string } | null)?.focusCampaignId;
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<'all' | string>(focusCampaignId ?? 'all');
  const [range, setRange] = React.useState<30 | 60 | 90>(30);
  const [insights, setInsights] = React.useState<string[]>([
    'Email is outperforming Retail on CVR for switch-prone families.',
    'Social retargeting is boosting ARPU for urban streamers.',
    'Field teams are driving higher NPS lifts in fiber launch DMAs.'
  ]);

  React.useEffect(() => {
    if (focusCampaignId) {
      setSelectedCampaignId(focusCampaignId);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const pool = [
      'Email is outperforming Retail on CVR for value seekers.',
      'Search + Social pairing is lifting net adds in high-churn DMAs.',
      'Promo months beyond 4 slow payback but raise ARPU in premium tiers.',
      'Self-serve cohorts react fastest to price drops under $5.',
      'Field activations improve NPS when bundled with device upgrades.'
    ];
    const interval = window.setInterval(() => {
      setInsights((prev) => {
        const next = [...prev];
        const idea = pool[Math.floor(Math.random() * pool.length)];
        next.shift();
        next.push(idea);
        return next;
      });
    }, 12_000);
    return () => window.clearInterval(interval);
  }, []);

  const threshold = Date.now() - range * 24 * 60 * 60 * 1000;
  const runningCampaigns = campaigns.filter((campaign) => campaign.status === 'Running');

  const getStream = (campaignId: string) => (monitoring.streams[campaignId] ?? []).filter((point) => point.t >= threshold);

  const selectedStreams =
    selectedCampaignId === 'all'
      ? averageSeries(runningCampaigns.map((campaign) => getStream(campaign.id)))
      : getStream(selectedCampaignId);

  const metricSparklines = {
    cvr: selectedStreams.map((point) => ({ t: formatTime(point.t), value: point.cvr })),
    arpu: selectedStreams.map((point) => ({ t: formatTime(point.t), value: point.arpuDelta })),
    net: selectedStreams.map((point) => ({ t: formatTime(point.t), value: point.netAdds })),
    churn: selectedStreams.map((point) => ({ t: formatTime(point.t), value: point.churnDelta }))
  };

  const activeCampaigns = runningCampaigns.length;
  const averageCvr = runningCampaigns.length
    ? runningCampaigns.reduce((sum, campaign) => sum + campaign.kpis.cvr, 0) / runningCampaigns.length
    : 0;
  const averageArpu = runningCampaigns.length
    ? runningCampaigns.reduce((sum, campaign) => sum + campaign.kpis.arpuDelta, 0) / runningCampaigns.length
    : 0;
  const totalNetAdds = runningCampaigns.reduce((sum, campaign) => sum + campaign.kpis.netAdds, 0);
  const averageChurn = selectedStreams.length
    ? selectedStreams[selectedStreams.length - 1].churnDelta
    : 0;

  const performanceSeries = selectedStreams.map((point) => ({
    time: formatTime(point.t),
    cvr: point.cvr,
    arpu: point.arpuDelta,
    netAdds: point.netAdds
  }));

  const channelEffectiveness = selectedStreams.map((point) => {
    const baseCampaigns = selectedCampaignId === 'all'
      ? runningCampaigns
      : campaigns.filter((campaign) => campaign.id === selectedCampaignId);
    const entry: Record<string, number | string> = { time: formatTime(point.t) };
    baseCampaigns.forEach((campaign) => {
      channelKeys.forEach((key) => {
        const share = campaign.channels[key] ?? 0;
        const contribution = point.cvr * share;
        entry[key] = (entry[key] as number | undefined ?? 0) + Number(contribution.toFixed(2));
      });
    });
    return entry;
  });

  const cohortTotals = new Map<string, { name: string; cvr: number; arpu: number; count: number }>();
  runningCampaigns.forEach((campaign) => {
    campaign.cohorts.forEach((cohort) => {
      const key = cohort.id;
      const record = cohortTotals.get(key) ?? { name: cohort.name, cvr: 0, arpu: 0, count: 0 };
      record.cvr += campaign.kpis.cvr;
      record.arpu += campaign.kpis.arpuDelta;
      record.count += 1;
      cohortTotals.set(key, record);
    });
  });
  const cohortCompare = Array.from(cohortTotals.values())
    .map((entry) => ({
      name: entry.name,
      cvr: Number((entry.cvr / entry.count).toFixed(2)),
      arpu: Number((entry.arpu / entry.count).toFixed(2))
    }))
    .slice(0, 5);

  const leverSuggestions = runningCampaigns.slice(0, 3).map((campaign) => {
    const suggestion = Math.random() > 0.5 ? 'Search' : 'Email';
    const delta = suggestion === 'Search' ? 0.04 : 0.03;
    const recommendation = `Increase ${suggestion} +${Math.round(delta * 100)}% for ${campaign.name}`;
    const expectedLift = (0.5 + Math.random() * 0.6).toFixed(1);
    const confidence = Math.random() > 0.6 ? 'High' : 'Medium';
    return {
      campaign,
      recommendation,
      expectedLift,
      confidence,
      deltas: {
        channels: {
          [suggestion]: (campaign.channels[suggestion as ChannelKey] ?? 0) + delta
        }
      }
    };
  });

  const handleExport = () => {
    const rows = performanceSeries.map((row) => `${row.time},${row.cvr},${row.arpu},${row.netAdds}`);
    const csv = ['time,cvr,arpu_delta,net_adds', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monitoring-export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    pushToast({ description: 'Monitoring export ready.', variant: 'success' });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Monitoring dashboard</h2>
          <p className="text-sm text-slate-400">One-glance health of live acquisition plays.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200"
            value={selectedCampaignId}
            onChange={(event) => setSelectedCampaignId(event.target.value as typeof selectedCampaignId)}
          >
            <option value="all">All campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200"
            value={range}
            onChange={(event) => setRange(Number(event.target.value) as typeof range)}
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-400/60 hover:text-emerald-200"
            onClick={handleExport}
          >
            Export CSV
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        {[
          {
            label: 'Active campaigns',
            value: activeCampaigns,
            spark: metricSparklines.cvr,
            info: (
              <>
                <p><strong>How it is used:</strong> Gauge how many plays are live at any moment.</p>
                <p><strong>What it means:</strong> Running status combines CRM launch flags and synthetic control states.</p>
              </>
            )
          },
          {
            label: 'Average CVR',
            value: `${averageCvr.toFixed(2)}%`,
            spark: metricSparklines.cvr,
            info: (
              <>
                <p><strong>How it is used:</strong> Track blended conversion momentum across the active portfolio.</p>
                <p><strong>What it means:</strong> Calculated from modeled net adds divided by exposed volume.</p>
              </>
            )
          },
          {
            label: 'ARPU Δ (12-mo)',
            value: `$${averageArpu.toFixed(2)}`,
            spark: metricSparklines.arpu,
            info: (
              <>
                <p><strong>How it is used:</strong> Monitor value lift generated by your campaigns.</p>
                <p><strong>What it means:</strong> Synthetic blend of upsell attach and usage uplift vs. baseline cohorts.</p>
              </>
            )
          },
          {
            label: 'Net adds (rolling)',
            value: totalNetAdds.toLocaleString('en-US'),
            spark: metricSparklines.net,
            info: (
              <>
                <p><strong>How it is used:</strong> Gauge subscriber growth potential fed to Finance and Sales.</p>
                <p><strong>What it means:</strong> Derived from modeled reach * take-rate across all active cohorts.</p>
              </>
            )
          },
          {
            label: 'Churn Δ (rolling)',
            value: `${averageChurn.toFixed(2)} pts`,
            spark: metricSparklines.churn,
            info: (
              <>
                <p><strong>How it is used:</strong> Keep a pulse on retention risk or lift.</p>
                <p><strong>What it means:</strong> Based on synthetic churn propensity shifts from telemetry and sentiment.</p>
              </>
            )
          }
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{tile.label}</p>
                <p className="mt-1 text-xl font-semibold text-white">{tile.value}</p>
              </div>
              <Info title={tile.label} body={tile.info} />
            </div>
            <div className="mt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tile.spark}>
                  <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Campaign performance over time"
          info={{
            title: 'Performance over time',
            body: (
              <>
                <p><strong>How it is used:</strong> Inspect trend lines for conversion, value, and net adds to catch inflections quickly.</p>
                <p><strong>What it means:</strong> Cadence aligns with synthetic telemetry updates every six minutes for live plays.</p>
              </>
            )
          }}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceSeries}>
                <XAxis dataKey="time" stroke="#94a3b8" hide />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="cvr" name="CVR %" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="arpu" name="ARPU Δ" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="netAdds" name="Net adds" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section
          title="Channel effectiveness"
          info={{
            title: 'Channel effectiveness',
            body: (
              <>
                <p><strong>How it is used:</strong> Diagnose which channels are delivering conversions at scale right now.</p>
                <p><strong>What it means:</strong> Effectiveness is modeled conversions weighted by the live mix across campaigns.</p>
              </>
            )
          }}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={channelEffectiveness}>
                <XAxis dataKey="time" stroke="#94a3b8" hide />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: 12 }} />
                <Legend />
                {channelKeys.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={['#34d399', '#60a5fa', '#f97316', '#a78bfa', '#f472b6'][index]}
                    fill={['#34d399', '#60a5fa', '#f97316', '#a78bfa', '#f472b6'][index]}
                    fillOpacity={0.35}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Cohort compare"
          info={{
            title: 'Cohort compare',
            body: (
              <>
                <p><strong>How it is used:</strong> Compare conversion and value lift across the top cohorts you activated.</p>
                <p><strong>What it means:</strong> Cohorts trace back to Segment Studio micro-segments aggregated for this demo.</p>
              </>
            )
          }}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cohortCompare}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#020617', borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="cvr" name="CVR %" fill="#34d399" radius={[8, 8, 0, 0]} />
                <Bar dataKey="arpu" name="ARPU Δ" fill="#60a5fa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section
          title="Best levers right now"
          info={{
            title: 'Best levers',
            body: (
              <>
                <p><strong>How it is used:</strong> Act on quick wins surfaced by telemetry heuristics.</p>
                <p><strong>What it means:</strong> Recommendations simulate impact based on current mix and offer sensitivity.</p>
              </>
            )
          }}
        >
          <div className="space-y-4">
            {leverSuggestions.map((entry) => (
              <div key={entry.campaign.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-100">{entry.recommendation}</p>
                    <p className="text-xs text-slate-400">Confidence: {entry.confidence}</p>
                  </div>
                  <TrendChip value={Number(entry.expectedLift)} suffix="%" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <MiniBadge tone="emerald">{entry.campaign.name}</MiniBadge>
                  <button
                    type="button"
                    className="rounded-full border border-emerald-500/60 px-3 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
                    onClick={() => {
                      navigate('/execution-hub', {
                        state: {
                          selectedCampaignId: entry.campaign.id,
                          pendingDeltas: entry.deltas
                        }
                      });
                      pushToast({ description: 'Lever sent to Execution Hub.', variant: 'success' });
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section
        title="What the system is learning"
        info={{
          title: 'Learning loop',
          body: (
            <>
              <p><strong>How it is used:</strong> Socialise takeaways with leadership and adjacent teams.</p>
              <p><strong>What it means:</strong> Illustrative blend of CRM, activation, and synthetic market signals.</p>
            </>
          )
        }}
      >
        <ul className="space-y-2 text-sm text-slate-200">
          {insights.map((item, index) => (
            <li key={`${item}-${index}`} className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3">
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

export default MonitoringDashboard;

