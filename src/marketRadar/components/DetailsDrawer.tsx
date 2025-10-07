/**
 * Details drawer reveals micro-segments for the selected archetype.
 */
import React from "react";
import { Archetype, microSegments } from "../data/mockData";
import Drawer from "./Drawer";
import { Badge } from "./atoms";

type DetailsDrawerProps = {
  open: boolean;
  onClose: () => void;
  archetype: Archetype | null;
};

const DetailsDrawer: React.FC<DetailsDrawerProps> = ({ open, onClose, archetype }) => {
  const segments = archetype ? microSegments[archetype.id] ?? [] : [];

  return (
    <Drawer open={open} onClose={onClose} title={archetype ? `${archetype.title} micro-segments` : "Segment details"}>
      {archetype ? (
        <div className="space-y-4">
          {segments.map((segment) => (
            <div
              key={segment.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100"
            >
              <header className="flex items-start justify-between gap-2">
                <h4 className="text-base font-semibold text-white">{segment.title}</h4>
                <Badge color="emerald">{segment.conf}</Badge>
              </header>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200">
                <div>
                  <dt className="text-slate-400">Segment size</dt>
                  <dd className="font-semibold">{segment.size}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Reachable now</dt>
                  <dd className="font-semibold">{segment.reach}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Expected CVR</dt>
                  <dd className="font-semibold">{segment.cvr}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Payback</dt>
                  <dd className="font-semibold">{segment.payback}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-300">
                <span className="font-semibold text-emerald-200">Why here?</span> {segment.why}
              </p>
            </div>
          ))}
          {segments.length === 0 && (
            <p className="text-sm text-slate-300">No micro-segments mapped yet.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-300">Select an archetype to view details.</p>
      )}
    </Drawer>
  );
};

export default DetailsDrawer;
