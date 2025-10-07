/**
 * Cohort Builder provides framework chips and a plain-English prompt to define the target audience.
 */
import React, { useMemo, useState } from "react";
import { Badge, SectionTitle } from "./atoms";

export const filterGroups: { title: string; options: string[] }[] = [
  { title: "Stage", options: ["Seed", "Series A", "Series B", "Scaleup", "Enterprise"] },
  { title: "Motion", options: ["Product-led", "Sales-led", "Hybrid", "Channel", "Self-serve"] },
  { title: "Team", options: ["Remote", "Hybrid", "Field", "Retail", "Agency"] },
  { title: "Pain", options: ["Onboarding", "Compliance", "Support", "Payments", "Analytics"] },
  { title: "Stack", options: ["Salesforce", "HubSpot", "Zendesk", "Slack", "Workday"] },
  { title: "Signals", options: ["Hiring", "Funding", "Expansion", "Downsizing", "Tool churn"] }
];

type CohortBuilderProps = {
  selected: Record<string, string[]>;
  onSelectedChange: (value: Record<string, string[]>) => void;
};

const ensureGroup = (value: Record<string, string[]>) => {
  const next: Record<string, string[]> = { ...value };
  filterGroups.forEach((group) => {
    if (!next[group.title]) {
      next[group.title] = [];
    }
  });
  return next;
};

const CohortBuilder: React.FC<CohortBuilderProps> = ({ selected, onSelectedChange }) => {
  const [ask, setAsk] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const hydrated = useMemo(() => ensureGroup(selected), [selected]);

  const toggleOption = (group: string, option: string) => {
    const groupValues = new Set(hydrated[group]);
    if (groupValues.has(option)) {
      groupValues.delete(option);
    } else {
      groupValues.add(option);
    }
    onSelectedChange({ ...hydrated, [group]: Array.from(groupValues) });
  };

  const summary = useMemo(() => {
    const parts: string[] = [];
    Object.entries(hydrated).forEach(([group, values]) => {
      if (values.length > 0) {
        parts.push(`${group}: ${values.join(", ")}`);
      }
    });
    return parts.join(" • ");
  }, [hydrated]);

  return (
    <aside className="card sticky top-4 flex flex-col gap-6 border border-slate-800 p-6" aria-label="Cohort Builder">
      <SectionTitle
        title="Cohort Builder"
        subtitle="Stack criteria or ask the Radar to translate"
        action={<Badge color="slate">Beta</Badge>}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (ask.trim().length > 0) {
            setSubmitted(`Translated to cohort criteria: "${ask.trim()}"`);
            setAsk("");
          }
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="ask-input" className="text-sm font-semibold text-slate-200">
          Ask the Radar
        </label>
        <div className="flex gap-2">
          <input
            id="ask-input"
            value={ask}
            onChange={(event) => setAsk(event.target.value)}
            placeholder="e.g. Companies expanding remote success pods"
            className="focus-outline w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="focus-outline rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400"
          >
            Ask
          </button>
        </div>
        {submitted && <p className="text-xs text-emerald-300">{submitted}</p>}
      </form>

      <div className="space-y-5" aria-label="Framework chips">
        {filterGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">{group.title}</h3>
              {hydrated[group.title].length > 0 && (
                <span className="text-xs text-emerald-300">
                  {hydrated[group.title].length} selected
                </span>
              )}
            </header>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const isActive = hydrated[group.title].includes(option);
                return (
                  <button
                    type="button"
                    key={option}
                    onClick={() => toggleOption(group.title, option)}
                    className={
                      "focus-outline rounded-full border px-3 py-1 text-xs font-semibold transition" +
                      (isActive
                        ? " border-emerald-400 bg-emerald-500/20 text-emerald-200"
                        : " border-slate-700 bg-slate-800/60 text-slate-300 hover:border-emerald-500/70 hover:text-emerald-200")
                    }
                    aria-pressed={isActive}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {summary && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-100">
          <p className="font-semibold uppercase tracking-wide text-emerald-200">Selected criteria</p>
          <p className="mt-1 text-slate-100">{summary}</p>
        </div>
      )}
    </aside>
  );
};

export default CohortBuilder;
