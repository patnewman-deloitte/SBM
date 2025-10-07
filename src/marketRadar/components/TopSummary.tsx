/**
 * Plain-English summary guiding the user on how to use the Market Radar tab.
 */
import React from "react";
import { Badge } from "./atoms";

const badges = [
  "Segment-first",
  "Competitive strip",
  "Optional map",
  "AI picks",
  "Key metrics only"
];

const TopSummary: React.FC = () => {
  return (
    <section className="card mx-auto mb-6 flex flex-col gap-4 border border-emerald-500/20 bg-gradient-to-r from-slate-900 to-slate-800/90 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">How to use Market Radar</h1>
      </header>
      <p className="text-sm leading-relaxed text-slate-200">
        Define a cohort in Cohort Builder or type a plain-English ask. Use the Market Lens to spot high-yield segments (CVR vs payback, bubble size = reach). Check competitive intensity in the strip below. Open a card to see micro-segments and apply the cohort. The right rail shows only the most important metrics by default.
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((item) => (
          <Badge key={item} className="bg-emerald-500/15 text-emerald-200">
            {item}
          </Badge>
        ))}
      </div>
    </section>
  );
};

export default TopSummary;
