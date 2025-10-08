import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ActionBar from '../../components/ActionBar';
import ObjectiveRow from '../../components/ObjectiveRow';
import AutoPlanCard from '../../components/AutoPlanCard';
import ScenarioLevers from '../../components/ScenarioLevers';
import CampaignCalendar from '../../components/CampaignCalendar';
import ValidationChecklist from '../../components/ValidationChecklist';
import StickyFooter from '../../components/StickyFooter';
import { useOfferStore, selectBudgetHealth, selectCac, selectCalendarCoverage } from '../../store/offerStore';

const CampaignDesigner: React.FC = () => {
  const plan = useOfferStore((state) => state.plan);
  const objective = useOfferStore((state) => state.objective);
  const budget = useOfferStore(selectBudgetHealth);
  const cac = useOfferStore(selectCac);
  const coverage = useOfferStore(selectCalendarCoverage);

  const lineData = React.useMemo(() => {
    return Array.from({ length: 12 }).map((_, idx) => {
      const baseline = idx < 4 ? 2.1 : idx < 8 ? 1.7 : 1.2;
      const intensity = plan.calendar.reduce((sum, row) => sum + (row[idx] ?? 0), 0);
      return {
        week: `W${idx + 1}`,
        baseline: Number(baseline.toFixed(2)),
        plan: Number((baseline + intensity * 0.35).toFixed(2))
      };
    });
  }, [plan.calendar]);

  return (
    <div className="relative -mx-6 px-6 pb-24 text-slate-100">
      <ActionBar />
      <div className="space-y-6">
        <header className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Offering & Campaign Designer</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Generate a ready-to-launch campaign in one click, then fine-tune pricing, promo, and channel mix with live KPIs,
                guardrails, and explainability baked in.
              </p>
            </div>
            <div className="grid gap-2 text-xs text-slate-300">
              <span>Budget headroom: {budget.within ? 'On track' : 'Over plan'} ({budget.spend.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})</span>
              <span>CAC: ${cac.toFixed(0)} vs ceiling ${objective.cacCeiling}</span>
              <span>Calendar coverage: {(coverage * 100).toFixed(0)}%</span>
            </div>
          </div>
        </header>
        <ObjectiveRow />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <AutoPlanCard />
            <ScenarioLevers />
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Baseline vs plan</h3>
                <span className="text-xs text-slate-400">Weekly net adds index</span>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ left: -10, right: 12, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" stroke="#94a3b8" tickLine={false} axisLine={{ stroke: '#475569' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={{ stroke: '#475569' }} width={32} />
                    <Tooltip
                      cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4 4' }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#22c55e', color: '#f8fafc' }}
                    />
                    <Line type="monotone" dataKey="baseline" stroke="#64748b" strokeWidth={2} dot={false} name="Baseline" />
                    <Line type="monotone" dataKey="plan" stroke="#22c55e" strokeWidth={2} dot={false} name="Plan" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <CampaignCalendar />
            <ValidationChecklist />
          </div>
        </div>
      </div>
      <StickyFooter />
    </div>
  );
};

export default CampaignDesigner;
