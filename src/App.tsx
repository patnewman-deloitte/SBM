import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import MarketRadar from './app/routes/MarketRadar';
import SegmentStudio from './app/routes/SegmentStudio';
import CampaignDesigner from './app/routes/CampaignDesigner';
import { useGlobalStore } from './store/global';
import { useEffect } from 'react';

const tabs = [
  { path: '/', label: 'Market Radar' },
  { path: '/segment-studio', label: 'Segment Studio' },
  { path: '/campaign-designer', label: 'Offering & Campaign Designer' }
];

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cartSegments = useGlobalStore((s) => s.cartSegmentIds);
  const selectedMicroIds = useGlobalStore((s) => s.selectedMicroIds);
  const initCampaign = useGlobalStore((s) => s.initCampaignFromSelection);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Subscriber Base Management</p>
            <h1 className="text-2xl font-semibold text-white">Acquire</h1>
          </div>
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30' : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
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
        </Routes>
      </main>
    </div>
  );
};

export default App;
