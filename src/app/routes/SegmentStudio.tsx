import React from 'react';
import { useNavigate } from 'react-router-dom';
import RightRail from '../../components/RightRail';
import SelectionTray from '../../components/SelectionTray';
import SubsegmentTile from '../../components/SubsegmentTile';
import { simulateAudience } from '../../sim/tinySim';
import { useGlobalStore } from '../../store/global';

const defaultMix = {
  'ch-search': 0.32,
  'ch-social': 0.24,
  'ch-email': 0.16,
  'ch-retail': 0.18,
  'ch-field': 0.1
};

const SegmentStudio: React.FC = () => {
  const navigate = useNavigate();
  const cartSegmentIds = useGlobalStore((s) => s.cartSegmentIds);
  const segments = useGlobalStore((s) => s.segments);
  const microSegmentsByParent = useGlobalStore((s) => s.microSegmentsByParent);
  const assumptions = useGlobalStore((s) => s.assumptions);
  const offers = useGlobalStore((s) => s.offers);
  const channels = useGlobalStore((s) => s.channels);
  const selectedMicroIds = useGlobalStore((s) => s.selectedMicroIds);
  const setSelectedMicro = useGlobalStore((s) => s.setSelectedMicro);

  const offer = offers[1] ?? offers[0];

  const sourceCohorts = cartSegmentIds.map((id) => segments.find((s) => s.id === id)).filter(Boolean);

  const subsegments = React.useMemo(() => {
    return sourceCohorts.flatMap((segment) => {
      const micros = microSegmentsByParent[segment!.id] ?? [];
      const total = micros.reduce((sum, micro) => sum + micro.sizeShare, 0) || 1;
      return micros.map((micro, index) => {
        const normalized = { ...micro, sizeShare: micro.sizeShare / total };
        const sim = simulateAudience({
          micro: normalized,
          segmentSize: segment!.size,
          offer,
          channelMix: defaultMix,
          assumptions,
          channels
        });
        return {
          micro: normalized,
          segment,
          sim,
          rank: index + 1
        };
      });
    });
  }, [assumptions, channels, microSegmentsByParent, offer, sourceCohorts]);

  const sortedSubsegments = [...subsegments].sort((a, b) => b.micro.attractiveness - a.micro.attractiveness);
  const topThreeIds = sortedSubsegments.slice(0, 3).map((s) => s.micro.id);

  const toggleSelection = (microId: string, checked: boolean) => {
    const current = new Set(selectedMicroIds);
    if (checked) {
      current.add(microId);
    } else {
      current.delete(microId);
    }
    setSelectedMicro(Array.from(current));
  };

  const trayMetrics = React.useMemo(() => {
    if (!selectedMicroIds.length) {
      return [
        { label: 'Combined size', value: '0%' },
        { label: 'Blended payback', value: '–' },
        { label: '12-mo GM', value: '–' }
      ];
    }
    let totalShare = 0;
    let totalPayback = 0;
    let totalGm = 0;
    selectedMicroIds.forEach((id) => {
      const item = subsegments.find((sub) => sub.micro.id === id);
      if (!item) return;
      totalShare += item.micro.sizeShare * item.segment.size;
      totalGm += item.sim.gm12m * item.segment.size;
      totalPayback += (typeof item.sim.paybackMonths === 'number' ? item.sim.paybackMonths : 24) * item.segment.size;
    });
    const denominator = selectedMicroIds.reduce((sum, id) => {
      const item = subsegments.find((sub) => sub.micro.id === id);
      if (!item) return sum;
      return sum + item.segment.size;
    }, 0);
    return [
      { label: 'Combined size', value: `${((totalShare / Math.max(1, denominator)) * 100).toFixed(1)}%` },
      { label: 'Blended payback', value: denominator ? `${Math.round(totalPayback / denominator)} mo` : '–' },
      { label: '12-mo GM', value: denominator ? `$${Math.round(totalGm / denominator).toLocaleString()}` : '–' }
    ];
  }, [selectedMicroIds, subsegments]);

  const recommended = sortedSubsegments[0];

  return (
    <div className="grid grid-cols-[240px_1fr_320px] gap-6">
      <aside className="flex flex-col gap-4">
        <div className="card border border-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-400">How to use</p>
          <p className="mt-2 text-sm text-slate-300">
            This view breaks your selected cohort(s) into sub-segments and recommends how to target each. Pick the ones you want to take into the campaign.
          </p>
        </div>
        <div className="card border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-white">Source cohorts</h3>
          <div className="mt-2 space-y-2">
            {sourceCohorts.map((segment) => (
              <div key={segment!.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                <p className="text-sm font-semibold text-white">{segment!.name}</p>
                <p>{segment!.size.toLocaleString()} households</p>
                <p>Primary traits: {segment!.traits.slice(0, 2).join(', ')}</p>
              </div>
            ))}
            {!sourceCohorts.length ? <p className="text-xs text-slate-500">No cohorts yet—head back to Market Radar.</p> : null}
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-emerald-400">Primary data sources (est.): Synth Cohort Econ / Segment Fabric</p>
        </div>
      </aside>
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedSubsegments.map((entry) => (
            <SubsegmentTile
              key={entry.micro.id}
              name={`${entry.segment.name} — ${entry.micro.name}`}
              rank={entry.rank}
              sizeShare={entry.micro.sizeShare}
              payback={entry.sim.paybackMonths}
              gm12={entry.sim.gm12m}
              traits={entry.micro.traits}
              rationale={`Attractiveness ${(entry.micro.attractiveness * 100).toFixed(0)} • Conversion ${(entry.sim.conversionRate * 100).toFixed(1)}%`}
              selected={selectedMicroIds.includes(entry.micro.id)}
              highlight={topThreeIds.includes(entry.micro.id)}
              onSelect={(checked) => toggleSelection(entry.micro.id, checked)}
            />
          ))}
        </div>
      </section>
      {recommended ? (
        <RightRail
          title="Targeting strategy"
          subtitle="AI-assisted recommendation"
          sections={[
            {
              id: 'strategy',
              title: 'Recommended play',
              defaultOpen: true,
              body: (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-white">Goal</p>
                  <p>Drive high-value conversions among {recommended.segment.name} using {offer.name} with a heavier digital mix.</p>
                  <p className="font-semibold text-white">Offer archetype</p>
                  <p>{offer.name} — ${offer.monthlyPrice}/mo, promo {offer.promoMonths} mo, device subsidy ${offer.deviceSubsidy}.</p>
                </div>
              )
            },
            {
              id: 'channels',
              title: 'Channel mix',
              body: (
                <ul className="space-y-1 text-sm">
                  {Object.entries(defaultMix).map(([channelId, weight]) => (
                    <li key={channelId}>
                      {channels.find((ch) => ch.id === channelId)?.name ?? channelId}: {(weight * 100).toFixed(0)}%
                    </li>
                  ))}
                </ul>
              )
            },
            {
              id: 'why',
              title: 'Why this works',
              body: (
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  <li>High digital responsiveness — {Math.round(recommended.micro.attractiveness * 100)} index.</li>
                  <li>Offer bundling aligns with traits: {recommended.micro.traits.slice(0, 2).join(', ')}.</li>
                  <li>Projected payback {typeof recommended.sim.paybackMonths === 'number' ? `${recommended.sim.paybackMonths} mo` : recommended.sim.paybackMonths}.</li>
                </ul>
              )
            }
          ]}
          kpis={[
            {
              label: 'Payback (mo)',
              value: typeof recommended.sim.paybackMonths === 'number' ? recommended.sim.paybackMonths : recommended.sim.paybackMonths,
              info: {
                title: 'CAC Payback (months)',
                description: 'Months until fully-loaded CAC is covered by cumulative contribution.',
                primarySource: 'Synth Cohort Econ'
              }
            },
            {
              label: '12-mo GM',
              value: `$${recommended.sim.gm12m.toLocaleString()}`,
              info: {
                title: '12-Month Incremental Gross Margin',
                description: 'Gross margin over first 12 months after servicing costs and device amortization.',
                primarySource: 'Synth Cohort Econ'
              }
            }
          ]}
          action={
            <button
              onClick={() => {
                if (!selectedMicroIds.includes(recommended.micro.id)) {
                  setSelectedMicro([...selectedMicroIds, recommended.micro.id]);
                }
                navigate('/campaign-designer');
              }}
              className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-600"
            >
              Add to selection tray
            </button>
          }
        />
      ) : (
        <div className="card border border-slate-800 p-4 text-sm text-slate-300">
          Select cohorts to view targeting guidance.
        </div>
      )}
      <div className="col-span-3">
        <SelectionTray
          title="Sub-segments selected"
          items={selectedMicroIds.map((id) => {
            const entry = subsegments.find((sub) => sub.micro.id === id);
            return {
              id,
              label: entry ? `${entry.segment.name} — ${entry.micro.name}` : id,
              subtitle: entry ? `${(entry.micro.sizeShare * 100).toFixed(1)}% of cohort` : ''
            };
          })}
          metrics={trayMetrics}
          ctaLabel="Send to Campaign Designer"
          onCta={() => navigate('/campaign-designer')}
          disabled={!selectedMicroIds.length}
        />
      </div>
    </div>
  );
};

export default SegmentStudio;
