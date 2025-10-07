import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { InfoPopover } from '../../components/InfoPopover';
import { channels } from '../../data/seeds';
import { currencyFormatter, formatPayback } from '../../lib/format';
import { buildRecommendation, generateMicroSegments, normaliseMix } from '../../lib/microSegments';
import { parseIntent, describeIntent } from '../../lib/intentParser';
import { getOfferById, runCohort } from '../../sim/tinySim';
import { useActiveSegment, useGlobalStore } from '../../store/globalStore';

interface PlanMicroSummary {
  micro: ReturnType<typeof generateMicroSegments>[number];
  summary: ReturnType<typeof runCohort>;
  offerConfig: {
    offerId: string;
    price: number;
    promoMonths: number;
    promoValue: number;
    deviceSubsidy: number;
  };
  channelMix: Record<string, number>;
}

export const CampaignDesignerRoute = () => {
  const activeSegment = useActiveSegment();
  const selectedMicroIds = useGlobalStore((state) => state.selectedMicroSegmentIds);
  const recommendations = useGlobalStore((state) => state.recommendationsByMicroSegment);
  const campaign = useGlobalStore((state) => state.campaign);
  const setCampaign = useGlobalStore((state) => state.setCampaign);
  const setInfoPanel = useGlobalStore((state) => state.setInfoPanel);
  const setSelectedMicroSegments = useGlobalStore((state) => state.setSelectedMicroSegments);

  const micros = useMemo(() => generateMicroSegments(activeSegment), [activeSegment]);

  useEffect(() => {
    if (!selectedMicroIds.length) {
      return;
    }
    setCampaign((prev) => {
      let changed = false;
      const offers: typeof prev.offers = { ...prev.offers };
      const channelMix: typeof prev.channelMix = { ...prev.channelMix };
      let budget = prev.budget;
      let totalPotential = 0;
      selectedMicroIds.forEach((microId) => {
        const micro = micros.find((item) => item.id === microId);
        if (!micro) return;
        const recommendation = recommendations[microId] ?? buildRecommendation(micro);
        const offer = getOfferById(recommendation.offerArchetypeId);
        offers[microId] = {
          offerId: recommendation.offerArchetypeId,
          price: offer.monthlyPrice,
          promoMonths: offer.promoMonths,
          promoValue: offer.promoValue,
          deviceSubsidy: offer.deviceSubsidy
        };
        channelMix[microId] = normaliseMix(recommendation.channelMix);
        totalPotential += recommendation.expected.netAdds;
      });
      if (selectedMicroIds.some((id) => !prev.audienceIds.includes(id)) || prev.audienceIds.length !== selectedMicroIds.length) {
        changed = true;
      }
      const cleanedOffers = Object.fromEntries(Object.entries(offers).filter(([id]) => selectedMicroIds.includes(id)));
      const cleanedMix = Object.fromEntries(Object.entries(channelMix).filter(([id]) => selectedMicroIds.includes(id)));
      if (Object.keys(cleanedOffers).length !== Object.keys(prev.offers).length) changed = true;
      if (Object.keys(cleanedMix).length !== Object.keys(prev.channelMix).length) changed = true;
      const recommendedBudget = Math.round(totalPotential * 45);
      if (recommendedBudget && Math.abs(recommendedBudget - prev.budget) > 1000) {
        budget = recommendedBudget;
        changed = true;
      }
      if (!changed) {
        return prev;
      }
      return {
        ...prev,
        audienceIds: selectedMicroIds,
        offers: cleanedOffers,
        channelMix: cleanedMix,
        budget,
        schedule: prev.schedule ?? { weeks: 12, waves: 2 },
        guardrails: prev.guardrails ?? { cacCeiling: 350, paybackMax: 8 }
      };
    });
  }, [micros, recommendations, selectedMicroIds, setCampaign]);

  const planMicros = useMemo(
    () => micros.filter((micro) => campaign.audienceIds.includes(micro.id)),
    [micros, campaign.audienceIds]
  );

  const planSummaries: PlanMicroSummary[] = planMicros.map((micro) => {
    const config = campaign.offers[micro.id];
    const baseOffer = getOfferById(config?.offerId ?? micro.defaultOfferId);
    const offer = {
      ...baseOffer,
      monthlyPrice: config?.price ?? baseOffer.monthlyPrice,
      promoMonths: config?.promoMonths ?? baseOffer.promoMonths,
      promoValue: config?.promoValue ?? baseOffer.promoValue,
      deviceSubsidy: config?.deviceSubsidy ?? baseOffer.deviceSubsidy
    };
    const mix = campaign.channelMix[micro.id] ?? normaliseMix(micro.defaultChannelMix);
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
    return {
      micro,
      summary,
      offerConfig: {
        offerId: offer.id,
        price: offer.monthlyPrice,
        promoMonths: offer.promoMonths,
        promoValue: offer.promoValue,
        deviceSubsidy: offer.deviceSubsidy
      },
      channelMix: mix
    };
  });

  const totals = planSummaries.reduce(
    (acc, entry) => {
      acc.netAdds += entry.summary.netAdds;
      acc.grossMargin += entry.summary.grossMargin12Mo;
      const payback = parseInt(entry.summary.paybackMonths, 10);
      if (!Number.isNaN(payback)) acc.paybackMonths.push(payback);
      acc.cac += entry.summary.cac;
      return acc;
    },
    { netAdds: 0, grossMargin: 0, paybackMonths: [] as number[], cac: 0 }
  );
  const blendedPayback = totals.paybackMonths.length
    ? `${Math.round(totals.paybackMonths.reduce((sum, value) => sum + value, 0) / totals.paybackMonths.length)} mo`
    : '—';

  const channelSpendData = useMemo(() => {
    if (!planSummaries.length) return [];
    const weeks = campaign.schedule?.weeks ?? 12;
    const total = campaign.budget || 0;
    const waves = campaign.schedule?.waves ?? 2;
    const waveLength = Math.round(weeks / waves);
    return Array.from({ length: weeks }).map((_, index) => {
      const waveFactor = 1 + (index % waveLength === 0 ? 0.15 : 0);
      const spendBase = (total / weeks) * waveFactor;
      const entry: Record<string, number | string> = { week: `W${index + 1}` };
      channels.forEach((channel) => {
        const mixAvg = planSummaries.reduce((sum, summary) => sum + (summary.channelMix[channel.id] ?? 0), 0) / planSummaries.length;
        entry[channel.name] = Math.round(spendBase * mixAvg);
      });
      return entry;
    });
  }, [planSummaries, campaign.budget, campaign.schedule]);

  const [command, setCommand] = useState('');
  const [changeLog, setChangeLog] = useState<string[]>([]);

  const applyIntent = (input: string) => {
    if (!input.trim()) return;
    const intent = parseIntent(input, {
      microSegments: planMicros
    });
    setCampaign((prev) => {
      let next = { ...prev, offers: { ...prev.offers }, channelMix: { ...prev.channelMix }, audienceIds: [...prev.audienceIds] };
      if (intent.channelShifts.length) {
        for (const shift of intent.channelShifts) {
          next.channelMix = Object.fromEntries(
            Object.entries(next.channelMix).map(([microId, mix]) => {
              const current = { ...mix };
              const fromWeight = shift.from ? current[shift.from] ?? 0 : 0;
              const toWeight = shift.to ? current[shift.to] ?? 0 : 0;
              if (shift.from) current[shift.from] = Math.max(0, fromWeight - shift.delta);
              if (shift.to) current[shift.to] = Math.min(1, toWeight + shift.delta);
              return [microId, normaliseMix(current)];
            })
          );
        }
      }
      if (intent.channelAdjusts.length) {
        next.channelMix = Object.fromEntries(
          Object.entries(next.channelMix).map(([microId, mix]) => {
            const current = { ...mix };
            intent.channelAdjusts.forEach((adjust) => {
              if (adjust.channelId in current) {
                current[adjust.channelId] = Math.max(0.05, current[adjust.channelId] + adjust.delta);
              }
            });
            return [microId, normaliseMix(current)];
          })
        );
      }
      if (intent.offerAdjustments.priceDelta || intent.offerAdjustments.promoMonthsDelta || intent.offerAdjustments.promoValueDelta || intent.offerAdjustments.deviceSubsidyDelta) {
        next.offers = Object.fromEntries(
          Object.entries(next.offers).map(([microId, offer]) => [
            microId,
            {
              ...offer,
              price: Math.max(35, offer.price + (intent.offerAdjustments.priceDelta ?? 0)),
              promoMonths: Math.max(0, offer.promoMonths + (intent.offerAdjustments.promoMonthsDelta ?? 0)),
              promoValue: Math.max(0, offer.promoValue + (intent.offerAdjustments.promoValueDelta ?? 0)),
              deviceSubsidy: Math.max(0, offer.deviceSubsidy + (intent.offerAdjustments.deviceSubsidyDelta ?? 0))
            }
          ])
        );
      }
      if (intent.audienceChange) {
        let updatedAudience = next.audienceIds;
        if (intent.audienceChange.include) {
          updatedAudience = Array.from(new Set([...updatedAudience, ...intent.audienceChange.include]));
          setSelectedMicroSegments(Array.from(new Set([...selectedMicroIds, ...intent.audienceChange.include])));
        }
        if (intent.audienceChange.exclude) {
          updatedAudience = updatedAudience.filter((id) => !intent.audienceChange.exclude?.includes(id));
          setSelectedMicroSegments(selectedMicroIds.filter((id) => !intent.audienceChange.exclude?.includes(id)));
        }
        next.audienceIds = updatedAudience;
      }
      if (intent.budgetDelta) {
        next.budget = Math.max(0, next.budget + intent.budgetDelta);
      }
      if (intent.paybackTarget) {
        next.guardrails = { ...next.guardrails, paybackMax: intent.paybackTarget };
      }
      return next;
    });
    setChangeLog((log) => [`${new Date().toLocaleTimeString()} — ${describeIntent(intent)}`, ...log.slice(0, 6)]);
    setCommand('');
  };

  const handleOfferFieldChange = (microId: string, field: 'price' | 'promoMonths' | 'promoValue' | 'deviceSubsidy', value: number) => {
    setCampaign((prev) => ({
      ...prev,
      offers: {
        ...prev.offers,
        [microId]: {
          ...prev.offers[microId],
          [field]: value
        }
      }
    }));
  };

  const handleChannelFieldChange = (microId: string, channelId: string, value: number) => {
    setCampaign((prev) => ({
      ...prev,
      channelMix: {
        ...prev.channelMix,
        [microId]: normaliseMix({ ...(prev.channelMix[microId] ?? {}), [channelId]: value })
      }
    }));
  };

  if (!selectedMicroIds.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">No micro-segments selected</h2>
        <p className="mt-2 text-sm text-slate-600">Head back to Segment Studio to choose who this campaign should target.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Audience</h2>
            <p className="text-sm text-slate-600">{planMicros.length} micro-segments in scope. Hover for traits.</p>
          </div>
          <InfoPopover title="Audience" plainDescription="The micro-segments included in this campaign flight." primarySourceHint="Synth clustering" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {planMicros.map((micro) => (
            <button
              key={micro.id}
              className="group rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 hover:border-primary hover:text-primary"
              onMouseEnter={() =>
                setInfoPanel({
                  title: micro.name,
                  description: micro.traits.join(' • '),
                  hint: 'Synth persona blend'
                })
              }
            >
              {micro.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Offers</h2>
            <p className="text-sm text-slate-600">Light tweaks per micro-segment update TinySim instantly.</p>
          </div>
          <InfoPopover
            title="Offer controls"
            plainDescription="Edit monthly price, promo depth, or device subsidy for each micro-segment offer."
            primarySourceHint="Synth plan archetypes"
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {planSummaries.map(({ micro, offerConfig }) => (
            <div key={micro.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
              <h3 className="font-semibold text-slate-900">{micro.name}</h3>
              <div className="mt-3 space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">Monthly price</span>
                  <input
                    type="number"
                    value={offerConfig.price}
                    onChange={(event) => handleOfferFieldChange(micro.id, 'price', Number(event.target.value))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">Promo months</span>
                  <input
                    type="number"
                    value={offerConfig.promoMonths}
                    onChange={(event) => handleOfferFieldChange(micro.id, 'promoMonths', Number(event.target.value))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">Promo value</span>
                  <input
                    type="number"
                    value={offerConfig.promoValue}
                    onChange={(event) => handleOfferFieldChange(micro.id, 'promoValue', Number(event.target.value))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">Device subsidy</span>
                  <input
                    type="number"
                    value={offerConfig.deviceSubsidy}
                    onChange={(event) => handleOfferFieldChange(micro.id, 'deviceSubsidy', Number(event.target.value))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Channel plan</h2>
            <p className="text-sm text-slate-600">Budget ${currencyFormatter.format(campaign.budget)} across {campaign.schedule?.weeks ?? 12} weeks.</p>
          </div>
          <InfoPopover
            title="Channel plan"
            plainDescription="Weekly spend allocation simulated from current weights and budget."
            primarySourceHint="Synth CAC curves"
          />
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="h-72 rounded-2xl bg-slate-50 p-4">
            <ResponsiveContainer>
              <BarChart data={channelSpendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(value) => `$${value}`}></YAxis>
                <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                <Legend />
                {channels.map((channel) => (
                  <Bar key={channel.id} dataKey={channel.name} stackId="a" fill="#1f7aec" fillOpacity={0.35 + channels.indexOf(channel) * 0.15} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <h3 className="font-semibold text-slate-900">Channel weights</h3>
            <ul className="mt-3 space-y-2">
              {planSummaries.map(({ micro, channelMix }) => (
                <li key={micro.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">{micro.name}</p>
                  <div className="mt-2 space-y-2 text-xs">
                    {channels.map((channel) => (
                      <label key={channel.id} className="flex items-center justify-between gap-2">
                        <span>{channel.name}</span>
                        <input
                          type="range"
                          min={5}
                          max={80}
                          step={5}
                          value={Math.round((channelMix[channel.id] ?? 0) * 100)}
                          onChange={(event) => handleChannelFieldChange(micro.id, channel.id, Number(event.target.value) / 100)}
                        />
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Expected outcomes</h2>
            <p className="text-sm text-slate-600">TinySim recalculates whenever you adjust offers or mix.</p>
          </div>
          <InfoPopover
            title="Outcome KPIs"
            plainDescription="Shows CAC payback, 12-mo gross margin, and net adds based on TinySim calculations."
            primarySourceHint="Synth Cohort Econ."
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Blended payback</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{blendedPayback}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">12-mo gross margin</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{currencyFormatter.format(totals.grossMargin)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Net adds</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{totals.netAdds.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>Guardrails: CAC ceiling {currencyFormatter.format(campaign.guardrails?.cacCeiling ?? 0)}, payback ≤ {campaign.guardrails?.paybackMax ?? '—'} months.</p>
        </div>
      </section>

      <section className="sticky bottom-6 rounded-3xl border border-primary/40 bg-white p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Command bar</h3>
            <InfoPopover
              title="LLM-like command"
              plainDescription="Type adjustments in natural language to fine-tune offers, channels, or budget."
              primarySourceHint="Synth intent parser"
            />
          </div>
          <form
            className="flex w-full flex-1 items-center gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              applyIntent(command);
            }}
          >
            <input
              type="text"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Make payback ≤ 6 months by shifting 10% budget from Retail to Search..."
              className="flex-1 rounded-full border border-slate-300 px-4 py-2"
            />
            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">
              Apply
            </button>
          </form>
        </div>
        <div className="mt-3 space-y-1 text-xs text-slate-500">
          {changeLog.map((item, index) => (
            <p key={index}>{item}</p>
          ))}
        </div>
      </section>
    </div>
  );
};
