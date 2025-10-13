import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import MarketRadar from './app/routes/MarketRadar';
import SegmentStudio from './app/routes/SegmentStudio';
import CampaignDesigner from './app/routes/CampaignDesigner';
import ExecutionHub from './tabs/ExecutionHub';
import MonitoringDashboard from './tabs/MonitoringDashboard';
import { useGlobalStore } from './store/global';
import { useAppState, Mode, Step } from './appState';

const tabs: Array<{ path: string; label: string; step: Step }> = [
  { path: '/', label: 'Opportunity Radar', step: 1 },
  { path: '/segment-studio', label: 'Segment Studio', step: 2 },
  { path: '/campaign-designer', label: 'Offer & Campaign Designer', step: 3 },
  { path: '/execution-hub', label: 'Execution Hub', step: 4 },
  { path: '/monitoring', label: 'Monitoring Dashboard', step: 5 }
];

const lifecycleModes: Array<{ id: Mode; label: string }> = [
  { id: 'acquire', label: 'Acquire' },
  { id: 'grow', label: 'Grow' },
  { id: 'retain', label: 'Retain' }
];

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cartSegments = useGlobalStore((s) => s.cartSegmentIds);
  const selectedMicroIds = useGlobalStore((s) => s.selectedMicroIds);
  const initCampaign = useGlobalStore((s) => s.initCampaignFromSelection);
  const { mode, setMode, step, setStep } = useAppState();

  useEffect(() => {
    if (location.pathname === '/segment-studio' && cartSegments.length === 0) {
      navigate('/');
    }
  }, [cartSegments.length, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === '/campaign-designer' && selectedMicroIds.length === 0) {
      navigate('/segment-studio');
    }
  }, [selectedMicroIds.length, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === '/campaign-designer') {
      initCampaign();
    }
  }, [initCampaign, location.pathname]);

  useEffect(() => {
    const current = tabs.find((tab) => tab.path === location.pathname);
    if (current) {
      setStep(current.step);
    }
  }, [location.pathname, setStep]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Subscriber Base Management</p>
              <h1 className="text-2xl font-semibold text-white">Lifecycle Playbook</h1>
            </div>
            <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 p-1 text-xs">
                {lifecycleModes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`rounded-full px-4 py-1 text-sm font-semibold transition ${
                      mode === item.id
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    aria-pressed={mode === item.id}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2" aria-label="Lifecycle progress">
                {tabs.map((tab) => (
                  <span
                    key={tab.step}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      step >= tab.step ? 'bg-emerald-400 shadow-emerald-400/50 shadow-[0_0_6px]' : 'bg-slate-700'
                    }`}
                  >
                    <span className="sr-only">Step {tab.step}: {tab.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                onClick={() => setStep(tab.step)}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-7xl px-6 py-6">
        <Routes>
          <Route path="/" element={<MarketRadar />} />
          <Route path="/segment-studio" element={<SegmentStudio />} />
          <Route path="/campaign-designer" element={<CampaignDesigner />} />
          <Route path="/execution-hub" element={<ExecutionHub />} />
          <Route path="/monitoring" element={<MonitoringDashboard />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
