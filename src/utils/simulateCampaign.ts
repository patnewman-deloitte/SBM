import type { CampaignPlan, ChannelMix, ChannelKey, Objective } from '../store/offerStore';
import { calendarCoverage as computeCalendarCoverage, clamp } from './planMath';

type MetricContrib = {
  label: string;
  delta: number;
};

const basePrice = 82;
const basePromoDepth = 12;
const basePromoMonths = 3;
const baseSubsidy = 40;
const baseChannelMix: ChannelMix = {
  Search: 32,
  Social: 22,
  Email: 26,
  Retail: 20
};
const basePayback = 8.4;
const baseConversion = 3.1; // %
const baseMargin = 31; // %

const paybackScale = 1.6;
const conversionScale = 1.4;
const marginScale = 6;

const mixDelta = (mix: ChannelMix, key: ChannelKey) => (mix[key] - baseChannelMix[key]) / 100;

const formatDriver = (label: string, delta: number): MetricContrib => ({ label, delta: Number(delta.toFixed(2)) });

const deriveCoverageSignal = (calendar: number[][], mix: ChannelMix) => {
  const calendarCoverage = computeCalendarCoverage(calendar);
  const mixSpread = Object.values(mix).reduce((acc, value) => acc + (value > 0 ? 1 : 0), 0) / 4;
  return clamp(calendarCoverage * 0.7 + mixSpread * 0.3, 0, 1);
};

export const computeConfidence = (coverage: number, r2: number) => {
  const boundedCoverage = clamp(coverage, 0, 1);
  const boundedR2 = clamp(r2, 0, 1);
  return Number((boundedCoverage * 0.6 + boundedR2 * 0.4).toFixed(3));
};

export const simulateCampaign = (plan: CampaignPlan, objective: Objective): CampaignPlan => {
  const drivers: MetricContrib[] = [];
  const next: CampaignPlan = {
    ...plan,
    channelMix: { ...plan.channelMix },
    calendar: plan.calendar.map((row) => [...row]),
    kpis: { ...plan.kpis },
    drivers: []
  };

  const priceDelta = (plan.price - basePrice) / basePrice;
  const promoDepthDelta = (plan.promoDepthPct - basePromoDepth) / 100;
  const promoMonthsDelta = plan.promoMonths - basePromoMonths;
  const subsidyDelta = (plan.deviceSubsidy - baseSubsidy) / baseSubsidy;

  let payback = basePayback;
  let conversion = baseConversion;
  let margin = baseMargin;

  // Price effects
  const priceMarginLift = priceDelta * 14;
  const priceConversionDrag = priceDelta * 2.4;
  margin += priceMarginLift;
  conversion -= priceConversionDrag;
  payback += priceDelta * 3.2;
  drivers.push(formatDriver('Pricing', priceDelta * 2.1));

  // Promo depth and months
  const promoPaybackLift = clamp(promoDepthDelta * -6 + promoMonthsDelta * -0.35, -3.4, 2);
  const promoMarginDrag = promoDepthDelta * 18 + promoMonthsDelta * 0.9;
  payback += promoPaybackLift;
  margin -= promoMarginDrag;
  conversion += promoDepthDelta * 5.2;
  drivers.push(formatDriver('Promo depth', promoPaybackLift));

  // Device subsidy
  const subsidyMarginDrag = subsidyDelta * 9;
  const subsidyConversionLift = subsidyDelta * -2.8;
  margin -= subsidyMarginDrag;
  conversion += subsidyConversionLift;
  payback += subsidyDelta * 1.2;
  drivers.push(formatDriver('Device subsidy', subsidyDelta * 1.1));

  // Channel effects
  const searchGain = mixDelta(plan.channelMix, 'Search') * -6.5;
  const emailGain = mixDelta(plan.channelMix, 'Email') * -4.1;
  const socialConversion = mixDelta(plan.channelMix, 'Social') * 3.2;
  const retailConversion = mixDelta(plan.channelMix, 'Retail') * 4.6;
  const retailMarginDrag = mixDelta(plan.channelMix, 'Retail') * 5.4;

  payback += searchGain + emailGain;
  conversion += socialConversion + retailConversion;
  margin -= retailMarginDrag;
  drivers.push(formatDriver('Channel mix', searchGain + emailGain));

  const calendarCoverageValue = computeCalendarCoverage(plan.calendar);
  const coverageSignal = deriveCoverageSignal(plan.calendar, plan.channelMix);
  const calendarLift = clamp(calendarCoverageValue * -1.8, -2.4, 0);
  payback += calendarLift;
  conversion += calendarCoverageValue * 3.6;
  drivers.push(formatDriver('Calendar coverage', calendarLift));

  if (plan.inventoryHold) {
    conversion -= 0.4;
    payback += 0.6;
    drivers.push(formatDriver('Inventory hold', 0.6));
  }

  const budgetHeadroom = objective.budget - (plan.price * plan.promoMonths * 4200) / 12;
  if (budgetHeadroom < 0) {
    const paybackPenalty = clamp(Math.abs(budgetHeadroom) / 50000, 0, 1.8);
    payback += paybackPenalty;
    margin -= clamp(Math.abs(budgetHeadroom) / 80000, 0, 4);
    drivers.push(formatDriver('Budget pressure', paybackPenalty));
  }

  const coverage = coverageSignal;
  const r2 = clamp(0.62 + coverage * 0.25 - Math.abs(priceDelta) * 0.08, 0.4, 0.93);
  const confidence = computeConfidence(coverage, r2);

  const paybackRangeDelta = (1 - confidence) * paybackScale;
  const conversionRangeDelta = (1 - confidence) * conversionScale;
  const marginRangeDelta = (1 - confidence) * marginScale;

  next.kpis = {
    paybackMo: Number(payback.toFixed(2)),
    paybackRange: [Number((payback - paybackRangeDelta).toFixed(2)), Number((payback + paybackRangeDelta).toFixed(2))],
    conversionPct: Number(conversion.toFixed(2)),
    conversionRange: [
      Number((conversion - conversionRangeDelta).toFixed(2)),
      Number((conversion + conversionRangeDelta).toFixed(2))
    ],
    marginPct: Number(margin.toFixed(2)),
    marginRange: [Number((margin - marginRangeDelta).toFixed(2)), Number((margin + marginRangeDelta).toFixed(2))]
  };
  next.confidence = confidence;

  const rankedDrivers = drivers
    .reduce<MetricContrib[]>((acc, item) => {
      const existing = acc.find((d) => d.label === item.label);
      if (existing) {
        existing.delta = Number((existing.delta + item.delta).toFixed(2));
        return acc;
      }
      acc.push({ ...item });
      return acc;
    }, [])
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  next.drivers = rankedDrivers;

  const baseHeadline = objective.goal === 'Growth-first' ? 'Scale acquisition with efficient spend' : 'Protect unit economics while growing';
  const heroHint = objective.goal === 'Margin-first' ? 'Lean into high-margin digital bundles' : 'Balance mix across search and lifecycle CRM';

  next.creativeBrief = {
    headline: baseHeadline,
    subtext: `Recommend ${plan.promoDepthPct}% promo for ${plan.promoMonths} months with ${Math.round(plan.channelMix.Search)}% search mix.`,
    heroHint
  };

  return next;
};
