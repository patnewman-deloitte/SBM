import type { CampaignPlan, ChannelKey, ChannelMix } from '../store/offerStore';

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const calendarCoverage = (calendar: number[][]) => {
  const rows = calendar.length;
  const cols = calendar[0]?.length ?? 0;
  if (!rows || !cols) return 0;
  const sum = calendar.reduce((acc, row) => acc + row.reduce((a, cell) => a + cell, 0), 0);
  const max = rows * cols * 3;
  return max === 0 ? 0 : sum / max;
};

export const estimatePlanSpend = (plan: CampaignPlan) => {
  const calendarFactor = 0.6 + calendarCoverage(plan.calendar) * 0.4;
  const promoLift = plan.promoDepthPct / 100 * plan.promoMonths * 18000;
  const mixWeight =
    plan.channelMix.Search * 420 +
    plan.channelMix.Social * 310 +
    plan.channelMix.Email * 260 +
    plan.channelMix.Retail * 510;
  const base = (plan.price * 2000 + plan.deviceSubsidy * 1500) / 12;
  return Math.round((base + promoLift + mixWeight) * calendarFactor);
};

export const estimateCac = (plan: CampaignPlan) => {
  const mixEfficiency =
    plan.channelMix.Search * 0.18 +
    plan.channelMix.Email * 0.16 +
    plan.channelMix.Social * 0.22 +
    plan.channelMix.Retail * 0.28;
  const promoRelief = plan.promoDepthPct * 0.42 + plan.promoMonths * 1.8;
  const subsidyPenalty = plan.deviceSubsidy * 0.36;
  const intensityRelief = calendarCoverage(plan.calendar) * 28;
  const raw = 210 - promoRelief - intensityRelief + subsidyPenalty + mixEfficiency;
  return Number(Math.max(65, raw).toFixed(2));
};

export const normaliseMix = (mix: ChannelMix): ChannelMix => {
  const total = Object.values(mix).reduce((acc, value) => acc + value, 0);
  if (!total) {
    return {
      Search: 25,
      Social: 25,
      Email: 25,
      Retail: 25
    };
  }
  return {
    Search: Number(((mix.Search / total) * 100).toFixed(2)),
    Social: Number(((mix.Social / total) * 100).toFixed(2)),
    Email: Number(((mix.Email / total) * 100).toFixed(2)),
    Retail: Number(((mix.Retail / total) * 100).toFixed(2))
  };
};

export const rebalanceMix = (mix: ChannelMix, key: ChannelKey, value: number): ChannelMix => {
  const bounded = Math.min(100, Math.max(0, value));
  const others: ChannelKey[] = ['Search', 'Social', 'Email', 'Retail'].filter((item) => item !== key) as ChannelKey[];
  const remaining = Math.max(0, 100 - bounded);
  const currentOtherTotal = others.reduce((acc, item) => acc + mix[item], 0);
  const next: ChannelMix = { ...mix, [key]: bounded } as ChannelMix;
  if (currentOtherTotal === 0) {
    const share = remaining / others.length;
    others.forEach((item) => {
      next[item] = Number(share.toFixed(2));
    });
  } else {
    others.forEach((item) => {
      const proportion = mix[item] / currentOtherTotal;
      next[item] = Number((remaining * proportion).toFixed(2));
    });
  }
  return normaliseMix(next);
};

export const sumCalendarColumn = (calendar: number[][], column: number) => {
  return calendar.reduce((acc, row) => acc + (row[column] ?? 0), 0);
};
