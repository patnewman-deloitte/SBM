import React from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useOfferStore } from '../store/offerStore';

const StickyFooter: React.FC = () => {
  const navigate = useNavigate();
  const { cohortName, plan, lockAndExport, isExporting } = useOfferStore((state) => ({
    cohortName: state.cohortName,
    plan: state.plan,
    lockAndExport: state.lockAndExport,
    isExporting: state.isExporting
  }));

  const handleLock = async () => {
    await lockAndExport('auto-plan-card');
  };

  return (
    <footer className="sticky bottom-0 z-20 -mx-6 mt-10 bg-slate-950/90 backdrop-blur">
      <div className="flex flex-col gap-4 border-t border-emerald-500/10 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-300">Cohort</p>
          <p className="text-lg font-semibold text-white">{cohortName}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-300">
            <span>Payback {plan.kpis.paybackMo.toFixed(2)} mo</span>
            <span>Conversion {plan.kpis.conversionPct.toFixed(2)}%</span>
            <span>Margin {plan.kpis.marginPct.toFixed(2)}%</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleLock}
            disabled={isExporting}
            className={clsx(
              'rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300',
              isExporting && 'cursor-not-allowed opacity-70'
            )}
          >
            {isExporting ? 'Locking…' : 'Lock & Export'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/execution-hub')}
            className="rounded-md border border-slate-600/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            View Monitoring
          </button>
        </div>
      </div>
    </footer>
  );
};

export default StickyFooter;
