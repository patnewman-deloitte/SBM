import React from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useOfferStore } from '../store/offerStore';

const ActionBar: React.FC = () => {
  const navigate = useNavigate();
  const {
    generate,
    optimizeToTarget,
    exportCsv,
    exportPng,
    isGenerating,
    isOptimizing,
    isExporting
  } = useOfferStore((state) => ({
    generate: state.generate,
    optimizeToTarget: state.optimizeToTarget,
    exportCsv: state.exportCsv,
    exportPng: state.exportPng,
    isGenerating: state.isGenerating,
    isOptimizing: state.isOptimizing,
    isExporting: state.isExporting
  }));
  const [menuOpen, setMenuOpen] = React.useState(false);
  const busy = isGenerating || isOptimizing || isExporting;

  const handleGenerate = async () => {
    if (busy) return;
    await generate();
  };

  const handleOptimize = async () => {
    if (busy) return;
    await optimizeToTarget();
  };

  const handleExportCsv = () => {
    exportCsv();
    setMenuOpen(false);
  };

  const handleExportPng = async () => {
    await exportPng('auto-plan-card');
    setMenuOpen(false);
  };

  const handleLaunch = () => {
    navigate('/execution-hub', { replace: false });
  };

  React.useEffect(() => {
    if (!menuOpen) return;
    const handle = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-export-menu]')) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('click', handle);
    return () => window.removeEventListener('click', handle);
  }, [menuOpen]);

  return (
    <div className="sticky top-0 z-30 -mx-6 mb-6 bg-slate-950/90 backdrop-blur">
      <div className="flex items-center gap-3 border-b border-emerald-500/10 px-6 py-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className={clsx(
            'rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-500/40'
          )}
        >
          {isGenerating ? 'Generating…' : 'Generate campaign'}
        </button>
        <button
          type="button"
          onClick={handleOptimize}
          disabled={busy}
          className="rounded-md border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:border-emerald-500/20 disabled:text-emerald-200/50"
        >
          {isOptimizing ? 'Improving…' : 'Improve to target'}
        </button>
        <div className="relative" data-export-menu>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            disabled={busy}
            className="rounded-md border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:border-emerald-500/20 disabled:text-emerald-200/50"
          >
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
          {menuOpen && !busy && (
            <div className="absolute right-0 mt-2 w-40 rounded-md border border-emerald-500/30 bg-slate-900/95 p-2 shadow-xl">
              <button
                type="button"
                onClick={handleExportPng}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-emerald-500/10"
              >
                PNG snapshot
                <span className="text-xs text-emerald-400">auto</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="mt-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-emerald-500/10"
              >
                CSV workbook
                <span className="text-xs text-emerald-400">auto</span>
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleLaunch}
          className="ml-auto rounded-md border border-slate-600/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          Launch to Execution Hub
        </button>
      </div>
    </div>
  );
};

export default ActionBar;
