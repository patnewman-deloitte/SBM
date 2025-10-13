import { Mode } from './appState';

const delay = <T,>(value: T, base = 320) =>
  new Promise<T>((resolve) => {
    const ms = base + Math.floor(Math.random() * 280);
    globalThis.setTimeout(() => resolve(value), ms);
  });

type RadarInsight = { id: string; label: string; score: number; velocity: number };
type SegmentInsight = { id: string; opportunity: number; payback: number; gm12: number };

type ScoringResponse = {
  radar: RadarInsight[];
  segments: SegmentInsight[];
};

const scoringSeeds: Record<Mode, ScoringResponse> = {
  acquire: {
    radar: [
      { id: 'hh_digital', label: 'Digital-first households', score: 84, velocity: 0.32 },
      { id: 'switchers', label: 'Port-in seekers', score: 78, velocity: 0.28 },
      { id: 'value_stackers', label: 'Value stackers', score: 73, velocity: 0.22 }
    ],
    segments: [
      { id: 'seg-west', opportunity: 0.64, payback: 8.6, gm12: 1_240_000 },
      { id: 'seg-sunbelt', opportunity: 0.58, payback: 9.1, gm12: 980_000 },
      { id: 'seg-metro', opportunity: 0.52, payback: 7.4, gm12: 1_120_000 }
    ]
  },
  grow: {
    radar: [
      { id: 'bundle_loyalists', label: 'Bundle loyalists', score: 81, velocity: 0.27 },
      { id: 'fiber_upgrades', label: 'Fiber-ready upgrades', score: 77, velocity: 0.21 },
      { id: 'mobile_cross', label: 'Mobile cross-sell', score: 72, velocity: 0.19 }
    ],
    segments: [
      { id: 'seg-hybrid', opportunity: 0.55, payback: 7.2, gm12: 890_000 },
      { id: 'seg-hq', opportunity: 0.5, payback: 6.4, gm12: 960_000 },
      { id: 'seg-gamer', opportunity: 0.47, payback: 6.9, gm12: 820_000 }
    ]
  },
  retain: {
    radar: [
      { id: 'at_risk', label: 'At-risk fiber homes', score: 76, velocity: 0.26 },
      { id: 'device_finance', label: 'Device finance expiring', score: 71, velocity: 0.18 },
      { id: 'premium_loyal', label: 'Premium loyalists', score: 69, velocity: 0.16 }
    ],
    segments: [
      { id: 'seg-defend', opportunity: 0.49, payback: 5.8, gm12: 760_000 },
      { id: 'seg-premium', opportunity: 0.46, payback: 6.1, gm12: 810_000 },
      { id: 'seg-stability', opportunity: 0.44, payback: 5.5, gm12: 720_000 }
    ]
  }
};

export const scoringAPI = {
  get: async (mode: Mode): Promise<ScoringResponse> => delay(scoringSeeds[mode])
};

type OfferSimInput = {
  mode: Mode;
  segment?: { id: string; size: number };
  params?: { offerDepth?: number; channelMix?: number };
};

type OfferSimResponse = {
  payback: number;
  gm12: number;
  netAdds: number;
  flags: string[];
};

export const offersAPI = {
  simulate: async ({ mode, segment, params }: OfferSimInput): Promise<OfferSimResponse> => {
    const base = mode === 'retain' ? 0.88 : mode === 'grow' ? 0.94 : 1;
    const scale = segment ? Math.log10(Math.max(segment.size, 10_000)) : 4.2;
    const depth = params?.offerDepth ?? 1;
    const payback = Math.max(5.5, (11 - base * 3) * (2 / (depth + 1)));
    const gm12 = Math.round(650_000 * scale * base);
    const netAdds = Math.round(2_400 * scale * (depth + base));
    const flags = [] as string[];
    if (payback > 12) flags.push('payback_slow');
    if (depth > 1.6) flags.push('promo_rich');
    return delay({ payback, gm12, netAdds, flags }, 360);
  }
};

type ExecPushInput = {
  mode: Mode;
  plan: {
    id: string;
    name: string;
    cohorts: Array<{ id: string; name: string; size: number }>;
    channels: Record<string, number>;
    offer: { price: number; promoMonths: number; promoValue: number; deviceSubsidy: number };
  };
};

type ExecPushResponse = {
  planId: string;
  jobs: Array<{ id: string; label: string; status: 'queued' | 'running' | 'done' }>;
};

export const execAPI = {
  push: async ({ mode, plan }: ExecPushInput): Promise<ExecPushResponse> => {
    const planId = `${mode}-${plan.id}-${Date.now()}`;
    const jobs: ExecPushResponse['jobs'] = [
      { id: `${planId}-qa`, label: 'QA guardrails', status: 'queued' },
      { id: `${planId}-launch`, label: 'Channel activation', status: 'queued' },
      { id: `${planId}-sync`, label: 'Telemetry sync', status: 'queued' }
    ];
    return delay({ planId, jobs }, 420);
  }
};

type MetricPoint = { t: number; value: number };

type MetricsResponse = {
  cvr: MetricPoint[];
  arpu: MetricPoint[];
  netAdds: MetricPoint[];
};

const buildSeries = (mode: Mode, seed: number): MetricsResponse => {
  const now = Date.now();
  const span = 12;
  const lift = mode === 'grow' ? 1.08 : mode === 'retain' ? 0.92 : 1;
  const series = Array.from({ length: span }).map((_, index) => {
    const time = now - (span - index) * 24 * 60 * 60 * 1000;
    const cvr = Number((0.042 * lift + (Math.sin(index / 2 + seed) * 0.003)).toFixed(3));
    const arpu = Number((4.2 * lift + Math.cos(index / 2 + seed) * 0.6).toFixed(2));
    const net = Math.round(2100 * lift + Math.sin(index / 3 + seed) * 260);
    return { time, cvr, arpu, net };
  });
  return {
    cvr: series.map((point) => ({ t: point.time, value: point.cvr })),
    arpu: series.map((point) => ({ t: point.time, value: point.arpu })),
    netAdds: series.map((point) => ({ t: point.time, value: point.net }))
  };
};

export const metricsAPI = {
  get: async (mode: Mode): Promise<MetricsResponse> => delay(buildSeries(mode, mode === 'grow' ? 1.2 : mode === 'retain' ? 2 : 0.6), 380)
};
