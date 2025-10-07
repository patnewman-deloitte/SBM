import { Dialog, Transition } from '@headlessui/react';
import { ChevronRight, Menu, Share2, SlidersHorizontal, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { channels, segments } from '../data/seeds';
import { useGlobalStore } from '../store/globalStore';
import { currencyFormatter } from '../lib/format';

const nav = [
  { name: 'Market Radar', href: '/market-radar' },
  { name: 'Segment Studio', href: '/segment-studio' },
  { name: 'Campaign Designer', href: '/campaign-designer' }
];

export const AppLayout = () => {
  const location = useLocation();
  const infoPanel = useGlobalStore((state) => state.infoPanel);
  const assumptions = useGlobalStore((state) => state.assumptions);
  const updateAssumptions = useGlobalStore((state) => state.updateAssumptions);
  const [assumptionModalOpen, setAssumptionModalOpen] = useState(false);

  const assumptionSummary = useMemo(
    () => [
      `Gross margin ${Math.round(assumptions.grossMarginRate * 100)}%`,
      `Servicing $${assumptions.servicingCostPerSubMo}/mo`,
      `Device amort ${assumptions.deviceSubsidyAmortMo} mo`,
      `Execution $${assumptions.executionCost}`
    ].join(' • '),
    [assumptions]
  );

  const breadcrumb = useMemo(() => {
    const navItem = nav.find((item) => location.pathname.startsWith(item.href));
    return navItem?.name ?? 'Market Radar';
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Menu className="h-5 w-5 text-slate-400" aria-hidden />
            <div>
              <Link to="/market-radar" className="text-lg font-semibold text-slate-900">
                Subscriber Base Management
              </Link>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Acquire</span>
                <ChevronRight className="h-4 w-4" />
                <span>{breadcrumb}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
              onClick={() => {
                const state = JSON.stringify(localStorage.getItem('sbm-acquire-store'));
                navigator.clipboard.writeText(state ?? '');
              }}
            >
              <Share2 className="h-4 w-4" /> Save & Share
            </button>
          </div>
        </div>
        <nav className="mx-auto w-full max-w-7xl px-6">
          <ul className="flex gap-4 border-t border-slate-200 pt-3 text-sm font-medium text-slate-500">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${
                      isActive ? 'bg-primary text-white shadow-sm' : 'hover:bg-slate-200 hover:text-slate-900'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-8">
        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-6 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Scenario assumptions</h2>
                <p className="text-sm text-primary/80">{assumptionSummary}</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm hover:bg-primary/10"
                onClick={() => setAssumptionModalOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" /> Quick edit
              </button>
            </div>
          </div>
          <Outlet />
        </main>
        <aside className="sticky top-24 h-fit w-[280px] space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contextual info</h3>
            <p className="mt-2 text-base font-semibold text-slate-900">{infoPanel.title}</p>
            <p className="mt-2 text-sm text-slate-600">{infoPanel.description}</p>
            {infoPanel.hint ? <p className="mt-4 text-xs text-slate-500">Source: {infoPanel.hint}</p> : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <h3 className="font-semibold text-slate-900">Channel reference CAC</h3>
            <ul className="mt-3 space-y-2 text-slate-600">
              {channels.map((channel) => (
                <li key={channel.id} className="flex items-center justify-between">
                  <span>{channel.name}</span>
                  <span>{currencyFormatter.format(channel.cac)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <Transition.Root show={assumptionModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setAssumptionModalOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-6">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-4"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-4"
              >
                <Dialog.Panel className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold text-slate-900">Edit economic assumptions</Dialog.Title>
                    <button
                      className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                      onClick={() => setAssumptionModalOpen(false)}
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <label className="flex flex-col gap-2">
                      <span className="font-medium text-slate-600">Gross margin rate (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(assumptions.grossMarginRate * 100)}
                        onChange={(event) => updateAssumptions({ grossMarginRate: Number(event.target.value) / 100 })}
                        className="rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="font-medium text-slate-600">Servicing cost ($/mo)</span>
                      <input
                        type="number"
                        min={0}
                        value={assumptions.servicingCostPerSubMo}
                        onChange={(event) => updateAssumptions({ servicingCostPerSubMo: Number(event.target.value) })}
                        className="rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="font-medium text-slate-600">Device amortization (mo)</span>
                      <input
                        type="number"
                        min={1}
                        value={assumptions.deviceSubsidyAmortMo}
                        onChange={(event) => updateAssumptions({ deviceSubsidyAmortMo: Number(event.target.value) })}
                        className="rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="font-medium text-slate-600">Execution cost ($)</span>
                      <input
                        type="number"
                        min={0}
                        value={assumptions.executionCost}
                        onChange={(event) => updateAssumptions({ executionCost: Number(event.target.value) })}
                        className="rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setAssumptionModalOpen(false)}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm"
                    >
                      Done
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};
