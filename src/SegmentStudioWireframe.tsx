/**
 * SegmentStudioWireframe reads Market Radar exports and provides a lite rules builder and readiness view.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Meter } from "./marketRadar/components/atoms";
import { SegmentPayload, getOne, loadAll, saveOne } from "./storage";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round = (n: number) => Math.round(n);
const fmtK = (n: number) => {
  if (n >= 1000) {
    const value = Math.round(n / 100) / 10;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k`;
  }
  return `${n}`;
};
const calcDest = (net: number) => ({
  email: round(net * 0.37),
  social: round(net * 0.3),
  sms: round(net * 0.24)
});

type Props = {
  activeId?: string | null;
};

type StepKey = "step1" | "step2" | "step3";

type StepState = Record<StepKey, boolean>;

const emptyStepState: StepState = { step1: false, step2: false, step3: false };

const SegmentStudioWireframe: React.FC<Props> = ({ activeId }) => {
  const [payload, setPayload] = useState<SegmentPayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [includeChips, setIncludeChips] = useState<string[]>([]);
  const [excludeChips, setExcludeChips] = useState<string[]>([]);
  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [includeLogic, setIncludeLogic] = useState<"AND" | "OR">("AND");
  const [dedupGrain, setDedupGrain] = useState<"Household" | "Person">("Household");
  const [holdout, setHoldout] = useState(10);
  const [suppressionsApplied, setSuppressionsApplied] = useState(false);
  const [contactPermissions, setContactPermissions] = useState(true);
  const [stepChecks, setStepChecks] = useState<StepState>(emptyStepState);
  const [stepToast, setStepToast] = useState<StepState>(emptyStepState);
  const stepTimers = useRef<Record<StepKey, ReturnType<typeof setTimeout> | null>>({
    step1: null,
    step2: null,
    step3: null
  });
  const baseline = useRef<{ include: string[]; exclude: string[] }>({ include: [], exclude: [] });
  const [lineageOpen, setLineageOpen] = useState(false);
  const lastHydratedId = useRef<string | null>(null);
  const includeMarker = useRef(includeChips.length + excludeChips.length);
  const prevNet = useRef(0);
  const prevReadiness = useRef(0);
  const prevContact = useRef(contactPermissions);
  const prevGrain = useRef(dedupGrain);

  const baseReach = payload?.kpis.reachable ?? 0;

  const scoreNet = useCallback(
    (
      reach: number,
      grain: "Household" | "Person",
      includes: string[],
      excludes: string[],
      hold: number,
      suppression: boolean
    ) => {
      if (!reach) {
        return 0;
      }
      let net = grain === "Person" ? reach * 1.06 : reach;
      const includeBonus = clamp(includes.length * 0.01, 0, 0.1);
      const excludePenalty = clamp(excludes.length * 0.015, 0, 0.2);
      net = net * (1 + includeBonus - excludePenalty);
      net = net * (1 - hold / 100);
      if (suppression) {
        net = net * 0.94;
      }
      return clamp(Math.round(net), 0, 300000);
    },
    []
  );

  const netEligible = useMemo(
    () => scoreNet(baseReach, dedupGrain, includeChips, excludeChips, holdout, suppressionsApplied),
    [baseReach, dedupGrain, includeChips, excludeChips, holdout, suppressionsApplied, scoreNet]
  );

  const destinations = useMemo(() => calcDest(netEligible), [netEligible]);

  const readinessScore = useMemo(() => {
    const passes = [true, contactPermissions, true, suppressionsApplied];
    const count = passes.filter(Boolean).length;
    return Math.round((count / 4) * 100);
  }, [contactPermissions, suppressionsApplied]);

  const triggerStep = (key: StepKey) => {
    setStepChecks((prev) => ({ ...prev, [key]: !prev[key] }));
    setStepToast((prev) => ({ ...prev, [key]: true }));
    if (stepTimers.current[key]) {
      clearTimeout(stepTimers.current[key] as ReturnType<typeof setTimeout>);
    }
    stepTimers.current[key] = setTimeout(() => {
      setStepToast((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const hydrate = useCallback(
    (id: string | null) => {
      if (!id) {
        setPayload(null);
        setMissing(true);
        lastHydratedId.current = null;
        return;
      }
      if (lastHydratedId.current === id) {
        return;
      }
      const found = getOne(id);
      if (!found) {
        setPayload(null);
        setMissing(true);
        lastHydratedId.current = id;
        return;
      }
      lastHydratedId.current = id;
      setPayload(found);
      setMissing(false);
      const seededInclude = found.chips.slice(0, 2);
      const seededExclude = found.rivals?.slice(0, 1) ?? [];
      setIncludeChips(seededInclude);
      setExcludeChips(seededExclude);
      setIncludeInput("");
      setExcludeInput("");
      setHoldout(10);
      setSuppressionsApplied(false);
      setContactPermissions(true);
      setIncludeLogic("AND");
      setDedupGrain("Household");
      setStepChecks(emptyStepState);
      setStepToast(emptyStepState);
      baseline.current = { include: seededInclude, exclude: seededExclude };
    },
    []
  );

  const parseHashId = useCallback(() => {
    if (typeof window === "undefined") {
      hydrate(activeId ?? null);
      return;
    }
    const hash = window.location.hash.replace(/^#/, "");
    const parts = hash.split("/").filter(Boolean);
    if (parts[0] === "studio") {
      hydrate(parts[1] ?? activeId ?? null);
    } else {
      hydrate(activeId ?? null);
    }
  }, [activeId, hydrate]);

  useEffect(() => {
    parseHashId();
    if (typeof window === "undefined") {
      return;
    }
    const handler = () => parseHashId();
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [parseHashId]);

  useEffect(() => {
    if (activeId) {
      hydrate(activeId);
    }
  }, [activeId, hydrate]);

  useEffect(() => {
    includeMarker.current = includeChips.length + excludeChips.length;
  }, []);

  useEffect(() => {
    const changeMarker = includeChips.length + excludeChips.length;
    const previousNet = prevNet.current;
    const previousReadiness = prevReadiness.current;
    const previousContact = prevContact.current;
    const previousGrain = prevGrain.current;
    if (changeMarker !== includeMarker.current && previousNet === netEligible) {
      console.warn("Chip updates should influence net eligible counts");
    }
    if (readinessScore < 0 || readinessScore > 100) {
      console.warn("Readiness score out of expected range");
    }
    if (previousContact !== contactPermissions && previousReadiness === readinessScore) {
      console.warn("Contact permissions toggle should adjust readiness score");
    }
    if (previousGrain !== dedupGrain && previousNet === netEligible) {
      console.warn("Dedup grain toggle should shift net eligible base");
    }
    includeMarker.current = changeMarker;
    prevNet.current = netEligible;
    prevReadiness.current = readinessScore;
    prevContact.current = contactPermissions;
    prevGrain.current = dedupGrain;
  }, [includeChips, excludeChips, netEligible, readinessScore, contactPermissions, dedupGrain]);

  const addChip = (bucket: "include" | "exclude") => {
    const value = bucket === "include" ? includeInput.trim() : excludeInput.trim();
    if (!value) {
      return;
    }
    if (bucket === "include") {
      if (!includeChips.includes(value)) {
        setIncludeChips((prev) => [...prev, value]);
      }
      setIncludeInput("");
    } else {
      if (!excludeChips.includes(value)) {
        setExcludeChips((prev) => [...prev, value]);
      }
      setExcludeInput("");
    }
  };

  const diff = useMemo(() => {
    const includeAdded = includeChips.filter((chip) => !baseline.current.include.includes(chip));
    const includeRemoved = baseline.current.include.filter((chip) => !includeChips.includes(chip));
    const excludeAdded = excludeChips.filter((chip) => !baseline.current.exclude.includes(chip));
    const excludeRemoved = baseline.current.exclude.filter((chip) => !excludeChips.includes(chip));
    return { includeAdded, includeRemoved, excludeAdded, excludeRemoved };
  }, [includeChips, excludeChips]);

  const delta = netEligible - baseReach;
  const deltaLabel = `${delta >= 0 ? "+" : "-"}${fmtK(Math.abs(delta))}`;

  const readinessRows = [
    { label: "Coverage >= 80%", pass: true },
    { label: "Consent >= 95%", pass: contactPermissions },
    { label: "Dedup loss <= 12%", pass: true },
    { label: "Overlap <= 15%", pass: suppressionsApplied }
  ];

  const emptyImport = () => {
    const all = loadAll();
    if (all.length === 0) {
      return;
    }
    const sorted = [...all].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    if (typeof window !== "undefined") {
      window.location.hash = `#/studio/${sorted[0].id}`;
    }
  };

  const lockCohort = () => {
    if (!payload) {
      return;
    }
    const updated: SegmentPayload = { ...payload, version: payload.version + 1 };
    setPayload(updated);
    saveOne(updated);
  };

  const lineageSummary = [
    diff.includeAdded.length > 0 ? `+${diff.includeAdded.join(", ")}` : null,
    diff.includeRemoved.length > 0 ? `-${diff.includeRemoved.join(", ")}` : null,
    diff.excludeAdded.length > 0 ? `+EX ${diff.excludeAdded.join(", ")}` : null,
    diff.excludeRemoved.length > 0 ? `-EX ${diff.excludeRemoved.join(", ")}` : null
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Segment Studio</h2>
            {payload && <span className="text-xs text-slate-400">Version {payload.version}</span>}
          </div>
          <p className="text-sm text-slate-300">
            Refine the read-in cohort, apply governance checks, and preview destinations before locking.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900/70 px-4 py-3 text-xs text-slate-200">
          <Badge color="emerald">Pinned cohort</Badge>
          <span className="font-semibold text-white">{payload?.name ?? "No cohort selected"}</span>
          <span className="rounded-full bg-slate-800 px-3 py-1">Net eligible ~ {fmtK(netEligible)}</span>
          <span className="rounded-full bg-slate-800 px-3 py-1" data-testid="dest-email">
            Email ~{fmtK(destinations.email)}
          </span>
          <span className="rounded-full bg-slate-800 px-3 py-1" data-testid="dest-social">
            Paid social ~{fmtK(destinations.social)}
          </span>
          <span className="rounded-full bg-slate-800 px-3 py-1" data-testid="dest-sms">
            SMS ~{fmtK(destinations.sms)}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            {["step1", "step2", "step3"].map((key) => {
              const labelMap: Record<StepKey, { title: string; action: string }> = {
                step1: { title: "Step 1: Read-in & refine", action: "Apply standard exclusions" },
                step2: { title: "Step 2: QA & readiness", action: "Run checks" },
                step3: { title: "Step 3: Lock & export", action: "Prepare export" }
              };
              const data = labelMap[key as StepKey];
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-slate-400">{data.title}</span>
                  <button
                    type="button"
                    className={`focus-outline rounded-full px-3 py-1 text-xs font-semibold transition ${
                      stepChecks[key as StepKey]
                        ? "bg-emerald-500 text-slate-900"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                    onClick={() => triggerStep(key as StepKey)}
                  >
                    {data.action}
                  </button>
                  {stepToast[key as StepKey] && (
                    <span className="rounded-full border border-emerald-400 bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200">
                      Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {missing && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-300">
            <p>No Market Radar export detected.</p>
            <button
              type="button"
              className="mt-3 focus-outline rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
              onClick={emptyImport}
            >
              Import last from Market Radar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="space-y-4 lg:col-span-3">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">From Market Radar</h3>
                {payload && <Badge color="slate">Read-in</Badge>}
              </header>
              {payload ? (
                <div className="mt-3 space-y-3 text-xs text-slate-200">
                  <div className="flex flex-wrap gap-2">
                    {payload.chips.map((chip) => (
                      <span key={chip} className="rounded-full bg-slate-800 px-3 py-1">{chip}</span>
                    ))}
                  </div>
                  <p className="text-slate-400">
                    Window: {payload.geoWindow.window} • Grain: {payload.geoWindow.grain}
                  </p>
                  <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Opportunity score</span>
                      <span className="font-semibold text-emerald-200">{Math.round(payload.kpis.opportunityScore * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Reachable</span>
                      <span className="font-semibold">{fmtK(payload.kpis.reachable)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Expected CVR</span>
                      <span className="font-semibold">{payload.kpis.expectedCVR[0]}–{payload.kpis.expectedCVR[1]}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Payback</span>
                      <span className="font-semibold">~{payload.kpis.paybackMonths} mo</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">No cohort selected yet.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-white">Lineage</h3>
              <p className="mt-2 text-xs text-slate-400">Diff vs read-in</p>
              <button
                type="button"
                className="mt-3 focus-outline rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                onClick={() => setLineageOpen((prev) => !prev)}
              >
                {lineageOpen ? "Hide details" : "Show details"}
              </button>
              {lineageOpen && (
                <div className="mt-3 space-y-2 text-xs text-slate-200">
                  <p>Include added: {diff.includeAdded.join(", ") || "None"}</p>
                  <p>Include removed: {diff.includeRemoved.join(", ") || "None"}</p>
                  <p>Exclude added: {diff.excludeAdded.join(", ") || "None"}</p>
                  <p>Exclude removed: {diff.excludeRemoved.join(", ") || "None"}</p>
                </div>
              )}
              {!lineageOpen && lineageSummary && (
                <p className="mt-3 text-xs text-emerald-200">{lineageSummary}</p>
              )}
            </section>
          </aside>

          <section className="space-y-4 lg:col-span-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Rules builder</h3>
                <button
                  type="button"
                  className="text-xs text-emerald-300 underline"
                  onClick={() => setIncludeLogic((prev) => (prev === "AND" ? "OR" : "AND"))}
                >
                  Toggle logic ({includeLogic})
                </button>
              </header>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Include ({includeLogic})</h4>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {includeChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200"
                        onClick={() => setIncludeChips((prev) => prev.filter((item) => item !== chip))}
                      >
                        {chip} ×
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={includeInput}
                      onChange={(event) => setIncludeInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addChip("include");
                        }
                      }}
                      placeholder="Add include"
                      className="focus-outline w-full rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs"
                    />
                    <button
                      type="button"
                      className="focus-outline rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900"
                      onClick={() => addChip("include")}
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Exclude</h4>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {excludeChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="rounded-full bg-slate-800 px-3 py-1 text-slate-200"
                        onClick={() => setExcludeChips((prev) => prev.filter((item) => item !== chip))}
                      >
                        {chip} ×
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={excludeInput}
                      onChange={(event) => setExcludeInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addChip("exclude");
                        }
                      }}
                      placeholder="Add exclude"
                      className="focus-outline w-full rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs"
                    />
                    <button
                      type="button"
                      className="focus-outline rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
                      onClick={() => addChip("exclude")}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300">
                Net eligible preview: <span className="font-semibold text-white" data-testid="net-eligible">{fmtK(netEligible)}</span>
                {payload && (
                  <span className="ml-2 text-emerald-200">{deltaLabel} vs read-in</span>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold text-white">ID graph & dedup</h3>
                <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Dedup grain">
                  <button
                    type="button"
                    aria-label="Dedup grain household"
                    className={`focus-outline rounded-full px-3 py-1 text-xs font-semibold transition ${
                      dedupGrain === "Household"
                        ? "bg-emerald-500 text-slate-900"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                    onClick={() => setDedupGrain("Household")}
                  >
                    Household
                  </button>
                  <button
                    type="button"
                    aria-label="Dedup grain person"
                    className={`focus-outline rounded-full px-3 py-1 text-xs font-semibold transition ${
                      dedupGrain === "Person"
                        ? "bg-emerald-500 text-slate-900"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                    onClick={() => setDedupGrain("Person")}
                  >
                    Person
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Dedup base from read-in reachable {fmtK(baseReach)}. Person grain adds ~6% lift.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold text-white">Overlap & suppressions</h3>
                <p className="mt-2 text-xs text-slate-400">
                  Apply standard suppressions to lower overlap and clear compliance gates.
                </p>
                <button
                  type="button"
                  className={`mt-3 focus-outline rounded-full px-3 py-1 text-xs font-semibold transition ${
                    suppressionsApplied
                      ? "bg-emerald-500 text-slate-900"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                  onClick={() => setSuppressionsApplied(true)}
                  disabled={suppressionsApplied}
                >
                  {suppressionsApplied ? "Suppressions applied" : "Apply standard suppressions"}
                </button>
                <p className="mt-3 text-xs text-slate-300">
                  Net eligible after suppressions: <span className="font-semibold text-white">{fmtK(netEligible)}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold text-white">Test & holdout split</h3>
                <label htmlFor="holdout" className="mt-2 block text-xs text-slate-300">
                  Global holdout ({holdout}%)
                </label>
                <input
                  id="holdout"
                  type="range"
                  min={5}
                  max={15}
                  value={holdout}
                  aria-label="Holdout slider"
                  onChange={(event) => setHoldout(Number(event.target.value))}
                  className="mt-2 w-full"
                />
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold text-white">Destinations preview</h3>
                <div className="mt-3 grid gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Email</span>
                    <span>~{fmtK(destinations.email)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Paid social</span>
                    <span>~{fmtK(destinations.social)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SMS</span>
                    <span>~{fmtK(destinations.sms)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:col-span-3">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-white">QA & readiness</h3>
              <Meter label="Readiness" value={readinessScore} helper="Target >= 75" />
              <p className="mt-2 text-xs font-semibold text-white" data-testid="readiness-score">
                {readinessScore}% ready
              </p>
              <div className="mt-3 space-y-2 text-xs">
                {readinessRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-slate-300">{row.label}</span>
                    <span className={row.pass ? "text-emerald-300" : "text-amber-300"}>{row.pass ? "Pass" : "Review"}</span>
                  </div>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={contactPermissions}
                  onChange={(event) => setContactPermissions(event.target.checked)}
                />
                Contact permissions
              </label>
              {!contactPermissions && (
                <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">
                  <p>Warning: Consent below threshold.</p>
                  <button
                    type="button"
                    className="mt-2 focus-outline rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-900"
                    onClick={() => setContactPermissions(true)}
                  >
                    Fix
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-white">Governance</h3>
              {payload ? (
                <div className="mt-3 space-y-2 text-xs text-slate-300">
                  <p>Segment ID: {payload.id}</p>
                  <p>Created: {new Date(payload.createdAt).toLocaleString()}</p>
                  <p>Version: {payload.version}</p>
                  <p>Pressure index: {(payload.pressureIndex ?? 0) * 100}%</p>
                  <p>White space: {(payload.whiteSpace ?? 0) * 100}%</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">Awaiting read-in.</p>
              )}
            </section>
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button className="focus-outline rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700">
            Validate
          </button>
          <button
            className="focus-outline rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            onClick={lockCohort}
          >
            Lock cohort
          </button>
          <button className="focus-outline rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400">
            Export…
          </button>
          <button className="focus-outline rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700">
            Send to Campaign Designer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SegmentStudioWireframe;
