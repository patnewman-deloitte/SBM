import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mode, useAppState } from '../appState';
import InfoIcon from '../components/InfoIcon';
import WhyChip from '../components/WhyChip';

type ChannelKey = 'Search' | 'Social' | 'Email' | 'Retail' | 'Field';

type TimelineState = {
  timestamps: number[];
  cvr: number[];
  arpu: number[];
  netAdds: number[];
  churn: number[];
  active: number[];
};

type ChannelSeries = Record<ChannelKey, number[]>;

type KpiKey = 'activeCampaigns' | 'averageCvr' | 'arpuDelta' | 'netAdds' | 'churnDelta';
type KpiMetric = 'active' | 'cvr' | 'arpu' | 'netAdds' | 'churn';

type LegendVisibility = {
  cvr: boolean;
  arpu: boolean;
  netAdds: boolean;
};

type ChannelVisibility = Record<ChannelKey, boolean>;

type CohortDatum = { cohort: string; metrics: { label: string; value: number; metric: 'cvr' | 'arpu' }[] };

type Anomaly = { metric: 'cvr' | 'arpu' | 'netAdds' | 'churn'; direction: 'up' | 'down'; z: number };

type HoverTooltip = { id: KpiKey; x: number; y: number; value: string; delta?: string | null; baseline?: string };

type ChartTooltip = { x: number; y: number; lines: Array<{ label: string; value: string }>; timestamp: string };

type PulseEntry = {
  id: string;
  title: string;
  blurb: string;
  reasons: string[];
  onView: () => void;
  disabled?: boolean;
  tone: 'risk' | 'opportunity' | 'insight';
};

const toneHeading: Record<PulseEntry['tone'], string> = {
  risk: 'text-rose-300',
  opportunity: 'text-emerald-300',
  insight: 'text-sky-300',
};

const PulseColumn: React.FC<{ title: string; tone: PulseEntry['tone']; items: PulseEntry[] }> = ({ title, tone, items }) => (
  <div>
    <p className={`text-xs font-semibold uppercase tracking-wide ${toneHeading[tone]}`}>{title}</p>
    <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
      {items.map((item) => {
        const buttonClasses = item.disabled
          ? 'w-full text-left text-slate-400 cursor-default'
          : 'w-full text-left text-slate-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
        return (
          <div
            key={item.id}
            className="min-w-[220px] rounded-xl border border-slate-800 bg-slate-950/70 p-3 shadow-inner shadow-slate-900/20"
          >
            <button
              type="button"
              onClick={item.onView}
              disabled={item.disabled}
              aria-disabled={item.disabled}
              className={buttonClasses}
              aria-label={`${title} ${item.title}`}
            >
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-[11px] text-slate-300">{item.blurb}</p>
            </button>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">View drivers</span>
              <WhyChip reasons={item.reasons} title={`${title} drivers`} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const PulseRail: React.FC<{ risks: PulseEntry[]; opportunities: PulseEntry[]; insights: PulseEntry[] }> = ({
  risks,
  opportunities,
  insights,
}) => (
  <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
      <span>Pulse</span>
      <InfoIcon
        title="Pulse strip"
        body="Snapshot of urgent risks, emerging opportunities, and curated insights. Click to focus tiles, or open drivers for context."
      />
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <PulseColumn title="Risks" tone="risk" items={risks} />
      <PulseColumn title="Opportunities" tone="opportunity" items={opportunities} />
      <PulseColumn title="Insights" tone="insight" items={insights} />
    </div>
  </div>
);

const channelKeys: ChannelKey[] = ['Search', 'Social', 'Email', 'Retail', 'Field'];

const rangePoints: Record<'7d' | '30d' | '90d', number> = {
  '7d': 14,
  '30d': 30,
  '90d': 60,
};

const modeSeed: Record<Mode, number> = { acquire: 3, grow: 5, retain: 7 };
const groupSeed: Record<'campaign' | 'channel' | 'cohort', number> = { campaign: 11, channel: 19, cohort: 29 };
const rangeSeed: Record<'7d' | '30d' | '90d', number> = { '7d': 13, '30d': 17, '90d': 23 };

const baseSeeds: Record<Mode, { cvr: number; arpu: number; netAdds: number; churn: number; active: number }> = {
  acquire: { cvr: 0.041, arpu: 7.4, netAdds: 2400, churn: 0.008, active: 18 },
  grow: { cvr: 0.053, arpu: 9.6, netAdds: 1850, churn: 0.011, active: 15 },
  retain: { cvr: 0.033, arpu: 5.1, netAdds: 1620, churn: 0.015, active: 12 },
};

const baseChannels: Record<Mode, Record<ChannelKey, number>> = {
  acquire: { Search: 32, Social: 18, Email: 24, Retail: 14, Field: 12 },
  grow: { Search: 18, Social: 24, Email: 26, Retail: 18, Field: 14 },
  retain: { Search: 14, Social: 16, Email: 32, Retail: 12, Field: 26 },
};

const leverByMode: Record<Mode, { channel: ChannelKey; delta: number; recommendation: string; confidence: 'Low' | 'Medium' | 'High'; cohorts: string[] }> = {
  acquire: {
    channel: 'Email',
    delta: 3,
    recommendation: 'Increase Email +3% for Premium Network Loyalists — Family Coverage Maximizers.',
    confidence: 'Medium',
    cohorts: ['Premium Network Loyalists', 'Family Coverage Maximizers'],
  },
  grow: {
    channel: 'Social',
    delta: 2,
    recommendation: 'Shift Social +2% toward Hybrid Fiber Enthusiasts — Streaming Bundlers.',
    confidence: 'High',
    cohorts: ['Hybrid Fiber Enthusiasts', 'Streaming Bundlers'],
  },
  retain: {
    channel: 'Field',
    delta: 4,
    recommendation: 'Allocate Field +4% for Premium Network Loyalists — Family Coverage Maximizers.',
    confidence: 'Medium',
    cohorts: ['Premium Network Loyalists', 'Family Coverage Maximizers'],
  },
};

const kpiConfig: Array<{
  id: KpiKey;
  label: string;
  helper: string;
  format: 'int' | 'pct' | 'currency' | 'pts';
  metric: KpiMetric;
  focus: 'cvr' | 'arpu' | 'netAdds' | 'churn';
  tooltip: string;
}> = [
  {
    id: 'activeCampaigns',
    label: 'ACTIVE CAMPAIGNS',
    helper: 'Live plays in flight',
    format: 'int',
    metric: 'active',
    focus: 'netAdds',
    tooltip: 'Count of live campaigns in this lifecycle mode and filters. Lower deltas may indicate launches ending.',
  },
  {
    id: 'averageCvr',
    label: 'AVERAGE CVR',
    helper: 'Across current focus',
    format: 'pct',
    metric: 'cvr',
    focus: 'cvr',
    tooltip: 'Conversion rate blended across campaigns within scope. Compare to prior periods to catch momentum shifts.',
  },
  {
    id: 'arpuDelta',
    label: 'ARPU Δ (12-MO)',
    helper: 'Rolling lift',
    format: 'currency',
    metric: 'arpu',
    focus: 'arpu',
    tooltip: 'Twelve-month ARPU uplift generated by the active plays. Watch deltas when toggling groupings.',
  },
  {
    id: 'netAdds',
    label: 'NET ADDS (ROLLING)',
    helper: '30-day adds',
    format: 'int',
    metric: 'netAdds',
    focus: 'netAdds',
    tooltip: 'Rolling net additions across your selected view. Spikes often align to new bundle pushes.',
  },
  {
    id: 'churnDelta',
    label: 'CHURN Δ (ROLLING)',
    helper: 'Basis points',
    format: 'pts',
    metric: 'churn',
    focus: 'churn',
    tooltip: 'Rolling churn delta in basis points; lower is better. Use focus to zoom in on problem areas.',
  },
];

const learningsByMode: Record<Mode, Record<'campaign' | 'channel' | 'cohort', string[]>> = {
  acquire: {
    campaign: [
      'Flagship bundle launches pick up speed after 36 hours when search and email stay in lockstep.',
      'Households with fiber availability respond 1.2x better to dual-offer hero creative.',
      'A seven-day window keeps CAC within guardrails for acquisition pushes.',
    ],
    channel: [
      'Search expansion drives early discovery but needs email nurture within 24 hours.',
      'Retail pop-ups amplify net adds when field teams pre-seed leads.',
      'Social lookalikes cool quickly; refresh audiences every 10 days.',
    ],
    cohort: [
      'Premium Network Loyalists react to speed messaging with +0.6 pts CVR.',
      'Family Coverage Maximizers need device bundle emphasis to convert.',
      'Recent movers stay warm when SMS sequences precede field follow-ups.',
    ],
  },
  grow: {
    campaign: [
      'Upgrade campaigns pop when loyalty perks headline the subject line.',
      'Bundled offers sustain ARPU lift when refreshed bi-weekly.',
      'Attach journeys hold momentum when the second touch highlights savings.',
    ],
    channel: [
      'Social carousel creative maintains lift if rotated every seven days.',
      'Email nurture works best with interactive plan builders.',
      'Field consults convert upsell prospects 1.3x over control territories.',
    ],
    cohort: [
      'Hybrid Fiber Enthusiasts love premium streaming bundles.',
      'Streaming Bundlers add accessories when device credits stack.',
      'Shared-family plans upgrade faster with simplified checkout copy.',
    ],
  },
  retain: {
    campaign: [
      'Proactive save plays need clear value reinforcement inside the first 12 hours.',
      'Retention offers perform when we mix service credits with concierge care.',
      'Win-back journeys spike after billing reassurance sequences.',
    ],
    channel: [
      'SMS-first save flows reduce call deflection by 0.8 pts.',
      'Field retention visits stabilize churn in high-value zips.',
      'Email win-backs benefit from clearer loyalty recognition.',
    ],
    cohort: [
      'Premium Network Loyalists expect priority support and free device swaps.',
      'Family Coverage Maximizers respond to safety and reliability framing.',
      'Budget protectors lean into extended payment options.',
    ],
  },
};

const formatValue = (metric: KpiMetric, value: number) => {
  if (metric === 'cvr') return `${(value * 100).toFixed(2)}%`;
  if (metric === 'arpu') return `$${value.toFixed(2)}`;
  if (metric === 'netAdds' || metric === 'active') return Math.round(value).toLocaleString();
  return `${(value * 10000).toFixed(1)} pts`;
};

const formatDelta = (metric: KpiMetric, diff: number) => {
  if (metric === 'churn') {
    const basis = diff * 10000;
    const symbol = basis <= 0 ? '▲' : '▼';
    return `${symbol} ${Math.abs(basis).toFixed(1)} bps`;
  }
  const positive = diff >= 0;
  if (metric === 'cvr') return `${positive ? '▲' : '▼'} ${(Math.abs(diff) * 100).toFixed(2)} pts`;
  if (metric === 'arpu') return `${positive ? '▲' : '▼'} $${Math.abs(diff).toFixed(2)}`;
  return `${positive ? '▲' : '▼'} ${Math.abs(Math.round(diff)).toLocaleString()}`;
};

const seedRand = (seed: number) => () => {
  seed = (seed * 48271) % 2147483647;
  return (seed & 2147483647) / 2147483647;
};

const useTicker = (enabled: boolean, ms: number) => {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setTick((prev) => prev + 1), ms);
    return () => window.clearInterval(id);
  }, [enabled, ms]);
  return tick;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getSpacing = (range: '7d' | '30d' | '90d') => {
  if (range === '7d') return (7 * 24 * 60 * 60 * 1000) / rangePoints['7d'];
  if (range === '30d') return (30 * 24 * 60 * 60 * 1000) / rangePoints['30d'];
  return (90 * 24 * 60 * 60 * 1000) / rangePoints['90d'];
};

const createTimeline = (mode: Mode, range: '7d' | '30d' | '90d', groupBy: 'campaign' | 'channel' | 'cohort'): TimelineState => {
  const points = rangePoints[range];
  const generator = seedRand(modeSeed[mode] * 97 + groupSeed[groupBy] * 53 + rangeSeed[range] * 199);
  const base = baseSeeds[mode];
  const spacing = getSpacing(range);
  const startTime = Date.now() - spacing * points;
  const timeline: TimelineState = { timestamps: [], cvr: [], arpu: [], netAdds: [], churn: [], active: [] };
  let cvr = base.cvr;
  let arpu = base.arpu;
  let netAdds = base.netAdds;
  let churn = base.churn;
  let active = base.active;
  const driftBoost = groupBy === 'campaign' ? 0.0006 : groupBy === 'cohort' ? 0.0003 : 0.0004;
  for (let index = 0; index < points; index += 1) {
    const noise = generator() - 0.5;
    cvr = clamp(cvr * (1 + 0.0008 + driftBoost + noise * 0.02), 0.02, 0.18);
    arpu = clamp(arpu * (1 + 0.0012 + noise * 0.04), 3, 22);
    netAdds = clamp(netAdds * (1 + 0.002 + noise * 0.05), 400, 4200);
    churn = clamp(churn * (1 - 0.0009 + noise * 0.015), 0.004, 0.03);
    active = clamp(active * (1 + 0.0004 + noise * 0.02), 6, 36);
    timeline.timestamps.push(startTime + index * spacing);
    timeline.cvr.push(Number(cvr.toFixed(4)));
    timeline.arpu.push(Number(arpu.toFixed(2)));
    timeline.netAdds.push(Math.round(netAdds));
    timeline.churn.push(Number(churn.toFixed(4)));
    timeline.active.push(Math.round(active));
  }
  return timeline;
};

const advanceTimeline = (
  prev: TimelineState,
  mode: Mode,
  range: '7d' | '30d' | '90d',
  groupBy: 'campaign' | 'channel' | 'cohort',
  rand: () => number,
): TimelineState => {
  const points = rangePoints[range];
  const spacing = getSpacing(range);
  const base = baseSeeds[mode];
  const driftBoost = groupBy === 'campaign' ? 0.0006 : groupBy === 'cohort' ? 0.0003 : 0.0004;
  const nextTime = (prev.timestamps[prev.timestamps.length - 1] ?? Date.now()) + spacing;
  const noise = rand() - 0.5;
  const nextCvr = clamp((prev.cvr[prev.cvr.length - 1] ?? base.cvr) * (1 + 0.0008 + driftBoost + noise * 0.02), 0.02, 0.18);
  const nextArpu = clamp((prev.arpu[prev.arpu.length - 1] ?? base.arpu) * (1 + 0.0012 + noise * 0.04), 3, 22);
  const nextNetAdds = clamp((prev.netAdds[prev.netAdds.length - 1] ?? base.netAdds) * (1 + 0.002 + noise * 0.05), 400, 4200);
  const nextChurn = clamp((prev.churn[prev.churn.length - 1] ?? base.churn) * (1 - 0.0009 + noise * 0.015), 0.004, 0.03);
  const nextActive = clamp((prev.active[prev.active.length - 1] ?? base.active) * (1 + 0.0004 + noise * 0.02), 6, 36);
  return {
    timestamps: [...prev.timestamps.slice(-(points - 1)), nextTime],
    cvr: [...prev.cvr.slice(-(points - 1)), Number(nextCvr.toFixed(4))],
    arpu: [...prev.arpu.slice(-(points - 1)), Number(nextArpu.toFixed(2))],
    netAdds: [...prev.netAdds.slice(-(points - 1)), Math.round(nextNetAdds)],
    churn: [...prev.churn.slice(-(points - 1)), Number(nextChurn.toFixed(4))],
    active: [...prev.active.slice(-(points - 1)), Math.round(nextActive)],
  };
};

const createChannels = (mode: Mode, range: '7d' | '30d' | '90d', groupBy: 'campaign' | 'channel' | 'cohort'): ChannelSeries => {
  const base = baseChannels[mode];
  const points = rangePoints[range];
  const generator = seedRand(modeSeed[mode] * 193 + groupSeed[groupBy] * 131 + rangeSeed[range] * 97);
  const series = channelKeys.reduce<ChannelSeries>((acc, key, index) => {
    const baseValue = base[key];
    const values: number[] = [];
    let current = baseValue;
    for (let point = 0; point < points; point += 1) {
      const noise = generator() - 0.5;
      const drift = 0.0006 + index * 0.0002 + (groupBy === 'cohort' ? 0.0004 : 0);
      current = clamp(current * (1 + drift + noise * 0.04), 6, 64);
      values.push(Number(current.toFixed(2)));
    }
    acc[key] = values;
    return acc;
  }, {} as ChannelSeries);
  return series;
};

const advanceChannels = (
  prev: ChannelSeries,
  mode: Mode,
  range: '7d' | '30d' | '90d',
  groupBy: 'campaign' | 'channel' | 'cohort',
  rand: () => number,
): ChannelSeries => {
  const points = rangePoints[range];
  return channelKeys.reduce<ChannelSeries>((acc, key, index) => {
    const values = prev[key] ?? [];
    const base = baseChannels[mode][key];
    const drift = 0.0006 + index * 0.0002 + (groupBy === 'cohort' ? 0.0004 : 0);
    const nextValue = clamp((values[values.length - 1] ?? base) * (1 + drift + (rand() - 0.5) * 0.04), 6, 64);
    acc[key] = [...values.slice(-(points - 1)), Number(nextValue.toFixed(2))];
    return acc;
  }, {} as ChannelSeries);
};

const buildCohorts = (
  timeline: TimelineState,
  mode: Mode,
  groupBy: 'campaign' | 'channel' | 'cohort',
): CohortDatum[] => {
  const base = timeline;
  const length = base.cvr.length || 1;
  const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
  const cvr = avg(base.cvr.slice(-Math.min(12, length))) * 100;
  const arpu = avg(base.arpu.slice(-Math.min(12, length)));
  const factor = groupBy === 'campaign' ? 1.08 : groupBy === 'cohort' ? 0.94 : 1.0;
  const secondaryFactor = groupBy === 'campaign' ? 0.92 : groupBy === 'cohort' ? 1.06 : 1.02;
  const cohortLabels: Record<'campaign' | 'channel' | 'cohort', [string, string]> = {
    campaign: ['Flagship Fiber Launch', 'Neighborhood Door-to-Door'],
    channel: ['Search-Driven Prospects', 'Field Advocates'],
    cohort: ['Premium Network Loyalists', 'Family Coverage Maximizers'],
  };
  const [first, second] = cohortLabels[groupBy];
  return [
    {
      cohort: first,
      metrics: [
        { label: 'CVR %', value: Number((cvr * factor).toFixed(2)), metric: 'cvr' },
        { label: 'ARPU Δ', value: Number((arpu * factor).toFixed(2)), metric: 'arpu' },
      ],
    },
    {
      cohort: second,
      metrics: [
        { label: 'CVR %', value: Number((cvr * secondaryFactor).toFixed(2)), metric: 'cvr' },
        { label: 'ARPU Δ', value: Number((arpu * (secondaryFactor + 0.04)).toFixed(2)), metric: 'arpu' },
      ],
    },
  ];
};

const computeAnomalies = (timeline: TimelineState): Anomaly[] => {
  const window = 20;
  const metrics: Array<{ key: Anomaly['metric']; values: number[] }> = [
    { key: 'cvr', values: timeline.cvr },
    { key: 'arpu', values: timeline.arpu },
    { key: 'netAdds', values: timeline.netAdds },
    { key: 'churn', values: timeline.churn },
  ];
  return metrics
    .map(({ key, values }) => {
      if (values.length < 6) return null;
      const slice = values.slice(-window);
      const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
      const variance = slice.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / (slice.length || 1);
      const std = Math.sqrt(variance);
      if (std === 0) return null;
      const latest = values[values.length - 1];
      const z = (latest - mean) / std;
      if (Math.abs(z) < 1.2) return null;
      return { metric: key, direction: z > 0 ? 'up' : 'down', z } as Anomaly;
    })
    .filter((item): item is Anomaly => Boolean(item));
};

const anomalyLabel: Record<Anomaly['metric'], string> = {
  cvr: 'CVR',
  arpu: 'ARPU',
  netAdds: 'Net adds',
  churn: 'Churn',
};

const MonitoringDashboard: React.FC = () => {
  const { mode, setStep, monitor, setMonitor } = useAppState();
  const navigate = useNavigate();
  const { auto, period, range, groupBy, compare, focus } = monitor;
  const [timeline, setTimeline] = React.useState(() => createTimeline(mode, range, groupBy));
  const [channels, setChannels] = React.useState(() => createChannels(mode, range, groupBy));
  const [legend, setLegend] = React.useState<LegendVisibility>({ cvr: true, arpu: true, netAdds: true });
  const [channelVisibility, setChannelVisibility] = React.useState<ChannelVisibility>(() =>
    channelKeys.reduce<ChannelVisibility>((acc, key) => ({ ...acc, [key]: true }), {} as ChannelVisibility)
  );
  const [tileTooltip, setTileTooltip] = React.useState<HoverTooltip | null>(null);
  const [chartTooltip, setChartTooltip] = React.useState<ChartTooltip | null>(null);
  const [channelTooltip, setChannelTooltip] = React.useState<ChartTooltip | null>(null);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [channelHoverIndex, setChannelHoverIndex] = React.useState<number | null>(null);
  const [brushWindow, setBrushWindow] = React.useState<{ start: number; end: number } | null>(null);
  const [isBrushing, setIsBrushing] = React.useState(false);
  const chartRef = React.useRef<SVGSVGElement | null>(null);
  const channelRef = React.useRef<SVGSVGElement | null>(null);
  const generatorRef = React.useRef(() => Math.random());
  const channelGeneratorRef = React.useRef(() => Math.random());
  const baselineRef = React.useRef<Record<KpiMetric, number>>({
    cvr: timeline.cvr[0],
    arpu: timeline.arpu[0],
    netAdds: timeline.netAdds[0],
    churn: timeline.churn[0],
    active: timeline.active[0],
  });

  React.useEffect(() => {
    const seedValue = modeSeed[mode] * 97 + groupSeed[groupBy] * 53 + rangeSeed[range] * 199;
    generatorRef.current = seedRand(seedValue);
    channelGeneratorRef.current = seedRand(seedValue + 73);
    const nextTimeline = createTimeline(mode, range, groupBy);
    setTimeline(nextTimeline);
    setChannels(createChannels(mode, range, groupBy));
    baselineRef.current = {
      cvr: nextTimeline.cvr[0],
      arpu: nextTimeline.arpu[0],
      netAdds: nextTimeline.netAdds[0],
      churn: nextTimeline.churn[0],
      active: nextTimeline.active[0],
    };
    setHoverIndex(null);
    setChannelHoverIndex(null);
  }, [mode, range, groupBy]);

  const periodMs = React.useMemo(() => (period === 'w/w' ? 60000 : 180000), [period]);
  const tick = useTicker(auto, periodMs);

  React.useEffect(() => {
    if (!auto) return;
    setTimeline((prev) => advanceTimeline(prev, mode, range, groupBy, generatorRef.current));
    setChannels((prev) => advanceChannels(prev, mode, range, groupBy, channelGeneratorRef.current));
  }, [auto, mode, range, groupBy, tick]);

  React.useEffect(() => {
    if (!isBrushing) return;
    const handleUp = () => {
      setIsBrushing(false);
      setBrushWindow(null);
    };
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [isBrushing]);

  const cohorts = React.useMemo(() => buildCohorts(timeline, mode, groupBy), [timeline, mode, groupBy]);
  const anomalies = React.useMemo(() => computeAnomalies(timeline), [timeline]);
  const groupLabel = groupBy === 'campaign' ? 'campaigns' : groupBy === 'channel' ? 'channels' : 'cohorts';
  const kpiCards = React.useMemo(() => {
    const rangeLabel = range === '7d' ? 'last 7 days' : range === '30d' ? 'last 30 days' : 'last 90 days';
    return kpiConfig.map((config) => {
      const metricSeries = timeline[config.metric];
      const latest = metricSeries[metricSeries.length - 1];
      const previous = metricSeries[metricSeries.length - 2] ?? latest;
      let diff = 0;
      if (compare === 'prevPeriod') {
        diff = latest - previous;
      } else if (compare === 'prevPlan') {
        diff = latest - (baselineRef.current[config.metric] ?? previous);
      }
      const delta = compare === 'none' ? null : formatDelta(config.metric, diff);
      const compareReason =
        compare === 'none'
          ? 'Comparison disabled'
          : compare === 'prevPeriod'
          ? `vs previous period (${formatValue(config.metric, previous)})`
          : `vs previous plan (${formatValue(config.metric, baselineRef.current[config.metric] ?? previous)})`;
      const focusReason =
        focus?.kpi === config.focus ? 'Focus locked from Pulse' : `Monitor ${groupLabel}`;
      const reasons = [`Latest: ${formatValue(config.metric, latest)}`, `Range: ${rangeLabel}`, compareReason, focusReason];
      return {
        ...config,
        value: formatValue(config.metric, latest),
        raw: latest,
        delta,
        deltaPositive: config.metric === 'churn' ? diff <= 0 : diff >= 0,
        trend: metricSeries,
        baseline: compare === 'prevPlan' ? baselineRef.current[config.metric] : compare === 'prevPeriod' ? previous : undefined,
        reasons,
      };
    });
  }, [compare, focus?.kpi, groupLabel, range, timeline]);

  const learnings = React.useMemo(() => {
    const baseLearnings = [...learningsByMode[mode][groupBy]];
    if (focus?.key) {
      baseLearnings.unshift(`Focus locked on ${focus.key} — adjusting charts and insights in real time.`);
    } else if (focus) {
      const metricLabel =
        focus.kpi === 'cvr'
          ? 'conversion swings'
          : focus.kpi === 'arpu'
          ? 'ARPU shifts'
          : focus.kpi === 'netAdds'
          ? 'net additions'
          : 'churn drift';
      baseLearnings.unshift(`Focus is set to ${metricLabel}. Related tiles and charts are highlighted.`);
    }
    return baseLearnings.slice(0, 4);
  }, [mode, groupBy, focus]);

  const modeLabel = mode === 'acquire' ? 'Acquire' : mode === 'grow' ? 'Grow' : 'Retain';

  const pulseData = React.useMemo(() => {
    const abs = (value: number) => Math.abs(value).toFixed(1);
    const risks = anomalies
      .filter(
        (anomaly) =>
          (anomaly.metric === 'churn' && anomaly.direction === 'up') ||
          (anomaly.metric === 'netAdds' && anomaly.direction === 'down') ||
          ((anomaly.metric === 'cvr' || anomaly.metric === 'arpu') && anomaly.direction === 'down'),
      )
      .slice(0, 3)
      .map((anomaly, index) => {
        const magnitude = abs(anomaly.z);
        const title =
          anomaly.metric === 'churn'
            ? 'Churn spike'
            : anomaly.metric === 'netAdds'
            ? 'Net adds softening'
            : anomaly.metric === 'cvr'
            ? 'CVR slide'
            : 'ARPU compression';
        const reasons =
          anomaly.metric === 'churn'
            ? [`Churn up ${magnitude} sigma vs trend`, 'Retention guardrails triggered', `Inspect ${groupLabel}`]
            : anomaly.metric === 'netAdds'
            ? [`Net adds down ${magnitude} sigma`, 'Channel pacing lagging', `Review ${groupLabel}`]
            : [`${anomalyLabel[anomaly.metric]} down ${magnitude} sigma`, 'Performance pressure building', `Inspect ${groupLabel}`];
        return {
          id: `risk-${anomaly.metric}-${index}`,
          title,
          blurb: `${anomalyLabel[anomaly.metric]} ${anomaly.direction === 'up' ? 'up' : 'down'} ${magnitude} sigma`,
          reasons,
          onView: () => setMonitor({ focus: { kpi: anomaly.metric } }),
          tone: 'risk' as const,
        } satisfies PulseEntry;
      });

    const opportunities = anomalies
      .filter((anomaly) => (anomaly.metric === 'cvr' || anomaly.metric === 'arpu') && anomaly.direction === 'up')
      .slice(0, 3)
      .map((anomaly, index) => {
        const magnitude = abs(anomaly.z);
        const title = anomaly.metric === 'cvr' ? 'CVR momentum' : 'ARPU lift';
        const reasons =
          anomaly.metric === 'cvr'
            ? [`CVR up ${magnitude} sigma`, 'Funnel conversion heating up', `Lean into ${groupLabel}`]
            : [`ARPU up ${magnitude} sigma`, 'Value per subscriber rising', `Mode lens: ${modeLabel}`];
        return {
          id: `opportunity-${anomaly.metric}-${index}`,
          title,
          blurb: `${anomalyLabel[anomaly.metric]} up ${magnitude} sigma`,
          reasons,
          onView: () => setMonitor({ focus: { kpi: anomaly.metric } }),
          tone: 'opportunity' as const,
        } satisfies PulseEntry;
      });

    const insightItems = learnings.slice(0, 3).map((text, index) => {
      const firstSentence = text.split('. ')[0] ?? text;
      const shortTitle = firstSentence.length > 60 ? `${firstSentence.slice(0, 57)}...` : firstSentence;
      const trimmed = text.length > 100 ? `${text.slice(0, 97)}...` : text;
      const lower = text.toLowerCase();
      const metric: 'cvr' | 'arpu' | 'netAdds' | 'churn' = lower.includes('churn')
        ? 'churn'
        : lower.includes('cvr') || lower.includes('conversion')
        ? 'cvr'
        : lower.includes('arpu') || lower.includes('revenue')
        ? 'arpu'
        : 'netAdds';
      return {
        id: `insight-${index}`,
        title: shortTitle,
        blurb: trimmed,
        reasons: [text, `Mode lens: ${modeLabel}`, `Share with ${groupLabel}`],
        onView: () => setMonitor({ focus: { kpi: metric } }),
        tone: 'insight' as const,
      } satisfies PulseEntry;
    });

    const fallback = (tone: PulseEntry['tone']): PulseEntry => ({
      id: `${tone}-steady`,
      title: tone === 'risk' ? 'Stable outlook' : tone === 'opportunity' ? 'Watching lift' : 'Insights steady',
      blurb: tone === 'risk' ? 'No critical deviations flagged.' : tone === 'opportunity' ? 'Monitoring for emerging lift.' : 'Review existing learnings.',
      reasons: ['No new signals surfaced', `Mode lens: ${modeLabel}`, `Keep scanning ${groupLabel}`],
      onView: () => setMonitor({ focus: null }),
      disabled: true,
      tone,
    });

    return {
      risks: risks.length ? risks : [fallback('risk')],
      opportunities: opportunities.length ? opportunities : [fallback('opportunity')],
      insights: insightItems.length ? insightItems : [fallback('insight')],
    };
  }, [anomalies, groupLabel, learnings, modeLabel, setMonitor]);

  const lever = leverByMode[mode];

  const handleApply = () => {
    const base = baseChannels[mode];
    const tweaked = channelKeys.reduce<Record<string, number>>((acc, key) => {
      const next = key === lever.channel ? Math.min(70, base[key] + lever.delta) : base[key];
      acc[key.toLowerCase()] = Number(next.toFixed(2));
      return acc;
    }, {} as Record<string, number>);
    setMonitor({ focus: { kpi: 'cvr', key: lever.channel } });
    setStep(4);
    navigate('/execution-hub', { state: { presetMix: tweaked } });
  };

  const exportCsv = () => {
    const header = ['timestamp', 'cvr', 'arpu', 'netAdds', 'churn', 'active'];
    const rows = timeline.timestamps.map((ts, index) => [
      new Date(ts).toISOString(),
      timeline.cvr[index].toFixed(4),
      timeline.arpu[index].toFixed(2),
      timeline.netAdds[index].toString(),
      timeline.churn[index].toFixed(4),
      timeline.active[index].toString(),
    ]);
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'subscriber-connect-monitoring.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportJson = () => {
    const payload = {
      mode,
      options: monitor,
      kpis: kpiCards.map((card) => ({ id: card.id, value: card.value, delta: card.delta })),
      timeline,
      channels,
      cohorts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'subscriber-connect-monitoring.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleTileClick = (config: typeof kpiCards[number]) => {
    const isActive =
      focus?.kpi === config.focus &&
      ((config.id === 'activeCampaigns' && focus.key === 'activeCampaigns') ||
        (config.id !== 'activeCampaigns' && !focus?.key));
    if (isActive) {
      setMonitor({ focus: null });
      return;
    }
    if (config.id === 'activeCampaigns') {
      setMonitor({ focus: { kpi: 'netAdds', key: 'activeCampaigns' } });
    } else {
      setMonitor({ focus: { kpi: config.focus } });
    }
  };

  const handleTileHover = (event: React.MouseEvent<HTMLDivElement>, config: typeof kpiCards[number]) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTileTooltip({
      id: config.id,
      x: rect.left + rect.width / 2,
      y: rect.top - 12,
      value: config.value,
      delta: config.delta,
      baseline: config.baseline !== undefined ? formatValue(config.metric, config.baseline) : undefined,
    });
  };

  const handleTileLeave = () => setTileTooltip(null);
  const visibleTimelineSeries = React.useMemo(() => {
    const entries: Array<{ key: keyof LegendVisibility; values: number[]; color: string; label: string; metric: KpiMetric }>
      = [];
    if (legend.cvr) entries.push({ key: 'cvr', values: timeline.cvr, color: 'rgba(16,185,129,0.85)', label: 'CVR %', metric: 'cvr' });
    if (legend.arpu) entries.push({ key: 'arpu', values: timeline.arpu, color: 'rgba(59,130,246,0.85)', label: 'ARPU Δ', metric: 'arpu' });
    if (legend.netAdds) entries.push({ key: 'netAdds', values: timeline.netAdds, color: 'rgba(244,114,182,0.85)', label: 'Net adds', metric: 'netAdds' });
    return entries;
  }, [legend, timeline]);

  const allValues = visibleTimelineSeries.flatMap((entry) => entry.values);
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 1;
  const rangeSpan = maxValue - minValue || 1;

  const handleChartMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.min(Math.max(Math.round(ratio * (timeline.timestamps.length - 1)), 0), timeline.timestamps.length - 1);
    setHoverIndex(index);
    const lines = visibleTimelineSeries.map((entry) => ({
      label: entry.label,
      value: formatValue(entry.metric, entry.values[index]),
    }));
    setChartTooltip({
      x: rect.left + rect.width * ratio,
      y: rect.top + 12,
      lines,
      timestamp: new Date(timeline.timestamps[index]).toLocaleString(),
    });
    if (isBrushing && brushWindow) {
      setBrushWindow({ start: brushWindow.start, end: ratio });
    }
  };

  const handleChartMouseLeave = () => {
    setHoverIndex(null);
    setChartTooltip(null);
    if (!isBrushing) {
      setBrushWindow(null);
    }
  };

  const handleChartMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setBrushWindow({ start: ratio, end: ratio });
    setIsBrushing(true);
  };

  const handleChartMouseUp = () => {
    if (!brushWindow) return;
    const width = Math.abs(brushWindow.end - brushWindow.start);
    if (width > 0.05) {
      const rangeValue = width < 0.33 ? '7d' : width < 0.66 ? '30d' : '90d';
      setMonitor({ range: rangeValue });
    }
    setIsBrushing(false);
    setBrushWindow(null);
  };

  const visibleChannels = React.useMemo(() => {
    return channelKeys.filter((key) => channelVisibility[key]);
  }, [channelVisibility]);

  const channelTotals = React.useMemo(() => {
    if (!visibleChannels.length) return timeline.timestamps.map(() => 0);
    const length = channels[visibleChannels[0]]?.length ?? 0;
    return Array.from({ length }, (_, index) =>
      visibleChannels.reduce((sum, key) => sum + (channels[key]?.[index] ?? 0), 0)
    );
  }, [channels, visibleChannels, timeline.timestamps.length]);

  const handleChannelMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!channelRef.current) return;
    const rect = channelRef.current.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const length = channelTotals.length;
    const index = Math.min(Math.max(Math.round(ratio * (length - 1)), 0), length - 1);
    setChannelHoverIndex(index);
    const lines: Array<{ label: string; value: string }> = visibleChannels.map((key) => ({
      label: key,
      value: `${(channels[key]?.[index] ?? 0).toFixed(1)}% allocation`,
    }));
    lines.push({ label: 'Total', value: `${channelTotals[index].toFixed(1)}%` });
    setChannelTooltip({ x: rect.left + ratio * rect.width, y: rect.top + 12, lines, timestamp: `Index ${index + 1}` });
  };

  const handleChannelLeave = () => {
    setChannelHoverIndex(null);
    setChannelTooltip(null);
  };

  const toggleLegend = (key: keyof LegendVisibility) => {
    setLegend((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleChannelVisibility = (key: ChannelKey) => {
    setChannelVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCohortClick = (cohort: CohortDatum, metric: 'cvr' | 'arpu') => {
    setMonitor({ focus: { kpi: metric === 'cvr' ? 'cvr' : 'arpu', key: cohort.cohort } });
  };

  const isFocusActive = (card: typeof kpiCards[number]) => {
    if (!focus) return false;
    if (card.id === 'activeCampaigns') return focus.key === 'activeCampaigns';
    return focus.kpi === card.focus && !focus.key;
  };

  const isChannelFocused = (key: ChannelKey) => focus?.key === key;
  const isCohortFocused = (cohort: string) => focus?.key === cohort;

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-white">Monitoring dashboard</h2>
              <InfoIcon
                title="Monitoring dashboard"
                body="Live KPIs and trends. Click tiles to focus, brush the timeline to zoom, and compare against previous baselines."
              />
            </div>
            <p className="text-sm text-slate-300">One-glance health of live {mode} plays.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span>Range</span>
              <select
                value={range}
                onChange={(event) => setMonitor({ range: event.target.value as '7d' | '30d' | '90d' })}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
              >
                <option value="7d">Last 7d</option>
                <option value="30d">Last 30d</option>
                <option value="90d">Last 90d</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span>Group by</span>
              <select
                value={groupBy}
                onChange={(event) => setMonitor({ groupBy: event.target.value as 'campaign' | 'channel' | 'cohort' })}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
              >
                <option value="campaign">Campaign</option>
                <option value="channel">Channel</option>
                <option value="cohort">Cohort</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span>Compare to</span>
              <select
                value={compare}
                onChange={(event) => setMonitor({ compare: event.target.value as typeof compare })}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
              >
                <option value="none">None</option>
                <option value="prevPeriod">Previous period</option>
                <option value="prevPlan">Previous plan</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span>Period</span>
              <select
                value={period}
                onChange={(event) => setMonitor({ period: event.target.value as 'w/w' | 'm/m' })}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
              >
                <option value="w/w">Week over week</option>
                <option value="m/m">Month over month</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={auto}
                onChange={(event) => setMonitor({ auto: event.target.checked })}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Auto-refresh</span>
            </label>
            <button
              type="button"
              onClick={() => setMonitor({ auto: false })}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900"
            >
              Export JSON
            </button>
          </div>
        </div>
        <PulseRail risks={pulseData.risks} opportunities={pulseData.opportunities} insights={pulseData.insights} />
      </header>
      <section className="grid gap-4 md:grid-cols-5">
        {kpiCards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleTileClick(card)}
            onMouseEnter={(event) => handleTileHover(event, card)}
            onMouseLeave={handleTileLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleTileClick(card);
              }
            }}
            aria-pressed={isFocusActive(card)}
            className={`relative cursor-pointer rounded-xl border px-4 py-3 transition ${
              isFocusActive(card)
                ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/30'
                : 'border-slate-800 bg-slate-950/70 hover:border-emerald-500/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                <WhyChip reasons={card.reasons} title={`${card.label} drivers`} />
              </div>
              <InfoIcon title={card.label} body={card.tooltip} />
            </div>
            <p className="mt-1 text-lg font-semibold text-white">{card.value}</p>
            {card.delta ? (
              <p className={`mt-1 text-xs font-semibold ${card.deltaPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                {card.delta}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">No comparison</p>
            )}
            <p className="text-[11px] text-slate-500">{card.helper}</p>
            <Sparkline values={card.trend} baseline={card.baseline} />
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Performance over time</h3>
            <InfoIcon
              title="Performance over time"
              body="Hover to inspect CVR, ARPU, and net adds. Toggle legend chips to isolate series and brush to change the time horizon."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            {(['cvr', 'arpu', 'netAdds'] as Array<keyof LegendVisibility>).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleLegend(key)}
                aria-pressed={legend[key]}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
                  legend[key]
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'border border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      key === 'cvr' ? 'rgba(16,185,129,0.85)' : key === 'arpu' ? 'rgba(59,130,246,0.85)' : 'rgba(244,114,182,0.85)',
                  }}
                />
                {key === 'cvr' ? 'CVR %' : key === 'arpu' ? 'ARPU Δ' : 'Net adds'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-4">
          <svg
            ref={chartRef}
            viewBox="0 0 100 100"
            className="h-64 w-full"
            preserveAspectRatio="none"
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
            onMouseDown={handleChartMouseDown}
            onMouseUp={handleChartMouseUp}
          >
            {visibleTimelineSeries.map((series) => {
              const path = series.values
                .map((value, index) => {
                  const x = (index / Math.max(series.values.length - 1, 1)) * 100;
                  const y = 100 - ((value - minValue) / rangeSpan) * 100;
                  return `${x},${y}`;
                })
                .join(' ');
              const highlight = focus?.kpi === series.metric && !focus?.key;
              return (
                <polyline
                  key={series.key}
                  points={path}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={highlight ? 2.8 : 1.8}
                  strokeOpacity={highlight || !focus ? 1 : 0.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            {brushWindow ? (
              <rect
                x={`${Math.min(brushWindow.start, brushWindow.end) * 100}`}
                width={`${Math.abs(brushWindow.end - brushWindow.start) * 100}`}
                y="0"
                height="100"
                fill="rgba(16,185,129,0.15)"
              />
            ) : null}
            {hoverIndex !== null ? (
              <line
                x1={`${(hoverIndex / Math.max(timeline.timestamps.length - 1, 1)) * 100}`}
                x2={`${(hoverIndex / Math.max(timeline.timestamps.length - 1, 1)) * 100}`}
                y1="0"
                y2="100"
                stroke="rgba(148,163,184,0.5)"
                strokeWidth={0.6}
              />
            ) : null}
          </svg>
          {chartTooltip ? (
            <div
              className="pointer-events-none absolute rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-[11px] text-slate-200 shadow-lg"
              style={{ left: Math.min(Math.max(chartTooltip.x - 60, 0), (chartRef.current?.clientWidth ?? 0) - 120), top: 8 }}
            >
              <p className="font-semibold">{chartTooltip.timestamp}</p>
              <ul className="mt-1 space-y-1">
                {chartTooltip.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-2">
                    <span>{line.label}</span>
                    <span className="font-semibold text-emerald-200">{line.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Channel effectiveness</h3>
              <InfoIcon
                title="Channel effectiveness"
                body="Stacked allocation by channel. Toggle channels below to isolate contributions; hover to inspect share and totals."
              />
            </div>
            <div className="relative mt-4">
              <svg
                ref={channelRef}
                viewBox="0 0 100 100"
                className="h-60 w-full"
                preserveAspectRatio="none"
                onMouseMove={handleChannelMove}
                onMouseLeave={handleChannelLeave}
              >
                {visibleChannels.map((key, index) => {
                  const series = channels[key] ?? [];
                  const cumulativeStart = visibleChannels.slice(0, index).reduce<number[]>((acc, channelKey) => {
                    const values = channels[channelKey] ?? [];
                    if (!acc.length) return values.map((value) => value);
                    return values.map((value, idx) => value + (acc[idx] ?? 0));
                  }, []);
                  const totals = channelTotals.map((value) => value || 1);
                  const topPath = series
                    .map((value, idx) => {
                      const x = (idx / Math.max(series.length - 1, 1)) * 100;
                      const y = 100 - ((value + (cumulativeStart[idx] ?? 0)) / totals[idx]) * 100;
                      return `${x},${y}`;
                    })
                    .join(' ');
                  const bottomPath = series
                    .map((value, idx) => {
                      const prior = cumulativeStart[idx] ?? 0;
                      const x = (idx / Math.max(series.length - 1, 1)) * 100;
                      const y = 100 - (prior / totals[idx]) * 100;
                      return `${x},${y}`;
                    })
                    .reverse()
                    .join(' ');
                  const fill =
                    key === 'Search'
                      ? 'rgba(16,185,129,0.5)'
                      : key === 'Social'
                      ? 'rgba(14,165,233,0.5)'
                      : key === 'Email'
                      ? 'rgba(129,140,248,0.5)'
                      : key === 'Retail'
                      ? 'rgba(249,115,22,0.45)'
                      : 'rgba(244,114,182,0.45)';
                  const stroke =
                    key === 'Search'
                      ? 'rgba(16,185,129,0.9)'
                      : key === 'Social'
                      ? 'rgba(14,165,233,0.9)'
                      : key === 'Email'
                      ? 'rgba(129,140,248,0.9)'
                      : key === 'Retail'
                      ? 'rgba(249,115,22,0.9)'
                      : 'rgba(244,114,182,0.9)';
                  const path = `M ${topPath} L ${bottomPath} Z`;
                  const focused = isChannelFocused(key);
                  return (
                    <path key={key} d={path} fill={fill} stroke={stroke} strokeWidth={focused ? 1.4 : 0.6} opacity={focused || !focus?.key ? 0.9 : 0.25} />
                  );
                })}
                {channelHoverIndex !== null ? (
                  <line
                    x1={`${(channelHoverIndex / Math.max(channelTotals.length - 1, 1)) * 100}`}
                    x2={`${(channelHoverIndex / Math.max(channelTotals.length - 1, 1)) * 100}`}
                    y1="0"
                    y2="100"
                    stroke="rgba(148,163,184,0.5)"
                    strokeWidth={0.6}
                  />
                ) : null}
              </svg>
              {channelTooltip ? (
                <div
                  className="pointer-events-none absolute rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-[11px] text-slate-200 shadow-lg"
                  style={{ left: Math.min(Math.max(channelTooltip.x - 60, 0), (channelRef.current?.clientWidth ?? 0) - 120), top: 8 }}
                >
                  <p className="font-semibold">{channelTooltip.timestamp}</p>
                  <ul className="mt-1 space-y-1">
                    {channelTooltip.lines.map((line) => (
                      <li key={line.label} className="flex justify-between gap-2">
                        <span>{line.label}</span>
                        <span className="font-semibold text-emerald-200">{line.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 text-center text-[11px] text-slate-400">
              {channelKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleChannelVisibility(key)}
                  aria-pressed={channelVisibility[key]}
                  className={`rounded-full px-2 py-1 transition ${
                    channelVisibility[key]
                      ? 'bg-slate-900 text-slate-200'
                      : 'border border-slate-700 bg-slate-950 text-slate-500'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Cohort compare</h3>
              <InfoIcon
                title="Cohort compare"
                body="Grouped bars highlight CVR and ARPU differences. Click a bar to lock focus on that cohort."
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <svg viewBox={`0 0 ${cohorts.length * 80} 120`} className="h-60 w-full" preserveAspectRatio="none">
                {cohorts.map((group, groupIndex) =>
                  group.metrics.map((metric, metricIndex) => {
                    const max = Math.max(
                      ...cohorts.flatMap((co) => co.metrics.map((item) => item.value))
                    );
                    const x = groupIndex * 80 + metricIndex * 28 + 12;
                    const height = (metric.value / (max || 1)) * 80;
                    const focused = isCohortFocused(group.cohort);
                    const fill = metric.metric === 'cvr' ? 'rgba(16,185,129,0.85)' : 'rgba(59,130,246,0.85)';
                    return (
                      <rect
                        key={`${group.cohort}-${metric.label}`}
                        x={x}
                        y={95 - height}
                        width={20}
                        height={height}
                        rx={3}
                        fill={fill}
                        opacity={focused || !focus?.key ? 0.9 : 0.3}
                        className="cursor-pointer"
                        onClick={() => handleCohortClick(group, metric.metric)}
                      />
                    );
                  })
                )}
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              {cohorts.map((cohort) => (
                <span
                  key={cohort.cohort}
                  className={`rounded-full border px-3 py-1 ${
                    isCohortFocused(cohort.cohort)
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {cohort.cohort}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Insights</h3>
              <InfoIcon
                title="Insights"
                body="Auto-detected anomalies, recommended levers, and learnings adapt as you change focus or grouping."
              />
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Anomalies</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {anomalies.length === 0 ? (
                    <span className="text-xs text-slate-500">No significant spikes detected.</span>
                  ) : (
                    anomalies.map((anomaly) => (
                      <span
                        key={anomaly.metric}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          anomaly.direction === 'up' ? 'border-emerald-600 text-emerald-300' : 'border-rose-600 text-rose-300'
                        }`}
                      >
                        {anomalyLabel[anomaly.metric]} {anomaly.direction === 'up' ? '▲' : '▼'} {Math.abs(anomaly.z).toFixed(1)}σ
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Best lever now</p>
                <p className="mt-1 text-slate-200">{lever.recommendation} <span className="ml-1 rounded-full border border-emerald-600 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">▲ +{lever.delta}%</span></p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">Confidence: {lever.confidence}</span>
                  {lever.cohorts.map((chip) => (
                    <span key={chip} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                      {chip}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleApply}
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
                >
                  Apply
                </button>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">What the system is learning</p>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {learnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {tileTooltip ? (
        <div
          className="pointer-events-none fixed z-40 rounded-lg border border-slate-800 bg-slate-950/95 px-3 py-2 text-[11px] text-slate-200 shadow-lg"
          style={{ left: tileTooltip.x - 80, top: Math.max(tileTooltip.y - 40, 8) }}
        >
          <p className="font-semibold">{tileTooltip.value}</p>
          {tileTooltip.delta ? <p className="text-emerald-300">{tileTooltip.delta}</p> : <p className="text-slate-500">No delta</p>}
          {tileTooltip.baseline ? <p className="text-slate-400">Baseline: {tileTooltip.baseline}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

function Sparkline({ values, baseline }: { values: number[]; baseline?: number }) {
  if (!values.length) {
    return <div className="mt-2 h-10 rounded bg-slate-900/70" />;
  }
  const min = Math.min(...values, baseline ?? values[0]);
  const max = Math.max(...values, baseline ?? values[values.length - 1]);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 40" className="mt-2 h-10 w-full text-emerald-400/80" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {baseline !== undefined ? (
        <line
          x1="0"
          x2="100"
          y1={100 - ((baseline - min) / range) * 100}
          y2={100 - ((baseline - min) / range) * 100}
          stroke="rgba(148,163,184,0.4)"
          strokeDasharray="2 2"
          strokeWidth={0.6}
        />
      ) : null}
    </svg>
  );
}

export default MonitoringDashboard;
