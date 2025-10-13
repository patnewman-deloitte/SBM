import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mode, useAppState } from '../appState';
import { metricsAPI } from '../mocks';

type MetricPoint = { t: number; value: number };
type MetricBundle = { cvr: MetricPoint[]; arpu: MetricPoint[]; netAdds: MetricPoint[] };

type BuiltKpi = {
  id: string;
  label: string;
  value: string;
  trend: number[];
  learning?: { threshold: number; delta: number; message: string };
};

const toPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const toCurrency = (value: number) => `$${Math.round(value)}`;
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const delta = (values: number[]) => (values.length > 1 ? values[values.length - 1] - values[0] : 0);

type KpiId = 'conversion' | 'cac' | 'roi' | 'attach' | 'arpu' | 'ltv' | 'churn' | 'saves' | 'saveRate';

const KPI_SETS: Record<Mode, KpiId[]> = {
  acquire: ['conversion', 'cac', 'roi'],
  grow: ['attach', 'arpu', 'roi'],
  retain: ['churn', 'saves', 'saveRate']
};

const withSign = (value: number, formatted: string) => `${value >= 0 ? '+' : ''}${formatted}`;

const KPI_META: Record<KpiId, { label: string; formatter: (value: number) => string; deltaFormatter: (delta: number) => string; learning?: { threshold: number; message: (delta: number) => string } }> = {
  conversion: {
    label: 'Conversion',
    formatter: (value) => toPercent(value),
    deltaFormatter: (deltaValue) => withSign(deltaValue, `${(Math.abs(deltaValue) * 100).toFixed(1)} pts`),
    learning: {
      threshold: 0.003,
      message: (deltaValue) => `Conversion moved ${(deltaValue * 100).toFixed(1)} pts`
    }
  },
  cac: {
    label: 'CAC',
    formatter: (value) => toCurrency(value),
    deltaFormatter: (deltaValue) => withSign(deltaValue, `$${Math.abs(deltaValue).toFixed(0)}`),
    learning: {
      threshold: 6,
      message: (deltaValue) => `CAC shifted ${deltaValue.toFixed(1)}`
    }
  },
  roi: {
    label: 'ROI',
    formatter: (value) => `${value.toFixed(1)}x`,
    deltaFormatter: (deltaValue) => withSign(deltaValue, `${Math.abs(deltaValue).toFixed(2)}x`),
    learning: {
      threshold: 0.25,
      message: (deltaValue) => `ROI changed ${deltaValue.toFixed(2)}x`
    }
  },
  attach: {
    label: 'Attach rate',
    formatter: (value) => `${value.toFixed(1)}%`,
    deltaFormatter: (deltaValue) => withSign(deltaValue, `${Math.abs(deltaValue).toFixed(1)} pts`),
    learning: {
      threshold: 2.5,
      message: (deltaValue) => `Attach rate moved ${deltaValue.toFixed(1)} pts`
    }
  },
  arpu: {
    label: 'ARPU lift',
    formatter: (value) => `$${value.toFixed(2)}`,
    deltaFormatter: (deltaValue) => withSign(deltaValue, `$${Math.abs(deltaValue).toFixed(2)}`),
    learning: {
      threshold: 0.6,
      message: (deltaValue) => `ARPU lift changed ${deltaValue.toFixed(2)}`
    }
  },
  ltv: {
    label: 'LTV lift',
    formatter: (value) => toCurrency(value),
    deltaFormatter: (deltaValue) => withSign(deltaValue, `$${Math.abs(deltaValue).toFixed(0)}`),
    learning: {
      threshold: 18,
      message: (deltaValue) => `LTV lift moved ${deltaValue.toFixed(0)}`
    }
  },
  churn: {
    label: 'Churn rate',
    formatter: (value) => `${value.toFixed(2)}%`,
    deltaFormatter: (deltaValue) => withSign(deltaValue, `${Math.abs(deltaValue).toFixed(2)} pts`),
    learning: {
      threshold: 0.9,
      message: (deltaValue) => `Churn rate moved ${deltaValue.toFixed(2)} pts`
    }
  },
  saves: {
    label: 'Saves',
    formatter: (value) => Math.round(value).toLocaleString(),
    deltaFormatter: (deltaValue) => withSign(deltaValue, Math.round(Math.abs(deltaValue)).toLocaleString()),
    learning: {
      threshold: 300,
      message: (deltaValue) => `Saves changed ${Math.round(deltaValue).toLocaleString()}`
    }
  },
  saveRate: {
    label: 'Save rate',
    formatter: (value) => `${(value * 100).toFixed(1)}%`,
    deltaFormatter: (deltaValue) => withSign(deltaValue, `${(Math.abs(deltaValue) * 100).toFixed(1)} pts`),
    learning: {
      threshold: 0.028,
      message: (deltaValue) => `Save rate moved ${(deltaValue * 100).toFixed(1)} pts`
    }
  }
};

const buildEmptyKpi = (id: KpiId): BuiltKpi => ({ id, label: KPI_META[id].label, value: '--', trend: [] });

const computeKpis = (mode: Mode, metrics: MetricBundle | null): BuiltKpi[] => {
  const ids = KPI_SETS[mode];
  if (!metrics || metrics.cvr.length === 0) {
    return ids.map((id) => buildEmptyKpi(id));
  }

  const cvrSeries = metrics.cvr.map((point) => point.value);
  const arpuSeries = metrics.arpu.map((point) => point.value);
  const netSeries = metrics.netAdds.map((point) => point.value);

  const cacSeries = netSeries.map((value) => Math.round(Math.max(70, 220 - value / 20)));
  const roiSeries = arpuSeries.map((value, index) => {
    const cacValue = cacSeries[index] ?? cacSeries[cacSeries.length - 1] ?? 100;
    return Number(((value * 12) / Math.max(1, cacValue)).toFixed(2));
  });
  const attachSeries = netSeries.map((value) => Number(Math.min(85, value / 35).toFixed(1)));
  const arpuLiftSeries = arpuSeries.map((value) => Number((value - 4).toFixed(2)));
  const ltvSeries = arpuSeries.map((value) => Math.round(value * 18));
  const churnSeries = cvrSeries.map((value) => Number((2.8 - value * 45).toFixed(2)));
  const savesSeries = netSeries.map((value) => Math.round(Math.max(600, value * 12)));
  const saveRateSeries = cvrSeries.map((value) => Number((0.62 + value * 1.6).toFixed(2)));

  const map = new Map<KpiId, BuiltKpi>();
  const register = (id: KpiId, series: number[]) => {
    const meta = KPI_META[id];
    const last = series[series.length - 1];
    const change = delta(series);
    const learning = meta.learning
      ? { threshold: meta.learning.threshold, delta: change, message: meta.learning.message(change) }
      : undefined;
    map.set(id, { id, label: meta.label, value: meta.formatter(last), trend: series, learning });
  };

  register('conversion', cvrSeries);
  register('cac', cacSeries);
  register('roi', roiSeries);
  register('attach', attachSeries);
  register('arpu', arpuLiftSeries);
  register('ltv', ltvSeries);
  register('churn', churnSeries);
  register('saves', savesSeries);
  register('saveRate', saveRateSeries);

  return ids.map((id) => map.get(id) ?? buildEmptyKpi(id));
};

const buildForecastPath = (values: number[]) => {
  if (values.length < 2) return null;
  const recent = values.slice(-4);
  const deltas = [] as number[];
  for (let index = 1; index < recent.length; index += 1) {
    deltas.push(recent[index] - recent[index - 1]);
  }
  const avgDelta = deltas.length ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length : 0;
  const last = recent[recent.length - 1];
  const forecast = [last, last + avgDelta, last + avgDelta * 2];
  const combined = [...recent, ...forecast.slice(1)];
  const min = Math.min(...combined);
  const max = Math.max(...combined);
  const range = max - min || 1;
  return combined
    .map((value, index) => {
      const x = (index / (combined.length - 1)) * 64;
      const y = 24 - ((value - min) / range) * 24;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

const TrendBars: React.FC<{ values: number[] }> = ({ values }) => {
  if (values.length === 0) {
    return <div className="mt-3 h-12 rounded bg-slate-900/70" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <div className="mt-3 flex h-12 items-end gap-1">
      {values.map((value, index) => {
        const height = 20 + ((value - min) / range) * 28;
        return <div key={`${index}-${value}`} style={{ height: `${height}px` }} className="w-2 rounded bg-emerald-400/70" />;
      })}
    </div>
  );
};

const KpiCard: React.FC<{ kpi: BuiltKpi }> = ({ kpi }) => {
  const id = kpi.id as KpiId;
  const last = kpi.trend[kpi.trend.length - 1];
  const previous = React.useRef<number | undefined>(last);
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    if (last === undefined) return;
    if (previous.current === undefined) {
      previous.current = last;
      return;
    }
    if (last !== previous.current) {
      setPulse((prev) => !prev);
      previous.current = last;
    }
  }, [last]);

  const deltaValue = kpi.trend.length > 1 ? kpi.trend[kpi.trend.length - 1] - kpi.trend[kpi.trend.length - 2] : 0;
  const deltaText = KPI_META[id]?.deltaFormatter(deltaValue) ?? '';
  const isPositive = deltaValue >= 0;
  const ribbon = React.useMemo(() => buildForecastPath(kpi.trend), [kpi.trend]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{kpi.label}</p>
      <p
        className={`mt-2 text-2xl font-semibold text-white transition-all duration-500 ease-out ${
          pulse ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-90'
        }`}
      >
        {kpi.value}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span
          className={`flex items-center gap-1 font-semibold transition-all duration-500 ease-out ${
            isPositive ? 'text-emerald-300' : 'text-rose-300'
          } ${pulse ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-80'}`}
        >
          <span aria-hidden="true">{isPositive ? '▲' : '▼'}</span>
          <span>{deltaText}</span>
        </span>
        {ribbon ? (
          <svg className="h-6 w-16 text-emerald-400/70" viewBox="0 0 64 24" aria-hidden="true">
            <path d={ribbon} fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="h-6 w-16" />
        )}
      </div>
      <TrendBars values={kpi.trend} />
    </div>
  );
};

const MonitoringDashboard: React.FC = () => {
  const { mode, planId, setStep } = useAppState();
  const navigate = useNavigate();
  const [metrics, setMetrics] = React.useState<MetricBundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [learnings, setLearnings] = React.useState<string[]>([]);
  const seenLearnings = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    metricsAPI
      .get(mode)
      .then((response) => {
        if (!isMounted) return;
        setMetrics(response);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setMetrics(null);
        setError('Unable to load telemetry for this mode.');
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [mode]);

  React.useEffect(() => {
    seenLearnings.current.clear();
    setLearnings(planId ? [`Plan ${planId} connected to monitoring`] : []);
  }, [mode, planId]);

  const kpis = React.useMemo(() => computeKpis(mode, metrics), [mode, metrics]);

  React.useEffect(() => {
    kpis.forEach((kpi) => {
      if (!kpi.learning) return;
      if (Math.abs(kpi.learning.delta) < kpi.learning.threshold) return;
      if (seenLearnings.current.has(kpi.id)) return;
      seenLearnings.current.add(kpi.id);
      setLearnings((prev) => [...prev, kpi.learning!.message]);
    });
  }, [kpis]);

  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const hasSeries = Boolean(metrics && metrics.cvr.length > 0);
  const sampleCount = metrics?.cvr.length ?? 0;
  const averageCvr = metrics ? average(metrics.cvr.map((point) => point.value)) : 0;
  const averageArpu = metrics ? average(metrics.arpu.map((point) => point.value)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Monitoring Dashboard</h2>
          <p className="mt-1 text-sm text-slate-300">
            {hasSeries ? 'Live telemetry flowing from execution jobs.' : 'No telemetry yet. Launch a plan to begin tracking.'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            {modeLabel} mode
          </span>
          {planId ? <span className="text-xs text-slate-400">Plan id: <span className="font-semibold text-slate-200">{planId}</span></span> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Learnings</h3>
            <button
              type="button"
              className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
              onClick={() => {
                setStep(3);
                navigate('/campaign-designer', { state: { fromMonitoring: true } });
              }}
            >
              Re-simulate in Designer
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {learnings.length === 0 ? (
              <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                Insights will appear here once telemetry moves.
              </span>
            ) : (
              learnings.map((item, index) => (
                <span key={`${index}-${item}`} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {item}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Telemetry summary</h3>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Loading metrics...</p>
          ) : error ? (
            <p className="mt-3 text-sm text-rose-300">{error}</p>
          ) : hasSeries ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Samples: {sampleCount}</li>
              <li>Average conversion: {toPercent(averageCvr, 2)}</li>
              <li>Average ARPU delta: {toCurrency(averageArpu)}</li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">No samples returned for this mode yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
