/**
 * MarketRadarWireframe composes the guided Market Radar experience with mock data and export wiring.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import TopSummary from "./components/TopSummary";
import CohortBuilder, { filterGroups } from "./components/CohortBuilder";
import MarketLensTabs from "./components/MarketLensTabs";
import CompetitiveStrip from "./components/CompetitiveStrip";
import ArchetypeCard from "./components/ArchetypeCard";
import DetailsDrawer from "./components/DetailsDrawer";
import KeyMetrics from "./components/KeyMetrics";
import Info from "./components/Info";
import { archetypes } from "./data/mockData";
import { PlaybookHandle } from "./components/PlaybookView";
import { SegmentPayload, saveOne } from "../storage";

const timeframes = ["6w", "13w", "26w"] as const;

type Timeframe = (typeof timeframes)[number];

const baseGeoWindow = { geo: "DFW-07, DFW-12", grain: "ZIP clusters" };

const initialFilters = () => {
  const seed: Record<string, string[]> = {};
  filterGroups.forEach((group) => {
    seed[group.title] = [];
  });
  seed.Stage = ["Enterprise"];
  seed.Motion = ["Product-led"];
  seed.Team = ["Remote"];
  seed.Pain = ["Support"];
  seed.Stack = ["Salesforce"];
  seed.Signals = ["Expansion"];
  return seed;
};

const MarketRadarWireframe: React.FC<{ onExport?: (payload: SegmentPayload) => void }> = ({ onExport }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("13w");
  const [selectedId, setSelectedId] = useState<number>(archetypes[0].id);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>(initialFilters);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbookRef = useRef<PlaybookHandle>(null);
  const selectedCohortName = "AIPIC cohort";

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const selectedArchetype = useMemo(
    () => archetypes.find((item) => item.id === selectedId) ?? archetypes[0],
    [selectedId]
  );

  const selectedChips = useMemo(() => {
    const chips: string[] = [];
    Object.values(filters).forEach((list) => {
      chips.push(...list);
    });
    return chips;
  }, [filters]);

  const geoWindow = useMemo(
    () => ({ ...baseGeoWindow, window: timeframe }),
    [timeframe]
  );

  const kpis = useMemo(
    () => ({
      opportunityScore: 0.58,
      reachable: 210000,
      expectedCVR: [0.9, 1.2] as [number, number],
      paybackMonths: 8.5
    }),
    []
  );

  const rivals = ["FirmWare"];
  const pressureIndex = 0.37;
  const whiteSpace = 0.31;

  const canExport = selectedCohortName.trim().length > 0 && selectedChips.length > 0;

  const triggerToast = () => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  };

  const handleExport = () => {
    if (!canExport) {
      return;
    }
    const payload: SegmentPayload = {
      id: `seg_${Date.now()}`,
      name: selectedCohortName,
      label: "Radar export",
      chips: selectedChips,
      filters,
      geoWindow,
      kpis,
      rivals,
      pressureIndex,
      whiteSpace,
      createdAt: new Date().toISOString(),
      version: 1
    };
    saveOne(payload);
    onExport?.(payload);
    triggerToast();
    window.location.hash = `#/studio/${payload.id}`;
  };

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
            <CohortBuilder selected={filters} onSelectedChange={setFilters} />
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
              <div
                className="flex items-center justify-between text-xs text-slate-300"
                data-testid="market-selected-chips"
              >
                <span>Selected chips</span>
                <span className="text-emerald-200">{selectedChips.join(", ") || "None"}</span>
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
              <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-4">
                <button
                  type="button"
                  className="focus-outline rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  onClick={handleExport}
                  disabled={!canExport}
                  data-testid="export-market-to-studio"
                >
                  Export to Segment Studio
                </button>
                {!canExport && (
                  <span className="text-xs text-slate-400">Select at least one chip to enable export.</span>
                )}
                {toastVisible && (
                  <span
                    className="inline-flex items-center justify-center rounded-full border border-emerald-400 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200"
                    data-testid="export-toast"
                  >
                    Exported to Segment Studio
                  </span>
                )}
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

export default MarketRadarWireframe;
