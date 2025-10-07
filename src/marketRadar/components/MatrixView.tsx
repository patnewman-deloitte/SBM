/**
 * Matrix view renders an accessible bubble chart comparing CVR and payback.
 */
import React, { useMemo, useRef, useState } from "react";
import { Archetype } from "../data/mockData";
import { midRangePercent, midMonths, reachK } from "../utils";

export type MatrixViewProps = {
  items: Archetype[];
  selectedId: number;
  onSelect: (item: Archetype) => void;
};

type HoverState = {
  item: Archetype;
  x: number;
  y: number;
} | null;

const MatrixView: React.FC<MatrixViewProps> = ({ items, selectedId, onSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<HoverState>(null);

  const derived = useMemo(() => {
    const mapped = items.map((item) => ({
      item,
      x: midRangePercent(item.cvr),
      y: midMonths(item.payback),
      r: reachK(item.reachable)
    }));
    const xExtent = [
      Math.min(...mapped.map((d) => d.x)) - 0.2,
      Math.max(...mapped.map((d) => d.x)) + 0.2
    ];
    const yExtent = [
      Math.min(...mapped.map((d) => d.y)) - 0.2,
      Math.max(...mapped.map((d) => d.y)) + 0.2
    ];
    const rExtent = [Math.min(...mapped.map((d) => d.r)), Math.max(...mapped.map((d) => d.r))];
    return { mapped, xExtent, yExtent, rExtent };
  }, [items]);

  const width = 520;
  const height = 360;

  const scaleX = (value: number) => {
    const [min, max] = derived.xExtent;
    return ((value - min) / (max - min)) * (width - 80) + 60;
  };

  const scaleY = (value: number) => {
    const [min, max] = derived.yExtent;
    return height - (((value - min) / (max - min)) * (height - 80) + 40);
  };

  const scaleR = (value: number) => {
    const [min, max] = derived.rExtent;
    if (max === min) return 28;
    const normalized = (value - min) / (max - min);
    return 20 + normalized * 24;
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label="Market lens matrix"
        className="w-full rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 shadow-soft"
      >
        <defs>
          <linearGradient id="bubbleGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <g className="text-slate-500" fontSize={12}>
          <line x1={60} x2={width - 20} y1={height - 40} y2={height - 40} stroke="#1f2937" />
          <line x1={60} x2={60} y1={40} y2={height - 20} stroke="#1f2937" />
          <text x={width / 2} y={height - 12} textAnchor="middle" fill="#94a3b8">
            Expected CVR (%)
          </text>
          <text x={12} y={height / 2} transform={`rotate(-90 12 ${height / 2})`} fill="#94a3b8">
            Payback speed (faster up)
          </text>
        </g>

        {derived.mapped.map(({ item, x, y, r, score }) => {
          const isSelected = item.id === selectedId;
          return (
            <g
              key={item.id}
              transform={`translate(${scaleX(x)}, ${scaleY(y)})`}
              className="cursor-pointer focus:outline-none"
              tabIndex={0}
              role="button"
              aria-label={`${item.title} bubble`}
              aria-pressed={isSelected}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(item);
                }
              }}
              onMouseEnter={(event) => {
                const rect = svgRef.current?.getBoundingClientRect();
                setHovered({
                  item,
                  x: event.clientX - (rect?.left ?? 0),
                  y: event.clientY - (rect?.top ?? 0)
                });
              }}
              onMouseLeave={() => setHovered(null)}
              onFocus={(event) => {
                const rect = svgRef.current?.getBoundingClientRect();
                setHovered({
                  item,
                  x: scaleX(x),
                  y: scaleY(y) - 20 - (rect?.top ?? 0)
                });
              }}
              onBlur={() => setHovered(null)}
            >
              <circle
                r={scaleR(r)}
                fill="url(#bubbleGradient)"
                fillOpacity={isSelected ? 0.95 : 0.6}
                stroke={isSelected ? "#34d399" : "#0f172a"}
                strokeWidth={isSelected ? 3 : 1}
              />
              <text
                y={4}
                textAnchor="middle"
                className="pointer-events-none text-sm font-semibold"
                fill="#f8fafc"
              >
                {item.title.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-30 rounded-xl border border-emerald-400/30 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
          style={{
            left: Math.min(Math.max(hovered.x + 12, 0), width - 160),
            top: Math.max(hovered.y - 40, 0)
          }}
        >
          <p className="font-semibold text-emerald-200">{hovered.item.title}</p>
          <p>Reach: {hovered.item.reachable}</p>
          <p>CVR: {hovered.item.cvr}</p>
          <p>Payback: {hovered.item.payback}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-300">
        <span className="inline-flex h-3 w-3 rounded-full bg-emerald-400/80" aria-hidden />
        <span>Size = reach • Darker = higher score • Tap a bubble to drill</span>
      </div>
    </div>
  );
};

export default MatrixView;
