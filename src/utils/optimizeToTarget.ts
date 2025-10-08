import { simulateCampaign } from './simulateCampaign';
import { estimateCac, estimatePlanSpend, normaliseMix, rebalanceMix } from './planMath';
import type { CampaignPlan, Objective } from '../store/offerStore';

export type OptimizerChange = {
  field: string;
  from: number | string;
  to: number | string;
};

const goalPresets: Record<Objective['goal'], { price: number; promoDepthPct: number; promoMonths: number }> = {
  Balanced: { price: 79, promoDepthPct: 15, promoMonths: 3 },
  'Growth-first': { price: 74, promoDepthPct: 20, promoMonths: 4 },
  'Margin-first': { price: 86, promoDepthPct: 10, promoMonths: 2 }
};

const adjustTowardGoal = (plan: CampaignPlan, objective: Objective): CampaignPlan => {
  const baseline = goalPresets[objective.goal];
  return {
    ...plan,
    price: (plan.price * 2 + baseline.price) / 3,
    promoDepthPct: (plan.promoDepthPct * 2 + baseline.promoDepthPct) / 3,
    promoMonths: Math.round((plan.promoMonths * 2 + baseline.promoMonths) / 3)
  };
};

export const optimizeToTarget = (plan: CampaignPlan, objective: Objective) => {
  let working: CampaignPlan = {
    ...plan,
    channelMix: { ...plan.channelMix },
    calendar: plan.calendar.map((row) => [...row])
  };
  const changes: OptimizerChange[] = [];

  let iterations = 0;
  const seen = new Set<string>();

  const snapshot = () => JSON.stringify({
    price: working.price,
    promo: working.promoMonths,
    depth: working.promoDepthPct,
    mix: working.channelMix
  });

  while (iterations < 14) {
    iterations += 1;
    working = simulateCampaign(working, objective);
    const currentKey = snapshot();
    if (seen.has(currentKey)) break;
    seen.add(currentKey);

    const spend = estimatePlanSpend(working);
    const cac = estimateCac(working);

    const paybackGap = working.kpis.paybackMo - objective.paybackTarget;
    const marginGap = objective.marginTarget - working.kpis.marginPct;
    const budgetGap = spend - objective.budget;
    const cacGap = cac - objective.cacCeiling;

    let adjusted = false;

    if (budgetGap > 0) {
      const prev = working.promoMonths;
      working = {
        ...working,
        promoMonths: Math.max(1, working.promoMonths - 1)
      };
      if (prev !== working.promoMonths) {
        changes.push({ field: 'Promo months', from: prev, to: working.promoMonths });
        adjusted = true;
      }
    }

    if (cacGap > 0.5) {
      const prev = working.channelMix.Search;
      working.channelMix = rebalanceMix(working.channelMix, 'Search', working.channelMix.Search + 5);
      const next = working.channelMix.Search;
      if (prev !== next) {
        changes.push({ field: 'Search mix', from: prev, to: next });
        adjusted = true;
      }
    }

    if (paybackGap > 0.2) {
      const prevDepth = working.promoDepthPct;
      working.promoDepthPct = Math.min(40, working.promoDepthPct + 2);
      if (prevDepth !== working.promoDepthPct) {
        changes.push({ field: 'Promo depth', from: prevDepth, to: working.promoDepthPct });
        adjusted = true;
      }
    }

    if (marginGap > 0.2) {
      const prevPrice = working.price;
      working.price = Math.min(110, working.price + 1.5);
      if (prevPrice !== working.price) {
        changes.push({ field: 'Price', from: Number(prevPrice.toFixed(2)), to: Number(working.price.toFixed(2)) });
        adjusted = true;
      }
    }

    if (!adjusted) {
      const prevPlan = working;
      working = adjustTowardGoal(working, objective);
      if (prevPlan.price !== working.price) {
        changes.push({ field: 'Recenter plan', from: Number(prevPlan.price.toFixed(2)), to: Number(working.price.toFixed(2)) });
      }
    }
  }

  working = simulateCampaign(working, objective);

  working.channelMix = normaliseMix(working.channelMix);

  return { plan: working, changes };
};
