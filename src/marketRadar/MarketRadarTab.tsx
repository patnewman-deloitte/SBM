/**
 * MarketRadarTab composes the guided Market Radar experience with mock data.
 */
import React, { useMemo, useRef, useState } from "react";
import TopSummary from "./components/TopSummary";
import CohortBuilder from "./components/CohortBuilder";
import MarketLensTabs from "./components/MarketLensTabs";
import CompetitiveStrip from "./components/CompetitiveStrip";
import ArchetypeCard from "./components/ArchetypeCard";
import DetailsDrawer from "./components/DetailsDrawer";
import KeyMetrics from "./components/KeyMetrics";
import Info from "./components/Info";
import { archetypes } from "./data/mockData";
import { PlaybookHandle } from "./components/PlaybookView";

const timeframes = ["6w", "13w", "26w"] as const;

type Timeframe = (typeof timeframes)[number];

const MarketRadarTab: React.FC = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>("13w");
  const [selectedId, setSelectedId] = useState<number>(archetypes[0].id);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const playbookRef = useRef<PlaybookHandle>(null);

  const selectedArchetype = useMemo(
    () => archetypes.find((item) => item.id === selectedId) ?? archetypes[0],
    [selectedId]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-20 text-slate-50">
      <div className="sticky top-0 z-30 border-b border-emerald-500/20 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Market Radar</h1>
            <p className="text-xs text-slate-400">Segment-first growth radar with AI picks</p>
          </div>
          <div className="flex items-center gap-2" role="tablist" aria-label="Timeframe">
            {timeframes.map((option) => (
              <button
                key={option}
                role="tab"
                aria-selected={timeframe === option}
                className={
                  "focus-outline rounded-full px-3 py-1 text-xs font-semibold transition " +
                  (timeframe === option
                    ? "bg-emerald-500 text-slate-900"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700")
                }
                onClick={() => setTimeframe(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6">
        <TopSummary />
        <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
          <span>Last refreshed yesterday</span>
          <Info
            title="What is Market Radar?"
            lines={[
              "Blends CRM, product, and market signals",
              "Ranks segments by opportunity score",
              "Pairs with competitive intelligence"
            ]}
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <CohortBuilder />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-6">
            <MarketLensTabs
              items={archetypes}
              selectedId={selectedId}
              onSelect={(item) => setSelectedId(item.id)}
              playbookRef={playbookRef}
            />
            <CompetitiveStrip selectedIndex={archetypes.findIndex((item) => item.id === selectedId)} />
            <section aria-label="AI Picks" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">AI Picks</h3>
                <span className="text-xs text-slate-400">Powered by the Market Lens</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {archetypes.map((item) => (
                  <ArchetypeCard
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    onSelect={(chosen) => {
                      setSelectedId(chosen.id);
                    }}
                    onViewDetails={(chosen) => {
                      setSelectedId(chosen.id);
                      setDetailsOpen(true);
                    }}
                    onAddToPlan={(chosen) => playbookRef.current?.addToPlan(chosen)}
                  />
                ))}
              </div>
            </section>
          </div>
          <div className="lg:col-span-3">
            <KeyMetrics archetype={selectedArchetype} />
          </div>
        </div>
      </main>

      <DetailsDrawer open={detailsOpen} onClose={() => setDetailsOpen(false)} archetype={selectedArchetype} />
    </div>
  );
};

export default MarketRadarTab;
