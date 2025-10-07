/**
 * Market lens orchestrates Matrix, Map, and Playbook tabs with accessible tab controls.
 */
import React, { useMemo, useState } from "react";
import { Archetype } from "../data/mockData";
import MatrixView from "./MatrixView";
import MapViewUS from "./MapViewUS";
import PlaybookView, { PlaybookHandle } from "./PlaybookView";

const tabs = [
  { id: "matrix", label: "Matrix" },
  { id: "map", label: "Map" },
  { id: "playbook", label: "Playbook" }
] as const;

type TabId = (typeof tabs)[number]["id"];

type MarketLensTabsProps = {
  items: Archetype[];
  selectedId: number;
  onSelect: (item: Archetype) => void;
  playbookRef: React.RefObject<PlaybookHandle>;
};

const MarketLensTabs: React.FC<MarketLensTabsProps> = ({ items, selectedId, onSelect, playbookRef }) => {
  const [activeTab, setActiveTab] = useState<TabId>("matrix");

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0], [items, selectedId]);

  return (
    <section className="flex flex-col gap-4" aria-label="Market lens">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-white">Market lens</h2>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase text-emerald-200">
            Tri-lens
          </span>
        </div>
        <div role="tablist" aria-label="Market lens tabs" className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              className={
                "focus-outline rounded-full px-4 py-2 text-sm font-semibold transition " +
                (activeTab === tab.id
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700")
              }
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  const idx = tabs.findIndex((t) => t.id === activeTab);
                  const dir = event.key === "ArrowRight" ? 1 : -1;
                  const next = (idx + dir + tabs.length) % tabs.length;
                  setActiveTab(tabs[next].id);
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
        {activeTab === "matrix" && <MatrixView items={items} selectedId={selectedId} onSelect={onSelect} />}
        {activeTab === "map" && <MapViewUS />}
        {activeTab === "playbook" && <PlaybookView ref={playbookRef} selected={selected ?? null} />}
      </div>
    </section>
  );
};

export default MarketLensTabs;
