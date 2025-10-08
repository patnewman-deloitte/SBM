import React from 'react';
import { useNavigate } from 'react-router-dom';
import InfoPopover from '../../components/InfoPopover';
import RightRail from '../../components/RightRail';
import SelectionTray from '../../components/SelectionTray';
import SubsegmentTile from '../../components/SubsegmentTile';
import { simulateAudience } from '../../sim/tinySim';
import { useGlobalStore } from '../../store/global';
import type { MicroSegment, Segment } from '../../store/global';
import type { SimResult } from '../../sim/tinySim';

const isDefined = <T,>(value: T | null | undefined): value is T => value != null;
function hasSegment<T extends { segment?: Segment | null }>(value: T): value is T & { segment: Segment } {
  // Guard against micro-segments that have not been hydrated with a parent cohort.
  return !!value.segment && typeof value.segment.size === 'number';
}

const defaultMix = {
  'ch-search': 0.32,
  'ch-social': 0.24,
  'ch-email': 0.16,
  'ch-retail': 0.18,
  'ch-field': 0.1
};

type SubsegmentEntry = {
  micro: MicroSegment & { sizeShare: number };
  segment?: Segment | null;
  sim: SimResult;
  rank: number;
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

  const sourceCohorts = React.useMemo<Segment[]>(
    () => cartSegmentIds.map((id) => segments.find((s) => s.id === id)).filter(isDefined),
    [cartSegmentIds, segments]
  );

  const subsegments = React.useMemo<SubsegmentEntry[]>(() => {
    return sourceCohorts.flatMap((segment) => {
      const micros = microSegmentsByParent[segment.id] ?? [];
      const total = micros.reduce((sum, micro) => sum + micro.sizeShare, 0) || 1;
      return micros.map((micro, index) => {
        const normalized = { ...micro, sizeShare: micro.sizeShare / total };
        const sim = simulateAudience({
          micro: normalized,
          segmentSize: segment.size,
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

  const sortedSubsegments = React.useMemo(
    () => [...subsegments].sort((a, b) => b.micro.attractiveness - a.micro.attractiveness),
    [subsegments]
  );
  const rankedWithSegments = React.useMemo(
    () => sortedSubsegments.filter(hasSegment),
    [sortedSubsegments]
  );
  const topThreeIds = React.useMemo(
    () => rankedWithSegments.slice(0, 3).map((s) => s.micro.id),
    [rankedWithSegments]
  );
  const recommended = rankedWithSegments[0];
  const nextBest = rankedWithSegments[1];
  const gmCandidate = recommended?.sim.gm12m;
  const recommendedGmValue = typeof gmCandidate === 'number' && Number.isFinite(gmCandidate) ? gmCandidate : 0;
  const paybackCandidate = recommended?.sim.paybackMonths;
  const recommendedPaybackValue =
    typeof paybackCandidate === 'number'
      ? paybackCandidate
      : typeof paybackCandidate === 'string'
        ? paybackCandidate
        : '–';

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
    const selected = selectedMicroIds
      .map((id) => subsegments.find((sub) => sub.micro.id === id))
      .filter(isDefined)
      .filter(hasSegment);
    if (!selected.length) {
      return [
        { label: 'Combined size', value: '0%' },
        { label: 'Blended payback', value: '–' },
        { label: '12-mo GM', value: '–' }
      ];
    }
    const totals = selected.reduce(
      (acc, item) => {
        const segSize = item.segment.size;
        const gm12 = Number.isFinite(item.sim.gm12m) ? item.sim.gm12m : 0;
        const rawPayback =
          typeof item.sim.paybackMonths === 'number' ? item.sim.paybackMonths : Number(item.sim.paybackMonths);
        const payback = Number.isFinite(rawPayback) ? rawPayback : 24;
        acc.totalShare += item.micro.sizeShare * segSize;
        acc.totalGm += gm12 * segSize;
        acc.totalPayback += payback * segSize;
        acc.denominator += segSize;
        return acc;
      },
      { totalShare: 0, totalGm: 0, totalPayback: 0, denominator: 0 }
    );
    const combinedSize = totals.denominator ? ((totals.totalShare / totals.denominator) * 100).toFixed(1) : '0.0';
    const blendedPayback = totals.denominator ? Math.round(totals.totalPayback / totals.denominator) : null;
    const blendedGm = totals.denominator ? Math.round(totals.totalGm / totals.denominator) : null;
    return [
      { label: 'Combined size', value: `${combinedSize}%` },
      { label: 'Blended payback', value: blendedPayback !== null ? `${blendedPayback} mo` : '–' },
      { label: '12-mo GM', value: blendedGm !== null ? `$${blendedGm.toLocaleString()}` : '–' }
    ];
  }, [selectedMicroIds, subsegments]);

  return (
    <div className="space-y-6">
      <div className="card border border-emerald-500/20 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Segment Studio</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Break shortlisted cohorts into micro-segments, highlight the winning play, and choose which audiences move into campaign design.
            </p>
          </div>
          <InfoPopover
            title="Segment Studio overview"
            description="Review AI-suggested micro-segments, follow the recommended play, and select the audiences to take forward."
          />
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
          <div className="flex items-start gap-2">
            <InfoPopover title="See the breakouts" description="Each cohort is split into micro-segments ranked by attractiveness." />
            <span>Review the sub-segment tiles to understand size, economics, and traits.</span>
          </div>
          <div className="flex items-start gap-2">
            <InfoPopover title="Follow the play" description="Use the headline recommendation to move quickly." />
            <span>Start with the suggested action and use the bullets to justify the move.</span>
          </div>
          <div className="flex items-start gap-2">
            <InfoPopover title="Pick the audience" description="Select only the micro-segments you want to simulate later." />
            <span>Toggle selections and send the right mix to the Campaign Designer.</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[240px_1fr_320px] gap-6">
        <aside className="flex flex-col gap-4">
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-emerald-400">Workflow reminder</p>
              <InfoPopover title="Workflow reminder" description="Trace selections from Market Radar into this studio view." />
            </div>
            <p className="mt-2 text-sm text-slate-300">
              This view breaks your selected cohort(s) into sub-segments and recommends how to target each. Pick the ones you want to take into the campaign.
            </p>
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Source cohorts</h3>
              <InfoPopover title="Source cohorts" description="Shows which cohorts feed these micro-segments." />
            </div>
            <div className="mt-2 space-y-2">
              {sourceCohorts.map((segment) => (
                <div key={segment.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{segment.name}</p>
                    <InfoPopover title="Cohort details" description="Size and trait summary for this cohort." placement="left" />
                  </div>
                  <p>{segment.size.toLocaleString()} households</p>
                  <p>Primary traits: {segment.traits.slice(0, 2).join(', ')}</p>
                </div>
              ))}
              {!sourceCohorts.length ? <p className="text-xs text-slate-500">No cohorts yet—head back to Market Radar.</p> : null}
            </div>
          </div>
        </aside>
        <section className="flex min-w-0 flex-col gap-4">
          {recommended ? (
            <div className="card border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-300">Do this</p>
                  <h2 className="text-xl font-semibold text-white">
                    Lead with {offer.name} for {recommended.segment.name} — {recommended.micro.name}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm text-emerald-100">
                    Focus on a digital-first mix and lean on bundled value to win share quickly.
                  </p>
                </div>
                <InfoPopover title="Recommended play" description="Use this starter move and fine-tune as you learn more." />
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-emerald-100">
                <li>
                  Highest attractiveness index ({Math.round(recommended.micro.attractiveness * 100)}) versus {nextBest ? `${Math.round(nextBest.micro.attractiveness * 100)} for the runner-up, translating to ${(recommended.sim.conversionRate * 100).toFixed(1)}% conversion` : `${(recommended.sim.conversionRate * 100).toFixed(1)}% conversion`}.
                </li>
                <li>
                  Sized opportunity: ~{Math.round(recommended.micro.sizeShare * recommended.segment.size).toLocaleString()} reachable households with{' '}
                  {Math.round((defaultMix['ch-search'] + defaultMix['ch-social'] + defaultMix['ch-email']) * 100)}% digital coverage and projected net adds of {Math.round(recommended.sim.netAdds).toLocaleString()}.
                </li>
                <li>
                  Economics check: payback
                  {typeof recommended.sim.paybackMonths === 'number'
                    ? ` ${recommended.sim.paybackMonths} mo`
                    : ` ${recommended.sim.paybackMonths}`}
                  , {recommended.sim.marginPct}% margin, and {recommended.sim.breakdown.promoCost ? `$${recommended.sim.breakdown.promoCost.toLocaleString()}` : '$0'} promo spend delivering
                  {recommendedGmValue ? ` $${recommendedGmValue.toLocaleString()}` : ' $0'} gross margin.
                </li>
              </ul>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Micro-segment recommendations</h3>
            <InfoPopover title="Micro-segment grid" description="Select the audiences that deserve investment." />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sortedSubsegments.map((entry) => {
              const segmentName = hasSegment(entry) ? entry.segment.name : 'Unassigned segment';
              const label = `${segmentName} — ${entry.micro.name}`;
              const gm12Value = Number.isFinite(entry.sim.gm12m) ? entry.sim.gm12m : 0;
              return (
                <SubsegmentTile
                  key={entry.micro.id}
                  name={label}
                  rank={entry.rank}
                  sizeShare={entry.micro.sizeShare}
                  payback={entry.sim.paybackMonths}
                  gm12={gm12Value}
                  traits={entry.micro.traits}
                  rationale={`Attractiveness ${(entry.micro.attractiveness * 100).toFixed(0)} • Conversion ${(entry.sim.conversionRate * 100).toFixed(1)}%`}
                  selected={selectedMicroIds.includes(entry.micro.id)}
                  highlight={topThreeIds.includes(entry.micro.id)}
                  onSelect={(checked) => toggleSelection(entry.micro.id, checked)}
                />
              );
            })}
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
                info: {
                  title: 'Recommended play',
                  description: 'Understand the core action suggested for this audience.'
                },
                body: (
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-white">Goal</p>
                    <p className="break-words">
                      Drive high-value conversions among {recommended.segment.name} using {offer.name}, targeting {(recommended.sim.conversionRate * 100).toFixed(1)}% conversion and{' '}
                      {Math.round(recommended.sim.netAdds).toLocaleString()} net adds within guardrails.
                    </p>
                    <p className="font-semibold text-white">Offer archetype</p>
                    <p className="break-words">
                      {offer.name} — ${offer.monthlyPrice}/mo, promo {offer.promoMonths} mo, device subsidy ${offer.deviceSubsidy}. Recommended mix keeps CAC at ${recommended.sim.breakdown.cac.toLocaleString()} with {recommended.sim.marginPct}% margin.
                    </p>
                  </div>
                )
              },
              {
                id: 'channels',
                title: 'Channel mix',
                info: {
                  title: 'Channel mix',
                  description: 'Default channel allocation to start your campaign design.'
                },
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
                info: {
                  title: 'Why this works',
                  description: 'Bulletproof your case with the key qualitative reasons.'
                },
                body: (
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    <li>
                      Digital responsiveness index {Math.round(recommended.micro.attractiveness * 100)} enables {Math.round((defaultMix['ch-search'] + defaultMix['ch-social'] + defaultMix['ch-email']) * 100)}% reach through efficient channels.
                    </li>
                    <li>
                      Offer bundling aligns with traits {recommended.micro.traits.slice(0, 3).join(', ')} and defends versus {recommended.segment.traits.slice(0, 1).join(', ') || 'competitors'}.
                    </li>
                    <li>
                      Financial guardrails hold: payback
                      {typeof recommended.sim.paybackMonths === 'number'
                        ? ` ${recommended.sim.paybackMonths} mo`
                        : ` ${recommended.sim.paybackMonths}`}
                      , 12-mo GM {recommendedGmValue ? `$${recommendedGmValue.toLocaleString()}` : '$0'}, margin {recommended.sim.marginPct}%.
                    </li>
                  </ul>
                )
              }
            ]}
            kpis={[
              {
                label: 'Payback (mo)',
                value: recommendedPaybackValue,
                info: {
                  title: 'CAC Payback (months)',
                  description: 'Months until fully-loaded CAC is covered by cumulative contribution.'
                }
              },
              {
                label: '12-mo GM',
                value: `$${recommendedGmValue.toLocaleString()}`,
                info: {
                  title: '12-Month Incremental Gross Margin',
                  description: 'Gross margin over the first 12 months after servicing costs and device amortization.'
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
                Move to Campaign Designer
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
            title="Micro-segments selected"
            items={selectedMicroIds.map((id) => {
              const entry = subsegments.find((sub) => sub.micro.id === id);
              return {
                id,
                label: entry && hasSegment(entry) ? `${entry.segment.name} — ${entry.micro.name}` : entry ? entry.micro.name : id,
                subtitle: entry ? `${(entry.micro.sizeShare * 100).toFixed(1)}% of cohort` : ''
              };
            })}
            metrics={trayMetrics}
            ctaLabel="Move to Campaign Designer"
            onCta={() => navigate('/campaign-designer')}
            disabled={!selectedMicroIds.length}
          />
        </div>
      </div>
    </div>
  );
};

export default SegmentStudio;
