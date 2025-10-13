import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mode, useAppState } from '../appState';
import InfoIcon from '../components/InfoIcon';
import { metricsAPI } from '../mocks';
import { stepSeries, useTicker } from '../hooks/useLiveData';

type MetricPoint = { t: number; value: number };
type MetricBundle = { cvr: MetricPoint[]; arpu: MetricPoint[]; netAdds: MetricPoint[] };

type ChannelKey = 'search' | 'social' | 'email' | 'retail' | 'field';
const channelOrder: ChannelKey[] = ['search', 'social', 'email', 'retail', 'field'];

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

type KpiKey = 'activeCampaigns' | 'averageCvr' | 'arpuDelta' | 'netAdds' | 'churnDelta';

const KPI_CONFIG: Array<{ id: KpiKey; label: string; helper: string; format: 'int' | 'pct' | 'currency' | 'pts' }> = [
  { id: 'activeCampaigns', label: 'ACTIVE CAMPAIGNS', helper: 'Live this mode', format: 'int' },
  { id: 'averageCvr', label: 'AVERAGE CVR', helper: 'Across active plays', format: 'pct' },
  { id: 'arpuDelta', label: 'ARPU Δ (12-MO)', helper: 'Rolling lift', format: 'currency' },
  { id: 'netAdds', label: 'NET ADDS (ROLLING)', helper: '30-day adds', format: 'int' },
  { id: 'churnDelta', label: 'CHURN Δ (ROLLING)', helper: 'Basis points', format: 'pts' },
];

const KPI_SEEDS: Record<Mode, Record<KpiKey, number>> = {
  acquire: { activeCampaigns: 18, averageCvr: 0.041, arpuDelta: 7.4, netAdds: 2400, churnDelta: -0.8 },
  grow: { activeCampaigns: 15, averageCvr: 0.053, arpuDelta: 9.6, netAdds: 1850, churnDelta: -1.1 },
  retain: { activeCampaigns: 12, averageCvr: 0.033, arpuDelta: 5.1, netAdds: 1620, churnDelta: -1.6 },
};

const KPI_AMPLITUDES: Record<KpiKey, number> = {
  activeCampaigns: 0.04,
  averageCvr: 0.015,
  arpuDelta: 0.08,
  netAdds: 0.06,
  churnDelta: 0.1,
};

const KPI_DRIFTS: Record<KpiKey, number> = {
  activeCampaigns: 0.002,
  averageCvr: 0.0004,
  arpuDelta: 0.001,
  netAdds: 0.0026,
  churnDelta: 0.0008,
};

const CHURN_SIGN = -1;

const createInitialKpis = (mode: Mode): Record<KpiKey, number[]> => {
  const seeds = KPI_SEEDS[mode];
  return {
    activeCampaigns: Array.from({ length: 8 }, (_, index) =>
      Math.round(seeds.activeCampaigns * (1 + Math.sin(index / 2.5) * KPI_AMPLITUDES.activeCampaigns))
    ),
    averageCvr: Array.from({ length: 8 }, (_, index) =>
      Number((seeds.averageCvr * (1 + Math.sin(index / 2.2) * KPI_AMPLITUDES.averageCvr)).toFixed(4))
    ),
    arpuDelta: Array.from({ length: 8 }, (_, index) =>
      Number((seeds.arpuDelta * (1 + Math.sin(index / 3) * KPI_AMPLITUDES.arpuDelta)).toFixed(2))
    ),
    netAdds: Array.from({ length: 8 }, (_, index) =>
      Math.round(seeds.netAdds * (1 + Math.sin(index / 2.8) * KPI_AMPLITUDES.netAdds))
    ),
    churnDelta: Array.from({ length: 8 }, (_, index) =>
      Number((Math.abs(seeds.churnDelta) * (1 + Math.sin(index / 3.1) * KPI_AMPLITUDES.churnDelta)).toFixed(2))
    ),
  };
};

const createInitialChannels = (mode: Mode): Record<ChannelKey, number[]> =>
  channelOrder.reduce<Record<ChannelKey, number[]>>((acc, key, index) => {
    const base = mixPresets[mode][key];
    acc[key] = Array.from({ length: 12 }, (_, point) =>
      Number((base * (0.92 + Math.sin(point / (index + 2)) * 0.08)).toFixed(2))
    );
    return acc;
  }, {} as Record<ChannelKey, number[]>);

const formatKpiValue = (config: (typeof KPI_CONFIG)[number], value: number) => {
  const actual = config.id === 'churnDelta' ? value * CHURN_SIGN : value;
  if (config.format === 'int') return Math.round(actual).toLocaleString();
  if (config.format === 'pct') return `${(actual * 100).toFixed(2)}%`;
  if (config.format === 'currency') return `$${actual.toFixed(2)}`;
  return `${actual.toFixed(1)} pts`;
};

const formatDelta = (config: (typeof KPI_CONFIG)[number], diff: number) => {
  const actual = config.id === 'churnDelta' ? diff * CHURN_SIGN : diff;
  const symbol = actual >= 0 ? '▲' : '▼';
  if (config.format === 'int') return `${symbol} ${Math.abs(Math.round(actual)).toLocaleString()}`;
  if (config.format === 'pct') return `${symbol} ${(Math.abs(actual) * 100).toFixed(2)} pts`;
  if (config.format === 'currency') return `${symbol} $${Math.abs(actual).toFixed(2)}`;
  return `${symbol} ${Math.abs(actual).toFixed(1)} pts`;
};

const MonitoringDashboard: React.FC = () => {
  const { mode, setStep } = useAppState();
  const navigate = useNavigate();
  const [metrics, setMetrics] = React.useState<MetricBundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [campaignFilter, setCampaignFilter] = React.useState('All campaigns');
  const [timeFilter, setTimeFilter] = React.useState('Last 30 days');
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [period, setPeriod] = React.useState<'15s' | '1m' | '5m'>('15s');
  const [compare, setCompare] = React.useState<'prevPeriod' | 'prevPlan' | null>('prevPeriod');
  const [kpiSeries, setKpiSeries] = React.useState<Record<KpiKey, number[]>>(() => createInitialKpis(mode));
  const baselineRef = React.useRef<Record<KpiKey, number>>({ ...KPI_SEEDS[mode] });
  const [channelEffectiveness, setChannelEffectiveness] = React.useState<Record<ChannelKey, number[]>>(() =>
    createInitialChannels(mode)
  );
  const periodMs = React.useMemo(() => (period === '15s' ? 15000 : period === '1m' ? 60000 : 300000), [period]);
  const tick = useTicker(autoRefresh, periodMs);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setKpiSeries(createInitialKpis(mode));
    baselineRef.current = { ...KPI_SEEDS[mode] };
    setChannelEffectiveness(createInitialChannels(mode));
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

  React.useEffect(() => {
    if (!autoRefresh) return;
    setKpiSeries((prev) => {
      const next: Record<KpiKey, number[]> = { ...prev };
      KPI_CONFIG.forEach((config) => {
        const key = config.id;
        const updated = stepSeries(prev[key] ?? [], KPI_DRIFTS[key], 0.02);
        if (key === 'averageCvr') {
          next[key] = updated.map((value) => Number(Math.max(0.01, Math.min(0.2, value)).toFixed(4)));
        } else if (key === 'arpuDelta') {
          next[key] = updated.map((value) => Number(Math.max(1, Math.min(25, value)).toFixed(2)));
        } else if (key === 'netAdds') {
          next[key] = updated.map((value) => Math.max(0, Math.round(value)));
        } else if (key === 'churnDelta') {
          next[key] = updated.map((value) => Number(Math.max(0.1, Math.min(4, value)).toFixed(2)));
        } else {
          next[key] = updated.map((value) => Math.max(1, Math.round(value)));
        }
      });
      return next;
    });

    setMetrics((prev) => {
      if (!prev) return prev;
      const now = Date.now();
      const toPoints = (values: number[], seed: MetricPoint[]) =>
        values.map((value, index) => ({
          t: seed[index]?.t ?? now - (values.length - index) * 60000,
          value,
        }));
      const nextCvr = stepSeries(prev.cvr.map((point) => point.value), 0.0008, 0.01).map((value) =>
        Number(Math.max(0.02, Math.min(0.18, value)).toFixed(4))
      );
      const nextArpu = stepSeries(prev.arpu.map((point) => point.value), 0.001, 0.02).map((value) =>
        Number(Math.max(1.5, Math.min(18, value)).toFixed(2))
      );
      const nextNet = stepSeries(prev.netAdds.map((point) => point.value), 0.0016, 0.025).map((value) =>
        Math.max(0, Math.round(value))
      );
      return {
        cvr: toPoints(nextCvr, prev.cvr),
        arpu: toPoints(nextArpu, prev.arpu),
        netAdds: toPoints(nextNet, prev.netAdds),
      };
    });

    setChannelEffectiveness((prev) => {
      const next: Record<ChannelKey, number[]> = { ...prev };
      channelOrder.forEach((key, index) => {
        const updated = stepSeries(prev[key] ?? [], 0.0009 + index * 0.0003, 0.02).map((value) =>
          Number(Math.max(2, Math.min(60, value)).toFixed(2))
        );
        next[key] = updated;
      });
      return next;
    });
  }, [autoRefresh, mode, tick]);

  const kpiCards = React.useMemo(() => {
    return KPI_CONFIG.map((config) => {
      const series = kpiSeries[config.id] ?? [];
      const latest = series[series.length - 1] ?? Math.abs(KPI_SEEDS[mode][config.id]);
      const actualLatest = config.id === 'churnDelta' ? latest * CHURN_SIGN : latest;
      let diff = 0;
      if (compare === 'prevPeriod') {
        const prevValue = series.length > 1 ? series[series.length - 2] : latest;
        const actualPrev = config.id === 'churnDelta' ? prevValue * CHURN_SIGN : prevValue;
        diff = actualLatest - actualPrev;
      } else if (compare === 'prevPlan') {
        diff = actualLatest - baselineRef.current[config.id];
      }
      return {
        ...config,
        value: formatKpiValue(config, latest),
        trend: series,
        delta: compare ? formatDelta(config, diff) : null,
        deltaPositive: diff >= 0,
      };
    });
  }, [compare, kpiSeries, mode]);

  const areaSeries = React.useMemo(() => channelEffectiveness, [channelEffectiveness]);

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
      ...kpiCards.map((item) => [item.label, item.value]),
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-white">Monitoring dashboard</h2>
              <InfoIcon
                title="Monitoring dashboard"
                body="Live KPIs and telemetry across campaigns in this lifecycle mode. Toggle auto-refresh to watch trends update or pause to investigate a moment in time."
              />
            </div>
            <p className="text-sm text-slate-300">One-glance health of live acquisition plays.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
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
            <select
              value={compare ?? 'none'}
              onChange={(event) => {
                const value = event.target.value;
                setCompare(value === 'none' ? null : (value as 'prevPeriod' | 'prevPlan'));
              }}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
            >
              <option value="prevPeriod">Compare to previous period</option>
              <option value="prevPlan">Compare to previous plan</option>
              <option value="none">No comparison</option>
            </select>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as '15s' | '1m' | '5m')}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
            >
              <option value="15s">15s refresh</option>
              <option value="1m">1m refresh</option>
              <option value="5m">5m refresh</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              Auto-refresh
            </label>
            <button
              type="button"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-900"
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </button>
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
          {kpiCards.map((kpi) => (
            <div key={kpi.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <p>{kpi.label}</p>
                <InfoIcon title={kpi.label} body={kpi.helper} />
              </div>
              <p className="mt-2 text-xl font-semibold text-white">{kpi.value}</p>
              {kpi.delta ? (
                <p className={`text-xs font-semibold ${kpi.deltaPositive ? 'text-emerald-300' : 'text-rose-300'}`}>{kpi.delta}</p>
              ) : null}
              <p className="text-[11px] text-slate-500">{kpi.helper}</p>
              <Sparkline values={kpi.trend} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Campaign performance over time</h3>
              <InfoIcon
                title="Campaign performance"
                body="Overlay conversion, ARPU lift, and net adds to see how launch waves are trending. Legends update with your selection."
              />
            </div>
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Channel effectiveness</h3>
            <InfoIcon
              title="Channel effectiveness"
              body="See how allocation mix and contribution by channel evolve. Hover to inspect changes as auto-refresh updates."
            />
          </div>
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Cohort compare</h3>
            <InfoIcon
              title="Cohort compare"
              body="Compare headline CVR and ARPU lift across key cohorts to decide where to nudge mix or creative."
            />
          </div>
          <div className="mt-4">
            <GroupedBars data={cohorts} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Best levers right now</h3>
              <InfoIcon
                title="Best levers"
                body="Apply the recommended mix shift directly into Execution Hub. We pre-load the channel delta and keep your plan in sync."
              />
            </div>
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">What the system is learning</h3>
              <InfoIcon
                title="System learnings"
                body="Key insights surfaced from live experimentation and telemetry. Use these to inform design tweaks and execution guardrails."
              />
            </div>
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
