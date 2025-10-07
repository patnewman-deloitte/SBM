import { Dialog, Transition } from '@headlessui/react';
import { ArrowRight, Filter, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { channels, competitors, segments } from '../../data/seeds';
import { InfoPopover } from '../../components/InfoPopover';
import { KpiCard } from '../../components/KpiCard';
import { SegmentCard } from '../../components/SegmentCard';
import { CompareDrawer } from '../../components/CompareDrawer';
import { CompetitorHeatmap } from '../../components/CompetitorHeatmap';
import { MigrationMatrix } from '../../components/MigrationMatrix';
import { currencyFormatter, formatPayback, percentFormatter } from '../../lib/format';
import { summariseCohort } from '../../sim/tinySim';
import { useGlobalStore } from '../../store/globalStore';

const heroInfo = {
  payback: {
    description: 'How long until gross margin from this cohort covers the fully-loaded CAC (channel + promo + device).',
    formula: 'min m where Σ(Contribution₁..m) ≥ CAC',
    source: 'Synth Cohort Econ.'
  },
  grossMargin: {
    description: 'Gross margin from this cohort over 12 months after servicing costs and device amortization.',
    formula: 'Σ₁₋₁₂(Gross Margin - Servicing - Device amort)',
    source: 'Synth Cohort Econ.'
  }
};

const aiSummaryBullets = () => {
  const topValue = [...competitors].sort((a, b) => b.valueScore - a.valueScore)[0];
  const bestPrice = [...competitors].sort((a, b) => a.basePrice - b.basePrice)[0];
  return [
    `${topValue.name} leads perceived value at ${topValue.valueScore} while charging $${topValue.basePrice}, signalling room for bundle storytelling.`,
    `${bestPrice.name} anchors entry pricing at $${bestPrice.basePrice} with ${bestPrice.promoStyle.toLowerCase()}, so promo discipline is key.`
  ];
};

export const MarketRadarRoute = () => {
  const activeSegmentId = useGlobalStore((state) => state.activeSegmentId);
  const setActiveSegmentId = useGlobalStore((state) => state.setActiveSegmentId);
  const setInfoPanel = useGlobalStore((state) => state.setInfoPanel);
  const [filters, setFilters] = useState({ region: 'all', price: 'all', value: 'all', size: 'all' });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [assumptionModal, setAssumptionModal] = useState(false);

  const filteredSegments = useMemo(() => {
    return segments.filter((segment) => {
      const matchRegion = filters.region === 'all' || segment.regionMix[filters.region] !== undefined;
      const matchPrice =
        filters.price === 'all' || (filters.price === 'sensitive' ? segment.priceSensitivity > 0.6 : segment.priceSensitivity <= 0.6);
      const matchValue =
        filters.value === 'all' || (filters.value === 'high' ? segment.valueSensitivity >= 0.7 : segment.valueSensitivity < 0.7);
      const matchSize =
        filters.size === 'all' || (filters.size === 'large' ? segment.size >= 300000 : segment.size < 300000);
      return matchRegion && matchPrice && matchValue && matchSize;
    });
  }, [filters]);

  const activeSegment =
    filteredSegments.find((segment) => segment.id === activeSegmentId) ??
    segments.find((segment) => segment.id === activeSegmentId) ??
    segments[0];

  const heroSummary = summariseCohort(activeSegment);
  const channelMix = activeSegment.defaultChannelMix;
  const channelCacComponent = Object.entries(channelMix).reduce((sum, [channelId, weight]) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return sum;
    return sum + channel.cac * weight;
  }, 0);
  const promoDeviceExecution = heroSummary.cacPerSubscriber - channelCacComponent;

  const contributionSeries = heroSummary.contributionPerMonth.map((value, index) => ({ month: index + 1, contribution: value }));

  return (
    <div className="space-y-8">
      <section aria-label="Filters and assumptions" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Filter className="h-4 w-4" /> Filter segments
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600">Region signal</span>
            <select
              value={filters.region}
              onChange={(event) => setFilters((prev) => ({ ...prev, region: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="all">All</option>
              <option value="urban">Urban heavy</option>
              <option value="suburban">Suburban mix</option>
              <option value="rural">Rural skew</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600">Price sensitivity</span>
            <select
              value={filters.price}
              onChange={(event) => setFilters((prev) => ({ ...prev, price: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="all">All</option>
              <option value="sensitive">Higher sensitivity</option>
              <option value="balanced">Balanced or lower</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600">Value orientation</span>
            <select
              value={filters.value}
              onChange={(event) => setFilters((prev) => ({ ...prev, value: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="all">All</option>
              <option value="high">Value seeking</option>
              <option value="low">Utility driven</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600">Segment size</span>
            <select
              value={filters.size}
              onChange={(event) => setFilters((prev) => ({ ...prev, size: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="all">All</option>
              <option value="large">Large (≥300K)</option>
              <option value="small">Smaller (&lt;300K)</option>
            </select>
          </label>
        </div>
      </section>

      <section aria-label="Hero KPIs" className="grid gap-4 md:grid-cols-2">
        <KpiCard
          title="CAC Payback"
          value={formatPayback(heroSummary.paybackMonths)}
          deltaLabel={`Reach ${(heroSummary.reach * 100).toFixed(1)}% • Take rate ${(heroSummary.takeRate * 100).toFixed(1)}%`}
          trend={heroSummary.paybackMonths === '>24' ? 'down' : 'up'}
          info={heroInfo.payback}
          onFocus={() =>
            setInfoPanel({
              title: 'CAC Payback (months)',
              description: 'Months until fully loaded CAC is covered by cohort contribution.',
              hint: 'Synth Cohort Econ.'
            })
          }
        />
        <KpiCard
          title="12-mo Incremental Gross Margin"
          value={currencyFormatter.format(heroSummary.grossMargin12Mo)}
          deltaLabel={`Net adds est. ${heroSummary.netAdds.toLocaleString()}`}
          trend="up"
          info={heroInfo.grossMargin}
          onFocus={() =>
            setInfoPanel({
              title: '12-mo Incremental GM',
              description: 'Gross margin less servicing + device amort across first 12 months.',
              hint: 'Synth Cohort Econ.'
            })
          }
        />
      </section>

      <button className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" onClick={() => setAssumptionModal(true)}>
        <SlidersHorizontal className="h-4 w-4" /> Assumptions detail
      </button>

      <section aria-label="Segment carousel" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Segment carousel</h2>
          <p className="text-sm text-slate-500">Use arrow keys or scroll to explore.</p>
        </div>
        <div className="relative">
          <div
            className="flex gap-4 overflow-x-auto pb-4"
            role="listbox"
            aria-label="Segments"
            tabIndex={0}
            onKeyDown={(event) => {
              if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
              const currentIndex = filteredSegments.findIndex((segment) => segment.id === activeSegment.id);
              if (event.key === 'ArrowRight' && currentIndex < filteredSegments.length - 1) {
                setActiveSegmentId(filteredSegments[currentIndex + 1].id);
              }
              if (event.key === 'ArrowLeft' && currentIndex > 0) {
                setActiveSegmentId(filteredSegments[currentIndex - 1].id);
              }
              if (event.key === 'Home') setActiveSegmentId(filteredSegments[0].id);
              if (event.key === 'End') setActiveSegmentId(filteredSegments[filteredSegments.length - 1].id);
            }}
          >
            {filteredSegments.map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                active={segment.id === activeSegment.id}
                comparing={compareIds.includes(segment.id)}
                onSelect={() => setActiveSegmentId(segment.id)}
                onToggleCompare={(checked) => {
                  setCompareIds((prev) => {
                    if (!checked) return prev.filter((id) => id !== segment.id);
                    if (prev.length >= 3) return prev;
                    const next = [...new Set([...prev, segment.id])];
                    if (next.length > 0) setShowCompare(true);
                    return next;
                  });
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{filteredSegments.length} segment options shown</span>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:border-primary hover:text-primary"
            onClick={() => setShowCompare(true)}
            disabled={!compareIds.length}
          >
            <Sparkles className="h-4 w-4" /> Compare shortlist
          </button>
        </div>
      </section>

      <section aria-label="Competitor landscape" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Competitive landscape</h2>
          <InfoPopover
            title="Competitive block"
            plainDescription="Explore pricing, value, and switching behaviour to position our play."
            primarySourceHint="Synth pricing + sentiment"
          />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <CompetitorHeatmap />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Plan snapshot</h3>
              <InfoPopover title="Plan snapshot" plainDescription="Comparable plan constructs across key competitors." primarySourceHint="Synth plan/pricing" />
            </div>
            <div className="mt-4 overflow-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Brand</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Base price</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Promo style</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bundle</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Effective price mo12</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((competitor) => (
                    <tr key={competitor.id} className="even:bg-slate-50/60">
                      <th scope="row" className="sticky left-0 bg-white px-4 py-3 text-left font-medium text-slate-700">
                        {competitor.name}
                      </th>
                      <td className="px-4 py-3 text-slate-600">{currencyFormatter.format(competitor.basePrice)}</td>
                      <td className="px-4 py-3 text-slate-600">{competitor.promoStyle}</td>
                      <td className="px-4 py-3 text-slate-600">{competitor.bundleFlag ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-slate-600">{currencyFormatter.format(competitor.basePrice - competitor.promoDepth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">Estimates from synthetic data.</p>
          </div>
          <MigrationMatrix />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">AI summary</h3>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {aiSummaryBullets().map((bullet, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ArrowRight className="mt-1 h-4 w-4 text-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CompareDrawer open={showCompare} onClose={() => setShowCompare(false)} segments={segments.filter((segment) => compareIds.includes(segment.id))} />

      <Transition.Root show={assumptionModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setAssumptionModal}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-slate-900/40" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-6">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-4" enterTo="opacity-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-4">
                <Dialog.Panel className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold text-slate-900">Assumption breakdown</Dialog.Title>
                    <button onClick={() => setAssumptionModal(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
                      <h4 className="font-semibold text-slate-900">CAC breakdown</h4>
                      <ul className="mt-3 space-y-2 text-slate-600">
                        {Object.entries(channelMix).map(([channelId, weight]) => {
                          const channel = channels.find((c) => c.id === channelId)!;
                          return (
                            <li key={channelId} className="flex items-center justify-between">
                              <span>{channel.name}</span>
                              <span>
                                {percentFormatter.format(weight)} • {currencyFormatter.format(channel.cac * weight)}
                              </span>
                            </li>
                          );
                        })}
                        <li className="flex items-center justify-between font-medium text-slate-700">
                          <span>Promo + device + execution</span>
                          <span>{currencyFormatter.format(promoDeviceExecution)}</span>
                        </li>
                        <li className="flex items-center justify-between font-semibold text-slate-900">
                          <span>Total CAC / subscriber</span>
                          <span>{currencyFormatter.format(heroSummary.cacPerSubscriber)}</span>
                        </li>
                        <li className="flex items-center justify-between font-semibold text-primary">
                          <span>Cohort CAC (net adds)</span>
                          <span>{currencyFormatter.format(heroSummary.cac)}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">Contribution timeline</h4>
                      <div className="h-48">
                        <ResponsiveContainer>
                          <LineChart data={contributionSeries}>
                            <XAxis dataKey="month" tickFormatter={(value) => `M${value}`} />
                            <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} />
                            <Tooltip formatter={(value: number) => currencyFormatter.format(value)} labelFormatter={(label) => `Month ${label}`} />
                            <Line type="monotone" dataKey="contribution" stroke="#1f7aec" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Contribution includes gross margin less servicing and device amortization.</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => setAssumptionModal(false)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
                      Close
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
