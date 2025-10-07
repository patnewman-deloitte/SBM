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

type FilterField = {
  id: string;
  label: string;
  type: 'select' | 'range' | 'text';
  options?: string[];
  placeholder?: string;
  info: { title: string; description: string; primarySource?: string };
};

type FilterGroup = {
  id: string;
  label: string;
  fields: FilterField[];
  source?: string;
};

const filterGroups: FilterGroup[] = [
  {
    id: 'people-place',
    label: 'People & Place',
    source: 'Converge CONSUMER / HundredX / Recon / CSP 1P (synthetic)',
    fields: [
      {
        id: 'region',
        label: 'Region focus',
        type: 'select',
        options: ['National', 'Urban', 'Suburban', 'Rural', 'West', 'South', 'Northeast'],
        info: {
          title: 'Region filter',
          description: 'Focus the cohort list by geography or environment-level markers.',
          primarySource: 'Converge CONSUMER (synthetic)'
        }
      },
      {
        id: 'minSize',
        label: 'Minimum cohort size',
        type: 'range',
        info: {
          title: 'Cohort size threshold',
          description: 'Use to limit results to larger targetable audiences.',
          primarySource: 'Synth Cohort Econ'
        }
      }
    ]
  },
  {
    id: 'motivation',
    label: 'Motivation & Mindset',
    source: 'Recon Qual Synth / Sentiment Signals',
    fields: [
      {
        id: 'priceSensitivity',
        label: 'Price sensitivity',
        type: 'select',
        options: ['Any', 'Low', 'Medium', 'High'],
        info: {
          title: 'Price Sensitivity',
          description: 'Relative importance of price versus other triggers for this cohort.',
          primarySource: 'Recon Sentiment (synthetic)'
        }
      },
      {
        id: 'switchLikelihood',
        label: 'Likelihood to switch',
        type: 'select',
        options: ['Any', 'Elevated', 'High'],
        info: {
          title: 'Switch likelihood',
          description: 'Qualitative assessment of how likely members are to change providers.',
          primarySource: 'Churn Propensity Model (synthetic)'
        }
      }
    ]
  },
  {
    id: 'behaviors',
    label: 'Behaviors & Interests',
    source: 'App Usage Graph / OTT Panels',
    fields: [
      {
        id: 'streaming',
        label: 'Streaming usage',
        type: 'select',
        options: ['Any', 'Light', 'Moderate', 'Heavy'],
        info: {
          title: 'Streaming usage',
          description: 'Levels of video/OTT consumption and device reliance.',
          primarySource: 'OTT Behavioral Panel (synthetic)'
        }
      },
      {
        id: 'bundlePropensity',
        label: 'Bundle propensity',
        type: 'select',
        options: ['Any', 'Moderate', 'High'],
        info: {
          title: 'Bundle propensity',
          description: 'Willingness to add adjacent services when incented.',
          primarySource: 'Cross-sell Model (synthetic)'
        }
      }
    ]
  },
  {
    id: 'channels',
    label: 'Channels & Reachability',
    source: 'Engagement Graph / Campaign 1P',
    fields: [
      {
        id: 'preferredChannel',
        label: 'Preferred channel',
        type: 'select',
        options: ['Any', 'Search', 'Social', 'Retail', 'Email'],
        info: {
          title: 'Preferred channel',
          description: 'Channel most likely to capture attention for this cohort.',
          primarySource: 'Engagement Graph (synthetic)'
        }
      }
    ]
  }
];

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
  const activeFilters = useGlobalStore((s) => s.activeFilters);
  const cartSegmentIds = useGlobalStore((s) => s.cartSegmentIds);
  const setFilters = useGlobalStore((s) => s.setFilters);
  const setRecommended = useGlobalStore((s) => s.setRecommendedSegmentIds);
  const addToCart = useGlobalStore((s) => s.addSegmentToCart);
  const removeFromCart = useGlobalStore((s) => s.removeSegmentFromCart);
  const setActiveSegment = useGlobalStore((s) => s.setActiveSegment);
  const activeSegmentId = useGlobalStore((s) => s.activeSegmentId);

  const [view, setView] = React.useState<ViewMode>('market');
  const [command, setCommand] = React.useState('');
  const [intentSummary, setIntentSummary] = React.useState('');

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
    const filtered = segments
      .map((segment) => ({
        segment,
        sim: computeSegmentSim(segment.id)
      }))
      .filter(({ segment }) => {
        if (activeFilters.region && activeFilters.region !== 'national') {
          const region = String(activeFilters.region).toLowerCase();
          if (!segment.region.toLowerCase().includes(region)) {
            return false;
          }
        }
        if (activeFilters.minSize && segment.size < Number(activeFilters.minSize)) {
          return false;
        }
        if (activeFilters.priceSensitivity) {
          const desired = String(activeFilters.priceSensitivity).toLowerCase();
          if (desired !== 'any') {
            if (desired === 'high' && segment.priceSensitivity < 0.7) return false;
            if (desired === 'medium' && (segment.priceSensitivity < 0.45 || segment.priceSensitivity > 0.7)) return false;
            if (desired === 'low' && segment.priceSensitivity >= 0.45) return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.sim.opportunity - a.sim.opportunity)
      .slice(0, 9);
    setRecommended(filtered.map(({ segment }) => segment.id));
    return filtered;
  }, [activeFilters, computeSegmentSim, segments, setRecommended]);

  const bubbleData: BubblePoint[] = rankedSegments.map(({ segment, sim }) => ({
    id: segment.id,
    opportunity: Math.min(100, sim.opportunity),
    size: segment.size,
    netAdds: sim.netAdds,
    category: segment.region
  }));

  const handleCommand = () => {
    const { filters, summary } = parseIntent(command);
    setFilters(filters);
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
          <ul className="space-y-1">
            <li>Primary rival: Coverage gaps exploited by BetaTel</li>
            <li>Local promo intensity: {Math.round(activeSegment.sim.opportunity / 1.6)} index</li>
            <li>Network perception: {Math.round(segment.valueSensitivity * 100)} / 100</li>
          </ul>
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
  }, [activeSegment]);

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
          {filterGroups.map((group) => (
            <div key={group.id} className="card border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{group.label}</h3>
                <InfoPopover title={group.label} description={`Filters linked to the ${group.label} framework.`} />
              </div>
              <div className="mt-3 space-y-3">
                {group.fields.map((field) => {
                  const value = activeFilters[field.id] ?? (field.type === 'select' ? field.options?.[0]?.toLowerCase() ?? '' : '');
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                        {field.label}
                        <InfoPopover title={field.info.title} description={field.info.description} placement="left" />
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={value}
                          onChange={(event) => setFilters({ [field.id]: event.target.value.toLowerCase() })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        >
                          {field.options?.map((option) => (
                            <option key={option} value={option.toLowerCase()}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'range' ? (
                        <input
                          type="number"
                          min={0}
                          value={activeFilters[field.id] ?? ''}
                          onChange={(event) => setFilters({ [field.id]: event.target.value ? Number(event.target.value) : undefined })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          placeholder="Size in households"
                        />
                      ) : (
                        <input
                          type="text"
                          value={activeFilters[field.id] ?? ''}
                          onChange={(event) => setFilters({ [field.id]: event.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
                    onSelect={(checked) => (checked ? addToCart(segment.id) : removeFromCart(segment.id))}
                    onAddToCart={() => addToCart(segment.id)}
                    onSendToStudio={() => {
                      addToCart(segment.id);
                      navigate('/segment-studio');
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
                if (deepest?.meta?.region) {
                  setFilters({ region: deepest.meta.region });
                }
                if (deepest?.meta?.dma) {
                  setFilters({ dma: deepest.meta.dma });
                }
                if (deepest?.meta?.zip3) {
                  setFilters({ zip3: deepest.meta.zip3 });
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
                onClick={() => {
                  addToCart(activeSegment.segment.id);
                  navigate('/segment-studio');
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
            onCta={() => navigate('/segment-studio')}
            disabled={!cartSegmentIds.length}
          />
        </div>
      </div>
    </div>
  );
};

export default MarketRadar;
