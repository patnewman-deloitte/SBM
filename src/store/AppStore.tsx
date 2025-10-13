import React from 'react';

const makeId = () => Math.random().toString(36).slice(2, 10);

export type ChannelKey = 'Search' | 'Social' | 'Email' | 'Retail' | 'Field';

export type CohortRef = {
  id: string;
  name: string;
  size: number;
};

export type Campaign = {
  id: string;
  name: string;
  cohorts: CohortRef[];
  status: 'Planned' | 'Running' | 'Paused' | 'Completed';
  channels: Record<ChannelKey, number>;
  offer: {
    price: number;
    promoMonths: number;
    promoValue: number;
    deviceSubsidy: number;
  };
  kpis: {
    cvr: number;
    arpuDelta: number;
    paybackMo: number;
    gm12: number;
    netAdds: number;
    npsDelta: number;
  };
  agent: 'Acquisition' | 'Upsell' | 'Retention' | 'Optimization';
  createdAt: number;
  lastUpdate: number;
};

export type TelemetryPoint = {
  t: number;
  cvr: number;
  arpuDelta: number;
  netAdds: number;
  churnDelta: number;
};

export type Monitoring = {
  streams: Record<string, TelemetryPoint[]>;
};

type AgentAction = {
  id: string;
  campaignId: string;
  timestamp: number;
  summary: string;
  lift: number;
  status: 'Applied' | 'Queued';
  details?: string;
};

type LaunchPayload = {
  name: string;
  cohorts: CohortRef[];
  channels: Record<ChannelKey, number>;
  offer: Campaign['offer'];
  agent: Campaign['agent'];
  kpis?: Campaign['kpis'];
};

type AppStoreState = {
  campaigns: Campaign[];
  monitoring: Monitoring;
  agentActions: Record<string, AgentAction[]>;
  autoOptimize: Record<string, boolean>;
};

type AppStoreValue = {
  campaigns: Campaign[];
  monitoring: Monitoring;
  agentActions: Record<string, AgentAction[]>;
  autoOptimize: Record<string, boolean>;
  launchCampaign: (payload: LaunchPayload) => Campaign;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  toggleStatus: (id: string) => void;
  tuneCampaign: (
    id: string,
    patch: {
      channels?: Partial<Record<ChannelKey, number>>;
      offer?: Partial<Campaign['offer']>;
    }
  ) => Campaign | undefined;
  setAutoOptimize: (id: string, value: boolean) => void;
  logAction: (campaignId: string, action: Omit<AgentAction, 'id' | 'campaignId' | 'timestamp'>) => void;
  scoreImpact: (
    channels: Record<ChannelKey, number>,
    offer: Campaign['offer']
  ) => Pick<Campaign['kpis'], 'cvr' | 'arpuDelta' | 'paybackMo' | 'gm12' | 'netAdds' | 'npsDelta'>;
  estimateImpact: (
    campaign: Campaign,
    deltas: {
      channels?: Partial<Record<ChannelKey, number>>;
      offer?: Partial<Campaign['offer']>;
    }
  ) => {
    next: Campaign['kpis'];
    delta: {
      cvr: number;
      arpuDelta: number;
      gm12: number;
      netAdds: number;
      paybackMo: number;
      npsDelta: number;
    };
  };
};

const BASE_METRICS = {
  cvr: 3.4,
  arpuDelta: 6.8,
  gm12: 920_000,
  netAdds: 3800,
  paybackMo: 6.4,
  npsDelta: 5.6
};

const BASE_OFFER = {
  price: 75,
  promoMonths: 3,
  promoValue: 120,
  deviceSubsidy: 180
};

const CHANNEL_WEIGHTS: Record<ChannelKey, {
  cvr: number;
  arpu: number;
  gm12: number;
  netAdds: number;
  payback: number;
  nps: number;
}> = {
  Search: { cvr: 1.15, arpu: 0.4, gm12: 65_000, netAdds: 520, payback: -0.35, nps: 0.25 },
  Social: { cvr: 0.95, arpu: 0.25, gm12: 58_000, netAdds: 470, payback: -0.28, nps: 0.18 },
  Email: { cvr: 0.45, arpu: 0.55, gm12: 34_000, netAdds: 300, payback: -0.12, nps: 0.22 },
  Retail: { cvr: 0.25, arpu: 1.2, gm12: 72_000, netAdds: 240, payback: 0.28, nps: 0.46 },
  Field: { cvr: 0.2, arpu: 1.45, gm12: 68_000, netAdds: 210, payback: 0.36, nps: 0.4 }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normaliseChannels = (channels: Record<ChannelKey, number>) => {
  const total = Object.values(channels).reduce((sum, value) => sum + value, 0) || 1;
  const normalised = Object.fromEntries(
    (Object.entries(channels) as [ChannelKey, number][]).map(([key, value]) => [key, Number((value / total).toFixed(4))])
  ) as Record<ChannelKey, number>;
  return normalised;
};

const scoreImpactInternal = (
  channels: Record<ChannelKey, number>,
  offer: Campaign['offer']
): Pick<Campaign['kpis'], 'cvr' | 'arpuDelta' | 'paybackMo' | 'gm12' | 'netAdds' | 'npsDelta'> => {
  const mix = normaliseChannels(channels);
  const channelEffect = Object.entries(mix).reduce(
    (acc, [key, weight]) => {
      const effect = CHANNEL_WEIGHTS[key as ChannelKey];
      acc.cvr += effect.cvr * weight;
      acc.arpu += effect.arpu * weight;
      acc.gm12 += effect.gm12 * weight;
      acc.netAdds += effect.netAdds * weight;
      acc.payback += effect.payback * weight;
      acc.nps += effect.nps * weight;
      return acc;
    },
    { cvr: 0, arpu: 0, gm12: 0, netAdds: 0, payback: 0, nps: 0 }
  );

  const priceDiff = offer.price - BASE_OFFER.price;
  const promoValueDiff = offer.promoValue - BASE_OFFER.promoValue;
  const promoMonthsDiff = offer.promoMonths - BASE_OFFER.promoMonths;
  const deviceDiff = offer.deviceSubsidy - BASE_OFFER.deviceSubsidy;

  const offerEffect = {
    cvr:
      priceDiff * -0.018 +
      promoValueDiff * 0.0025 +
      promoMonthsDiff * 0.12 +
      deviceDiff * 0.0018,
    arpu:
      priceDiff * 0.055 +
      promoValueDiff * -0.009 +
      promoMonthsDiff * -0.08 +
      deviceDiff * -0.003,
    gm12:
      priceDiff * 1100 +
      promoValueDiff * -160 +
      promoMonthsDiff * -9000 +
      deviceDiff * -420,
    netAdds:
      priceDiff * -6 +
      promoValueDiff * 4.5 +
      promoMonthsDiff * 120 +
      deviceDiff * 1.8,
    payback:
      priceDiff * 0.011 +
      promoValueDiff * 0.004 +
      promoMonthsDiff * 0.22 +
      deviceDiff * 0.005,
    nps:
      priceDiff * 0.03 +
      promoValueDiff * 0.018 +
      promoMonthsDiff * 0.08 +
      deviceDiff * 0.012
  };

  const result = {
    cvr: clamp(BASE_METRICS.cvr + channelEffect.cvr + offerEffect.cvr, 0.6, 9),
    arpuDelta: Number((BASE_METRICS.arpuDelta + channelEffect.arpu + offerEffect.arpu).toFixed(2)),
    gm12: Math.round(clamp(BASE_METRICS.gm12 + channelEffect.gm12 + offerEffect.gm12, 120_000, 2_200_000)),
    netAdds: Math.round(clamp(BASE_METRICS.netAdds + channelEffect.netAdds + offerEffect.netAdds, 420, 9800)),
    paybackMo: Number(clamp(BASE_METRICS.paybackMo + channelEffect.payback + offerEffect.payback, 3, 18).toFixed(2)),
    npsDelta: Number((BASE_METRICS.npsDelta + channelEffect.nps + offerEffect.nps).toFixed(2))
  };

  return result;
};

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const nextTelemetryPoint = (prev: TelemetryPoint | undefined, campaign: Campaign): TelemetryPoint => {
  const anchor = campaign.kpis;
  if (!prev) {
    return {
      t: Date.now(),
      cvr: anchor.cvr,
      arpuDelta: anchor.arpuDelta,
      netAdds: anchor.netAdds,
      churnDelta: campaign.agent === 'Retention' ? -0.4 : 0.2
    };
  }

  const smoothing = 0.18;
  const cvr = clamp(
    prev.cvr + randomBetween(-0.12, 0.12) + (anchor.cvr - prev.cvr) * smoothing,
    0.4,
    9.5
  );
  const arpuDelta = clamp(
    prev.arpuDelta + randomBetween(-0.25, 0.28) + (anchor.arpuDelta - prev.arpuDelta) * 0.16,
    -4,
    18
  );
  const netAdds = clamp(
    prev.netAdds + randomBetween(-90, 110) + (anchor.netAdds - prev.netAdds) * 0.22,
    220,
    12_000
  );
  const churnDeltaBase = campaign.agent === 'Retention' ? -0.25 : 0.18;
  const churnDelta = clamp(
    prev.churnDelta + randomBetween(-0.05, 0.06) + churnDeltaBase * 0.1,
    -2.2,
    2.4
  );

  return {
    t: Date.now(),
    cvr: Number(cvr.toFixed(2)),
    arpuDelta: Number(arpuDelta.toFixed(2)),
    netAdds: Math.round(netAdds),
    churnDelta: Number(churnDelta.toFixed(2))
  };
};

const initialCampaign: Campaign = {
  id: 'cmp_001',
  name: 'Premium Network Loyalists — Family Coverage Maximizers',
  cohorts: [
    { id: 'seg-premium', name: 'Premium Network Loyalists', size: 128_000 },
    { id: 'seg-family', name: 'Family Coverage Maximizers', size: 82_000 }
  ],
  status: 'Running',
  channels: normaliseChannels({ Search: 0.28, Social: 0.22, Email: 0.18, Retail: 0.2, Field: 0.12 }),
  offer: {
    price: 85,
    promoMonths: 4,
    promoValue: 180,
    deviceSubsidy: 220
  },
  kpis: {
    cvr: 4.1,
    arpuDelta: 7.4,
    paybackMo: 6.8,
    gm12: 1_180_000,
    netAdds: 4860,
    npsDelta: 6.3
  },
  agent: 'Acquisition',
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
  lastUpdate: Date.now() - 1000 * 60 * 60 * 2
};

const seedTelemetry = (): TelemetryPoint[] => {
  const points: TelemetryPoint[] = [];
  let prev: TelemetryPoint | undefined;
  for (let i = 0; i < 16; i += 1) {
    prev = nextTelemetryPoint(prev, initialCampaign);
    points.push({ ...prev, t: Date.now() - (15 - i) * 1000 * 60 * 6 });
  }
  return points;
};

const initialState: AppStoreState = {
  campaigns: [initialCampaign],
  monitoring: {
    streams: {
      [initialCampaign.id]: seedTelemetry()
    }
  },
  agentActions: {
    [initialCampaign.id]: [
      {
        id: makeId(),
        campaignId: initialCampaign.id,
        timestamp: Date.now() - 1000 * 60 * 45,
        summary: 'Rebalanced Search up +4% to capture intent from premium switchers.',
        lift: 0.6,
        status: 'Applied',
        details: 'Projected GM12 lift +$42K'
      }
    ]
  },
  autoOptimize: {
    [initialCampaign.id]: false
  }
};

const AppStoreContext = React.createContext<AppStoreValue | undefined>(undefined);

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<AppStoreState>(initialState);

  const launchCampaign = React.useCallback((payload: LaunchPayload): Campaign => {
    const now = Date.now();
    const kpis: Campaign['kpis'] = payload.kpis ?? scoreImpactInternal(payload.channels, payload.offer);
    const channels = normaliseChannels(payload.channels);
    const campaign: Campaign = {
      id: makeId(),
      name: payload.name,
      cohorts: payload.cohorts,
      status: 'Running',
      channels,
      offer: payload.offer,
      kpis,
      agent: payload.agent,
      createdAt: now,
      lastUpdate: now
    };

    const points: TelemetryPoint[] = [];
    let prevPoint: TelemetryPoint | undefined;
    for (let i = 0; i < 8; i += 1) {
      prevPoint = nextTelemetryPoint(prevPoint, campaign);
      points.push({ ...prevPoint, t: now - (7 - i) * 1000 * 60 * 6 });
    }

    const nextState: AppStoreState = {
      campaigns: [campaign, ...state.campaigns],
      monitoring: {
        streams: {
          ...state.monitoring.streams,
          [campaign.id]: points
        }
      },
      agentActions: {
        ...state.agentActions,
        [campaign.id]: [
          {
            id: makeId(),
            campaignId: campaign.id,
            timestamp: now,
            summary: 'Campaign launched from Offering Designer hand-off.',
            lift: 0,
            status: 'Applied',
            details: 'Baseline telemetry initialised.'
          }
        ]
      },
      autoOptimize: {
        ...state.autoOptimize,
        [campaign.id]: false
      }
    };

    setState(nextState);

    return campaign;
  }, []);

  const updateCampaign = React.useCallback((id: string, patch: Partial<Campaign>) => {
    setState((prev) => {
      const campaigns: Campaign[] = prev.campaigns.map((campaign) => {
        if (campaign.id !== id) return campaign;
        const next: Campaign = { ...campaign, ...patch, lastUpdate: Date.now() };
        return next;
      });
      return { ...prev, campaigns };
    });
  }, []);

  const toggleStatus = React.useCallback((id: string) => {
    setState((prev) => {
      const campaigns: Campaign[] = prev.campaigns.map((campaign) => {
        if (campaign.id !== id) return campaign;
        const status: Campaign['status'] = campaign.status === 'Running' ? 'Paused' : 'Running';
        return { ...campaign, status, lastUpdate: Date.now() };
      });
      return { ...prev, campaigns };
    });
  }, []);

  const applyTune = React.useCallback(
    (campaign: Campaign, patch: {
      channels?: Partial<Record<ChannelKey, number>>;
      offer?: Partial<Campaign['offer']>;
    }): Campaign => {
      const nextChannels = normaliseChannels({ ...campaign.channels, ...patch.channels });
      const nextOffer = { ...campaign.offer, ...patch.offer };
      const kpis = scoreImpactInternal(nextChannels, nextOffer);
      return {
        ...campaign,
        channels: nextChannels,
        offer: nextOffer,
        kpis,
        lastUpdate: Date.now()
      };
    },
    []
  );

  const tuneCampaign = React.useCallback(
    (id: string, patch: { channels?: Partial<Record<ChannelKey, number>>; offer?: Partial<Campaign['offer']> }) => {
      let updatedCampaign: Campaign | undefined;
      setState((prev) => {
        const campaigns = prev.campaigns.map((campaign) => {
          if (campaign.id !== id) return campaign;
          updatedCampaign = applyTune(campaign, patch);
          return updatedCampaign;
        });
        const monitoring = { ...prev.monitoring };
        if (updatedCampaign) {
          const stream = prev.monitoring.streams[id] ?? [];
          const nextPoint = nextTelemetryPoint(stream[stream.length - 1], updatedCampaign);
          monitoring.streams = {
            ...prev.monitoring.streams,
            [id]: [...stream.slice(-60), nextPoint]
          };
        }
        return {
          ...prev,
          campaigns,
          monitoring
        };
      });
      return updatedCampaign;
    },
    [applyTune]
  );

  const setAutoOptimize = React.useCallback((id: string, value: boolean) => {
    setState((prev) => ({
      ...prev,
      autoOptimize: { ...prev.autoOptimize, [id]: value }
    }));
  }, []);

  const logAction = React.useCallback(
    (campaignId: string, action: Omit<AgentAction, 'id' | 'campaignId' | 'timestamp'>) => {
      setState((prev) => {
        const entry: AgentAction = {
          ...action,
          id: makeId(),
          campaignId,
          timestamp: Date.now()
        };
        const list = prev.agentActions[campaignId] ?? [];
        return {
          ...prev,
          agentActions: {
            ...prev.agentActions,
            [campaignId]: [entry, ...list].slice(0, 12)
          }
        };
      });
    },
    []
  );

  const estimateImpact = React.useCallback(
    (campaign: Campaign, deltas: { channels?: Partial<Record<ChannelKey, number>>; offer?: Partial<Campaign['offer']> }) => {
      const nextCampaign = applyTune(campaign, deltas);
      return {
        next: nextCampaign.kpis,
        delta: {
          cvr: Number((nextCampaign.kpis.cvr - campaign.kpis.cvr).toFixed(2)),
          arpuDelta: Number((nextCampaign.kpis.arpuDelta - campaign.kpis.arpuDelta).toFixed(2)),
          gm12: Number((nextCampaign.kpis.gm12 - campaign.kpis.gm12).toFixed(0)),
          netAdds: Number((nextCampaign.kpis.netAdds - campaign.kpis.netAdds).toFixed(0)),
          paybackMo: Number((nextCampaign.kpis.paybackMo - campaign.kpis.paybackMo).toFixed(2)),
          npsDelta: Number((nextCampaign.kpis.npsDelta - campaign.kpis.npsDelta).toFixed(2))
        }
      };
    },
    [applyTune]
  );

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setState((prev) => {
        let mutated = false;
        const streams: Monitoring['streams'] = { ...prev.monitoring.streams };
        const campaigns = prev.campaigns.map((campaign) => {
          if (campaign.status !== 'Running') {
            return campaign;
          }
          const stream = streams[campaign.id] ?? [];
          const nextPoint = nextTelemetryPoint(stream[stream.length - 1], campaign);
          streams[campaign.id] = [...stream.slice(-60), nextPoint];
          mutated = true;
          return campaign;
        });
        if (!mutated) return prev;
        return {
          ...prev,
          campaigns,
          monitoring: { streams }
        };
      });
    }, 6000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setState((prev) => {
        let mutated = false;
        const streams: Monitoring['streams'] = { ...prev.monitoring.streams };
        const campaigns = prev.campaigns.map((campaign) => {
          if (!prev.autoOptimize[campaign.id] || campaign.status !== 'Running') {
            return campaign;
          }
          mutated = true;
          const randomChannel = (Object.keys(campaign.channels) as ChannelKey[])[
            Math.floor(Math.random() * 5)
          ];
          const direction = Math.random() > 0.5 ? 0.02 : -0.02;
          const channelPatch: Partial<Record<ChannelKey, number>> = {
            [randomChannel]: campaign.channels[randomChannel] + direction
          };
          const tuned = applyTune(campaign, { channels: channelPatch });
          const existing = streams[campaign.id] ?? [];
          const nextPoint = nextTelemetryPoint(existing[existing.length - 1], tuned);
          streams[campaign.id] = [...existing, nextPoint].slice(-60);
          return tuned;
        });
        if (!mutated) return prev;
        const agentActions = { ...prev.agentActions };
        campaigns.forEach((campaign) => {
          if (!prev.autoOptimize[campaign.id]) return;
          const list = agentActions[campaign.id] ?? [];
          const entry: AgentAction = {
            id: makeId(),
            campaignId: campaign.id,
            timestamp: Date.now(),
            summary: 'Auto-optimize nudged mix ±2% based on live telemetry.',
            lift: 0.3,
            status: 'Applied',
            details: 'Auto agent blended Search/Social reach.'
          };
          agentActions[campaign.id] = [entry, ...list].slice(0, 12);
        });
        return {
          ...prev,
          campaigns,
          monitoring: { streams },
          agentActions
        };
      });
    }, 12_000);
    return () => window.clearInterval(interval);
  }, [applyTune]);

  const value = React.useMemo<AppStoreValue>(() => ({
    campaigns: state.campaigns,
    monitoring: state.monitoring,
    agentActions: state.agentActions,
    autoOptimize: state.autoOptimize,
    launchCampaign,
    updateCampaign,
    toggleStatus,
    tuneCampaign,
    setAutoOptimize,
    logAction,
    scoreImpact: scoreImpactInternal,
    estimateImpact
  }), [
    state.campaigns,
    state.monitoring,
    state.agentActions,
    state.autoOptimize,
    launchCampaign,
    updateCampaign,
    toggleStatus,
    tuneCampaign,
    setAutoOptimize,
    logAction,
    estimateImpact
  ]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};

export const useAppStore = () => {
  const ctx = React.useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }
  return ctx;
};

export const appStoreUtils = {
  scoreImpact: scoreImpactInternal,
  nextTelemetryPoint
};

