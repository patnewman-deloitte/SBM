/**
 * Map view renders a simplified US choropleth using d3-geo for projection.
 */
import React, { useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { usStates } from "../data/mockData";

const LAYERS = [
  { id: "opportunity", label: "Opportunity" },
  { id: "weak", label: "Competitor weak" }
] as const;

type LayerId = (typeof LAYERS)[number]["id"];

type Tooltip = {
  state: string;
  value: number;
  x: number;
  y: number;
} | null;

const stateBounds: Record<string, [number, number][]> = {
  CA: [
    [-124.4, 32.5],
    [-114.1, 32.5],
    [-114.1, 42.0],
    [-124.4, 42.0]
  ],
  TX: [
    [-106.6, 25.8],
    [-93.5, 25.8],
    [-93.5, 36.5],
    [-106.6, 36.5]
  ],
  NY: [
    [-79.8, 40.5],
    [-71.8, 40.5],
    [-71.8, 45.1],
    [-79.8, 45.1]
  ],
  FL: [
    [-87.6, 24.6],
    [-80.1, 24.6],
    [-80.1, 31.0],
    [-87.6, 31.0]
  ],
  IL: [
    [-91.6, 36.9],
    [-87.0, 36.9],
    [-87.0, 42.5],
    [-91.6, 42.5]
  ],
  WA: [
    [-124.9, 45.5],
    [-116.9, 45.5],
    [-116.9, 49.0],
    [-124.9, 49.0]
  ],
  GA: [
    [-85.6, 30.5],
    [-80.8, 30.5],
    [-80.8, 35.0],
    [-85.6, 35.0]
  ],
  NC: [
    [-84.3, 33.7],
    [-75.4, 33.7],
    [-75.4, 36.6],
    [-84.3, 36.6]
  ],
  CO: [
    [-109.1, 36.9],
    [-102.0, 36.9],
    [-102.0, 41.0],
    [-109.1, 41.0]
  ],
  AZ: [
    [-114.8, 31.3],
    [-109.0, 31.3],
    [-109.0, 37.0],
    [-114.8, 37.0]
  ]
};

const MapViewUS: React.FC = () => {
  const [layer, setLayer] = useState<LayerId>("opportunity");
  const [tooltip, setTooltip] = useState<Tooltip>(null);

  const projection = useMemo(() => geoAlbersUsa().scale(900).translate([450 / 2, 280 / 2]), []);
  const path = useMemo(() => geoPath(projection), [projection]);

  const mockLayer = useMemo(() => {
    if (layer === "opportunity") {
      return usStates;
    }
    return usStates.map((state, index) => ({
      ...state,
      value: Math.max(0, Math.min(1, state.value * (index % 2 === 0 ? 0.6 : 1.2)))
    }));
  }, [layer]);

  const colorFor = (value: number) => `rgba(16, 185, 129, ${0.35 + value * 0.5})`;

  const features = useMemo(() => {
    return mockLayer.map((state) => {
      const coords = stateBounds[state.id] ?? stateBounds.CA;
      return {
        type: "Feature" as const,
        properties: state,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[...coords, coords[0]]]
        }
      };
    });
  }, [mockLayer]);

  return (
    <div className="card flex flex-col gap-4 border border-slate-800 p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Map lens</h3>
        <div className="flex gap-2" role="tablist" aria-label="Map layer toggle">
          {LAYERS.map((option) => (
            <button
              key={option.id}
              role="tab"
              aria-selected={layer === option.id}
              className={
                "focus-outline rounded-full px-3 py-1 text-xs font-semibold transition " +
                (layer === option.id
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700")
              }
              onClick={() => setLayer(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      <svg
        viewBox="0 0 450 280"
        className="w-full rounded-2xl border border-slate-800 bg-slate-900/80"
        role="img"
        aria-label="US opportunity map"
      >
        {features.map((feature) => (
          <path
            key={feature.properties.id}
            d={path(feature as never) ?? ""}
            fill={colorFor(feature.properties.value)}
            stroke="#0f172a"
            strokeWidth={1}
            onClick={(event) => {
              const bounds = (event.target as SVGPathElement).getBoundingClientRect();
              setTooltip({
                state: feature.properties.name,
                value: feature.properties.value,
                x: bounds.x + bounds.width / 2,
                y: bounds.y
              });
            }}
            className="cursor-pointer transition hover:fill-emerald-400/80"
          >
            <title>{`${feature.properties.name}: ${(feature.properties.value * 100).toFixed(0)} index`}</title>
          </path>
        ))}
      </svg>
      {tooltip && (
        <div
          className="pointer-events-auto rounded-xl border border-emerald-400/40 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)"
          }}
        >
          <p className="font-semibold text-emerald-200">{tooltip.state}</p>
          <p>Index: {(tooltip.value * 100).toFixed(0)}</p>
          <button
            type="button"
            className="mt-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-slate-900"
            onClick={() => setTooltip(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default MapViewUS;
