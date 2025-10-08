import React from 'react';
import InfoPopover from './InfoPopover';
import stateKpisData, { StateKpi } from '../data/stateKpis';
import statesTopology from '../data/us-states-10m.json';

export type GeoNode = {
  id: string;
  name: string;
  value: number;
  children?: GeoNode[];
  meta?: Record<string, string>;
};

type Props = {
  root: GeoNode[];
  onSelectRegion: (path: GeoNode[]) => void;
};

type TooltipState = {
  x: number;
  y: number;
  state: StateKpi;
};

type MapPosition = {
  translate: [number, number];
  scale: number;
};

type PlaceholderDma = {
  id: string;
  name: string;
  payback: number;
  score: number;
  opportunities: number;
};

type ChoroplethProps = {
  data: StateKpi[];
  selectedState: string | null;
  compareSelection: string[];
  onSelectState: (state: StateKpi, options?: { multi?: boolean }) => void;
  onHoverState: (tooltip: TooltipState | null) => void;
  onDoubleClickState: (state: StateKpi) => void;
  position: MapPosition;
  onPositionChange: (position: MapPosition) => void;
  getColor: (value: number) => string;
  legend: Array<{ color: string; label: string }>;
  mapContainerRef: React.RefObject<HTMLDivElement>;
};

type Topology = {
  type: 'Topology';
  transform?: { scale: [number, number]; translate: [number, number] };
  objects: {
    states: {
      type: 'GeometryCollection';
      geometries: Array<{
        type: 'Polygon' | 'MultiPolygon';
        id?: string;
        properties?: { name?: string; postal?: string };
        arcs: number[][] | number[][][];
      }>;
    };
  };
  arcs: number[][][];
};

type MapFeature = {
  id: string;
  name: string;
  postal: string;
  path: string;
  centroid: [number, number];
};

const parseTopology = (topology: Topology) => {
  const scale = topology.transform?.scale ?? [1, 1];
  const translate = topology.transform?.translate ?? [0, 0];
  const absoluteArcs = topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number];
    });
  });

  const polygons = topology.objects.states.geometries.map((geometry) => {
    const arcSets = geometry.type === 'Polygon'
      ? (geometry.arcs as number[][])
      : (geometry.arcs as number[][][]).flat();

    const rings = arcSets.map((ring) => {
      const points: [number, number][] = [];
      ring.forEach((arcIndex) => {
        const actualIndex = arcIndex >= 0 ? arcIndex : ~arcIndex;
        const arc = absoluteArcs[actualIndex].slice();
        if (arcIndex < 0) {
          arc.reverse();
        }
        if (points.length) {
          arc.shift();
        }
        points.push(...arc);
      });
      return points;
    });

    const id = (geometry.id ?? geometry.properties?.postal ?? geometry.properties?.name ?? 'unknown').toString();
    const name = geometry.properties?.name ?? id.toUpperCase();
    const postal = geometry.properties?.postal ?? id.toUpperCase();

    return { id, name, postal, rings };
  });

  const allPoints = polygons.flatMap((poly) => poly.rings.flat());
  const xs = allPoints.map(([x]) => x);
  const ys = allPoints.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = 900;
  const height = 540;
  const padding = 28;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scaleFactor = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);

  const features: MapFeature[] = polygons.map((poly) => {
    const projectedRings = poly.rings.map((ring) =>
      ring.map(([x, y]) => [
        (x - minX) * scaleFactor + padding,
        (maxY - y) * scaleFactor + padding
      ] as [number, number])
    );

    const path = projectedRings
      .map((ring) =>
        ring
          .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
          .join(' ') + 'Z'
      )
      .join(' ');

    const firstRing = projectedRings[0];
    const centroid = firstRing.reduce<[number, number]>(
      (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
      [0, 0]
    );
    centroid[0] /= firstRing.length;
    centroid[1] /= firstRing.length;

    return { id: poly.id, name: poly.name, postal: poly.postal, path, centroid: [centroid[0], centroid[1]] };
  });

  return { features, width, height };
};

const parsedMap = parseTopology(statesTopology as unknown as Topology);

const colorSteps = ['#ecfdf5', '#a7f3d0', '#6ee7b7', '#34d399', '#047857'];
const defaultPosition: MapPosition = { translate: [0, 0], scale: 1 };

const formatNumber = (value: number) => value.toLocaleString();

const useColorScale = (data: StateKpi[]) => {
  return React.useMemo(() => {
    if (!data.length) {
      return {
        getColor: () => '#1f2937',
        legend: colorSteps.map((color, index) => ({ color, label: `${index + 1}` }))
      };
    }

    const values = data.map((state) => state.paybackDeltaMonths);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    const step = span === 0 ? 1 : span / colorSteps.length;

    const getColor = (value: number) => {
      if (!Number.isFinite(value)) {
        return '#1f2937';
      }
      if (span === 0) {
        return colorSteps[colorSteps.length - 1];
      }
      const rawIndex = Math.floor((value - min) / step);
      const index = Math.min(colorSteps.length - 1, Math.max(0, rawIndex));
      return colorSteps[index];
    };

    const legend = colorSteps.map((color, index) => {
      const start = min + step * index;
      const end = index === colorSteps.length - 1 ? max : min + step * (index + 1);
      return {
        color,
        label: `${start.toFixed(1)}–${end.toFixed(1)} mo`
      };
    });

    return { getColor, legend };
  }, [data]);
};

const USChoroplethMap: React.FC<ChoroplethProps> = React.memo(
  ({
    data,
    selectedState,
    compareSelection,
    onSelectState,
    onHoverState,
    onDoubleClickState,
    position,
    onPositionChange,
    getColor,
    legend,
    mapContainerRef
  }) => {
    const stateByCode = React.useMemo(() => {
      const map = new Map<string, StateKpi>();
      data.forEach((state) => {
        map.set(state.stateCode, state);
      });
      return map;
    }, [data]);

    const panState = React.useRef<{ pointerId: number | null; origin: [number, number]; start: [number, number]; moved: boolean }>({
      pointerId: null,
      origin: [0, 0],
      start: [0, 0],
      moved: false
    });

    const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
      panState.current = {
        pointerId: event.pointerId,
        origin: [event.clientX, event.clientY],
        start: [...position.translate],
        moved: false
      };
      (event.currentTarget as SVGSVGElement).setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
      if (panState.current.pointerId !== event.pointerId) {
        return;
      }
      const dx = event.clientX - panState.current.origin[0];
      const dy = event.clientY - panState.current.origin[1];
      if (!panState.current.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        panState.current.moved = true;
      }
      if (panState.current.moved) {
        onPositionChange({ ...position, translate: [panState.current.start[0] + dx, panState.current.start[1] + dy] });
      }
    };

    const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
      if (panState.current.pointerId === event.pointerId) {
        (event.currentTarget as SVGSVGElement).releasePointerCapture?.(event.pointerId);
        panState.current.pointerId = null;
        setTimeout(() => {
          panState.current.moved = false;
        }, 0);
      }
    };

    const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = Math.max(0.7, Math.min(6, position.scale * factor));
      onPositionChange({ ...position, scale: nextScale });
    };

    const handleHover = React.useCallback(
      (event: React.MouseEvent<SVGPathElement, MouseEvent>, state: StateKpi) => {
        const container = mapContainerRef.current?.getBoundingClientRect();
        if (!container) {
          onHoverState({ x: event.clientX, y: event.clientY, state });
          return;
        }
        onHoverState({
          x: event.clientX - container.left,
          y: event.clientY - container.top,
          state
        });
      },
      [mapContainerRef, onHoverState]
    );

    return (
      <svg
        viewBox={`0 0 ${parsedMap.width} ${parsedMap.height}`}
        className="h-full w-full select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <rect width="100%" height="100%" fill="transparent" />
        <g transform={`translate(${position.translate[0]}, ${position.translate[1]}) scale(${position.scale})`}>
          {parsedMap.features.map((feature) => {
            const state = stateByCode.get(feature.postal);
            const fill = state ? getColor(state.paybackDeltaMonths) : '#1f2937';
            const isSelected = state ? selectedState === state.stateCode : false;
            const isCompared = state ? compareSelection.includes(state.stateCode) : false;
            const ariaLabel = state
              ? `${state.stateName} payback delta ${state.paybackDeltaMonths.toFixed(1)} months`
              : feature.name;

            return (
              <path
                key={feature.id}
                d={feature.path}
                fill={fill}
                stroke="#0f172a"
                strokeWidth={isSelected ? 2 : 0.9}
                strokeOpacity={isCompared ? 1 : 0.85}
                role="button"
                tabIndex={0}
                aria-label={ariaLabel}
                onMouseEnter={(event) => state && handleHover(event, state)}
                onMouseMove={(event) => state && handleHover(event, state)}
                onMouseLeave={() => onHoverState(null)}
                onClick={(event) => {
                  if (!state) {
                    return;
                  }
                  if (panState.current.moved) {
                    return;
                  }
                  onHoverState(null);
                  onSelectState(state, { multi: event.metaKey || event.ctrlKey });
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  if (!state) {
                    return;
                  }
                  onHoverState(null);
                  onDoubleClickState(state);
                }}
                onKeyDown={(event) => {
                  if (!state) {
                    return;
                  }
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectState(state, { multi: event.metaKey || event.ctrlKey });
                  }
                }}
                className="transition-[filter] duration-150 hover:cursor-pointer hover:filter brightness-105"
              />
            );
          })}
        </g>
        <g transform={`translate(20, ${parsedMap.height - (legend.length * 24 + 60)})`}>
          <foreignObject width={200} height={legend.length * 24 + 48}>
            <div className="rounded-xl border border-emerald-500/20 bg-slate-900/90 p-3 shadow-inner shadow-emerald-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Payback Δ (months)</p>
              <div className="mt-2 space-y-1.5">
                {legend.map((step) => (
                  <div key={step.label} className="flex items-center gap-2 text-xs text-slate-200">
                    <span className="h-3 w-6 rounded-sm" style={{ background: step.color }} />
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </foreignObject>
        </g>
      </svg>
    );
  }
);

USChoroplethMap.displayName = 'USChoroplethMap';

const MapView: React.FC<Props> = ({ root, onSelectRegion }) => {
  const stateData = React.useMemo(() => stateKpisData, []);
  const sortedStates = React.useMemo(() => {
    return [...stateData].sort((a, b) => b.paybackDeltaMonths - a.paybackDeltaMonths);
  }, [stateData]);
  const [selectedState, setSelectedState] = React.useState<string | null>(() => sortedStates[0]?.stateCode ?? null);
  const [compareSelection, setCompareSelection] = React.useState<string[]>([]);
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null);
  const [dmaDrawer, setDmaDrawer] = React.useState<{ state: StateKpi; dmas: PlaceholderDma[] } | null>(null);
  const [position, setPosition] = React.useState<MapPosition>(defaultPosition);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const tileRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const { legend, getColor } = useColorScale(stateData);

  const stateByCode = React.useMemo(() => {
    const map = new Map<string, StateKpi>();
    stateData.forEach((state) => {
      map.set(state.stateCode, state);
    });
    return map;
  }, [stateData]);

  const rootByCode = React.useMemo(() => {
    const map = new Map<string, GeoNode>();
    root.forEach((node) => {
      map.set(node.id.toUpperCase(), node);
    });
    return map;
  }, [root]);

  React.useEffect(() => {
    if (!selectedState) {
      return;
    }
    const tile = tileRefs.current[selectedState];
    const list = listRef.current;
    if (tile && list) {
      const offsetTop = tile.offsetTop;
      list.scrollTo({ top: offsetTop - 40, behavior: 'smooth' });
    }
  }, [selectedState]);

  const handleSelectState = React.useCallback(
    (state: StateKpi, options?: { multi?: boolean }) => {
      setSelectedState(state.stateCode);
      if (options?.multi) {
        setCompareSelection((prev) => {
          if (prev.includes(state.stateCode)) {
            return prev.filter((code) => code !== state.stateCode);
          }
          return [...prev, state.stateCode];
        });
      }
      const stateNode: GeoNode = {
        id: state.stateCode.toLowerCase(),
        name: state.stateName,
        value: Math.round(state.stateScore * 100),
        meta: { region: state.stateCode.toLowerCase(), stateCode: state.stateCode }
      };
      const existing = rootByCode.get(state.stateCode);
      if (existing) {
        onSelectRegion([existing]);
      } else {
        onSelectRegion([stateNode]);
      }
    },
    [onSelectRegion, rootByCode]
  );

  const handleCompareToggle = React.useCallback((state: StateKpi) => {
    setCompareSelection((prev) => {
      if (prev.includes(state.stateCode)) {
        return prev.filter((code) => code !== state.stateCode);
      }
      return [...prev, state.stateCode];
    });
  }, []);

  const buildPlaceholderDmas = React.useCallback(
    (state: StateKpi): PlaceholderDma[] => {
      const node = rootByCode.get(state.stateCode);
      const children = node?.children ?? [];
      if (children.length) {
        return children.slice(0, 5).map((child, index) => ({
          id: child.id,
          name: child.name,
          payback: Math.max(2, state.paybackDeltaMonths + (index - 1) * 0.5),
          score: Math.min(0.95, state.stateScore + index * 0.035),
          opportunities: Math.round(state.opportunities * (0.35 + index * 0.12))
        }));
      }
      return Array.from({ length: 5 }, (_, index) => ({
        id: `${state.stateCode.toLowerCase()}-dma-${index + 1}`,
        name: `${state.stateName} DMA ${index + 1}`,
        payback: Math.max(2, state.paybackDeltaMonths + (index - 2) * 0.6),
        score: Math.max(0.42, Math.min(0.92, state.stateScore + (index - 2) * 0.04)),
        opportunities: Math.round(state.opportunities * (0.32 + index * 0.14))
      }));
    },
    [rootByCode]
  );

  const handleDoubleClickState = React.useCallback(
    (state: StateKpi) => {
      const dmas = buildPlaceholderDmas(state);
      setDmaDrawer({ state, dmas });
      const stateNode: GeoNode = {
        id: state.stateCode.toLowerCase(),
        name: state.stateName,
        value: Math.round(state.stateScore * 100),
        meta: { region: state.stateCode.toLowerCase(), stateCode: state.stateCode }
      };
      const dma = dmas[0];
      const dmaNode: GeoNode = {
        id: dma.id,
        name: dma.name,
        value: Math.round(dma.score * 100),
        meta: { dma: dma.name.toLowerCase() }
      };
      onSelectRegion([stateNode, dmaNode]);
    },
    [buildPlaceholderDmas, onSelectRegion]
  );

  const selectedStateData = selectedState ? stateByCode.get(selectedState) ?? null : null;
  const compareStates = React.useMemo(() => compareSelection.map((code) => stateByCode.get(code)).filter(Boolean) as StateKpi[], [compareSelection, stateByCode]);

  return (
    <div className="card flex flex-col gap-4 border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Competitive Map</h3>
          <p className="text-xs text-slate-400">Hover for insights, click to focus, double-click to explore DMA depth.</p>
        </div>
        <div className="flex items-center gap-2">
          <InfoPopover title="Competitive map" description="Shows where payback improvements trend strongest across the US." />
          <button
            onClick={() => setPosition(defaultPosition)}
            className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-200 transition hover:bg-emerald-500/10"
          >
            Reset view
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div ref={mapContainerRef} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
          <USChoroplethMap
            data={stateData}
            selectedState={selectedState}
            compareSelection={compareSelection}
            onSelectState={handleSelectState}
            onHoverState={setTooltip}
            onDoubleClickState={handleDoubleClickState}
            position={position}
            onPositionChange={setPosition}
            getColor={getColor}
            legend={legend}
            mapContainerRef={mapContainerRef}
          />
          {tooltip ? (
            <div
              style={{ left: tooltip.x, top: tooltip.y }}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-3 rounded-xl border border-emerald-500/40 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
            >
              <p className="font-semibold text-white">{tooltip.state.stateName}</p>
              <p>Payback Δ: {tooltip.state.paybackDeltaMonths.toFixed(1)} mo</p>
              <p>State score: {(tooltip.state.stateScore * 100).toFixed(0)}%</p>
              <p>Opportunities: {formatNumber(tooltip.state.opportunities)}</p>
            </div>
          ) : null}
          {dmaDrawer ? (
            <div className="absolute inset-y-0 right-0 z-20 flex w-64 flex-col border-l border-emerald-500/20 bg-slate-950/95 p-4 shadow-emerald-500/10">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-300">DMA drill</p>
                  <h4 className="text-sm font-semibold text-white">{dmaDrawer.state.stateName}</h4>
                </div>
                <button
                  onClick={() => setDmaDrawer(null)}
                  className="rounded-full border border-emerald-500/30 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10"
                >
                  Close
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-300">Top DMAs ranked by projected payback gain.</p>
              <div className="mt-3 space-y-3">
                {dmaDrawer.dmas.map((dma) => (
                  <div key={dma.id} className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-2">
                    <p className="text-xs font-semibold text-white">{dma.name}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
                      <span>Payback Δ {dma.payback.toFixed(1)} mo</span>
                      <span>Score {(dma.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600"
                        style={{ width: `${Math.min(100, Math.round(dma.score * 100))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-200">{formatNumber(dma.opportunities)} prospects</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex max-h-[26rem] flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">State signals</h4>
            <InfoPopover title="State score" description="Blends penetration, net adds, and churn lift into one synthetic index." />
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
            {sortedStates.map((state) => {
              const isSelected = state.stateCode === selectedState;
              const isCompared = compareSelection.includes(state.stateCode);
              return (
                <button
                  key={state.stateCode}
                  ref={(node) => {
                    tileRefs.current[state.stateCode] = node;
                  }}
                  type="button"
                  onClick={(event) => handleSelectState(state, { multi: event.metaKey || event.ctrlKey })}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    handleDoubleClickState(state);
                  }}
                  className={`group relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isSelected ? 'ring-1 ring-emerald-400 shadow-emerald-500/20' : ''
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Select ${state.stateName}`}
                >
                  <div className="absolute right-0 top-0 h-28 w-28 -translate-y-6 translate-x-6 rounded-full bg-[conic-gradient(at_top_left,_rgba(52,211,153,0.15),_rgba(15,23,42,0))]" />
                  <div className="absolute right-2 top-2 h-12 w-12 rounded-lg bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent)]" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-white">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/40 bg-slate-900/80 text-emerald-300">
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21s6-6.32 6-11a6 6 0 1 0-12 0c0 4.68 6 11 6 11z" />
                          <circle cx="12" cy="10" r="2.4" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{state.stateName}</p>
                        <p className="text-xs text-emerald-200">{state.riskFlag} risk</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCompareToggle(state);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        isCompared
                          ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-100'
                          : 'border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10'
                      }`}
                    >
                      {isCompared ? 'Added' : '+ Compare'}
                    </button>
                  </div>
                  <div className="relative mt-4 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2 font-medium text-emerald-200">
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12a8 8 0 1 1 16 0" />
                        <path d="M12 4v5l3 2" />
                      </svg>
                      <span>State score</span>
                      <InfoPopover title="State score" description="Composite of conversion, ARPU, and retention potential." />
                    </div>
                    <span className="font-semibold text-white">{(state.stateScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-[width] duration-700 ease-out group-hover:shadow-[0_0_12px_rgba(16,185,129,0.45)]"
                      style={{ width: `${Math.min(100, Math.round(state.stateScore * 100))}%` }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-emerald-200">Payback Δ</span>
                      <span className="font-medium text-white">{state.paybackDeltaMonths.toFixed(1)} mo</span>
                      <InfoPopover title="Payback delta" description="Months shaved off CAC payback versus national baseline." />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-200">Opportunities</span>
                      <span className="font-medium text-emerald-200">{formatNumber(state.opportunities)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {compareStates.length ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/80 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-300">Compare queue</p>
              <p className="text-xs text-slate-300">{compareStates.length} selected • Cmd/Ctrl-click the map or tiles to adjust.</p>
            </div>
            <button
              onClick={() => setCompareSelection([])}
              className="rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {compareStates.map((state) => (
              <span
                key={`compare-${state.stateCode}`}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100"
              >
                <span className="font-semibold text-white">{state.stateCode}</span>
                <span>{state.paybackDeltaMonths.toFixed(1)} mo</span>
                <span>{(state.stateScore * 100).toFixed(0)}%</span>
                <button
                  onClick={() => handleCompareToggle(state)}
                  className="text-emerald-200 hover:text-emerald-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {selectedStateData ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Focused state</p>
            <p className="text-sm font-semibold text-white">{selectedStateData.stateName}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-200">
            <span>Score {(selectedStateData.stateScore * 100).toFixed(0)}%</span>
            <span>Payback Δ {selectedStateData.paybackDeltaMonths.toFixed(1)} mo</span>
            <span>Opportunities {formatNumber(selectedStateData.opportunities)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MapView;
