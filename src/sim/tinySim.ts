import { Assumptions, Channel, MicroSegment, OfferArchetype, Segment } from '../store/global';

export type TakeRateInput = {
  priceSensitivity: number;
  valueSensitivity: number;
  attractiveness: number;
  offer: OfferArchetype;
  channelEffect: number;
};

export const logistic = (x: number) => 1 / (1 + Math.exp(-x));

export const takeRate = ({ priceSensitivity, valueSensitivity, attractiveness, offer, channelEffect }: TakeRateInput): number => {
  const pricePressure = (offer.monthlyPrice - 60) / 25;
  const valueBoost = (offer.promoValue / 20 + offer.deviceSubsidy / 250 + offer.bundleFlags.length * 0.15) * valueSensitivity;
  const channelBoost = channelEffect * 0.8;
  const baseline = 0.03 + attractiveness * 0.035;
  const score = baseline + valueBoost + channelBoost - pricePressure * priceSensitivity;
  return Math.min(0.25, Math.max(0.01, logistic(score * 2) - 0.35 + attractiveness * 0.05));
};

export const arpu = (offer: OfferArchetype): number => offer.monthlyPrice;

export const channelWeightedCAC = (mix: Record<string, number>, channels: Channel[]): number => {
  return channels.reduce((sum, channel) => sum + (mix[channel.id] ?? 0) * channel.cac, 0);
};

type FullyLoadedCACInput = {
  mix: Record<string, number>;
  offer: OfferArchetype;
  assumptions: Assumptions;
  channels: Channel[];
};

export const fullyLoadedCAC = ({ mix, offer, assumptions, channels }: FullyLoadedCACInput): number => {
  const channelCac = channelWeightedCAC(mix, channels);
  return channelCac + assumptions.executionCost + offer.deviceSubsidy * 0.4;
};

type ContributionInput = {
  arpu: number;
  assumptions: Assumptions;
  offer: OfferArchetype;
};

export const monthlyContribution = ({ arpu, assumptions, offer }: ContributionInput, month: number): number => {
  const grossMargin = arpu * assumptions.grossMarginRate;
  const servicing = assumptions.servicingCostPerSubMo;
  const subsidy = month <= assumptions.deviceSubsidyAmortMo ? offer.deviceSubsidy / assumptions.deviceSubsidyAmortMo : 0;
  const promo = month <= offer.promoMonths ? offer.promoValue : 0;
  return grossMargin - servicing - subsidy - promo / Math.max(1, offer.promoMonths || 1);
};

type PaybackInput = {
  mix: Record<string, number>;
  offer: OfferArchetype;
  assumptions: Assumptions;
  channels: Channel[];
};

export const paybackMonths = (input: PaybackInput & { arpu: number }): number | string => {
  const cac = fullyLoadedCAC(input);
  let cumulative = 0;
  for (let month = 1; month <= 24; month += 1) {
    cumulative += monthlyContribution({ arpu: input.arpu, assumptions: input.assumptions, offer: input.offer }, month);
    if (cumulative >= cac) {
      return month;
    }
  }
  return '>24';
};

type Gm12Input = {
  arpu: number;
  assumptions: Assumptions;
  offer: OfferArchetype;
};

export const gm12m = (input: Gm12Input): number => {
  let total = 0;
  for (let month = 1; month <= 12; month += 1) {
    total += monthlyContribution(input, month);
  }
  return Math.round(total);
};

export const netAdds = (segmentSize: number, reach: number, rate: number): number => {
  return Math.round(segmentSize * reach * rate);
};

export type SimResult = {
  paybackMonths: number | string;
  gm12m: number;
  conversionRate: number;
  netAdds: number;
  marginPct: number;
  breakdown: {
    cac: number;
    promoCost: number;
    deviceSubsidy: number;
    executionCost: number;
  };
  timeline: { month: number; cumulativeContribution: number }[];
};

export type AudienceSimInput = {
  micro: MicroSegment;
  segment: Segment;
  segmentSize: number;
  offer: OfferArchetype;
  channelMix: Record<string, number>;
  assumptions: Assumptions;
  channels: Channel[];
};

export const reachFromMix = (mix: Record<string, number>, channels: Channel[]): number => {
  const base = 0.25;
  const digital = (mix['ch-search'] ?? 0) * 0.35 + (mix['ch-social'] ?? 0) * 0.25 + (mix['ch-email'] ?? 0) * 0.2;
  const offline = (mix['ch-retail'] ?? 0) * 0.18 + (mix['ch-field'] ?? 0) * 0.15;
  const efficiency = channels.reduce((sum, channel) => sum + (mix[channel.id] ?? 0) * channel.eff, 0);
  return Math.min(0.85, base + digital + offline + efficiency * 0.2);
};

export const simulateAudience = ({ micro, segmentSize, offer, channelMix, assumptions, channels }: AudienceSimInput): SimResult => {
  const arpuValue = arpu(offer);
  const reach = reachFromMix(channelMix, channels);
  const channelEffect = channels.reduce((sum, channel) => sum + (channelMix[channel.id] ?? 0) * channel.eff, 0);
  const rate = takeRate({
    priceSensitivity: 0.6,
    valueSensitivity: 0.7,
    attractiveness: micro.attractiveness,
    offer,
    channelEffect
  });
  const conversion = Math.min(0.35, rate * reach);
  const net = netAdds(segmentSize * micro.sizeShare, reach, rate);
  const cac = fullyLoadedCAC({ mix: channelMix, offer, assumptions, channels });
  const payback = paybackMonths({ mix: channelMix, offer, assumptions, channels, arpu: arpuValue });
  const gm12 = gm12m({ arpu: arpuValue, assumptions, offer });
  const promoCost = offer.promoValue * Math.min(offer.promoMonths, 6);
  const timeline: { month: number; cumulativeContribution: number }[] = [];
  let cumulative = 0;
  for (let month = 1; month <= 12; month += 1) {
    cumulative += monthlyContribution({ arpu: arpuValue, assumptions, offer }, month);
    timeline.push({ month, cumulativeContribution: Math.round(cumulative - cac) });
  }

  return {
    paybackMonths: payback,
    gm12m: gm12,
    conversionRate: Number(conversion.toFixed(3)),
    netAdds: net,
    marginPct: Number(((gm12 / (arpuValue * 12)) * 100).toFixed(1)),
    breakdown: {
      cac: Math.round(cac),
      promoCost,
      deviceSubsidy: offer.deviceSubsidy,
      executionCost: assumptions.executionCost
    },
    timeline
  };
};

type CampaignSimInput = {
  audiences: AudienceSimInput[];
};

export const simulateCampaign = ({ audiences }: CampaignSimInput): {
  blended: SimResult;
  byAudience: Record<string, SimResult>;
} => {
  const byAudience: Record<string, SimResult> = {};
  let totalNetAdds = 0;
  let weightedPayback = 0;
  let totalGm = 0;
  let totalSpend = 0;
  let totalArpu = 0;
  let totalConversion = 0;
  const timelineAccumulator: number[] = [];
  const timelineCounts: number[] = [];

  audiences.forEach((aud) => {
    const result = simulateAudience(aud);
    byAudience[aud.micro.id] = result;
    totalNetAdds += result.netAdds;
    totalGm += result.gm12m * result.netAdds;
    totalArpu += arpu(aud.offer) * 12 * result.netAdds;
    totalConversion += result.conversionRate;
    const paybackValue = typeof result.paybackMonths === 'number' ? result.paybackMonths : 26;
    weightedPayback += paybackValue * result.netAdds;
    totalSpend += result.breakdown.cac * result.netAdds;
    result.timeline.forEach((point, index) => {
      timelineAccumulator[index] = (timelineAccumulator[index] ?? 0) + point.cumulativeContribution;
      timelineCounts[index] = (timelineCounts[index] ?? 0) + 1;
    });
  });

  const blended: SimResult = {
    paybackMonths: totalNetAdds ? Math.round(weightedPayback / totalNetAdds) : '>24',
    gm12m: totalNetAdds ? Math.round(totalGm / totalNetAdds) : 0,
    conversionRate: Number((totalConversion / Math.max(1, audiences.length)).toFixed(3)),
    netAdds: totalNetAdds,
    marginPct: totalArpu ? Number(((totalGm / totalArpu) * 100).toFixed(1)) : 0,
    breakdown: {
      cac: totalNetAdds ? Math.round(totalSpend / totalNetAdds) : 0,
      promoCost: audiences.reduce((sum, aud) => sum + aud.offer.promoValue, 0),
      deviceSubsidy: audiences.reduce((sum, aud) => sum + aud.offer.deviceSubsidy, 0),
      executionCost: audiences.reduce((sum, aud) => sum + aud.assumptions.executionCost, 0)
    },
    timeline: timelineAccumulator.map((value, index) => ({
      month: index + 1,
      cumulativeContribution: Math.round(value / Math.max(1, timelineCounts[index]))
    }))
  };

  return { blended, byAudience };
};
