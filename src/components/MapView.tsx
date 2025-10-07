import React from 'react';
import InfoPopover from './InfoPopover';

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

const MapView: React.FC<Props> = ({ root, onSelectRegion }) => {
  const [path, setPath] = React.useState<GeoNode[]>([]);
  const nodes = path.length === 0 ? root : path[path.length - 1].children ?? [];

  const handleDoubleClick = (node: GeoNode) => {
    if (node.children && node.children.length) {
      const nextPath = [...path, node];
      setPath(nextPath);
      onSelectRegion(nextPath);
    } else {
      const nextPath = [...path, node];
      onSelectRegion(nextPath);
    }
  };

  const goBack = () => {
    const next = path.slice(0, -1);
    setPath(next);
    if (next.length) {
      onSelectRegion(next);
    }
  };

  const levelLabel = path.length === 0 ? 'State' : path.length === 1 ? 'DMA' : 'ZIP3';

  return (
    <div className="card flex h-80 flex-col gap-3 border border-slate-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Competitive Map</h3>
          <p className="text-xs text-slate-400">Double-click to drill into {path.length === 0 ? 'DMA' : path.length === 1 ? 'ZIP3' : 'details'} level.</p>
        </div>
        <div className="flex items-center gap-2">
          <InfoPopover title="Competitive map" description="Use the map to spot geographies where payback improves fastest." />
          {path.length > 0 ? (
            <button
              onClick={goBack}
              className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10"
            >
              ← Back to {path.length === 1 ? 'States' : 'DMAs'}
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2">
        {nodes.map((node) => (
          <button
            key={node.id}
            onDoubleClick={() => handleDoubleClick(node)}
            onClick={() => onSelectRegion([...path, node])}
            className="group relative flex flex-col items-start justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-emerald-500/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-slate-900/40 opacity-0 transition group-hover:opacity-100" />
            <div className="relative flex w-full items-center justify-between">
              <span className="text-sm font-semibold text-white">{node.name}</span>
              <span className="text-xs text-emerald-300">{levelLabel} score</span>
            </div>
            <div className="relative mt-6 w-full">
              <div className="h-2 w-full rounded-full bg-slate-800" />
              <div className="-mt-2 h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, node.value))}%` }} />
            </div>
            <p className="relative mt-2 text-xs text-slate-300">Payback improvement potential: {(node.value / 10).toFixed(1)} mo</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapView;
