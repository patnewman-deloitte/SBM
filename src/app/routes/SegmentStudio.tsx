import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { ArrowUpRight, ChevronRight, Sparkles } from 'lucide-react';
import { channels, offerArchetypes } from '../../data/seeds';
import { InfoPopover } from '../../components/InfoPopover';
import { currencyFormatter, formatPayback, percentFormatter } from '../../lib/format';
import { getOfferById, runCohort } from '../../sim/tinySim';
import { useActiveSegment, useGlobalStore } from '../../store/globalStore';
import { buildRecommendation, generateMicroSegments, normaliseMix } from '../../lib/microSegments';

interface MicroSummary {
  micro: ReturnType<typeof generateMicroSegments>[number];
  summary: ReturnType<typeof runCohort>;
}

export const SegmentStudioRoute = () => {
  const activeSegment = useActiveSegment();
  const selectedMicroIds = useGlobalStore((state) => state.selectedMicroSegmentIds);
  const toggleMicroSegment = useGlobalStore((state) => state.toggleMicroSegment);
  const recommendations = useGlobalStore((state) => state.recommendationsByMicroSegment);
  const setRecommendation = useGlobalStore((state) => state.setRecommendationsForMicro);
  const setInfoPanel = useGlobalStore((state) => state.setInfoPanel);
  const [showGuard, setShowGuard] = useState(false);

  useEffect(() => {
    if (!activeSegment) {
      setShowGuard(true);
    }
  }, [activeSegment]);

  const micros = useMemo(() => generateMicroSegments(activeSegment), [activeSegment]);

  useEffect(() => {
    micros.forEach((micro) => {
      if (!recommendations[micro.id]) {
        setRecommendation(micro.id, buildRecommendation(micro));
      }
    });
  }, [micros, recommendations, setRecommendation]);

  const microSummaries: MicroSummary[] = micros.map((micro) => {
    const recommendation = recommendations[micro.id];
    const offer = getOfferById(recommendation?.offerArchetypeId ?? micro.defaultOfferId);
    const mix = normaliseMix(recommendation?.channelMix ?? micro.defaultChannelMix);
    const summary = runCohort({
      segment: {
        id: micro.id,
        name: micro.name,
        size: micro.size,
        priceSensitivity: micro.priceSensitivity,
        valueSensitivity: micro.valueSensitivity,
        growthRate: activeSegment.growthRate
      },
      offer,
      channelMix: mix
    });
    return { micro, summary };
  });

  const selectedSummaries = microSummaries.filter((entry) => selectedMicroIds.includes(entry.micro.id));
  const aggregate = selectedSummaries.reduce(
    (acc, entry) => {
      acc.size += entry.micro.size;
      acc.netAdds += entry.summary.netAdds;
      acc.grossMargin += entry.summary.grossMargin12Mo;
      const payback = parseInt(entry.summary.paybackMonths, 10);
      if (!Number.isNaN(payback)) acc.paybackMonths.push(payback);
      return acc;
    },
    { size: 0, netAdds: 0, grossMargin: 0, paybackMonths: [] as number[] }
  );
  const blendedPayback = aggregate.paybackMonths.length
    ? `${Math.round(aggregate.paybackMonths.reduce((sum, value) => sum + value, 0) / aggregate.paybackMonths.length)} mo`
    : '—';

  const handleChannelAdjust = (microId: string, channelId: string, weight: number) => {
    const baseMicro = micros.find((micro) => micro.id === microId);
    if (!baseMicro) return;
    const current = recommendations[microId] ?? buildRecommendation(baseMicro);
    const updatedMix = normaliseMix({ ...current.channelMix, [channelId]: weight });
    const offer = getOfferById(current.offerArchetypeId);
    const summary = runCohort({
      segment: {
        id: baseMicro.id,
        name: baseMicro.name,
        size: baseMicro.size,
        priceSensitivity: baseMicro.priceSensitivity,
        valueSensitivity: baseMicro.valueSensitivity,
        growthRate: activeSegment.growthRate
      },
      offer,
      channelMix: updatedMix
    });
    setRecommendation(baseMicro.id, {
      ...current,
      channelMix: updatedMix,
      expected: {
        paybackMonths: summary.paybackMonths,
        grossMargin12Mo: summary.grossMargin12Mo,
        netAdds: summary.netAdds
      }
    });
  };

  const handleOfferSwap = (microId: string, offerId: string) => {
    const baseMicro = micros.find((micro) => micro.id === microId);
    if (!baseMicro) return;
    const current = recommendations[microId] ?? buildRecommendation(baseMicro);
    const offer = getOfferById(offerId);
    const updatedMix = normaliseMix(current.channelMix);
    const summary = runCohort({
      segment: {
        id: baseMicro.id,
        name: baseMicro.name,
        size: baseMicro.size,
        priceSensitivity: baseMicro.priceSensitivity,
        valueSensitivity: baseMicro.valueSensitivity,
        growthRate: activeSegment.growthRate
      },
      offer,
      channelMix: updatedMix
    });
    setRecommendation(baseMicro.id, {
      ...current,
      offerArchetypeId: offer.id,
      channelMix: updatedMix,
      expected: {
        paybackMonths: summary.paybackMonths,
        grossMargin12Mo: summary.grossMargin12Mo,
        netAdds: summary.netAdds
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Micro-segment gallery</h1>
            <p className="text-sm text-slate-600">Auto-clustered personas derived from {activeSegment.name}. Toggle to curate your campaign audience.</p>
          </div>
          <InfoPopover
            title="Micro-segments"
            plainDescription="AI clustering of the selected macro segment to surface actionable cohorts."
            primarySourceHint="Synth behaviour + usage"
          />
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {microSummaries.map(({ micro, summary }) => {
            const recommendation = recommendations[micro.id];
            return (
              <div
                key={micro.id}
                className={`flex h-full flex-col rounded-3xl border bg-white p-5 shadow-sm transition focus-within:ring-2 focus-within:ring-primary ${
                  selectedMicroIds.includes(micro.id) ? 'border-primary shadow-md' : 'border-slate-200'
                }`}
                tabIndex={0}
                onFocus={() =>
                  setInfoPanel({
                    title: micro.name,
                    description: micro.traits.join(' • '),
                    hint: 'Synth cluster rationale'
                  })
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{micro.name}</h3>
                    <p className="text-sm text-slate-500">{micro.traits.join(' • ')}</p>
                  </div>
                  <button
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      selectedMicroIds.includes(micro.id)
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 text-slate-600 hover:border-primary hover:text-primary'
                    }`}
                    onClick={() => toggleMicroSegment(micro.id)}
                  >
                    {selectedMicroIds.includes(micro.id) ? 'Targeted' : 'Target'}
                  </button>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <dt className="font-medium text-slate-500">Size</dt>
                    <dd className="text-base font-semibold text-slate-900">{micro.size.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Net adds</dt>
                    <dd className="text-base font-semibold text-slate-900">{summary.netAdds.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Payback</dt>
                    <dd className="text-base font-semibold text-slate-900">{formatPayback(summary.paybackMonths)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">12-mo GM</dt>
                    <dd className="text-base font-semibold text-slate-900">{currencyFormatter.format(summary.grossMargin12Mo)}</dd>
                  </div>
                </dl>
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                  <p className="font-semibold text-slate-600">Channel blend</p>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(recommendation?.channelMix ?? micro.defaultChannelMix).map(([channelId, weight]) => {
                      const channel = channels.find((c) => c.id === channelId)!;
                      return (
                        <li key={channelId} className="flex items-center justify-between">
                          <span>{channel.name}</span>
                          <span>{percentFormatter.format(weight)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-4 z-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Selection roll-up</h3>
              <p className="text-lg font-semibold text-slate-900">{selectedMicroIds.length ? `${selectedMicroIds.length} micro-segments targeted` : 'Pick micro-segments to build a plan'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span>Reachable size {aggregate.size.toLocaleString()}</span>
              <span>Blended payback {blendedPayback}</span>
              <span>12-mo GM {currencyFormatter.format(aggregate.grossMargin)}</span>
              <span>Net adds {aggregate.netAdds.toLocaleString()}</span>
            </div>
            <Link
              to="/campaign-designer"
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                selectedMicroIds.length
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-200 text-slate-500 pointer-events-none'
              }`}
            >
              Continue to campaign <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">AI activation kit</h2>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-sm text-slate-600">Adjust channel weights or swap offers to see updated KPIs instantly.</p>
        </div>
        {selectedSummaries.map(({ micro }) => {
          const recommendation = recommendations[micro.id] ?? buildRecommendation(micro);
          return (
            <div key={micro.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{micro.name}</h3>
                  <p className="text-sm text-slate-500">{recommendation.rationale.join(' • ')}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <label className="flex flex-col gap-2">
                  <span className="font-medium text-slate-600">Offer archetype</span>
                  <select
                    value={recommendation.offerArchetypeId}
                    onChange={(event) => handleOfferSwap(micro.id, event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                  >
                    {offerArchetypes.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.name} — {currencyFormatter.format(offer.monthlyPrice)}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <p className="font-medium text-slate-600">Channel weights</p>
                  <div className="mt-2 space-y-2">
                    {channels.map((channel) => (
                      <label key={channel.id} className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center justify-between text-sm text-slate-600">
                          {channel.name}
                          <span>{percentFormatter.format(recommendation.channelMix[channel.id] ?? 0)}</span>
                        </span>
                        <input
                          type="range"
                          min={5}
                          max={80}
                          step={5}
                          value={Math.round((recommendation.channelMix[channel.id] ?? 0) * 100)}
                          onChange={(event) => handleChannelAdjust(micro.id, channel.id, Number(event.target.value) / 100)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-slate-600">Creative tone</p>
                  <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">
                    {recommendation.creativeTone.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                  <p className="font-semibold text-slate-600">Expected KPIs</p>
                  <ul className="mt-2 space-y-1">
                    <li>Payback {formatPayback(recommendation.expected.paybackMonths)}</li>
                    <li>12-mo GM {currencyFormatter.format(recommendation.expected.grossMargin12Mo)}</li>
                    <li>Net adds {recommendation.expected.netAdds.toLocaleString()}</li>
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </aside>

      <Transition.Root show={showGuard} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setShowGuard}>
          <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-slate-900/50" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-6">
            <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0 translate-y-3" enterTo="opacity-100 translate-y-0" leave="ease-in duration-100" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-3">
              <Dialog.Panel className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-semibold text-slate-900">Pick a segment first</Dialog.Title>
                <p className="mt-2 text-sm text-slate-600">Head back to Market Radar to set an active segment before shaping micro-segments.</p>
                <Link to="/market-radar" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
                  Go to Market Radar <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
};
