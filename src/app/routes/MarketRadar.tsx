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

type LocationContext = {
  geoLevel: 'National' | 'Region' | 'State' | 'ZIP';
  areaType: 'Urban' | 'Suburban' | 'Rural' | 'Any';
  detail?: string;
};

export type Filters = {
  peoplePlace: {
    locationContext: LocationContext;
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

const FILTER_STORAGE_KEY = 'sbm.mr.filters';
const FILTER_SET_STORAGE_KEY = 'sbm.mr.savedFilters';

const deviceTypeOptions = ['iOS', 'Android', 'Feature'];
const frustrationOptions = ['Price', 'Coverage', 'Support wait time', 'Billing', 'Device', 'Other'];
const spendSectorOptions = ['Grocery', 'Fuel', 'Electronics', 'Streaming', 'Quick-serve', 'Big Box', 'Travel', 'Wellness'];
const bundleOptions = ['Mobile+Internet+TV', 'Mobile+Internet', 'Internet+TV', 'Accessories'];
const triggerServices = ['Fiber', 'FWA'];
const eventWindows = ['Back-to-school', 'Holidays', 'Device launch'];
const disruptionEvents = ['Outage', 'Store opening', 'Network upgrade'];
const providerOptions = ['AT&T', 'Verizon', 'T-Mobile', 'Cable MVNOs', 'Regional carriers'];
const rivalStrengths = ['Price', 'Coverage', 'Speed', 'Perks'];

const createDefaultFilters = (): Filters => ({
  peoplePlace: {
    locationContext: { geoLevel: 'National', areaType: 'Any' },
    incomeLevel: [0, 0],
    hhSizeLines: { hhSize: 'Any', lines: 'Any' },
    device5G: { deviceTypes: [], fiveGReady: 'Any' },
    tenurePay: { tenureMonths: [0, 0], payReliability: 'Any' }
  },
  motivationMindset: {
    priceSensitivity: 50,
    speedCoverageImportance: 50,
    valueForMoney: 50,
    switchLikelihood2mo: 50,
    topFrustrations: []
  },
  behaviorsInterests: {
    socialTrendAffinity: 50,
    topSpendOutsideConn: [],
    avgConnSpend: [0, 0],
    streamingGamingUsage: 50,
    bundlePropensity: []
  },
  externalSwitchTriggers: {
    recentMove: 'Any',
    newServicesAvailable: [],
    competitorPromoLevel: 'Any',
    eventWindow: [],
    localDisruption: []
  },
  competitiveEnvironment: {
    currentPreviousProvider: [],
    comparingTo: 'Any',
    rivalBeatsUsOn: [],
    winRateVsRival: [0, 0],
    rivalServiceAtAddress: 'Any'
  }
});

const mergeFilters = (base: Filters, saved?: Partial<Filters>): Filters => {
  if (!saved) return base;
  return {
    peoplePlace: {
      locationContext: { ...base.peoplePlace.locationContext, ...saved.peoplePlace?.locationContext },
      incomeLevel: saved.peoplePlace?.incomeLevel ?? base.peoplePlace.incomeLevel,
      hhSizeLines: { ...base.peoplePlace.hhSizeLines, ...saved.peoplePlace?.hhSizeLines },
      device5G: { ...base.peoplePlace.device5G, ...saved.peoplePlace?.device5G },
      tenurePay: { ...base.peoplePlace.tenurePay, ...saved.peoplePlace?.tenurePay }
    },
    motivationMindset: {
      priceSensitivity: saved.motivationMindset?.priceSensitivity ?? base.motivationMindset.priceSensitivity,
      speedCoverageImportance: saved.motivationMindset?.speedCoverageImportance ?? base.motivationMindset.speedCoverageImportance,
      valueForMoney: saved.motivationMindset?.valueForMoney ?? base.motivationMindset.valueForMoney,
      switchLikelihood2mo: saved.motivationMindset?.switchLikelihood2mo ?? base.motivationMindset.switchLikelihood2mo,
      topFrustrations: saved.motivationMindset?.topFrustrations ?? base.motivationMindset.topFrustrations
    },
    behaviorsInterests: {
      socialTrendAffinity: saved.behaviorsInterests?.socialTrendAffinity ?? base.behaviorsInterests.socialTrendAffinity,
      topSpendOutsideConn: saved.behaviorsInterests?.topSpendOutsideConn ?? base.behaviorsInterests.topSpendOutsideConn,
      avgConnSpend: saved.behaviorsInterests?.avgConnSpend ?? base.behaviorsInterests.avgConnSpend,
      streamingGamingUsage: saved.behaviorsInterests?.streamingGamingUsage ?? base.behaviorsInterests.streamingGamingUsage,
      bundlePropensity: saved.behaviorsInterests?.bundlePropensity ?? base.behaviorsInterests.bundlePropensity
    },
    externalSwitchTriggers: {
      recentMove: saved.externalSwitchTriggers?.recentMove ?? base.externalSwitchTriggers.recentMove,
      newServicesAvailable: saved.externalSwitchTriggers?.newServicesAvailable ?? base.externalSwitchTriggers.newServicesAvailable,
      competitorPromoLevel: saved.externalSwitchTriggers?.competitorPromoLevel ?? base.externalSwitchTriggers.competitorPromoLevel,
      eventWindow: saved.externalSwitchTriggers?.eventWindow ?? base.externalSwitchTriggers.eventWindow,
      localDisruption: saved.externalSwitchTriggers?.localDisruption ?? base.externalSwitchTriggers.localDisruption
    },
    competitiveEnvironment: {
      currentPreviousProvider:
        saved.competitiveEnvironment?.currentPreviousProvider ?? base.competitiveEnvironment.currentPreviousProvider,
      comparingTo: saved.competitiveEnvironment?.comparingTo ?? base.competitiveEnvironment.comparingTo,
      rivalBeatsUsOn: saved.competitiveEnvironment?.rivalBeatsUsOn ?? base.competitiveEnvironment.rivalBeatsUsOn,
      winRateVsRival: saved.competitiveEnvironment?.winRateVsRival ?? base.competitiveEnvironment.winRateVsRival,
      rivalServiceAtAddress:
        saved.competitiveEnvironment?.rivalServiceAtAddress ?? base.competitiveEnvironment.rivalServiceAtAddress
    }
  };
};

const cloneFilters = (source: Filters): Filters => JSON.parse(JSON.stringify(source)) as Filters;

const formatRange = (range: [number, number]) =>
  range[0] === 0 && range[1] === 0 ? 'any' : `${range[0]}-${range[1]}`;

const formatArray = (value: string[]) => (value.length ? value.join(',') : 'any');

export const buildQuery = (filters: Filters) => ({
  'peoplePlace.locationContext.geoLevel': filters.peoplePlace.locationContext.geoLevel,
  'peoplePlace.locationContext.areaType': filters.peoplePlace.locationContext.areaType,
  'peoplePlace.locationContext.detail': filters.peoplePlace.locationContext.detail ?? 'Any',
  'peoplePlace.incomeLevel': formatRange(filters.peoplePlace.incomeLevel),
  'peoplePlace.hhSize': String(filters.peoplePlace.hhSizeLines.hhSize ?? 'Any'),
  'peoplePlace.lines': String(filters.peoplePlace.hhSizeLines.lines ?? 'Any'),
  'peoplePlace.deviceTypes': formatArray(filters.peoplePlace.device5G.deviceTypes),
  'peoplePlace.fiveGReady': filters.peoplePlace.device5G.fiveGReady === 'Any' ? 'Any' : filters.peoplePlace.device5G.fiveGReady,
  'peoplePlace.tenure': formatRange(filters.peoplePlace.tenurePay.tenureMonths),
  'peoplePlace.payReliability': String(filters.peoplePlace.tenurePay.payReliability ?? 'Any'),
  'motivationMindset.priceSensitivity': filters.motivationMindset.priceSensitivity === 50 ? 'any' : filters.motivationMindset.priceSensitivity,
  'motivationMindset.speedCoverageImportance':
    filters.motivationMindset.speedCoverageImportance === 50 ? 'any' : filters.motivationMindset.speedCoverageImportance,
  'motivationMindset.valueForMoney': filters.motivationMindset.valueForMoney === 50 ? 'any' : filters.motivationMindset.valueForMoney,
  'motivationMindset.switchLikelihood2mo':
    filters.motivationMindset.switchLikelihood2mo === 50 ? 'any' : filters.motivationMindset.switchLikelihood2mo,
  'motivationMindset.topFrustrations': formatArray(filters.motivationMindset.topFrustrations),
  'behaviorsInterests.socialTrendAffinity':
    filters.behaviorsInterests.socialTrendAffinity === 50 ? 'any' : filters.behaviorsInterests.socialTrendAffinity,
  'behaviorsInterests.topSpendOutsideConn': formatArray(filters.behaviorsInterests.topSpendOutsideConn),
  'behaviorsInterests.avgConnSpend': formatRange(filters.behaviorsInterests.avgConnSpend),
  'behaviorsInterests.streamingGamingUsage':
    filters.behaviorsInterests.streamingGamingUsage === 50 ? 'any' : filters.behaviorsInterests.streamingGamingUsage,
  'behaviorsInterests.bundlePropensity': formatArray(filters.behaviorsInterests.bundlePropensity),
  'externalSwitchTriggers.recentMove': filters.externalSwitchTriggers.recentMove,
  'externalSwitchTriggers.newServicesAvailable': formatArray(filters.externalSwitchTriggers.newServicesAvailable),
  'externalSwitchTriggers.competitorPromoLevel': filters.externalSwitchTriggers.competitorPromoLevel,
  'externalSwitchTriggers.eventWindow': formatArray(filters.externalSwitchTriggers.eventWindow),
  'externalSwitchTriggers.localDisruption': formatArray(filters.externalSwitchTriggers.localDisruption),
  'competitiveEnvironment.currentPreviousProvider': formatArray(filters.competitiveEnvironment.currentPreviousProvider),
  'competitiveEnvironment.comparingTo': filters.competitiveEnvironment.comparingTo,
  'competitiveEnvironment.rivalBeatsUsOn': formatArray(filters.competitiveEnvironment.rivalBeatsUsOn),
  'competitiveEnvironment.winRateVsRival': formatRange(filters.competitiveEnvironment.winRateVsRival),
  'competitiveEnvironment.rivalServiceAtAddress': filters.competitiveEnvironment.rivalServiceAtAddress
});

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
      >
        ⓘ
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-48 -translate-x-1/2 rounded-md border border-emerald-500/30 bg-slate-900/95 px-2 py-1 text-[11px] leading-relaxed text-slate-200 shadow-lg shadow-emerald-500/10 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      >
        {text}
      </span>
    </span>
  );
};

type FilterFieldProps = {
  label: string;
  tooltip: string;
  dataTestId: string;
  children: (id: string) => React.ReactNode;
};

const FilterField: React.FC<FilterFieldProps> = ({ label, tooltip, dataTestId, children }) => {
  const id = React.useId();
  return (
    <div className="space-y-1" data-testid={dataTestId}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400"
        >
          {label}
          <InfoTooltip text={tooltip} />
        </label>
      </div>
      {children(id)}
    </div>
  );
};

type SectionCardProps = {
  title: string;
  count: number;
  onReset: () => void;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, count, onReset, expanded, onToggle, children }) => (
  <div className="card overflow-hidden border border-slate-800 bg-slate-900/60">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-4 py-3 text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">{count}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReset();
          }}
          className="rounded-full border border-emerald-500/40 bg-slate-900 px-2 py-0.5 text-[11px] uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/10"
        >
          Reset
        </button>
        <span className="text-emerald-300">{expanded ? 'v' : '>'}</span>
      </div>
    </button>
    {expanded ? <div className="space-y-4 border-t border-slate-800/60 px-4 py-4 text-sm text-slate-200">{children}</div> : null}
  </div>
);

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
  const [filters, setFilters] = React.useState<Filters>(() => {
    const base = createDefaultFilters();
    if (typeof window === 'undefined') return base;
    const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!stored) return base;
    try {
      const parsed = JSON.parse(stored) as Partial<Filters>;
      return mergeFilters(base, parsed);
    } catch (error) {
      console.warn('Failed to parse stored Market Radar filters', error);
      return base;
    }
  });
  const [expandedSections, setExpandedSections] = React.useState<Record<keyof Filters, boolean>>({
    peoplePlace: true,
    motivationMindset: true,
    behaviorsInterests: true,
    externalSwitchTriggers: true,
    competitiveEnvironment: true
  });
  const [savedSetFlash, setSavedSetFlash] = React.useState('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const queryPayload = React.useMemo(() => buildQuery(filters), [filters]);

  const countRangeActive = (range: [number, number]) => range[0] !== 0 || range[1] !== 0;

  const headerCounts = React.useMemo(() => {
    const peoplePlace = [
      filters.peoplePlace.locationContext.geoLevel !== 'National',
      filters.peoplePlace.locationContext.areaType !== 'Any',
      Boolean(filters.peoplePlace.locationContext.detail),
      countRangeActive(filters.peoplePlace.incomeLevel),
      filters.peoplePlace.hhSizeLines.hhSize !== 'Any',
      filters.peoplePlace.hhSizeLines.lines !== 'Any',
      filters.peoplePlace.device5G.deviceTypes.length > 0,
      filters.peoplePlace.device5G.fiveGReady !== 'Any',
      countRangeActive(filters.peoplePlace.tenurePay.tenureMonths),
      filters.peoplePlace.tenurePay.payReliability !== 'Any'
    ].filter(Boolean).length;

    const motivationMindset = [
      filters.motivationMindset.priceSensitivity !== 50,
      filters.motivationMindset.speedCoverageImportance !== 50,
      filters.motivationMindset.valueForMoney !== 50,
      filters.motivationMindset.switchLikelihood2mo !== 50,
      filters.motivationMindset.topFrustrations.length > 0
    ].filter(Boolean).length;

    const behaviorsInterests = [
      filters.behaviorsInterests.socialTrendAffinity !== 50,
      filters.behaviorsInterests.topSpendOutsideConn.length > 0,
      countRangeActive(filters.behaviorsInterests.avgConnSpend),
      filters.behaviorsInterests.streamingGamingUsage !== 50,
      filters.behaviorsInterests.bundlePropensity.length > 0
    ].filter(Boolean).length;

    const externalSwitchTriggers = [
      filters.externalSwitchTriggers.recentMove !== 'Any',
      filters.externalSwitchTriggers.newServicesAvailable.length > 0,
      filters.externalSwitchTriggers.competitorPromoLevel !== 'Any',
      filters.externalSwitchTriggers.eventWindow.length > 0,
      filters.externalSwitchTriggers.localDisruption.length > 0
    ].filter(Boolean).length;

    const competitiveEnvironment = [
      filters.competitiveEnvironment.currentPreviousProvider.length > 0,
      filters.competitiveEnvironment.comparingTo !== 'Any',
      filters.competitiveEnvironment.rivalBeatsUsOn.length > 0,
      countRangeActive(filters.competitiveEnvironment.winRateVsRival),
      filters.competitiveEnvironment.rivalServiceAtAddress !== 'Any'
    ].filter(Boolean).length;

    return {
      peoplePlace,
      motivationMindset,
      behaviorsInterests,
      externalSwitchTriggers,
      competitiveEnvironment,
      total:
        peoplePlace +
        motivationMindset +
        behaviorsInterests +
        externalSwitchTriggers +
        competitiveEnvironment
    } as const;
  }, [filters]);

  const resetSection = (key: keyof Filters) => {
    const defaults = createDefaultFilters();
    setFilters((prev) => ({ ...prev, [key]: defaults[key] }));
  };

  const clearAllFilters = () => {
    setFilters(createDefaultFilters());
  };

  const saveFilterSet = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FILTER_SET_STORAGE_KEY, JSON.stringify(filters));
    setSavedSetFlash('Saved');
    window.setTimeout(() => setSavedSetFlash(''), 1200);
  };

  const toggleSection = (key: keyof Filters) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const recordAction = (segmentIds: string | string[], action: 'shortlist' | 'advance') => {
    if (typeof window === 'undefined') return;
    const ids = Array.isArray(segmentIds) ? segmentIds : [segmentIds];
    window.localStorage.setItem(`sbm.mr.${action}`, JSON.stringify({ segmentIds: ids, filters: queryPayload }));
  };

  const toggleChip = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

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
    const regionDetail = filters.peoplePlace.locationContext.detail?.toLowerCase();
    const pricePref = filters.motivationMindset.priceSensitivity;
    const priceBand = pricePref === 50 ? 'any' : pricePref >= 67 ? 'high' : pricePref <= 33 ? 'low' : 'medium';
    const sizeFloor = filters.peoplePlace.incomeLevel[0];

    const filtered = segments
      .map((segment) => ({
        segment,
        sim: computeSegmentSim(segment.id)
      }))
      .filter(({ segment }) => {
        if (regionDetail && !segment.region.toLowerCase().includes(regionDetail)) {
          return false;
        }
        if (sizeFloor && segment.size < sizeFloor) {
          return false;
        }
        if (priceBand !== 'any') {
          if (priceBand === 'high' && segment.priceSensitivity < 0.7) return false;
          if (priceBand === 'medium' && (segment.priceSensitivity < 0.45 || segment.priceSensitivity > 0.7)) return false;
          if (priceBand === 'low' && segment.priceSensitivity >= 0.45) return false;
        }
        return true;
      })
      .sort((a, b) => b.sim.opportunity - a.sim.opportunity)
      .slice(0, 9);
    setRecommended(filtered.map(({ segment }) => segment.id));
    return filtered;
  }, [computeSegmentSim, filters, segments, setRecommended]);

  const bubbleData: BubblePoint[] = rankedSegments.map(({ segment, sim }) => ({
    id: segment.id,
    opportunity: Math.min(100, sim.opportunity),
    size: segment.size,
    netAdds: sim.netAdds,
    category: segment.region
  }));

  const handleCommand = () => {
    const { filters: intentFilters, summary } = parseIntent(command);
    setFilters((prev) => {
      const next = cloneFilters(prev);
      if (intentFilters.region) {
        const region = String(intentFilters.region).toLowerCase();
        if (['urban', 'suburban', 'rural'].includes(region)) {
          next.peoplePlace.locationContext = {
            ...next.peoplePlace.locationContext,
            geoLevel: 'National',
            areaType: region.charAt(0).toUpperCase() + region.slice(1) as LocationContext['areaType'],
            detail: undefined
          };
        } else if (region === 'national') {
          next.peoplePlace.locationContext = { geoLevel: 'National', areaType: 'Any', detail: undefined };
        } else {
          next.peoplePlace.locationContext = {
            ...next.peoplePlace.locationContext,
            geoLevel: 'Region',
            areaType: 'Any',
            detail: region
          };
        }
      }
      if (intentFilters.priceSensitivity) {
        const desired = String(intentFilters.priceSensitivity).toLowerCase();
        next.motivationMindset.priceSensitivity =
          desired === 'high' ? 80 : desired === 'low' ? 20 : 50;
      }
      if (intentFilters.switchLikelihood) {
        next.motivationMindset.switchLikelihood2mo =
          String(intentFilters.switchLikelihood).toLowerCase() === 'high' ? 80 : 65;
      }
      if (intentFilters.valueSensitivity) {
        const val = String(intentFilters.valueSensitivity).toLowerCase();
        next.motivationMindset.valueForMoney = val === 'high' ? 80 : val === 'low' ? 20 : 50;
      }
      return next;
    });
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
    const showCompetitiveCallout = headerCounts.competitiveEnvironment > 0;
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
            {showCompetitiveCallout ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                Competitive filters active • align playbook with rival dynamics.
              </div>
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
  }, [activeSegment, headerCounts.competitiveEnvironment]);

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
      <div className="grid grid-cols-[280px_1fr_320px] gap-6">
        <aside className="flex flex-col gap-4">
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
          <div className="relative">
            <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/80 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-full border border-emerald-500/40 bg-slate-900 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/10"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={saveFilterSet}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
                >
                  Save filter set
                </button>
                {savedSetFlash ? <span className="text-emerald-300">{savedSetFlash}</span> : null}
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">Active {headerCounts.total}</span>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <SectionCard
                title="People & Place"
                count={headerCounts.peoplePlace}
                onReset={() => resetSection('peoplePlace')}
                expanded={expandedSections.peoplePlace}
                onToggle={() => toggleSection('peoplePlace')}
              >
                <FilterField
                  label="Location context"
                  tooltip="Geo grain + neighborhood type to localize opportunity."
                  dataTestId="mr-peoplePlace-locationContext"
                >
                  {(id) => {
                    const geoLevel = filters.peoplePlace.locationContext.geoLevel;
                    const detailPlaceholder =
                      geoLevel === 'Region'
                        ? 'Region (e.g., West)'
                        : geoLevel === 'State'
                          ? 'State (e.g., CA)'
                          : geoLevel === 'ZIP'
                            ? 'ZIP or ZIP3'
                            : 'Descriptor';
                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            id={id}
                            value={geoLevel}
                            onChange={(event) =>
                              setFilters((prev) => ({
                                ...prev,
                                peoplePlace: {
                                  ...prev.peoplePlace,
                                  locationContext: {
                                    ...prev.peoplePlace.locationContext,
                                    geoLevel: event.target.value as LocationContext['geoLevel'],
                                    detail: event.target.value === 'National' ? undefined : prev.peoplePlace.locationContext.detail
                                  }
                                }
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
                            id={`${id}-area`}
                            value={filters.peoplePlace.locationContext.areaType}
                            onChange={(event) =>
                              setFilters((prev) => ({
                                ...prev,
                                peoplePlace: {
                                  ...prev.peoplePlace,
                                  locationContext: {
                                    ...prev.peoplePlace.locationContext,
                                    areaType: event.target.value as LocationContext['areaType']
                                  }
                                }
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
                        {geoLevel !== 'National' ? (
                          <input
                            id={`${id}-detail`}
                            value={filters.peoplePlace.locationContext.detail ?? ''}
                            onChange={(event) =>
                              setFilters((prev) => ({
                                ...prev,
                                peoplePlace: {
                                  ...prev.peoplePlace,
                                  locationContext: {
                                    ...prev.peoplePlace.locationContext,
                                    detail: event.target.value
                                  }
                                }
                              }))
                            }
                            placeholder={detailPlaceholder}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        ) : null}
                      </div>
                    );
                  }}
                </FilterField>
                <FilterField
                  label="Income level (range)"
                  tooltip="Household income band to index affordability and ARPU headroom."
                  dataTestId="mr-peoplePlace-incomeLevel"
                >
                  {(id) => (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        id={id}
                        type="number"
                        min={0}
                        value={filters.peoplePlace.incomeLevel[0] || ''}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            peoplePlace: {
                              ...prev.peoplePlace,
                              incomeLevel: [Number(event.target.value || 0), prev.peoplePlace.incomeLevel[1]]
                            }
                          }))
                        }
                        placeholder="Min"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        id={`${id}-max`}
                        type="number"
                        min={0}
                        value={filters.peoplePlace.incomeLevel[1] || ''}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            peoplePlace: {
                              ...prev.peoplePlace,
                              incomeLevel: [prev.peoplePlace.incomeLevel[0], Number(event.target.value || 0)]
                            }
                          }))
                        }
                        placeholder="Max"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Household size & active lines"
                  tooltip="Match plan fit to number of people and current lines in market."
                  dataTestId="mr-peoplePlace-hhSizeLines"
                >
                  {(id) => (
                    <div className="grid grid-cols-2 gap-2">
                          <select
                            id={id}
                            value={String(filters.peoplePlace.hhSizeLines.hhSize)}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            peoplePlace: {
                              ...prev.peoplePlace,
                              hhSizeLines: {
                                ...prev.peoplePlace.hhSizeLines,
                                hhSize: event.target.value === 'Any' ? 'Any' : Number(event.target.value)
                              }
                            }
                          }))
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      >
                        {['Any', '1', '2', '3', '4', '5', '6+'].map((option) => (
                          <option key={option} value={option === '6+' ? '6' : option}>
                            {option}
                          </option>
                        ))}
                      </select>
                          <select
                            id={`${id}-lines`}
                            value={String(filters.peoplePlace.hhSizeLines.lines)}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            peoplePlace: {
                              ...prev.peoplePlace,
                              hhSizeLines: {
                                ...prev.peoplePlace.hhSizeLines,
                                lines: event.target.value === 'Any' ? 'Any' : Number(event.target.value)
                              }
                            }
                          }))
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      >
                        {['Any', '1', '2', '3', '4', '5', '6+'].map((option) => (
                          <option key={`lines-${option}`} value={option === '6+' ? '6' : option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Device type & 5G capability"
                  tooltip="Device mix & readiness to tailor offers."
                  dataTestId="mr-peoplePlace-device5G"
                >
                  {(id) => (
                    <div className="space-y-2">
                      <input id={id} type="hidden" value="" readOnly />
                      <div className="flex flex-wrap gap-2">
                        {deviceTypeOptions.map((device) => {
                          const selected = filters.peoplePlace.device5G.deviceTypes.includes(device);
                          return (
                            <button
                              key={device}
                              type="button"
                              onClick={() =>
                                setFilters((prev) => ({
                                  ...prev,
                                  peoplePlace: {
                                    ...prev.peoplePlace,
                                    device5G: {
                                      ...prev.peoplePlace.device5G,
                                      deviceTypes: toggleChip(prev.peoplePlace.device5G.deviceTypes, device)
                                    }
                                  }
                                }))
                              }
                              className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                            >
                              {device}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            peoplePlace: {
                              ...prev.peoplePlace,
                              device5G: {
                                ...prev.peoplePlace.device5G,
                                fiveGReady:
                                  prev.peoplePlace.device5G.fiveGReady === 'Any'
                                    ? true
                                    : prev.peoplePlace.device5G.fiveGReady === true
                                      ? false
                                      : 'Any'
                              }
                            }
                          }))
                        }
                        className="rounded-full border border-emerald-500/40 bg-slate-900 px-3 py-1 text-xs uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/10"
                      >
                        5G-ready: {filters.peoplePlace.device5G.fiveGReady === 'Any' ? 'Any' : filters.peoplePlace.device5G.fiveGReady ? 'Yes' : 'No'}
                      </button>
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Tenure & payment reliability"
                  tooltip="Blend of tenure buckets and on-time payment score."
                  dataTestId="mr-peoplePlace-tenurePay"
                >
                  {(id) => (
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        id={id}
                        type="number"
                        min={0}
                        value={filters.peoplePlace.tenurePay.tenureMonths[0] || ''}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            peoplePlace: {
                              ...prev.peoplePlace,
                              tenurePay: {
                                ...prev.peoplePlace.tenurePay,
                                tenureMonths: [Number(event.target.value || 0), prev.peoplePlace.tenurePay.tenureMonths[1]]
                              }
                            }
                          }))
                        }
                        placeholder="Min mo"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        id={`${id}-max`}
                        type="number"
                        min={0}
                        value={filters.peoplePlace.tenurePay.tenureMonths[1] || ''}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            peoplePlace: {
                              ...prev.peoplePlace,
                              tenurePay: {
                                ...prev.peoplePlace.tenurePay,
                                tenureMonths: [prev.peoplePlace.tenurePay.tenureMonths[0], Number(event.target.value || 0)]
                              }
                            }
                          }))
                        }
                        placeholder="Max mo"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <select
                        id={`${id}-score`}
                        value={String(filters.peoplePlace.tenurePay.payReliability)}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            peoplePlace: {
                              ...prev.peoplePlace,
                              tenurePay: {
                                ...prev.peoplePlace.tenurePay,
                                payReliability:
                                  event.target.value === 'Any' ? 'Any' : Number(event.target.value)
                              }
                            }
                          }))
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      >
                        {['Any', '1', '2', '3', '4', '5'].map((option) => (
                          <option key={`pay-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </FilterField>
              </SectionCard>
              <SectionCard
                title="Motivation & Mindset"
                count={headerCounts.motivationMindset}
                onReset={() => resetSection('motivationMindset')}
                expanded={expandedSections.motivationMindset}
                onToggle={() => toggleSection('motivationMindset')}
              >
                <FilterField
                  label="Price sensitivity"
                  tooltip="Self-reported or inferred sensitivity to monthly bill changes."
                  dataTestId="mr-motivationMindset-priceSensitivity"
                >
                  {(id) => (
                    <div className="space-y-1">
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={filters.motivationMindset.priceSensitivity}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            motivationMindset: {
                              ...prev.motivationMindset,
                              priceSensitivity: Number(event.target.value)
                            }
                          }))
                        }
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">
                        {filters.motivationMindset.priceSensitivity === 50
                          ? 'Any'
                          : `${filters.motivationMindset.priceSensitivity}`}
                      </span>
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Importance of speed & coverage"
                  tooltip="Measures perceived need for network performance."
                  dataTestId="mr-motivationMindset-speedCoverageImportance"
                >
                  {(id) => (
                    <div className="space-y-1">
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={filters.motivationMindset.speedCoverageImportance}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            motivationMindset: {
                              ...prev.motivationMindset,
                              speedCoverageImportance: Number(event.target.value)
                            }
                          }))
                        }
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">
                        {filters.motivationMindset.speedCoverageImportance === 50
                          ? 'Any'
                          : `${filters.motivationMindset.speedCoverageImportance}`}
                      </span>
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Perceived value for money"
                  tooltip="How the audience rates the value equation of their plan."
                  dataTestId="mr-motivationMindset-valueForMoney"
                >
                  {(id) => (
                    <div className="space-y-1">
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={filters.motivationMindset.valueForMoney}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            motivationMindset: {
                              ...prev.motivationMindset,
                              valueForMoney: Number(event.target.value)
                            }
                          }))
                        }
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">
                        {filters.motivationMindset.valueForMoney === 50
                          ? 'Any'
                          : `${filters.motivationMindset.valueForMoney}`}
                      </span>
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Likelihood to switch (next 2 months)"
                  tooltip="Intent signal for near-term churn or provider change."
                  dataTestId="mr-motivationMindset-switchLikelihood2mo"
                >
                  {(id) => (
                    <div className="space-y-1">
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={filters.motivationMindset.switchLikelihood2mo}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            motivationMindset: {
                              ...prev.motivationMindset,
                              switchLikelihood2mo: Number(event.target.value)
                            }
                          }))
                        }
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">
                        {filters.motivationMindset.switchLikelihood2mo === 50
                          ? 'Any'
                          : `${filters.motivationMindset.switchLikelihood2mo}`}
                      </span>
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Top frustrations with current provider"
                  tooltip="Pinpoint sticking points you can solve."
                  dataTestId="mr-motivationMindset-topFrustrations"
                >
                  {(id) => (
                    <div className="flex flex-wrap gap-2">
                      <input id={id} type="hidden" value="" readOnly />
                      {frustrationOptions.map((option) => {
                        const selected = filters.motivationMindset.topFrustrations.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                motivationMindset: {
                                  ...prev.motivationMindset,
                                  topFrustrations: toggleChip(prev.motivationMindset.topFrustrations, option)
                                }
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FilterField>
              </SectionCard>
              <SectionCard
                title="Behaviors & Interests"
                count={headerCounts.behaviorsInterests}
                onReset={() => resetSection('behaviorsInterests')}
                expanded={expandedSections.behaviorsInterests}
                onToggle={() => toggleSection('behaviorsInterests')}
              >
                <FilterField
                  label="Social / trend affinity"
                  tooltip="Appetite for pop culture and viral trends."
                  dataTestId="mr-behaviorsInterests-socialTrendAffinity"
                >
                  {(id) => (
                    <div className="space-y-1">
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={filters.behaviorsInterests.socialTrendAffinity}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            behaviorsInterests: {
                              ...prev.behaviorsInterests,
                              socialTrendAffinity: Number(event.target.value)
                            }
                          }))
                        }
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">
                        {filters.behaviorsInterests.socialTrendAffinity === 50
                          ? 'Any'
                          : `${filters.behaviorsInterests.socialTrendAffinity}`}
                      </span>
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Top spend outside connectivity"
                  tooltip="Follow the dollars to adjacent purchase categories."
                  dataTestId="mr-behaviorsInterests-topSpendOutsideConn"
                >
                  {(id) => (
                    <div className="flex flex-wrap gap-2">
                      <input id={id} type="hidden" value="" readOnly />
                      {spendSectorOptions.map((option) => {
                        const selected = filters.behaviorsInterests.topSpendOutsideConn.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                behaviorsInterests: {
                                  ...prev.behaviorsInterests,
                                  topSpendOutsideConn: toggleChip(prev.behaviorsInterests.topSpendOutsideConn, option)
                                }
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Avg monthly connectivity spend"
                  tooltip="Spending band to gauge ARPU expansion."
                  dataTestId="mr-behaviorsInterests-avgConnSpend"
                >
                  {(id) => (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        id={id}
                        type="number"
                        min={0}
                        value={filters.behaviorsInterests.avgConnSpend[0] || ''}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            behaviorsInterests: {
                              ...prev.behaviorsInterests,
                              avgConnSpend: [Number(event.target.value || 0), prev.behaviorsInterests.avgConnSpend[1]]
                            }
                          }))
                        }
                        placeholder="Min $"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        id={`${id}-max`}
                        type="number"
                        min={0}
                        value={filters.behaviorsInterests.avgConnSpend[1] || ''}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            behaviorsInterests: {
                              ...prev.behaviorsInterests,
                              avgConnSpend: [prev.behaviorsInterests.avgConnSpend[0], Number(event.target.value || 0)]
                            }
                          }))
                        }
                        placeholder="Max $"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Streaming / gaming usage"
                  tooltip="Engagement level with high-bandwidth media."
                  dataTestId="mr-behaviorsInterests-streamingGamingUsage"
                >
                  {(id) => (
                    <div className="space-y-1">
                      <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={filters.behaviorsInterests.streamingGamingUsage}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            behaviorsInterests: {
                              ...prev.behaviorsInterests,
                              streamingGamingUsage: Number(event.target.value)
                            }
                          }))
                        }
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">
                        {filters.behaviorsInterests.streamingGamingUsage === 50
                          ? 'Any'
                          : `${filters.behaviorsInterests.streamingGamingUsage}`}
                      </span>
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Bundle propensity"
                  tooltip="Likelihood to respond to bundle offers (mobile, internet, TV)."
                  dataTestId="mr-behaviorsInterests-bundlePropensity"
                >
                  {(id) => (
                    <div className="flex flex-wrap gap-2">
                      <input id={id} type="hidden" value="" readOnly />
                      {bundleOptions.map((option) => {
                        const selected = filters.behaviorsInterests.bundlePropensity.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                behaviorsInterests: {
                                  ...prev.behaviorsInterests,
                                  bundlePropensity: toggleChip(prev.behaviorsInterests.bundlePropensity, option)
                                }
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FilterField>
              </SectionCard>
              <SectionCard
                title="External Switch Triggers"
                count={headerCounts.externalSwitchTriggers}
                onReset={() => resetSection('externalSwitchTriggers')}
                expanded={expandedSections.externalSwitchTriggers}
                onToggle={() => toggleSection('externalSwitchTriggers')}
              >
                <FilterField
                  label="Recent move / address change"
                  tooltip="Signals a high-propensity switching moment."
                  dataTestId="mr-externalSwitchTriggers-recentMove"
                >
                  {(id) => (
                    <select
                      id={id}
                      value={filters.externalSwitchTriggers.recentMove}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          externalSwitchTriggers: {
                            ...prev.externalSwitchTriggers,
                            recentMove: event.target.value as Filters['externalSwitchTriggers']['recentMove']
                          }
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
                  )}
                </FilterField>
                <FilterField
                  label="New services available (Fiber, FWA)"
                  tooltip="Track fresh infrastructure that changes the value equation."
                  dataTestId="mr-externalSwitchTriggers-newServicesAvailable"
                >
                  {(id) => (
                    <div className="flex flex-wrap gap-2">
                      <input id={id} type="hidden" value="" readOnly />
                      {triggerServices.map((service) => {
                        const selected = filters.externalSwitchTriggers.newServicesAvailable.includes(service);
                        return (
                          <button
                            key={service}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                externalSwitchTriggers: {
                                  ...prev.externalSwitchTriggers,
                                  newServicesAvailable: toggleChip(prev.externalSwitchTriggers.newServicesAvailable, service)
                                }
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                          >
                            {service}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Competitor promo/price change in ZIP"
                  tooltip="Detect competing moves that heat the market."
                  dataTestId="mr-externalSwitchTriggers-competitorPromoLevel"
                >
                  {(id) => (
                    <select
                      id={id}
                      value={filters.externalSwitchTriggers.competitorPromoLevel}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          externalSwitchTriggers: {
                            ...prev.externalSwitchTriggers,
                            competitorPromoLevel: event.target.value as Filters['externalSwitchTriggers']['competitorPromoLevel']
                          }
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
                  )}
                </FilterField>
                <FilterField
                  label="Event-driven window"
                  tooltip="Moments like back-to-school or holidays to time outreach."
                  dataTestId="mr-externalSwitchTriggers-eventWindow"
                >
                  {(id) => (
                    <div className="flex flex-wrap gap-2">
                      <input id={id} type="hidden" value="" readOnly />
                      {eventWindows.map((eventLabel) => {
                        const selected = filters.externalSwitchTriggers.eventWindow.includes(eventLabel);
                        return (
                          <button
                            key={eventLabel}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                externalSwitchTriggers: {
                                  ...prev.externalSwitchTriggers,
                                  eventWindow: toggleChip(prev.externalSwitchTriggers.eventWindow, eventLabel)
                                }
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                          >
                            {eventLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Local disruption / upgrade event"
                  tooltip="Capture outages or upgrades that shift sentiment."
                  dataTestId="mr-externalSwitchTriggers-localDisruption"
                >
                  {(id) => (
                    <div className="flex flex-wrap gap-2">
                      <input id={id} type="hidden" value="" readOnly />
                      {disruptionEvents.map((eventLabel) => {
                        const selected = filters.externalSwitchTriggers.localDisruption.includes(eventLabel);
                        return (
                          <button
                            key={eventLabel}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                externalSwitchTriggers: {
                                  ...prev.externalSwitchTriggers,
                                  localDisruption: toggleChip(prev.externalSwitchTriggers.localDisruption, eventLabel)
                                }
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                          >
                            {eventLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FilterField>
              </SectionCard>
              <SectionCard
                title="Competitive Environment"
                count={headerCounts.competitiveEnvironment}
                onReset={() => resetSection('competitiveEnvironment')}
                expanded={expandedSections.competitiveEnvironment}
                onToggle={() => toggleSection('competitiveEnvironment')}
              >
                <FilterField
                  label="Current / previous provider"
                  tooltip="Anchor on the players they already know."
                  dataTestId="mr-competitiveEnvironment-currentPreviousProvider"
                >
                  {(id) => (
                    <div className="flex flex-wrap gap-2">
                      <input id={id} type="hidden" value="" readOnly />
                      {providerOptions.map((provider) => {
                        const selected = filters.competitiveEnvironment.currentPreviousProvider.includes(provider);
                        return (
                          <button
                            key={provider}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                competitiveEnvironment: {
                                  ...prev.competitiveEnvironment,
                                  currentPreviousProvider: toggleChip(prev.competitiveEnvironment.currentPreviousProvider, provider)
                                }
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                          >
                            {provider}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Actively comparing to"
                  tooltip="Single rival they are evaluating head-to-head."
                  dataTestId="mr-competitiveEnvironment-comparingTo"
                >
                  {(id) => (
                    <select
                      id={id}
                      value={filters.competitiveEnvironment.comparingTo}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          competitiveEnvironment: {
                            ...prev.competitiveEnvironment,
                            comparingTo: event.target.value as Filters['competitiveEnvironment']['comparingTo']
                          }
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {['Any', ...providerOptions].map((provider) => (
                        <option key={`compare-${provider}`} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  )}
                </FilterField>
                <FilterField
                  label="Where rival beats us"
                  tooltip="Dimension(s) where a specific rival over-indexes."
                  dataTestId="mr-competitiveEnvironment-rivalBeatsUsOn"
                >
                  {(id) => (
                    <div className="flex flex-wrap gap-2">
                      <input id={id} type="hidden" value="" readOnly />
                      {rivalStrengths.map((strength) => {
                        const selected = filters.competitiveEnvironment.rivalBeatsUsOn.includes(strength);
                        return (
                          <button
                            key={strength}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                competitiveEnvironment: {
                                  ...prev.competitiveEnvironment,
                                  rivalBeatsUsOn: toggleChip(prev.competitiveEnvironment.rivalBeatsUsOn, strength)
                                }
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'} hover:border-emerald-500/60`}
                          >
                            {strength}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Historical win-rate vs rival"
                  tooltip="Range of win-rate performance to calibrate expectations."
                  dataTestId="mr-competitiveEnvironment-winRateVsRival"
                >
                  {(id) => (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        id={id}
                        type="number"
                        min={0}
                        max={100}
                        value={filters.competitiveEnvironment.winRateVsRival[0] || ''}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            competitiveEnvironment: {
                              ...prev.competitiveEnvironment,
                              winRateVsRival: [Number(event.target.value || 0), prev.competitiveEnvironment.winRateVsRival[1]]
                            }
                          }))
                        }
                        placeholder="Min %"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        id={`${id}-max`}
                        type="number"
                        min={0}
                        max={100}
                        value={filters.competitiveEnvironment.winRateVsRival[1] || ''}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            competitiveEnvironment: {
                              ...prev.competitiveEnvironment,
                              winRateVsRival: [prev.competitiveEnvironment.winRateVsRival[0], Number(event.target.value || 0)]
                            }
                          }))
                        }
                        placeholder="Max %"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                </FilterField>
                <FilterField
                  label="Rival service at address"
                  tooltip="Whether the rival can serve the address today."
                  dataTestId="mr-competitiveEnvironment-rivalServiceAtAddress"
                >
                  {(id) => (
                    <select
                      id={id}
                      value={filters.competitiveEnvironment.rivalServiceAtAddress}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          competitiveEnvironment: {
                            ...prev.competitiveEnvironment,
                            rivalServiceAtAddress:
                              event.target.value as Filters['competitiveEnvironment']['rivalServiceAtAddress']
                          }
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {['Any', 'Yes', 'No', 'Unknown'].map((option) => (
                        <option key={`rival-service-${option}`} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </FilterField>
              </SectionCard>
            </div>
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
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                  Active filters
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-100">{headerCounts.total}</span>
                </span>
              </div>
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
                    onSelect={(checked) => {
                      if (checked) {
                        addToCart(segment.id);
                        recordAction(segment.id, 'shortlist');
                      } else {
                        removeFromCart(segment.id);
                      }
                    }}
                    onAddToCart={() => {
                      addToCart(segment.id);
                      recordAction(segment.id, 'shortlist');
                    }}
                    onSendToStudio={() => {
                      addToCart(segment.id);
                      recordAction(segment.id, 'advance');
                      navigate('/segment-studio', { state: { filters: queryPayload } });
                    }}
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
                setFilters((prev) => {
                  const next = cloneFilters(prev);
                  if (deepest?.meta?.zip3) {
                    next.peoplePlace.locationContext = {
                      ...next.peoplePlace.locationContext,
                      geoLevel: 'ZIP',
                      detail: deepest.meta.zip3
                    };
                  } else if (deepest?.meta?.dma) {
                    next.peoplePlace.locationContext = {
                      ...next.peoplePlace.locationContext,
                      geoLevel: 'Region',
                      detail: deepest.meta.dma
                    };
                  } else if (deepest?.meta?.region) {
                    next.peoplePlace.locationContext = {
                      ...next.peoplePlace.locationContext,
                      geoLevel: 'Region',
                      detail: deepest.meta.region
                    };
                  }
                  return next;
                });
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
                onClick={() => {
                  addToCart(activeSegment.segment.id);
                  recordAction(activeSegment.segment.id, 'advance');
                  navigate('/segment-studio', { state: { filters: queryPayload } });
                }}
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
            onCta={() => {
              recordAction(cartSegmentIds, 'advance');
              navigate('/segment-studio', { state: { filters: queryPayload } });
            }}
            disabled={!cartSegmentIds.length}
          />
        </div>
      </div>
    </div>
  );
};

export default MarketRadar;
