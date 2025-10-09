import React from 'react';
import { useNavigate } from 'react-router-dom';
import BubbleChart, { BubblePoint } from '../../components/BubbleChart';
import InfoPopover from '../../components/InfoPopover';
import MapView, { GeoNode } from '../../components/MapView';
import PillToggle from '../../components/PillToggle';
import RightRail from '../../components/RightRail';
import SegmentTile from '../../components/SegmentTile';
import SelectionTray from '../../components/SelectionTray';
import { parseIntent } from '../../lib/intentParser';
import { simulateCampaign } from '../../sim/tinySim';
import { useGlobalStore } from '../../store/global';

const geoTree: GeoNode[] = [
  {
    id: 'ca',
    name: 'California',
    value: 82,
    meta: { region: 'west' },
    children: [
      {
        id: 'sf-dma',
        name: 'San Francisco Bay DMA',
        value: 74,
        meta: { dma: 'san francisco' },
        children: [
          { id: '941', name: 'ZIP3 941', value: 68, meta: { zip3: '941' } },
          { id: '945', name: 'ZIP3 945', value: 72, meta: { zip3: '945' } },
          { id: '947', name: 'ZIP3 947', value: 65, meta: { zip3: '947' } }
        ]
      },
      {
        id: 'la-dma',
        name: 'Los Angeles DMA',
        value: 80,
        meta: { dma: 'los angeles' },
        children: [
          { id: '900', name: 'ZIP3 900', value: 76, meta: { zip3: '900' } },
          { id: '902', name: 'ZIP3 902', value: 70, meta: { zip3: '902' } },
          { id: '913', name: 'ZIP3 913', value: 65, meta: { zip3: '913' } }
        ]
      }
    ]
  },
  {
    id: 'tx',
    name: 'Texas',
    value: 75,
    meta: { region: 'south' },
    children: [
      {
        id: 'dal-dma',
        name: 'Dallas-Fort Worth DMA',
        value: 68,
        meta: { dma: 'dallas' },
        children: [
          { id: '750', name: 'ZIP3 750', value: 63, meta: { zip3: '750' } },
          { id: '752', name: 'ZIP3 752', value: 60, meta: { zip3: '752' } },
          { id: '761', name: 'ZIP3 761', value: 58, meta: { zip3: '761' } }
        ]
      },
      {
        id: 'aus-dma',
        name: 'Austin DMA',
        value: 72,
        meta: { dma: 'austin' },
        children: [
          { id: '786', name: 'ZIP3 786', value: 69, meta: { zip3: '786' } },
          { id: '787', name: 'ZIP3 787', value: 74, meta: { zip3: '787' } },
          { id: '765', name: 'ZIP3 765', value: 65, meta: { zip3: '765' } }
        ]
      }
    ]
  },
  {
    id: 'ny',
    name: 'New York',
    value: 78,
    meta: { region: 'northeast' },
    children: [
      {
        id: 'nyc-dma',
        name: 'NYC DMA',
        value: 82,
        meta: { dma: 'new york' },
        children: [
          { id: '100', name: 'ZIP3 100', value: 80, meta: { zip3: '100' } },
          { id: '101', name: 'ZIP3 101', value: 70, meta: { zip3: '101' } },
          { id: '112', name: 'ZIP3 112', value: 68, meta: { zip3: '112' } }
        ]
      }
    ]
  }
];

type ViewMode = 'market' | 'map' | 'compare';

export type Filters = {
  peoplePlace: {
    locationContext: { geoLevel: 'National' | 'Region' | 'State' | 'ZIP'; areaType: 'Urban' | 'Suburban' | 'Rural' | 'Any' };
    incomeLevel: [number, number];
    hhSizeLines: { hhSize: number | 'Any'; lines: number | 'Any' };
    device5G: { deviceTypes: string[]; fiveGReady: boolean | 'Any' };
    tenurePay: { tenureMonths: [number, number]; payReliability: number | 'Any' };
  };
  motivationMindset: {
    priceSensitivity: number;
    speedCoverageImportance: number;
    valueForMoney: number;
    switchLikelihood2mo: number;
    topFrustrations: string[];
  };
  behaviorsInterests: {
    socialTrendAffinity: number;
    topSpendOutsideConn: string[];
    avgConnSpend: [number, number];
    streamingGamingUsage: number;
    bundlePropensity: string[];
  };
  externalSwitchTriggers: {
    recentMove: 'Yes' | 'No' | 'Unknown' | 'Any';
    newServicesAvailable: string[];
    competitorPromoLevel: 'None' | 'Minor' | 'Significant' | 'Any';
    eventWindow: string[];
    localDisruption: string[];
  };
  competitiveEnvironment: {
    currentPreviousProvider: string[];
    comparingTo: string | 'Any';
    rivalBeatsUsOn: string[];
    winRateVsRival: [number, number];
    rivalServiceAtAddress: 'Yes' | 'No' | 'Unknown' | 'Any';
  };
};

const defaultFilters: Filters = {
  peoplePlace: {
    locationContext: { geoLevel: 'National', areaType: 'Any' },
    incomeLevel: [0, 0],
    hhSizeLines: { hhSize: 'Any', lines: 'Any' },
    device5G: { deviceTypes: [], fiveGReady: 'Any' },
    tenurePay: { tenureMonths: [0, 0], payReliability: 'Any' },
  },
  motivationMindset: {
    priceSensitivity: 50,
    speedCoverageImportance: 50,
    valueForMoney: 50,
    switchLikelihood2mo: 50,
    topFrustrations: [],
  },
  behaviorsInterests: {
    socialTrendAffinity: 50,
    topSpendOutsideConn: [],
    avgConnSpend: [0, 0],
    streamingGamingUsage: 50,
    bundlePropensity: [],
  },
  externalSwitchTriggers: {
    recentMove: 'Any',
    newServicesAvailable: [],
    competitorPromoLevel: 'Any',
    eventWindow: [],
    localDisruption: [],
  },
  competitiveEnvironment: {
    currentPreviousProvider: [],
    comparingTo: 'Any',
    rivalBeatsUsOn: [],
    winRateVsRival: [0, 0],
    rivalServiceAtAddress: 'Any',
  },
};

const STORAGE_KEY = 'sbm.mr.filters';

export const buildQuery = (filters: Filters) => {
  const query: Record<string, string | number | boolean> = {};
  const push = (key: string, value: unknown) => {
    if (Array.isArray(value)) {
      query[key] = value.length ? value.join('|') : 'Any';
      return;
    }
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    query[key] = value as string | number | boolean;
  };

  push('peoplePlace.locationContext.geoLevel', filters.peoplePlace.locationContext.geoLevel);
  push('peoplePlace.locationContext.areaType', filters.peoplePlace.locationContext.areaType);
  push('peoplePlace.incomeLevel.min', filters.peoplePlace.incomeLevel[0]);
  push('peoplePlace.incomeLevel.max', filters.peoplePlace.incomeLevel[1]);
  push('peoplePlace.hhSize', filters.peoplePlace.hhSizeLines.hhSize);
  push('peoplePlace.lines', filters.peoplePlace.hhSizeLines.lines);
  push('peoplePlace.deviceTypes', filters.peoplePlace.device5G.deviceTypes);
  push('peoplePlace.fiveGReady', filters.peoplePlace.device5G.fiveGReady);
  push('peoplePlace.tenureMonths.min', filters.peoplePlace.tenurePay.tenureMonths[0]);
  push('peoplePlace.tenureMonths.max', filters.peoplePlace.tenurePay.tenureMonths[1]);
  push('peoplePlace.payReliability', filters.peoplePlace.tenurePay.payReliability);

  push('motivationMindset.priceSensitivity', filters.motivationMindset.priceSensitivity);
  push('motivationMindset.speedCoverageImportance', filters.motivationMindset.speedCoverageImportance);
  push('motivationMindset.valueForMoney', filters.motivationMindset.valueForMoney);
  push('motivationMindset.switchLikelihood2mo', filters.motivationMindset.switchLikelihood2mo);
  push('motivationMindset.topFrustrations', filters.motivationMindset.topFrustrations);

  push('behaviorsInterests.socialTrendAffinity', filters.behaviorsInterests.socialTrendAffinity);
  push('behaviorsInterests.topSpendOutsideConn', filters.behaviorsInterests.topSpendOutsideConn);
  push('behaviorsInterests.avgConnSpend.min', filters.behaviorsInterests.avgConnSpend[0]);
  push('behaviorsInterests.avgConnSpend.max', filters.behaviorsInterests.avgConnSpend[1]);
  push('behaviorsInterests.streamingGamingUsage', filters.behaviorsInterests.streamingGamingUsage);
  push('behaviorsInterests.bundlePropensity', filters.behaviorsInterests.bundlePropensity);

  push('externalSwitchTriggers.recentMove', filters.externalSwitchTriggers.recentMove);
  push('externalSwitchTriggers.newServicesAvailable', filters.externalSwitchTriggers.newServicesAvailable);
  push('externalSwitchTriggers.competitorPromoLevel', filters.externalSwitchTriggers.competitorPromoLevel);
  push('externalSwitchTriggers.eventWindow', filters.externalSwitchTriggers.eventWindow);
  push('externalSwitchTriggers.localDisruption', filters.externalSwitchTriggers.localDisruption);

  push('competitiveEnvironment.currentPreviousProvider', filters.competitiveEnvironment.currentPreviousProvider);
  push('competitiveEnvironment.comparingTo', filters.competitiveEnvironment.comparingTo);
  push('competitiveEnvironment.rivalBeatsUsOn', filters.competitiveEnvironment.rivalBeatsUsOn);
  push('competitiveEnvironment.winRateVsRival.min', filters.competitiveEnvironment.winRateVsRival[0]);
  push('competitiveEnvironment.winRateVsRival.max', filters.competitiveEnvironment.winRateVsRival[1]);
  push('competitiveEnvironment.rivalServiceAtAddress', filters.competitiveEnvironment.rivalServiceAtAddress);

  return query;
};

const defaultChannelMix = {
  'ch-search': 0.32,
  'ch-social': 0.24,
  'ch-email': 0.16,
  'ch-retail': 0.18,
  'ch-field': 0.1
};

const MarketRadar: React.FC = () => {
  const navigate = useNavigate();
  const segments = useGlobalStore((s) => s.segments);
  const microSegmentsByParent = useGlobalStore((s) => s.microSegmentsByParent);
  const offers = useGlobalStore((s) => s.offers);
  const channels = useGlobalStore((s) => s.channels);
  const assumptions = useGlobalStore((s) => s.assumptions);
  const cartSegmentIds = useGlobalStore((s) => s.cartSegmentIds);
  const setRecommended = useGlobalStore((s) => s.setRecommendedSegmentIds);
  const addToCart = useGlobalStore((s) => s.addSegmentToCart);
  const removeFromCart = useGlobalStore((s) => s.removeSegmentFromCart);
  const setActiveSegment = useGlobalStore((s) => s.setActiveSegment);
  const activeSegmentId = useGlobalStore((s) => s.activeSegmentId);

  const [view, setView] = React.useState<ViewMode>('market');
  const [command, setCommand] = React.useState('');
  const [intentSummary, setIntentSummary] = React.useState('');
  const [filters, setFiltersState] = React.useState<Filters>(defaultFilters);
  const [filtersHydrated, setFiltersHydrated] = React.useState(false);
  const [openSections, setOpenSections] = React.useState<Record<keyof Filters, boolean>>({
    peoplePlace: true,
    motivationMindset: true,
    behaviorsInterests: true,
    externalSwitchTriggers: true,
    competitiveEnvironment: true,
  });

  const mergeFilterDefaults = React.useCallback((partial?: Partial<Filters>): Filters => ({
    peoplePlace: {
      locationContext: {
        geoLevel: partial?.peoplePlace?.locationContext?.geoLevel ?? defaultFilters.peoplePlace.locationContext.geoLevel,
        areaType: partial?.peoplePlace?.locationContext?.areaType ?? defaultFilters.peoplePlace.locationContext.areaType,
      },
      incomeLevel: [...(partial?.peoplePlace?.incomeLevel ?? defaultFilters.peoplePlace.incomeLevel)] as [number, number],
      hhSizeLines: {
        hhSize: partial?.peoplePlace?.hhSizeLines?.hhSize ?? defaultFilters.peoplePlace.hhSizeLines.hhSize,
        lines: partial?.peoplePlace?.hhSizeLines?.lines ?? defaultFilters.peoplePlace.hhSizeLines.lines,
      },
      device5G: {
        deviceTypes: [...(partial?.peoplePlace?.device5G?.deviceTypes ?? defaultFilters.peoplePlace.device5G.deviceTypes)],
        fiveGReady: partial?.peoplePlace?.device5G?.fiveGReady ?? defaultFilters.peoplePlace.device5G.fiveGReady,
      },
      tenurePay: {
        tenureMonths: [...(partial?.peoplePlace?.tenurePay?.tenureMonths ?? defaultFilters.peoplePlace.tenurePay.tenureMonths)] as [number, number],
        payReliability: partial?.peoplePlace?.tenurePay?.payReliability ?? defaultFilters.peoplePlace.tenurePay.payReliability,
      },
    },
    motivationMindset: {
      priceSensitivity: partial?.motivationMindset?.priceSensitivity ?? defaultFilters.motivationMindset.priceSensitivity,
      speedCoverageImportance:
        partial?.motivationMindset?.speedCoverageImportance ?? defaultFilters.motivationMindset.speedCoverageImportance,
      valueForMoney: partial?.motivationMindset?.valueForMoney ?? defaultFilters.motivationMindset.valueForMoney,
      switchLikelihood2mo:
        partial?.motivationMindset?.switchLikelihood2mo ?? defaultFilters.motivationMindset.switchLikelihood2mo,
      topFrustrations: [...(partial?.motivationMindset?.topFrustrations ?? defaultFilters.motivationMindset.topFrustrations)],
    },
    behaviorsInterests: {
      socialTrendAffinity:
        partial?.behaviorsInterests?.socialTrendAffinity ?? defaultFilters.behaviorsInterests.socialTrendAffinity,
      topSpendOutsideConn: [...(partial?.behaviorsInterests?.topSpendOutsideConn ?? defaultFilters.behaviorsInterests.topSpendOutsideConn)],
      avgConnSpend: [...(partial?.behaviorsInterests?.avgConnSpend ?? defaultFilters.behaviorsInterests.avgConnSpend)] as [number, number],
      streamingGamingUsage:
        partial?.behaviorsInterests?.streamingGamingUsage ?? defaultFilters.behaviorsInterests.streamingGamingUsage,
      bundlePropensity: [...(partial?.behaviorsInterests?.bundlePropensity ?? defaultFilters.behaviorsInterests.bundlePropensity)],
    },
    externalSwitchTriggers: {
      recentMove: partial?.externalSwitchTriggers?.recentMove ?? defaultFilters.externalSwitchTriggers.recentMove,
      newServicesAvailable: [...(partial?.externalSwitchTriggers?.newServicesAvailable ?? defaultFilters.externalSwitchTriggers.newServicesAvailable)],
      competitorPromoLevel:
        partial?.externalSwitchTriggers?.competitorPromoLevel ?? defaultFilters.externalSwitchTriggers.competitorPromoLevel,
      eventWindow: [...(partial?.externalSwitchTriggers?.eventWindow ?? defaultFilters.externalSwitchTriggers.eventWindow)],
      localDisruption: [...(partial?.externalSwitchTriggers?.localDisruption ?? defaultFilters.externalSwitchTriggers.localDisruption)],
    },
    competitiveEnvironment: {
      currentPreviousProvider: [...(partial?.competitiveEnvironment?.currentPreviousProvider ?? defaultFilters.competitiveEnvironment.currentPreviousProvider)],
      comparingTo: partial?.competitiveEnvironment?.comparingTo ?? defaultFilters.competitiveEnvironment.comparingTo,
      rivalBeatsUsOn: [...(partial?.competitiveEnvironment?.rivalBeatsUsOn ?? defaultFilters.competitiveEnvironment.rivalBeatsUsOn)],
      winRateVsRival: [...(partial?.competitiveEnvironment?.winRateVsRival ?? defaultFilters.competitiveEnvironment.winRateVsRival)] as [number, number],
      rivalServiceAtAddress:
        partial?.competitiveEnvironment?.rivalServiceAtAddress ?? defaultFilters.competitiveEnvironment.rivalServiceAtAddress,
    },
  }), []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<Filters>;
        setFiltersState(mergeFilterDefaults(parsed));
      } catch {
        setFiltersState(mergeFilterDefaults());
      }
    } else {
      setFiltersState(mergeFilterDefaults());
    }
    setFiltersHydrated(true);
  }, [mergeFilterDefaults]);

  React.useEffect(() => {
    if (!filtersHydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters, filtersHydrated]);

  const setFilters = React.useCallback((updater: (prev: Filters) => Filters) => {
    setFiltersState((prev) => updater(prev));
  }, []);

  const resetAllFilters = React.useCallback(() => {
    setFiltersState(mergeFilterDefaults());
  }, [mergeFilterDefaults]);

  const updateSection = React.useCallback(
    <K extends keyof Filters>(section: K, updater: (prev: Filters[K]) => Filters[K]) => {
      setFilters((prev) => ({ ...prev, [section]: updater(prev[section]) }));
    },
    [setFilters],
  );

  const resetSection = React.useCallback(
    (section: keyof Filters) => {
      const defaults = mergeFilterDefaults();
      setFilters((prev) => ({ ...prev, [section]: defaults[section] }));
    },
    [mergeFilterDefaults, setFilters],
  );

  const toggleSection = React.useCallback((section: keyof Filters) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleSaveFilters = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`${STORAGE_KEY}.saved`, JSON.stringify(filters));
  }, [filters]);

  const filtersQuery = React.useMemo(() => buildQuery(filters), [filters]);
  const sectionCounts = React.useMemo(() => {
    const counts: Record<keyof Filters, number> = {
      peoplePlace: 0,
      motivationMindset: 0,
      behaviorsInterests: 0,
      externalSwitchTriggers: 0,
      competitiveEnvironment: 0,
    };
    const isRangeActive = (range: [number, number]) => range[0] !== 0 || range[1] !== 0;
    if (
      filters.peoplePlace.locationContext.geoLevel !== defaultFilters.peoplePlace.locationContext.geoLevel ||
      filters.peoplePlace.locationContext.areaType !== 'Any'
    ) {
      counts.peoplePlace += 1;
    }
    if (isRangeActive(filters.peoplePlace.incomeLevel)) counts.peoplePlace += 1;
    if (
      filters.peoplePlace.hhSizeLines.hhSize !== defaultFilters.peoplePlace.hhSizeLines.hhSize ||
      filters.peoplePlace.hhSizeLines.lines !== defaultFilters.peoplePlace.hhSizeLines.lines
    ) {
      counts.peoplePlace += 1;
    }
    if (
      filters.peoplePlace.device5G.deviceTypes.length ||
      filters.peoplePlace.device5G.fiveGReady !== defaultFilters.peoplePlace.device5G.fiveGReady
    ) {
      counts.peoplePlace += 1;
    }
    if (
      isRangeActive(filters.peoplePlace.tenurePay.tenureMonths) ||
      filters.peoplePlace.tenurePay.payReliability !== defaultFilters.peoplePlace.tenurePay.payReliability
    ) {
      counts.peoplePlace += 1;
    }

    if (filters.motivationMindset.priceSensitivity !== defaultFilters.motivationMindset.priceSensitivity)
      counts.motivationMindset += 1;
    if (filters.motivationMindset.speedCoverageImportance !== defaultFilters.motivationMindset.speedCoverageImportance)
      counts.motivationMindset += 1;
    if (filters.motivationMindset.valueForMoney !== defaultFilters.motivationMindset.valueForMoney)
      counts.motivationMindset += 1;
    if (filters.motivationMindset.switchLikelihood2mo !== defaultFilters.motivationMindset.switchLikelihood2mo)
      counts.motivationMindset += 1;
    if (filters.motivationMindset.topFrustrations.length) counts.motivationMindset += 1;

    if (filters.behaviorsInterests.socialTrendAffinity !== defaultFilters.behaviorsInterests.socialTrendAffinity)
      counts.behaviorsInterests += 1;
    if (filters.behaviorsInterests.topSpendOutsideConn.length) counts.behaviorsInterests += 1;
    if (isRangeActive(filters.behaviorsInterests.avgConnSpend)) counts.behaviorsInterests += 1;
    if (filters.behaviorsInterests.streamingGamingUsage !== defaultFilters.behaviorsInterests.streamingGamingUsage)
      counts.behaviorsInterests += 1;
    if (filters.behaviorsInterests.bundlePropensity.length) counts.behaviorsInterests += 1;

    if (filters.externalSwitchTriggers.recentMove !== defaultFilters.externalSwitchTriggers.recentMove)
      counts.externalSwitchTriggers += 1;
    if (filters.externalSwitchTriggers.newServicesAvailable.length) counts.externalSwitchTriggers += 1;
    if (filters.externalSwitchTriggers.competitorPromoLevel !== defaultFilters.externalSwitchTriggers.competitorPromoLevel)
      counts.externalSwitchTriggers += 1;
    if (filters.externalSwitchTriggers.eventWindow.length) counts.externalSwitchTriggers += 1;
    if (filters.externalSwitchTriggers.localDisruption.length) counts.externalSwitchTriggers += 1;

    if (filters.competitiveEnvironment.currentPreviousProvider.length) counts.competitiveEnvironment += 1;
    if (filters.competitiveEnvironment.comparingTo !== defaultFilters.competitiveEnvironment.comparingTo)
      counts.competitiveEnvironment += 1;
    if (filters.competitiveEnvironment.rivalBeatsUsOn.length) counts.competitiveEnvironment += 1;
    if (isRangeActive(filters.competitiveEnvironment.winRateVsRival)) counts.competitiveEnvironment += 1;
    if (filters.competitiveEnvironment.rivalServiceAtAddress !== defaultFilters.competitiveEnvironment.rivalServiceAtAddress)
      counts.competitiveEnvironment += 1;

    return counts;
  }, [filters]);
  const totalActiveFilters = React.useMemo(
    () => Object.values(sectionCounts).reduce((acc, value) => acc + value, 0),
    [sectionCounts],
  );

  const shortlistAdd = React.useCallback(
    (segmentId: string) => {
      addToCart(segmentId);
      console.log('shortlist:add', { segmentId, filters: filtersQuery });
    },
    [addToCart, filtersQuery],
  );

  const shortlistRemove = React.useCallback(
    (segmentId: string) => {
      removeFromCart(segmentId);
      console.log('shortlist:remove', { segmentId });
    },
    [removeFromCart],
  );

  const advanceSegment = React.useCallback(
    (segmentId: string) => {
      addToCart(segmentId);
      console.log('advance:segment', { segmentId, filters: filtersQuery });
      navigate('/segment-studio', { state: { filters: filtersQuery } });
    },
    [addToCart, filtersQuery, navigate],
  );

  const advanceSelection = React.useCallback(() => {
    console.log('advance:selection', { segmentIds: cartSegmentIds, filters: filtersQuery });
    navigate('/segment-studio', { state: { filters: filtersQuery } });
  }, [cartSegmentIds, filtersQuery, navigate]);

  const computeSegmentSim = React.useCallback(
    (segmentId: string) => {
      const segment = segments.find((s) => s.id === segmentId);
      if (!segment) return { payback: 9, gm12: 240, netAdds: 1200, opportunity: 55, conversion: 0.08 };
      const microSegments = microSegmentsByParent[segmentId] ?? [];
      const totalWeight = microSegments.reduce((sum, micro) => sum + micro.sizeShare, 0) || 1;
      const normalized = microSegments.map((micro) => ({
        ...micro,
        sizeShare: micro.sizeShare / totalWeight
      }));
      const audiences = normalized.map((micro) => ({
        micro,
        segmentSize: segment.size,
        offer: offers[0],
        channelMix: defaultChannelMix,
        assumptions,
        channels
      }));
      const { blended } = simulateCampaign({ audiences });
      return {
        payback: blended.paybackMonths,
        gm12: blended.gm12m,
        netAdds: blended.netAdds,
        opportunity: normalized.reduce((score, micro) => score + micro.attractiveness * micro.sizeShare, 0) * 100,
        conversion: blended.conversionRate
      };
    },
    [assumptions, channels, microSegmentsByParent, offers, segments]
  );

  const rankedSegments = React.useMemo(() => {
    const priceFloor = filters.motivationMindset.priceSensitivity;
    const filtered = segments
      .map((segment) => ({
        segment,
        sim: computeSegmentSim(segment.id)
      }))
      .filter(({ segment }) => {
        if (priceFloor > 50 && segment.priceSensitivity * 100 < priceFloor) {
          return false;
        }
        if (priceFloor < 50 && segment.priceSensitivity * 100 > priceFloor + 20) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.sim.opportunity - a.sim.opportunity)
      .slice(0, 9);
    setRecommended(filtered.map(({ segment }) => segment.id));
    return filtered;
  }, [computeSegmentSim, filters.motivationMindset.priceSensitivity, segments, setRecommended]);

  const bubbleData: BubblePoint[] = rankedSegments.map(({ segment, sim }) => ({
    id: segment.id,
    opportunity: Math.min(100, sim.opportunity),
    size: segment.size,
    netAdds: sim.netAdds,
    category: segment.region
  }));

  const handleCommand = () => {
    const { filters: parsedFilters, summary } = parseIntent(command);
    if (parsedFilters) {
      setFilters((prev) => {
        let next = mergeFilterDefaults(prev);
        if (parsedFilters.region) {
          next = {
            ...next,
            peoplePlace: {
              ...next.peoplePlace,
              locationContext: {
                ...next.peoplePlace.locationContext,
                geoLevel: 'Region',
                areaType: 'Any',
              },
            },
          };
        }
        if (parsedFilters.minSize) {
          const minSize = Number(parsedFilters.minSize);
          if (!Number.isNaN(minSize)) {
            next = {
              ...next,
              behaviorsInterests: {
                ...next.behaviorsInterests,
                avgConnSpend: [Math.max(0, Math.round(minSize / 1000)), next.behaviorsInterests.avgConnSpend[1]] as [number, number],
              },
            };
          }
        }
        if (parsedFilters.priceSensitivity) {
          const desired = String(parsedFilters.priceSensitivity).toLowerCase();
          const sliderValue =
            desired === 'high' ? 80 : desired === 'medium' ? 55 : desired === 'low' ? 30 : next.motivationMindset.priceSensitivity;
          next = {
            ...next,
            motivationMindset: {
              ...next.motivationMindset,
              priceSensitivity: sliderValue,
            },
          };
        }
        return next;
      });
    }
    setIntentSummary(summary);
  };

  const selectionItems = cartSegmentIds.map((id) => {
    const segment = segments.find((s) => s.id === id);
    return { id, label: segment?.name ?? id, subtitle: segment ? `${(segment.size / 1000).toFixed(0)}k HHs` : '' };
  });

  const selectionMetrics = React.useMemo(() => {
    if (!cartSegmentIds.length) {
      return [
        { label: 'Total size', value: '0' },
        { label: 'Blended payback', value: '–' },
        { label: '12-mo GM', value: '–' }
      ];
    }
    let totalSize = 0;
    let totalGm = 0;
    let totalNet = 0;
    let weightedPayback = 0;
    cartSegmentIds.forEach((id) => {
      const segment = segments.find((s) => s.id === id);
      if (!segment) return;
      const sim = computeSegmentSim(id);
      const payback = typeof sim.payback === 'number' ? sim.payback : 24;
      totalSize += segment.size;
      totalGm += sim.gm12 * segment.size;
      totalNet += sim.netAdds;
      weightedPayback += payback * segment.size;
    });
    return [
      { label: 'Total size', value: `${totalSize.toLocaleString()} HHs` },
      { label: 'Blended payback', value: totalSize ? `${Math.round(weightedPayback / totalSize)} mo` : '–' },
      { label: '12-mo GM', value: `$${totalSize ? Math.round(totalGm / totalSize).toLocaleString() : '–'}` }
    ];
  }, [cartSegmentIds, computeSegmentSim, segments]);

  const activeSegment = rankedSegments.find(({ segment }) => segment.id === activeSegmentId) ?? rankedSegments[0];

  React.useEffect(() => {
    if (rankedSegments.length && (!activeSegmentId || !rankedSegments.some(({ segment }) => segment.id === activeSegmentId))) {
      setActiveSegment(rankedSegments[0].segment.id);
    }
  }, [activeSegmentId, rankedSegments, setActiveSegment]);

  const rightRailSections = React.useMemo(() => {
    if (!activeSegment) return [];
    const segment = activeSegment.segment;
    return [
      {
        id: 'quant',
        title: 'Quant snapshot',
        info: {
          title: 'Quant snapshot',
          description: 'Key metrics to size and score the selected cohort.'
        },
        body: (
          <ul className="space-y-1">
            <li>Size: {segment.size.toLocaleString()} households</li>
            <li>Growth velocity: {(segment.valueSensitivity * 120).toFixed(0)} index</li>
            <li>Cross-shop rate: {(segment.priceSensitivity * 90).toFixed(0)} index</li>
            <li>Churn pressure: {(segment.priceSensitivity * 100).toFixed(0)} index</li>
          </ul>
        )
      },
      {
        id: 'qual',
        title: 'Qual insights',
        info: {
          title: 'Qual insights',
          description: 'Plain-language cues to explain the opportunity drivers.'
        },
        body: (
          <ul className="list-disc space-y-1 pl-4">
            <li>Why it works: {segment.notes}</li>
            <li>Trigger: {segment.traits[0]}</li>
            <li>Mindset: {segment.traits[1]}</li>
          </ul>
        )
      },
      {
        id: 'competitive',
        title: 'Competitive context',
        info: {
          title: 'Competitive context',
          description: 'Understand who else is active and how we can win.'
        },
        body: (
          <div className="space-y-2">
            {sectionCounts.competitiveEnvironment ? (
              <p className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
                Competitive filters active ({sectionCounts.competitiveEnvironment})
              </p>
            ) : null}
            <ul className="space-y-1">
              <li>Primary rival: Coverage gaps exploited by BetaTel</li>
              <li>Local promo intensity: {Math.round(activeSegment.sim.opportunity / 1.6)} index</li>
              <li>Network perception: {Math.round(segment.valueSensitivity * 100)} / 100</li>
            </ul>
          </div>
        )
      },
      {
        id: 'behaviors',
        title: 'Behavioral signals',
        info: {
          title: 'Behavioral signals',
          description: 'Signals that describe how the cohort shows up in market.'
        },
        body: (
          <ul className="space-y-1">
            {segment.traits.map((trait) => (
              <li key={trait}>{trait}</li>
            ))}
          </ul>
        )
      }
    ];
  }, [activeSegment, sectionCounts.competitiveEnvironment]);

  return (
    <div className="space-y-6">
      <div className="card border border-emerald-500/20 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Market Radar</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Scan synthetic market signals to spot subscriber cohorts worth advancing into deeper design work.
            </p>
          </div>
          <InfoPopover
            title="Market Radar overview"
            description="Start here to explore the universe, tune filters, and shortlist the strongest cohorts before moving on."
          />
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
          <div className="flex items-start gap-2">
            <InfoPopover title="Filter quickly" description="Mix structured filters with quick commands to focus the cohort list." />
            <span>Use filters or the intent bar to zero in on the customers you care most about.</span>
          </div>
          <div className="flex items-start gap-2">
            <InfoPopover title="Visualize opportunity" description="Bubble, map, and compare views highlight scale, payback, and coverage." />
            <span>Switch views to understand opportunity sizing and geographic hot spots.</span>
          </div>
          <div className="flex items-start gap-2">
            <InfoPopover title="Advance confidently" description="Shortlist promising cohorts so they flow seamlessly into Segment Studio." />
            <span>Shortlist the frontrunners and send them forward when you are ready to refine.</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[300px_1fr_320px] gap-6">
        <aside className="flex flex-col gap-4">
          <div className="sticky top-[5.25rem] z-20 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 backdrop-blur">
            <button
              type="button"
              onClick={() => {
                resetAllFilters();
                setIntentSummary('');
              }}
              className="font-medium text-emerald-300 hover:text-emerald-200"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleSaveFilters}
              className="rounded-full border border-emerald-500/40 px-3 py-1 text-[11px] font-medium text-emerald-200 hover:border-emerald-400 hover:text-emerald-100"
            >
              Save filter set
            </button>
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-emerald-400">Workflow primer</p>
              <InfoPopover title="Workflow primer" description="Remember the steps: explore, shortlist, then advance." />
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Filter the population or type a natural-language query. See recommended cohorts, inspect the visualization, and shortlist the best fits.
            </p>
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wide text-slate-400">Command bar</label>
              <InfoPopover title="Command bar" description="Type a short instruction to automatically adjust filters." />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="ex: urban cohorts over 200k size"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={handleCommand}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-600"
              >
                Apply
              </button>
            </div>
            {intentSummary ? (
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                <InfoPopover title="Intent summary" description="Lists the filters the command adjusted." />
                What changed: {intentSummary}
              </span>
            ) : null}
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSection('peoplePlace')}
                className="flex items-center gap-2 text-left text-sm font-semibold text-white"
              >
                <span className="text-xs text-emerald-300">{openSections.peoplePlace ? '▾' : '▸'}</span>
                <span>People & Place</span>
                {sectionCounts.peoplePlace ? (
                  <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                    {sectionCounts.peoplePlace}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => resetSection('peoplePlace')}
                className="text-xs text-emerald-300 hover:text-emerald-200"
              >
                Reset
              </button>
            </div>
            {openSections.peoplePlace ? (
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <div data-testid="mr-peoplePlace-locationContext" className="space-y-1">
                  <label
                    htmlFor="mr-location-geo"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-location-tip"
                  >
                    Location context
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Geo grain + neighborhood type to localize opportunity.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-location-tip" className="sr-only">
                    Geo grain + neighborhood type to localize opportunity.
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      id="mr-location-geo"
                      value={filters.peoplePlace.locationContext.geoLevel}
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          locationContext: {
                            ...prev.locationContext,
                            geoLevel: event.target.value as Filters['peoplePlace']['locationContext']['geoLevel'],
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {['National', 'Region', 'State', 'ZIP'].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      id="mr-location-area"
                      value={filters.peoplePlace.locationContext.areaType}
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          locationContext: {
                            ...prev.locationContext,
                            areaType: event.target.value as Filters['peoplePlace']['locationContext']['areaType'],
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {['Any', 'Urban', 'Suburban', 'Rural'].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div data-testid="mr-peoplePlace-incomeLevel" className="space-y-1">
                  <label
                    htmlFor="mr-income-min"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-income-tip"
                  >
                    Income level (range)
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Bracket household income bands to size affordability.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-income-tip" className="sr-only">
                    Bracket household income bands to size affordability.
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="mr-income-min"
                      type="number"
                      min={0}
                      value={filters.peoplePlace.incomeLevel[0] || ''}
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          incomeLevel: [event.target.value ? Number(event.target.value) : 0, prev.incomeLevel[1]],
                        }))
                      }
                      placeholder="Min"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">to</span>
                    <input
                      id="mr-income-max"
                      type="number"
                      min={0}
                      value={filters.peoplePlace.incomeLevel[1] || ''}
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          incomeLevel: [prev.incomeLevel[0], event.target.value ? Number(event.target.value) : 0],
                        }))
                      }
                      placeholder="Max"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div data-testid="mr-peoplePlace-hhSizeLines" className="space-y-1">
                  <label
                    htmlFor="mr-hhsize"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-hhsize-tip"
                  >
                    Household size &amp; active lines
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Align to primary account size and current line penetration.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-hhsize-tip" className="sr-only">
                    Align to primary account size and current line penetration.
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      id="mr-hhsize"
                      value={filters.peoplePlace.hhSizeLines.hhSize === 'Any' ? 'Any' : String(filters.peoplePlace.hhSizeLines.hhSize)}
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          hhSizeLines: {
                            ...prev.hhSizeLines,
                            hhSize:
                              event.target.value === 'Any'
                                ? 'Any'
                                : Number(event.target.value === '5+' ? 5 : event.target.value),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {['Any', '1', '2', '3', '4', '5+'].map((option) => (
                        <option key={option} value={option}>
                          {option === '5+' ? '5+' : option}
                        </option>
                      ))}
                    </select>
                    <select
                      id="mr-lines"
                      value={filters.peoplePlace.hhSizeLines.lines === 'Any' ? 'Any' : String(filters.peoplePlace.hhSizeLines.lines)}
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          hhSizeLines: {
                            ...prev.hhSizeLines,
                            lines:
                              event.target.value === 'Any'
                                ? 'Any'
                                : Number(event.target.value === '5+' ? 5 : event.target.value),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {['Any', '1', '2', '3', '4', '5+'].map((option) => (
                        <option key={option} value={option}>
                          {option === '5+' ? '5+' : option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div data-testid="mr-peoplePlace-device5G" className="space-y-1">
                  <label
                    htmlFor="mr-device-types"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-device-tip"
                  >
                    Device type &amp; 5G capability
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Blend OS mix and readiness for 5G upsell moments.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-device-tip" className="sr-only">
                    Blend OS mix and readiness for 5G upsell moments.
                  </span>
                  <div className="flex flex-wrap gap-2" id="mr-device-types">
                    {['iOS', 'Android', 'Feature'].map((option) => {
                      const active = filters.peoplePlace.device5G.deviceTypes.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('peoplePlace', (prev) => {
                              const set = new Set(prev.device5G.deviceTypes);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return {
                                ...prev,
                                device5G: { ...prev.device5G, deviceTypes: Array.from(set) },
                              };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    {[
                      { label: 'Any', value: 'Any' as const },
                      { label: '5G-ready', value: true as const },
                      { label: 'Not 5G', value: false as const },
                    ].map((option) => (
                      <button
                        key={String(option.value)}
                        type="button"
                        onClick={() =>
                          updateSection('peoplePlace', (prev) => ({
                            ...prev,
                            device5G: { ...prev.device5G, fiveGReady: option.value },
                          }))
                        }
                        className={`rounded-full border px-3 py-1 text-[11px] ${
                          filters.peoplePlace.device5G.fiveGReady === option.value
                            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div data-testid="mr-peoplePlace-tenurePay" className="space-y-1">
                  <label
                    htmlFor="mr-tenure-min"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-tenure-tip"
                  >
                    Tenure &amp; payment reliability
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Map longevity and billing discipline for stickiness risk.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-tenure-tip" className="sr-only">
                    Map longevity and billing discipline for stickiness risk.
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="mr-tenure-min"
                      type="number"
                      min={0}
                      value={filters.peoplePlace.tenurePay.tenureMonths[0] || ''}
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          tenurePay: {
                            ...prev.tenurePay,
                            tenureMonths: [event.target.value ? Number(event.target.value) : 0, prev.tenurePay.tenureMonths[1]],
                          },
                        }))
                      }
                      placeholder="Months min"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">to</span>
                    <input
                      id="mr-tenure-max"
                      type="number"
                      min={0}
                      value={filters.peoplePlace.tenurePay.tenureMonths[1] || ''}
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          tenurePay: {
                            ...prev.tenurePay,
                            tenureMonths: [prev.tenurePay.tenureMonths[0], event.target.value ? Number(event.target.value) : 0],
                          },
                        }))
                      }
                      placeholder="Months max"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        Payment reliability:{' '}
                        {typeof filters.peoplePlace.tenurePay.payReliability === 'number'
                          ? filters.peoplePlace.tenurePay.payReliability
                          : 'Any'}
                      </span>
                      <button
                        type="button"
                        className="text-emerald-300 hover:text-emerald-200"
                        onClick={() =>
                          updateSection('peoplePlace', (prev) => ({
                            ...prev,
                            tenurePay: { ...prev.tenurePay, payReliability: 'Any' },
                          }))
                        }
                      >
                        Any
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={
                        typeof filters.peoplePlace.tenurePay.payReliability === 'number'
                          ? filters.peoplePlace.tenurePay.payReliability
                          : 50
                      }
                      onChange={(event) =>
                        updateSection('peoplePlace', (prev) => ({
                          ...prev,
                          tenurePay: {
                            ...prev.tenurePay,
                            payReliability: Number(event.target.value),
                          },
                        }))
                      }
                      className="w-full accent-emerald-500"
                      aria-label="On-time payment score"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSection('motivationMindset')}
                className="flex items-center gap-2 text-left text-sm font-semibold text-white"
              >
                <span className="text-xs text-emerald-300">{openSections.motivationMindset ? '▾' : '▸'}</span>
                <span>Motivation &amp; Mindset</span>
                {sectionCounts.motivationMindset ? (
                  <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                    {sectionCounts.motivationMindset}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => resetSection('motivationMindset')}
                className="text-xs text-emerald-300 hover:text-emerald-200"
              >
                Reset
              </button>
            </div>
            {openSections.motivationMindset ? (
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                {[
                  {
                    id: 'mr-price-sensitivity',
                    testId: 'priceSensitivity',
                    label: 'Price sensitivity',
                    tooltip: 'Self-reported or inferred sensitivity to monthly bill changes.',
                    value: filters.motivationMindset.priceSensitivity,
                    onChange: (value: number) =>
                      updateSection('motivationMindset', (prev) => ({ ...prev, priceSensitivity: value })),
                  },
                  {
                    id: 'mr-speed-importance',
                    testId: 'speedCoverageImportance',
                    label: 'Importance of speed & coverage',
                    tooltip: 'How much reliable performance matters in their decision set.',
                    value: filters.motivationMindset.speedCoverageImportance,
                    onChange: (value: number) =>
                      updateSection('motivationMindset', (prev) => ({ ...prev, speedCoverageImportance: value })),
                  },
                  {
                    id: 'mr-value-money',
                    testId: 'valueForMoney',
                    label: 'Perceived value for money',
                    tooltip: 'Balance of quality versus cost perception today.',
                    value: filters.motivationMindset.valueForMoney,
                    onChange: (value: number) =>
                      updateSection('motivationMindset', (prev) => ({ ...prev, valueForMoney: value })),
                  },
                  {
                    id: 'mr-switch-likelihood',
                    testId: 'switchLikelihood2mo',
                    label: 'Likelihood to switch (next 2 months)',
                    tooltip: 'Modeled churn intent over the near term.',
                    value: filters.motivationMindset.switchLikelihood2mo,
                    onChange: (value: number) =>
                      updateSection('motivationMindset', (prev) => ({ ...prev, switchLikelihood2mo: value })),
                  },
                ].map((slider) => (
                  <div key={slider.id} data-testid={`mr-motivationMindset-${slider.testId}`} className="space-y-2">
                    <label
                      htmlFor={slider.id}
                      className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                      aria-describedby={`${slider.id}-tip`}
                    >
                      {slider.label}
                      <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title={slider.tooltip}>
                        ⓘ
                      </span>
                    </label>
                    <span id={`${slider.id}-tip`} className="sr-only">
                      {slider.tooltip}
                    </span>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{slider.value === 50 ? 'Any' : slider.value}</span>
                      <span className="text-[10px] uppercase tracking-wide">Low → High</span>
                    </div>
                    <input
                      id={slider.id}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={slider.value}
                      onChange={(event) => slider.onChange(Number(event.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                ))}
                <div data-testid="mr-motivationMindset-topFrustrations" className="space-y-1">
                  <label
                    htmlFor="mr-frustrations"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-frustrations-tip"
                  >
                    Top frustrations with current provider
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Surface pain points to target in messaging and offer design.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-frustrations-tip" className="sr-only">
                    Surface pain points to target in messaging and offer design.
                  </span>
                  <div id="mr-frustrations" className="flex flex-wrap gap-2">
                    {['Price', 'Coverage', 'Support wait time', 'Billing', 'Device', 'Other'].map((option) => {
                      const active = filters.motivationMindset.topFrustrations.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('motivationMindset', (prev) => {
                              const set = new Set(prev.topFrustrations);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return { ...prev, topFrustrations: Array.from(set) };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSection('behaviorsInterests')}
                className="flex items-center gap-2 text-left text-sm font-semibold text-white"
              >
                <span className="text-xs text-emerald-300">{openSections.behaviorsInterests ? '▾' : '▸'}</span>
                <span>Behaviors &amp; Interests</span>
                {sectionCounts.behaviorsInterests ? (
                  <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                    {sectionCounts.behaviorsInterests}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => resetSection('behaviorsInterests')}
                className="text-xs text-emerald-300 hover:text-emerald-200"
              >
                Reset
              </button>
            </div>
            {openSections.behaviorsInterests ? (
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                {[
                  {
                    id: 'mr-social-trend',
                    testId: 'socialTrendAffinity',
                    label: 'Social / trend affinity',
                    tooltip: 'Measures alignment to pop culture and viral trend adoption.',
                    value: filters.behaviorsInterests.socialTrendAffinity,
                    onChange: (value: number) =>
                      updateSection('behaviorsInterests', (prev) => ({ ...prev, socialTrendAffinity: value })),
                  },
                  {
                    id: 'mr-streaming-usage',
                    testId: 'streamingGamingUsage',
                    label: 'Streaming / gaming usage',
                    tooltip: 'Intensity of bandwidth-heavy entertainment habits.',
                    value: filters.behaviorsInterests.streamingGamingUsage,
                    onChange: (value: number) =>
                      updateSection('behaviorsInterests', (prev) => ({ ...prev, streamingGamingUsage: value })),
                  },
                ].map((slider) => (
                  <div key={slider.id} data-testid={`mr-behaviorsInterests-${slider.testId}`} className="space-y-2">
                    <label
                      htmlFor={slider.id}
                      className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                      aria-describedby={`${slider.id}-tip`}
                    >
                      {slider.label}
                      <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title={slider.tooltip}>
                        ⓘ
                      </span>
                    </label>
                    <span id={`${slider.id}-tip`} className="sr-only">
                      {slider.tooltip}
                    </span>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{slider.value === 50 ? 'Any' : slider.value}</span>
                      <span className="text-[10px] uppercase tracking-wide">Low → High</span>
                    </div>
                    <input
                      id={slider.id}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={slider.value}
                      onChange={(event) => slider.onChange(Number(event.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                ))}
                <div data-testid="mr-behaviorsInterests-topSpendOutsideConn" className="space-y-1">
                  <label
                    htmlFor="mr-top-spend"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-top-spend-tip"
                  >
                    Top spend outside connectivity
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="See where discretionary budgets go today.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-top-spend-tip" className="sr-only">
                    See where discretionary budgets go today.
                  </span>
                  <div id="mr-top-spend" className="flex flex-wrap gap-2">
                    {['Grocery', 'Fuel', 'Electronics', 'Streaming', 'Quick-serve', 'Big Box'].map((option) => {
                      const active = filters.behaviorsInterests.topSpendOutsideConn.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('behaviorsInterests', (prev) => {
                              const set = new Set(prev.topSpendOutsideConn);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return { ...prev, topSpendOutsideConn: Array.from(set) };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div data-testid="mr-behaviorsInterests-avgConnSpend" className="space-y-1">
                  <label
                    htmlFor="mr-avg-spend-min"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-avg-spend-tip"
                  >
                    Avg monthly connectivity spend (range)
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Bound budget expectations to focus right offers.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-avg-spend-tip" className="sr-only">
                    Bound budget expectations to focus right offers.
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="mr-avg-spend-min"
                      type="number"
                      min={0}
                      value={filters.behaviorsInterests.avgConnSpend[0] || ''}
                      onChange={(event) =>
                        updateSection('behaviorsInterests', (prev) => ({
                          ...prev,
                          avgConnSpend: [event.target.value ? Number(event.target.value) : 0, prev.avgConnSpend[1]],
                        }))
                      }
                      placeholder="Min"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">to</span>
                    <input
                      id="mr-avg-spend-max"
                      type="number"
                      min={0}
                      value={filters.behaviorsInterests.avgConnSpend[1] || ''}
                      onChange={(event) =>
                        updateSection('behaviorsInterests', (prev) => ({
                          ...prev,
                          avgConnSpend: [prev.avgConnSpend[0], event.target.value ? Number(event.target.value) : 0],
                        }))
                      }
                      placeholder="Max"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div data-testid="mr-behaviorsInterests-bundlePropensity" className="space-y-1">
                  <label
                    htmlFor="mr-bundle"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-bundle-tip"
                  >
                    Bundle propensity
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Likelihood to respond to bundle offers (mobile, internet, TV).">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-bundle-tip" className="sr-only">
                    Likelihood to respond to bundle offers (mobile, internet, TV).
                  </span>
                  <div id="mr-bundle" className="flex flex-wrap gap-2">
                    {['Mobile+Internet+TV', 'Mobile+Internet', 'Internet+TV', 'Accessories'].map((option) => {
                      const active = filters.behaviorsInterests.bundlePropensity.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('behaviorsInterests', (prev) => {
                              const set = new Set(prev.bundlePropensity);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return { ...prev, bundlePropensity: Array.from(set) };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSection('externalSwitchTriggers')}
                className="flex items-center gap-2 text-left text-sm font-semibold text-white"
              >
                <span className="text-xs text-emerald-300">{openSections.externalSwitchTriggers ? '▾' : '▸'}</span>
                <span>External Switch Triggers</span>
                {sectionCounts.externalSwitchTriggers ? (
                  <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                    {sectionCounts.externalSwitchTriggers}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => resetSection('externalSwitchTriggers')}
                className="text-xs text-emerald-300 hover:text-emerald-200"
              >
                Reset
              </button>
            </div>
            {openSections.externalSwitchTriggers ? (
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <div data-testid="mr-externalSwitchTriggers-recentMove" className="space-y-1">
                  <label
                    htmlFor="mr-recent-move"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-recent-move-tip"
                  >
                    Recent move / address change
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Signals a high-propensity switching moment.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-recent-move-tip" className="sr-only">
                    Signals a high-propensity switching moment.
                  </span>
                  <select
                    id="mr-recent-move"
                    value={filters.externalSwitchTriggers.recentMove}
                    onChange={(event) =>
                      updateSection('externalSwitchTriggers', (prev) => ({
                        ...prev,
                        recentMove: event.target.value as Filters['externalSwitchTriggers']['recentMove'],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {['Any', 'Yes', 'No', 'Unknown'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div data-testid="mr-externalSwitchTriggers-newServicesAvailable" className="space-y-1">
                  <label
                    htmlFor="mr-new-services"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-new-services-tip"
                  >
                    New services available (Fiber, FWA)
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Track freshly deployable access types to target.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-new-services-tip" className="sr-only">
                    Track freshly deployable access types to target.
                  </span>
                  <div id="mr-new-services" className="flex flex-wrap gap-2">
                    {['Fiber', 'FWA'].map((option) => {
                      const active = filters.externalSwitchTriggers.newServicesAvailable.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('externalSwitchTriggers', (prev) => {
                              const set = new Set(prev.newServicesAvailable);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return { ...prev, newServicesAvailable: Array.from(set) };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        updateSection('externalSwitchTriggers', (prev) => {
                          const set = new Set(prev.newServicesAvailable);
                          if (set.has('Availability confirmed')) {
                            set.delete('Availability confirmed');
                          } else {
                            set.add('Availability confirmed');
                          }
                          return { ...prev, newServicesAvailable: Array.from(set) };
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-[11px] ${
                        filters.externalSwitchTriggers.newServicesAvailable.includes('Availability confirmed')
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                          : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                      }`}
                    >
                      Availability toggle
                    </button>
                  </div>
                </div>
                <div data-testid="mr-externalSwitchTriggers-competitorPromoLevel" className="space-y-1">
                  <label
                    htmlFor="mr-promo-level"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-promo-level-tip"
                  >
                    Competitor promo/price change in ZIP
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Gauge rival pricing moves near target areas.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-promo-level-tip" className="sr-only">
                    Gauge rival pricing moves near target areas.
                  </span>
                  <select
                    id="mr-promo-level"
                    value={filters.externalSwitchTriggers.competitorPromoLevel}
                    onChange={(event) =>
                      updateSection('externalSwitchTriggers', (prev) => ({
                        ...prev,
                        competitorPromoLevel: event.target.value as Filters['externalSwitchTriggers']['competitorPromoLevel'],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {['Any', 'None', 'Minor', 'Significant'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div data-testid="mr-externalSwitchTriggers-eventWindow" className="space-y-1">
                  <label
                    htmlFor="mr-event-window"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-event-window-tip"
                  >
                    Event-driven window
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Anchor outreach to cultural and calendar triggers.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-event-window-tip" className="sr-only">
                    Anchor outreach to cultural and calendar triggers.
                  </span>
                  <div id="mr-event-window" className="flex flex-wrap gap-2">
                    {['Back-to-school', 'Holidays', 'Device launch'].map((option) => {
                      const active = filters.externalSwitchTriggers.eventWindow.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('externalSwitchTriggers', (prev) => {
                              const set = new Set(prev.eventWindow);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return { ...prev, eventWindow: Array.from(set) };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div data-testid="mr-externalSwitchTriggers-localDisruption" className="space-y-1">
                  <label
                    htmlFor="mr-local-disruption"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-local-disruption-tip"
                  >
                    Local disruption / upgrade event
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Identify urgency from outages, store openings, or upgrades.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-local-disruption-tip" className="sr-only">
                    Identify urgency from outages, store openings, or upgrades.
                  </span>
                  <div id="mr-local-disruption" className="flex flex-wrap gap-2">
                    {['Outage', 'Store opening', 'Network upgrade'].map((option) => {
                      const active = filters.externalSwitchTriggers.localDisruption.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('externalSwitchTriggers', (prev) => {
                              const set = new Set(prev.localDisruption);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return { ...prev, localDisruption: Array.from(set) };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSection('competitiveEnvironment')}
                className="flex items-center gap-2 text-left text-sm font-semibold text-white"
              >
                <span className="text-xs text-emerald-300">{openSections.competitiveEnvironment ? '▾' : '▸'}</span>
                <span>Competitive Environment</span>
                {sectionCounts.competitiveEnvironment ? (
                  <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                    {sectionCounts.competitiveEnvironment}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => resetSection('competitiveEnvironment')}
                className="text-xs text-emerald-300 hover:text-emerald-200"
              >
                Reset
              </button>
            </div>
            {openSections.competitiveEnvironment ? (
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <div data-testid="mr-competitiveEnvironment-currentPreviousProvider" className="space-y-1">
                  <label
                    htmlFor="mr-current-provider"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-current-provider-tip"
                  >
                    Current / previous provider
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Know who we are displacing or defending against.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-current-provider-tip" className="sr-only">
                    Know who we are displacing or defending against.
                  </span>
                  <div id="mr-current-provider" className="flex flex-wrap gap-2">
                    {['AT&T', 'Verizon', 'T-Mobile', 'Cable MVNOs', 'Regional Fiber', 'Other'].map((option) => {
                      const active = filters.competitiveEnvironment.currentPreviousProvider.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('competitiveEnvironment', (prev) => {
                              const set = new Set(prev.currentPreviousProvider);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return { ...prev, currentPreviousProvider: Array.from(set) };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div data-testid="mr-competitiveEnvironment-comparingTo" className="space-y-1">
                  <label
                    htmlFor="mr-comparing-to"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-comparing-to-tip"
                  >
                    Actively comparing to
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Surface the reference rival top of mind now.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-comparing-to-tip" className="sr-only">
                    Surface the reference rival top of mind now.
                  </span>
                  <select
                    id="mr-comparing-to"
                    value={filters.competitiveEnvironment.comparingTo}
                    onChange={(event) =>
                      updateSection('competitiveEnvironment', (prev) => ({
                        ...prev,
                        comparingTo: event.target.value as Filters['competitiveEnvironment']['comparingTo'],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {['Any', 'AT&T', 'Verizon', 'T-Mobile', 'Cable MVNOs', 'Regional Fiber'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div data-testid="mr-competitiveEnvironment-rivalBeatsUsOn" className="space-y-1">
                  <label
                    htmlFor="mr-rival-beats"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-rival-beats-tip"
                  >
                    Where rival beats us
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Dimension(s) where a specific rival over-indexes.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-rival-beats-tip" className="sr-only">
                    Dimension(s) where a specific rival over-indexes.
                  </span>
                  <div id="mr-rival-beats" className="flex flex-wrap gap-2">
                    {['Price', 'Coverage', 'Speed', 'Perks'].map((option) => {
                      const active = filters.competitiveEnvironment.rivalBeatsUsOn.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateSection('competitiveEnvironment', (prev) => {
                              const set = new Set(prev.rivalBeatsUsOn);
                              if (set.has(option)) {
                                set.delete(option);
                              } else {
                                set.add(option);
                              }
                              return { ...prev, rivalBeatsUsOn: Array.from(set) };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                              : 'border-slate-700 text-slate-300 hover:border-emerald-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div data-testid="mr-competitiveEnvironment-winRateVsRival" className="space-y-1">
                  <label
                    htmlFor="mr-winrate-min"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-winrate-tip"
                  >
                    Historical win-rate vs rival
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Frame expected conversion using historic lift.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-winrate-tip" className="sr-only">
                    Frame expected conversion using historic lift.
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="mr-winrate-min"
                      type="number"
                      min={0}
                      max={100}
                      value={filters.competitiveEnvironment.winRateVsRival[0] || ''}
                      onChange={(event) =>
                        updateSection('competitiveEnvironment', (prev) => ({
                          ...prev,
                          winRateVsRival: [event.target.value ? Number(event.target.value) : 0, prev.winRateVsRival[1]],
                        }))
                      }
                      placeholder="Min %"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">to</span>
                    <input
                      id="mr-winrate-max"
                      type="number"
                      min={0}
                      max={100}
                      value={filters.competitiveEnvironment.winRateVsRival[1] || ''}
                      onChange={(event) =>
                        updateSection('competitiveEnvironment', (prev) => ({
                          ...prev,
                          winRateVsRival: [prev.winRateVsRival[0], event.target.value ? Number(event.target.value) : 0],
                        }))
                      }
                      placeholder="Max %"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div data-testid="mr-competitiveEnvironment-rivalServiceAtAddress" className="space-y-1">
                  <label
                    htmlFor="mr-rival-service"
                    className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
                    aria-describedby="mr-rival-service-tip"
                  >
                    Rival service at address
                    <span className="ml-2 cursor-help text-emerald-300" aria-hidden="true" title="Check facility presence to understand head-to-head pressure.">
                      ⓘ
                    </span>
                  </label>
                  <span id="mr-rival-service-tip" className="sr-only">
                    Check facility presence to understand head-to-head pressure.
                  </span>
                  <select
                    id="mr-rival-service"
                    value={filters.competitiveEnvironment.rivalServiceAtAddress}
                    onChange={(event) =>
                      updateSection('competitiveEnvironment', (prev) => ({
                        ...prev,
                        rivalServiceAtAddress: event.target.value as Filters['competitiveEnvironment']['rivalServiceAtAddress'],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {['Any', 'Yes', 'No', 'Unknown'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Choose your view</h2>
            <InfoPopover title="View switcher" description="Toggle perspectives to validate scale, geography, or KPI comparisons." />
          </div>
          <PillToggle
            options={[
              { id: 'market', label: 'Market View' },
              { id: 'map', label: 'Competitive Map' },
              { id: 'compare', label: 'Compare' }
            ]}
            value={view}
            onChange={(value) => setView(value)}
          />
          {view === 'market' ? (
            <>
              <BubbleChart
                segments={segments}
                data={bubbleData}
                onSelect={(id) => setActiveSegment(id)}
              />
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Recommended cohorts</h3>
                <InfoPopover title="Recommended cohorts" description="Shortlist from the live-ranked list below." />
              </div>
              {totalActiveFilters ? (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                  Active filters: {totalActiveFilters}
                </span>
              ) : null}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {rankedSegments.map(({ segment, sim }) => (
                  <SegmentTile
                    key={segment.id}
                    name={segment.name}
                    size={segment.size}
                    payback={sim.payback}
                    gm12={sim.gm12}
                    traits={segment.traits}
                    rationale={`Opportunity score ${(sim.opportunity / 100).toFixed(2)} • Conversion ${(sim.conversion * 100).toFixed(1)}%`}
                    selected={cartSegmentIds.includes(segment.id)}
                    onSelect={(checked) => (checked ? shortlistAdd(segment.id) : shortlistRemove(segment.id))}
                    onAddToCart={() => shortlistAdd(segment.id)}
                    onSendToStudio={() => advanceSegment(segment.id)}
                    onPin={() => setActiveSegment(segment.id)}
                  />
                ))}
              </div>
            </>
          ) : null}
          {view === 'map' ? (
            <MapView
              root={geoTree}
              onSelectRegion={(path) => {
                const deepest = path[path.length - 1];
                if (!deepest) return;
                if (deepest.meta?.zip3) {
                  updateSection('peoplePlace', (prev) => ({
                    ...prev,
                    locationContext: { ...prev.locationContext, geoLevel: 'ZIP' },
                  }));
                } else if (deepest.meta?.dma) {
                  updateSection('peoplePlace', (prev) => ({
                    ...prev,
                    locationContext: { ...prev.locationContext, geoLevel: 'State' },
                  }));
                } else if (deepest.meta?.region) {
                  updateSection('peoplePlace', (prev) => ({
                    ...prev,
                    locationContext: { ...prev.locationContext, geoLevel: 'Region' },
                  }));
                }
              }}
            />
          ) : null}
          {view === 'compare' ? (
            <div className="card flex flex-col gap-4 border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Compare cohorts</h3>
                <InfoPopover title="Comparison table" description="Line up short-listed cohorts before you commit to a path." />
              </div>
              <p className="text-sm text-slate-300">
                Quickly compare top cohorts across payback, 12-mo GM, and projected net adds. Use this view when prioritizing a short list.
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <span className="text-xs uppercase tracking-wide text-slate-400">Cohort</span>
                <span className="text-xs uppercase tracking-wide text-slate-400">Payback</span>
                <span className="text-xs uppercase tracking-wide text-slate-400">12-mo GM</span>
                {rankedSegments.map(({ segment, sim }) => (
                  <React.Fragment key={`compare-${segment.id}`}>
                    <span className="font-semibold text-white">{segment.name}</span>
                    <span>{typeof sim.payback === 'number' ? `${sim.payback} mo` : sim.payback}</span>
                    <span>${sim.gm12.toLocaleString()}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : null}
        </section>
        {activeSegment ? (
          <RightRail
            title={activeSegment.segment.name}
            subtitle={`ID ${activeSegment.segment.id}`}
            kpis={[
              {
                label: 'Payback (mo)',
                value: typeof activeSegment.sim.payback === 'number' ? activeSegment.sim.payback : activeSegment.sim.payback,
                info: {
                  title: 'CAC Payback (months)',
                  description: 'Months until fully-loaded CAC is covered by cumulative contribution.'
                }
              },
              {
                label: '12-mo GM',
                value: `$${activeSegment.sim.gm12.toLocaleString()}`,
                info: {
                  title: '12-Month Incremental Gross Margin',
                  description: 'Gross margin over the first year after servicing costs and device amortization.'
                }
              }
            ]}
            sections={rightRailSections}
            action={
              <button
                onClick={() => advanceSegment(activeSegment.segment.id)}
                className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-600"
              >
                Move to Segment Studio
              </button>
            }
          />
        ) : (
          <div className="card border border-slate-800 p-4 text-sm text-slate-300">
            Select a cohort to see details.
          </div>
        )}
        <div className="col-span-3">
          <SelectionTray
            title="Shortlisted cohorts"
            items={selectionItems}
            metrics={selectionMetrics}
            ctaLabel="Move to Segment Studio"
            onCta={advanceSelection}
            disabled={!cartSegmentIds.length}
          />
        </div>
      </div>
    </div>
  );
};

export default MarketRadar;
