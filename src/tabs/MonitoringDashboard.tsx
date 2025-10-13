import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mode, useAppState } from '../appState';
import { metricsAPI } from '../mocks';

type MetricPoint = { t: number; value: number };
type MetricBundle = { cvr: MetricPoint[]; arpu: MetricPoint[]; netAdds: MetricPoint[] };

type ChannelKey = 'search' | 'social' | 'email' | 'retail' | 'field';
const channelOrder: ChannelKey[] = ['search', 'social', 'email', 'retail', 'field'];

type SparkKpi = {
  id: string;
  label: string;
  value: string;
  helper: string;
  trend: number[];
};

const mixPresets: Record<Mode, Record<ChannelKey, number>> = {
  acquire: { search: 32, social: 18, email: 24, retail: 14, field: 12 },
  grow: { search: 18, social: 24, email: 26, retail: 18, field: 14 },
  retain: { search: 14, social: 16, email: 32, retail: 12, field: 26 },
};

const learningsByMode: Record<Mode, string[]> = {
  acquire: [
    'Search share correlated with higher CVR for fiber-ready metros.',
    'Retail attach climbs when field teams seed local events.',
    'Email drives higher ARPU when dynamic bundles are present.',
  ],
  grow: [
    'Upsell journeys respond to limited-time loyalty perks.',
    'Social carousel creative lifts ARPU by 0.8 when refreshed weekly.',
    'Retail add-ons spike post-service touch with proactive consults.',
  ],
  retain: [
    'Save-rate improves 1.5 pts when SMS is sequenced before IVR.',
    'Service credits land best when paired with proactive care outreach.',
    'Field visits stabilize churn for high-value households within 10 days.',
  ],
};

const leverByMode: Record<Mode, { channel: ChannelKey; delta: number; recommendation: string; confidence: 'Low' | 'Medium' | 'High'; cohorts: string[] }> = {
  acquire: {
    channel: 'email',
    delta: 3,
    recommendation: 'Increase Email +3% for Premium Network Loyalists — Family Coverage Maximizers.',
    confidence: 'Medium',
    cohorts: ['Premium Network Loyalists', 'Family Coverage Maximizers'],
  },
  grow: {
    channel: 'social',
    delta: 2,
    recommendation: 'Shift Social +2% toward Hybrid Fiber Enthusiasts — Streaming Bundlers.',
    confidence: 'High',
    cohorts: ['Hybrid Fiber Enthusiasts', 'Streaming Bundlers'],
  },
  retain: {
    channel: 'field',
    delta: 4,
    recommendation: 'Allocate Field +4% for Premium Network Loyalists — Family Coverage Maximizers.',
    confidence: 'Medium',
    cohorts: ['Premium Network Loyalists', 'Family Coverage Maximizers'],
  },
};

const channelPalette: Record<ChannelKey, string> = {
  search: 'rgba(16,185,129,0.5)',
  social: 'rgba(14,165,233,0.5)',
  email: 'rgba(129,140,248,0.5)',
  retail: 'rgba(249,115,22,0.45)',
  field: 'rgba(244,114,182,0.45)',
};

const channelStroke: Record<ChannelKey, string> = {
  search: 'rgba(16,185,129,0.9)',
  social: 'rgba(14,165,233,0.9)',
  email: 'rgba(129,140,248,0.9)',
  retail: 'rgba(249,115,22,0.9)',
  field: 'rgba(244,114,182,0.9)',
};

const buildSpark = (label: string, helper: string, formatter: (values: number[]) => string) =>
  (values: number[]): SparkKpi => ({ id: label, label, helper, value: formatter(values), trend: values });

const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  if (!values.length) {
    return <div className="mt-2 h-10 rounded bg-slate-900/70" />;
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
    <svg viewBox="0 0 100 100" className="mt-2 h-10 w-full text-emerald-400/80" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const MultiLineChart: React.FC<{ metrics: MetricBundle | null }> = ({ metrics }) => {
  if (!metrics) {
    return <div className="h-64 rounded-lg border border-slate-800 bg-slate-950/60" />;
  }
  const length = Math.min(metrics.cvr.length, metrics.arpu.length, metrics.netAdds.length);
  if (!length) {
    return <div className="h-64 rounded-lg border border-slate-800 bg-slate-950/60" />;
  }
  const cvrValues = metrics.cvr.slice(-length).map((point) => point.value);
  const arpuValues = metrics.arpu.slice(-length).map((point) => point.value);
  const netValues = metrics.netAdds.slice(-length).map((point) => point.value / 1000);
  const allValues = [...cvrValues, ...arpuValues, ...netValues];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const toPoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x = (index / (values.length - 1 || 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(' ');
  return (
    <svg viewBox="0 0 100 100" className="h-64 w-full" preserveAspectRatio="none">
      <polyline points={toPoints(cvrValues)} fill="none" stroke="rgba(16,185,129,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={toPoints(arpuValues)} fill="none" stroke="rgba(59,130,246,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={toPoints(netValues)} fill="none" stroke="rgba(244,114,182,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const StackedArea: React.FC<{ values: Record<ChannelKey, number[]> }> = ({ values }) => {
  const keys = channelOrder;
  const length = values[keys[0]]?.length ?? 0;
  if (!length) {
    return <div className="h-64 rounded-lg border border-slate-800 bg-slate-950/60" />;
  }
  const totals = new Array(length).fill(0).map((_, index) => {
    const total = keys.reduce((sum, key) => sum + (values[key]?.[index] ?? 0), 0);
    return total || 1;
  });
  let cumulative = new Array(length).fill(0);
  return (
    <svg viewBox="0 0 100 100" className="h-64 w-full" preserveAspectRatio="none">
      {keys.map((key) => {
        const series = values[key] ?? new Array(length).fill(0);
        const next = series.map((value, index) => cumulative[index] + value);
        const topPath = next
          .map((value, index) => {
            const x = (index / (length - 1 || 1)) * 100;
            const y = 100 - (value / totals[index]) * 100;
            return `${x},${y}`;
          })
          .join(' L ');
        const bottomPath = cumulative
          .map((value, index) => {
            const x = (index / (length - 1 || 1)) * 100;
            const y = 100 - (value / totals[index]) * 100;
            return `${x},${y}`;
          })
          .reverse()
          .join(' L ');
        const d = `M ${topPath} L ${bottomPath} Z`;
        cumulative = next;
        return (
          <path key={key} d={d} fill={channelPalette[key]} stroke={channelStroke[key]} strokeWidth={0.6} opacity={0.85} />
        );
      })}
    </svg>
  );
};

const GroupedBars: React.FC<{ data: Array<{ cohort: string; metrics: { label: string; value: number }[] }> }> = ({ data }) => {
  const metricsCount = data[0]?.metrics.length ?? 0;
  if (!metricsCount) {
    return <div className="h-64 rounded-lg border border-slate-800 bg-slate-950/60" />;
  }
  const max = Math.max(
    ...data.flatMap((cohort) => cohort.metrics.map((metric) => metric.value))
  );
  const barWidth = 18;
  const gap = 12;
  const groupWidth = metricsCount * barWidth + (metricsCount - 1) * 8;
  return (
    <svg viewBox={`0 0 ${data.length * (groupWidth + gap)} 120`} className="h-64 w-full" preserveAspectRatio="none">
      {data.map((group, groupIndex) =>
        group.metrics.map((metric, metricIndex) => {
          const x = groupIndex * (groupWidth + gap) + metricIndex * (barWidth + 8);
          const height = (metric.value / (max || 1)) * 90;
          return (
            <rect
              key={`${group.cohort}-${metric.label}`}
              x={x}
              y={100 - height}
              width={barWidth}
              height={height}
              rx={3}
              fill={metricIndex === 0 ? 'rgba(16,185,129,0.8)' : 'rgba(59,130,246,0.8)'}
            />
          );
        })
      )}
    </svg>
  );
};

const buildKpis = (mode: Mode, metrics: MetricBundle | null): SparkKpi[] => {
  if (!metrics) {
    return [];
  }
  const cvrSeries = metrics.cvr.map((point) => point.value);
  const arpuSeries = metrics.arpu.map((point) => point.value);
  const netSeries = metrics.netAdds.map((point) => point.value);
  const churnSeries = cvrSeries.map((value, index) => Math.max(0.2, 1.6 - value * (index + 1) * 0.05));
  const active = buildSpark('Active campaigns', 'Live campaigns responding to plan', (values) => `${Math.max(1, Math.round(4 + values.length / 3))}`)(cvrSeries);
  const avgCvr = buildSpark('Average CVR', 'Last 30 days', (values) => `${(values.reduce((sum, value) => sum + value, 0) / (values.length || 1) * 100).toFixed(2)}%`)(cvrSeries);
  const arpu = buildSpark('ARPU Δ (12-mo)', 'Rolling ARPU lift', (values) => `$${(
    values.reduce((sum, value) => sum + value, 0) / (values.length || 1)
  ).toFixed(2)}`)(arpuSeries);
  const netAdds = buildSpark('Net adds (rolling)', 'Last four weeks', (values) => `${
    Math.round(values.slice(-4).reduce((sum, value) => sum + value, 0)).toLocaleString()
  }`)(netSeries);
  const churnDelta = buildSpark('Churn Δ (rolling)', 'bps movement', (values) => `${(-values.slice(-4).reduce((sum, value) => sum + value, 0) / 400).toFixed(1)} pts`)(churnSeries);
  return [active, avgCvr, arpu, netAdds, churnDelta];
};

const MonitoringDashboard: React.FC = () => {
  const { mode, setStep } = useAppState();
  const navigate = useNavigate();
  const [metrics, setMetrics] = React.useState<MetricBundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [campaignFilter, setCampaignFilter] = React.useState('All campaigns');
  const [timeFilter, setTimeFilter] = React.useState('Last 30 days');

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    metricsAPI
      .get(mode)
      .then((bundle) => {
        if (!active) return;
        setMetrics(bundle);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setMetrics(null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode]);

  const kpis = React.useMemo(() => buildKpis(mode, metrics), [mode, metrics]);

  const areaSeries = React.useMemo(() => {
    if (!metrics) return null;
    const length = metrics.cvr.length || 8;
    return channelOrder.reduce<Record<ChannelKey, number[]>>((acc, key, index) => {
      const base = mixPresets[mode][key] / 100;
      acc[key] = new Array(length).fill(0).map((_, pointIndex) => base * (1 + Math.sin(pointIndex / (index + 2)) * 0.12));
      return acc;
    }, {} as Record<ChannelKey, number[]>);
  }, [metrics, mode]);

  const cohorts = React.useMemo(() => {
    const cvrSeries = metrics?.cvr ?? [];
    const arpuSeries = metrics?.arpu ?? [];
    const sliceCvr = cvrSeries.slice(-6);
    const sliceArpu = arpuSeries.slice(-6);
    const denomCvr = sliceCvr.length || 1;
    const denomArpu = sliceArpu.length || 1;
    const primaryCvr = (sliceCvr.reduce((sum, point) => sum + point.value, 0) / denomCvr) * 100;
    const secondaryCvr = (sliceCvr.reduce((sum, point) => sum + point.value * 0.9, 0) / denomCvr) * 100;
    const primaryArpu = sliceArpu.reduce((sum, point) => sum + point.value, 0) / denomArpu;
    const secondaryArpu = sliceArpu.reduce((sum, point) => sum + point.value * 1.1, 0) / denomArpu;
    return [
      {
        cohort: 'Premium Network Loyalists',
        metrics: [
          { label: 'CVR %', value: primaryCvr },
          { label: 'ARPU Δ', value: primaryArpu },
        ],
      },
      {
        cohort: 'Family Coverage Maximizers',
        metrics: [
          { label: 'CVR %', value: secondaryCvr },
          { label: 'ARPU Δ', value: secondaryArpu },
        ],
      },
    ];
  }, [metrics]);

  const lever = leverByMode[mode];
  const handleApply = () => {
    const preset = mixPresets[mode];
    const updated = { ...preset, [lever.channel]: Math.min(60, preset[lever.channel] + lever.delta) };
    navigate('/execution-hub', { state: { presetMix: updated } });
    setStep(4);
  };

  const exportCsv = () => {
    const rows = [
      ['metric', 'value'],
      ...kpis.map((item) => [item.label, item.value]),
    ];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'monitoring-dashboard.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Monitoring dashboard</h2>
            <p className="text-sm text-slate-300">One-glance health of live acquisition plays.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={campaignFilter}
              onChange={(event) => setCampaignFilter(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
            >
              <option>All campaigns</option>
              <option>Flagship bundles</option>
              <option>Fiber launch</option>
            </select>
            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
            >
              <option>Last 30 days</option>
              <option>Last 14 days</option>
              <option>Last 7 days</option>
            </select>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
            >
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <section>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">{kpi.label}</p>
              <p className="mt-2 text-xl font-semibold text-white">{kpi.value}</p>
              <p className="text-[11px] text-slate-500">{kpi.helper}</p>
              <Sparkline values={kpi.trend} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Campaign performance over time
              <span className="ml-2 text-slate-500" title="CVR %, ARPU Δ, Net adds">ℹ</span>
            </h3>
            <div className="flex gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />CVR %</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />ARPU Δ</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Net adds</span>
            </div>
          </div>
          <div className="mt-4">
            <MultiLineChart metrics={metrics} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Channel effectiveness
            <span className="ml-2 text-slate-500" title="Stacked area of allocation">ℹ</span>
          </h3>
          <div className="mt-4">
            {areaSeries ? <StackedArea values={areaSeries} /> : <div className="h-64 rounded-lg border border-slate-800 bg-slate-950/60" />}
          </div>
          <div className="mt-3 grid grid-cols-5 text-center text-[11px] text-slate-400">
            {channelOrder.map((key) => (
              <span key={key}>{key.toUpperCase()}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Cohort compare
            <span className="ml-2 text-slate-500" title="CVR % vs ARPU Δ">ℹ</span>
          </h3>
          <div className="mt-4">
            <GroupedBars data={cohorts} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Best levers right now</h3>
            <p className="mt-2 text-sm text-white">
              {lever.recommendation} <span className="ml-1 rounded-full border border-emerald-600 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">▲ +1%</span>
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">Confidence: {lever.confidence}</span>
              {lever.cohorts.map((chip) => (
                <span key={chip} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">{chip}</span>
              ))}
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Apply
            </button>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">What the system is learning</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
              {learningsByMode[mode].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-xs text-slate-500">Loading telemetry…</p>
      ) : null}
    </div>
  );
};

export default MonitoringDashboard;
