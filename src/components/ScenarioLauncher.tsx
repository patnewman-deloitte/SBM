import React from 'react';
import ScenarioModal from './ScenarioModal';

const ScenarioLauncher: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        aria-label="Open scenario sandbox"
      >
        Scenario
      </button>
      <ScenarioModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default ScenarioLauncher;
