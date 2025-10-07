import { assumptions as defaultAssumptions, channels, offerArchetypes, type Assumptions, type ChannelMix, type OfferArchetype, type Segment } from '../data/seeds';

export interface CohortLike {
  id: string;
  name: string;
  size: number;
  priceSensitivity: number;
  valueSensitivity: number;
  growthRate?: number;
}

export interface CohortInput {
  segment: CohortLike;
  offer: OfferArchetype;
  channelMix: ChannelMix;
  assumptions?: Assumptions;
  executionCostOverride?: number;
}

export interface CohortOutput {
  takeRate: number;
  reach: number;
  netAdds: number;
  arpu: number;
  grossMarginPerMonth: number;
  contributionPerMonth: number[];
  cac: number;
  cacPerSubscriber: number;
  paybackMonths: string;
  grossMargin12Mo: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

const normaliseMix = (mix: ChannelMix): ChannelMix => {
  const total = Object.values(mix).reduce((sum, weight) => sum + weight, 0);
  if (!total || total === 0) {
    return channels.reduce((acc, channel) => {
      acc[channel.id] = 1 / channels.length;
      return acc;
    }, {} as ChannelMix);
  }
  const normalised: ChannelMix = {};
  for (const [channelId, weight] of Object.entries(mix)) {
    if (channels.some((c) => c.id === channelId)) {
      normalised[channelId] = weight / total;
    }
  }
  for (const channel of channels) {
    if (!(channel.id in normalised)) {
      normalised[channel.id] = 0;
    }
  }
  return normalised;
};

export const getOfferById = (offerId: string) => offerArchetypes.find((offer) => offer.id === offerId)!;

export const buildChannelMixFromOffer = (offer: OfferArchetype) => normaliseMix(offer.channelMixDefaults);

export const takeRate = (segment: CohortLike, offer: OfferArchetype, channelMix: ChannelMix) => {
  const mix = normaliseMix(channelMix);
  const weightedEfficiency = Object.entries(mix).reduce((sum, [channelId, weight]) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return sum;
    return sum + weight * channel.convCurveParams.efficiency;
  }, 0);

  const reachPotential = Object.entries(mix).reduce((sum, [channelId, weight]) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return sum;
    return sum + weight * channel.convCurveParams.reach;
  }, 0);

  const baseline = 0.08 + (segment.growthRate ?? 0.05) * 0.6;
  const offerValueBoost = (offer.promoValue / 20) * 0.25 + (offer.bundleFlag ? 0.25 : 0.12) + (offer.deviceSubsidy / 200) * 0.08;
  const pricePressure = (offer.monthlyPrice / 100) * segment.priceSensitivity * 0.9;
  const valueAffinity = segment.valueSensitivity * 0.6;
  const efficiencyBoost = weightedEfficiency * 0.9;
  const reachBoost = reachPotential * 0.7;

  const logit = -1.6 + baseline + offerValueBoost + valueAffinity + efficiencyBoost + reachBoost - pricePressure;
  return clamp(logistic(logit), 0.01, 0.48);
};

export const reachShare = (segment: CohortLike, channelMix: ChannelMix) => {
  const mix = normaliseMix(channelMix);
  const baseReach = Object.entries(mix).reduce((sum, [channelId, weight]) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return sum;
    return sum + weight * channel.convCurveParams.reach;
  }, 0);
  const modifier = 0.85 + segment.valueSensitivity * 0.15 - segment.priceSensitivity * 0.1;
  return clamp(baseReach * modifier, 0.05, 0.65);
};

export const netAdds = (segment: CohortLike, tr: number, reach: number) => {
  return Math.round(segment.size * reach * tr);
};

export const cac = (offer: OfferArchetype, channelMix: ChannelMix, assumptions: Assumptions, executionCostOverride?: number) => {
  const mix = normaliseMix(channelMix);
  const weightedCac = Object.entries(mix).reduce((sum, [channelId, weight]) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return sum;
    return sum + weight * channel.cac;
  }, 0);
  const promoCost = offer.promoMonths * offer.promoValue;
  const deviceCost = offer.deviceSubsidy;
  const executionCost = executionCostOverride ?? assumptions.executionCost;
  return weightedCac + promoCost + deviceCost + executionCost;
};

export const arpu = (offer: OfferArchetype) => offer.monthlyPrice;

export const monthlyContribution = (
  offer: OfferArchetype,
  assumptions: Assumptions
) => {
  const gm = arpu(offer) * assumptions.grossMarginRate;
  const serviceCost = assumptions.servicingCostPerSubMo;
  const amort = offer.deviceSubsidy / assumptions.deviceSubsidyAmortMo;
  const contribution: number[] = [];
  for (let month = 1; month <= 24; month += 1) {
    const amortDeduction = month <= assumptions.deviceSubsidyAmortMo ? amort : 0;
    contribution.push(gm - serviceCost - amortDeduction);
  }
  return { gm, contribution };
};

export const paybackMonths = (cacValue: number, contributions: number[]) => {
  let cumulative = 0;
  for (let month = 0; month < contributions.length; month += 1) {
    cumulative += contributions[month];
    if (cumulative >= cacValue) {
      return (month + 1).toString();
    }
  }
  return '>24';
};

export const grossMargin12Month = (contributions: number[]) => {
  return contributions.slice(0, 12).reduce((sum, value) => sum + value, 0);
};

export const runCohort = (input: CohortInput): CohortOutput => {
  const assumptions = input.assumptions ?? defaultAssumptions;
  const tr = takeRate(input.segment, input.offer, input.channelMix);
  const reach = reachShare(input.segment, input.channelMix);
  const adds = netAdds(input.segment, tr, reach);
  const cacPerSubscriber = cac(input.offer, input.channelMix, assumptions, input.executionCostOverride);
  const totalCac = cacPerSubscriber * Math.max(adds, 1);
  const { gm, contribution } = monthlyContribution(input.offer, assumptions);
  const scaledContribution = contribution.map((value) => value * adds);
  const gmTotal = gm * adds;
  const payback = paybackMonths(totalCac, scaledContribution);
  const margin12Mo = grossMargin12Month(scaledContribution);

  return {
    takeRate: tr,
    reach,
    netAdds: adds,
    arpu: gm / assumptions.grossMarginRate,
    grossMarginPerMonth: gmTotal,
    contributionPerMonth: scaledContribution,
    cac: totalCac,
    cacPerSubscriber,
    paybackMonths: payback,
    grossMargin12Mo: margin12Mo
  };
};

export const summariseCohort = (segment: Segment, offerId?: string, mix?: ChannelMix) => {
  const offer = getOfferById(offerId ?? segment.defaultOfferId);
  const channelMix = mix ?? segment.defaultChannelMix;
  return runCohort({ segment, offer, channelMix });
};
