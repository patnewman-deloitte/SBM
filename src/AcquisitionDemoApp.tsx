/**
 * AcquisitionDemoApp stitches the Market Radar and Segment Studio tabs with a hash router.
 */
import React, { useEffect, useMemo, useState } from "react";
import MarketRadarWireframe from "./marketRadar/MarketRadarWireframe";
import SegmentStudioWireframe from "./SegmentStudioWireframe";
import { SegmentPayload, loadAll } from "./storage";

type Route = { name: "radar" } | { name: "studio"; id: string | null };

const parseHash = (): Route => {
  if (typeof window === "undefined") {
    return { name: "radar" };
  }
  const hash = window.location.hash || "";
  if (!hash) {
    return { name: "radar" };
  }
  const clean = hash.replace(/^#/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts[0] === "studio") {
    return { name: "studio", id: parts[1] ?? null };
  }
  return { name: "radar" };
};

const AcquisitionDemoApp: React.FC = () => {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [lastSegmentId, setLastSegmentId] = useState<string | null>(() => {
    const all = loadAll();
    if (all.length === 0) {
      return null;
    }
    const sorted = [...all].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return sorted[0]?.id ?? null;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!window.location.hash) {
      window.location.hash = "#/radar";
    }
    const handle = () => {
      setRoute(parseHash());
      const all = loadAll();
      if (all.length > 0) {
        const sorted = [...all].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
        setLastSegmentId(sorted[0]?.id ?? null);
      }
    };
    window.addEventListener("hashchange", handle);
    handle();
    return () => window.removeEventListener("hashchange", handle);
  }, []);

  const nav = useMemo(() => route.name, [route]);

  const navigateToStudio = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (route.name === "studio" && route.id) {
      window.location.hash = `#/studio/${route.id}`;
      return;
    }
    if (lastSegmentId) {
      window.location.hash = `#/studio/${lastSegmentId}`;
    } else {
      window.location.hash = "#/studio";
    }
  };

  const handleExport = (payload: SegmentPayload) => {
    setLastSegmentId(payload.id);
    setRoute({ name: "studio", id: payload.id });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <h1 className="text-lg font-semibold text-white">Acquisition Demo</h1>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              data-testid="nav-radar"
              className={`focus-outline rounded-full px-3 py-1 font-semibold transition ${
                nav === "radar" ? "bg-emerald-500 text-slate-900" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.hash = "#/radar";
                }
              }}
            >
              Market Radar
            </button>
            <button
              type="button"
              data-testid="nav-studio"
              className={`focus-outline rounded-full px-3 py-1 font-semibold transition ${
                nav === "studio" ? "bg-emerald-500 text-slate-900" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              onClick={navigateToStudio}
            >
              Segment Studio
            </button>
          </div>
        </div>
      </nav>
      {route.name === "radar" ? (
        <MarketRadarWireframe onExport={handleExport} />
      ) : (
        <SegmentStudioWireframe activeId={route.id ?? lastSegmentId} />
      )}
    </div>
  );
};

export default AcquisitionDemoApp;
