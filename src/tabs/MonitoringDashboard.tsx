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

const emptyKpis: Record<Mode, BuiltKpi[]> = {
  acquire: [
    { id: 'conversion', label: 'Conversion', value: '--', trend: [] },
    { id: 'cac', label: 'CAC', value: '--', trend: [] },
    { id: 'roi', label: 'ROI', value: '--', trend: [] }
  ],
  grow: [
    { id: 'attach', label: 'Attach Rate', value: '--', trend: [] },
    { id: 'arpu', label: 'ARPU lift', value: '--', trend: [] },
    { id: 'ltv', label: 'LTV lift', value: '--', trend: [] }
  ],
  retain: [
    { id: 'save', label: 'Save Rate', value: '--', trend: [] },
    { id: 'survival30', label: '30-day survival', value: '--', trend: [] },
    { id: 'survival90', label: '90-day survival', value: '--', trend: [] }
  ]
};

const computeKpis = (mode: Mode, metrics: MetricBundle | null): BuiltKpi[] => {
  if (!metrics || metrics.cvr.length === 0) {
    return emptyKpis[mode];
  }

  const cvrSeries = metrics.cvr.map((point) => point.value);
  const arpuSeries = metrics.arpu.map((point) => point.value);
  const netSeries = metrics.netAdds.map((point) => point.value);

  if (mode === 'acquire') {
    const cacSeries = netSeries.map((value) => Math.round(Math.max(70, 220 - value / 20)));
    const roiSeries = arpuSeries.map((value, index) => {
      const cacValue = cacSeries[index] ?? cacSeries[cacSeries.length - 1] ?? 100;
      return Number(((value * 12) / Math.max(1, cacValue)).toFixed(2));
    });
    return [
      {
        id: 'conversion',
        label: 'Conversion',
        value: toPercent(cvrSeries[cvrSeries.length - 1]),
        trend: cvrSeries,
        learning: {
          threshold: 0.003,
          delta: delta(cvrSeries),
          message: `Conversion moved ${(delta(cvrSeries) * 100).toFixed(1)} pts`
        }
      },
      {
        id: 'cac',
        label: 'CAC',
        value: toCurrency(cacSeries[cacSeries.length - 1]),
        trend: cacSeries,
        learning: {
          threshold: 6,
          delta: delta(cacSeries),
          message: `CAC shifted ${delta(cacSeries).toFixed(1)}`
        }
      },
      {
        id: 'roi',
        label: 'ROI',
        value: `${roiSeries[roiSeries.length - 1].toFixed(1)}x`,
        trend: roiSeries,
        learning: {
          threshold: 0.25,
          delta: delta(roiSeries),
          message: `ROI changed ${delta(roiSeries).toFixed(2)}x`
        }
      }
    ];
  }

  if (mode === 'grow') {
    const attachSeries = netSeries.map((value) => Number(Math.min(75, value / 40).toFixed(1)));
    const arpuLiftSeries = arpuSeries.map((value) => Number((value - 4).toFixed(2)));
    const ltvSeries = arpuSeries.map((value) => Math.round(value * 18));
    return [
      {
        id: 'attach',
        label: 'Attach Rate',
        value: `${attachSeries[attachSeries.length - 1].toFixed(1)}%`,
        trend: attachSeries,
        learning: {
          threshold: 2.5,
          delta: delta(attachSeries),
          message: `Attach rate moved ${delta(attachSeries).toFixed(1)} pts`
        }
      },
      {
        id: 'arpu',
        label: 'ARPU lift',
        value: toCurrency(arpuLiftSeries[arpuLiftSeries.length - 1]),
        trend: arpuLiftSeries,
        learning: {
          threshold: 0.6,
          delta: delta(arpuLiftSeries),
          message: `ARPU lift changed ${delta(arpuLiftSeries).toFixed(2)}`
        }
      },
      {
        id: 'ltv',
        label: 'LTV lift',
        value: toCurrency(ltvSeries[ltvSeries.length - 1]),
        trend: ltvSeries,
        learning: {
          threshold: 18,
          delta: delta(ltvSeries),
          message: `LTV lift moved ${delta(ltvSeries).toFixed(0)}`
        }
      }
    ];
  }

  const saveSeries = cvrSeries.map((value) => Number((72 + value * 400).toFixed(1)));
  const survival30Series = arpuSeries.map((value) => Number((80 + value * 3).toFixed(1)));
  const survival90Series = arpuSeries.map((value, index) => {
    const smooth = (arpuSeries[index - 1] ?? value);
    return Number((74 + (value + smooth) * 2.1).toFixed(1));
  });
  return [
    {
      id: 'save',
      label: 'Save Rate',
      value: `${saveSeries[saveSeries.length - 1].toFixed(1)}%`,
      trend: saveSeries,
      learning: {
        threshold: 2.8,
        delta: delta(saveSeries),
        message: `Save rate moved ${delta(saveSeries).toFixed(1)} pts`
      }
    },
    {
      id: 'survival30',
      label: '30-day survival',
      value: `${survival30Series[survival30Series.length - 1].toFixed(1)}%`,
      trend: survival30Series,
      learning: {
        threshold: 1.8,
        delta: delta(survival30Series),
        message: `30-day survival moved ${delta(survival30Series).toFixed(1)} pts`
      }
    },
    {
      id: 'survival90',
      label: '90-day survival',
      value: `${survival90Series[survival90Series.length - 1].toFixed(1)}%`,
      trend: survival90Series,
      learning: {
        threshold: 2.2,
        delta: delta(survival90Series),
        message: `90-day survival moved ${delta(survival90Series).toFixed(1)} pts`
      }
    }
  ];
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
          <div key={kpi.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{kpi.value}</p>
            <TrendBars values={kpi.trend} />
          </div>
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
