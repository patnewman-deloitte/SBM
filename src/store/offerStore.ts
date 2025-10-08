import { create } from 'zustand';
import { exportPlanCsv, exportPlanPng } from '../utils/export';
import { optimizeToTarget as runOptimizer, OptimizerChange } from '../utils/optimizeToTarget';
import { simulateCampaign } from '../utils/simulateCampaign';
import {
  calendarCoverage,
  estimateCac,
  estimatePlanSpend,
  normaliseMix,
  rebalanceMix,
  sumCalendarColumn
} from '../utils/planMath';

export type Goal = 'Balanced' | 'Growth-first' | 'Margin-first';
export type ChannelKey = 'Search' | 'Social' | 'Email' | 'Retail';
export type ChannelMix = Record<ChannelKey, number>;

export type Objective = {
  goal: Goal;
  paybackTarget: number;
  marginTarget: number;
  cacCeiling: number;
  budget: number;
};

export type CampaignPlan = {
  price: number;
  promoDepthPct: number;
  promoMonths: number;
  deviceSubsidy: number;
  channelMix: ChannelMix;
  calendar: number[][];
  creativeBrief: { headline: string; subtext: string; heroHint: string };
  kpis: {
    paybackMo: number;
    paybackRange: [number, number];
    conversionPct: number;
    conversionRange: [number, number];
    marginPct: number;
    marginRange: [number, number];
  };
  drivers: { label: string; delta: number }[];
  confidence: number;
  inventoryHold: boolean;
};

export type PlannerMode = 'simple' | 'advanced';
export type ValidationIssue =
  | 'budget'
  | 'cac'
  | 'payback'
  | 'margin'
  | 'calendar'
  | 'confidence';

type OfferStoreState = {
  objective: Objective;
  plan: CampaignPlan;
  mode: PlannerMode;
  cohortName: string;
  isGenerating: boolean;
  isOptimizing: boolean;
  isExporting: boolean;
  lastOptimizerChanges: OptimizerChange[];
  generate: () => Promise<void>;
  optimizeToTarget: () => Promise<void>;
  updateObjective: (patch: Partial<Objective>) => void;
  setMode: (mode: PlannerMode) => void;
  applyLever: (patch: Partial<CampaignPlan>) => void;
  setCalendar: (row: number, column: number, value: number) => void;
  applyPreset: (goal: Goal) => void;
  fixIssue: (issue: ValidationIssue) => void;
  lockAndExport: (elementId: string) => Promise<void>;
  exportCsv: () => void;
  exportPng: (elementId: string) => Promise<void>;
};

const baseCalendar = (): number[][] => [
  Array.from({ length: 12 }, (_, idx) => (idx < 4 ? 2 : idx < 8 ? 1 : 0)),
  Array.from({ length: 12 }, (_, idx) => (idx % 3 === 0 ? 2 : 1)),
  Array.from({ length: 12 }, (_, idx) => (idx % 2 === 0 ? 1 : 2)),
  Array.from({ length: 12 }, (_, idx) => (idx < 6 ? 1 : 0))
];

const defaultObjective: Objective = {
  goal: 'Balanced',
  paybackTarget: 8,
  marginTarget: 28,
  cacCeiling: 145,
  budget: 420000
};

const baseMix: ChannelMix = {
  Search: 34,
  Social: 22,
  Email: 24,
  Retail: 20
};

const createPlanFromObjective = (objective: Objective): CampaignPlan => {
  const goalTweaks: Record<Goal, { price: number; promoDepthPct: number; promoMonths: number; subsidy: number }> = {
    Balanced: { price: 79, promoDepthPct: 16, promoMonths: 3, subsidy: 35 },
    'Growth-first': { price: 74, promoDepthPct: 20, promoMonths: 4, subsidy: 45 },
    'Margin-first': { price: 86, promoDepthPct: 12, promoMonths: 2, subsidy: 28 }
  };
  const preset = goalTweaks[objective.goal];
  const calendar = baseCalendar();
  const plan: CampaignPlan = {
    price: preset.price,
    promoDepthPct: preset.promoDepthPct,
    promoMonths: preset.promoMonths,
    deviceSubsidy: preset.subsidy,
    channelMix: { ...baseMix },
    calendar,
    inventoryHold: objective.goal === 'Margin-first',
    creativeBrief: {
      headline: 'Kick off campaign',
      subtext: 'Generating baseline performance ranges.',
      heroHint: 'Shift spend once performance stabilises.'
    },
    kpis: {
      paybackMo: 0,
      paybackRange: [0, 0],
      conversionPct: 0,
      conversionRange: [0, 0],
      marginPct: 0,
      marginRange: [0, 0]
    },
    drivers: [],
    confidence: 0.6
  };
  return simulateCampaign(plan, objective);
};

const buildCalendarFix = (calendar: number[][]) => {
  return calendar.map((row, rowIdx) =>
    row.map((value, colIdx) => {
      if (value > 0) return value;
      return colIdx % 3 === 0 ? 1 : rowIdx === 0 ? 2 : 1;
    })
  );
};

const ensurePlan = (plan: CampaignPlan, objective: Objective) => simulateCampaign(plan, objective);

export const useOfferStore = create<OfferStoreState>((set, get) => ({
  objective: defaultObjective,
  plan: createPlanFromObjective(defaultObjective),
  mode: 'simple',
  cohortName: 'Prime Mobility - Acquisition',
  isGenerating: false,
  isOptimizing: false,
  isExporting: false,
  lastOptimizerChanges: [],
  generate: async () => {
    set({ isGenerating: true });
    await new Promise((resolve) => setTimeout(resolve, 220));
    set((state) => ({
      plan: createPlanFromObjective(state.objective),
      isGenerating: false,
      lastOptimizerChanges: []
    }));
  },
  optimizeToTarget: async () => {
    const { plan, objective } = get();
    set({ isOptimizing: true });
    await new Promise((resolve) => setTimeout(resolve, 260));
    const { plan: optimised, changes } = runOptimizer(plan, objective);
    set({ plan: optimised, isOptimizing: false, lastOptimizerChanges: changes });
  },
  updateObjective: (patch) => {
    set((state) => {
      const objective = { ...state.objective, ...patch };
      return {
        objective,
        plan: ensurePlan({ ...state.plan }, objective)
      };
    });
  },
  setMode: (mode) => set({ mode }),
  applyLever: (patch) => {
    set((state) => {
      const channelMix = patch.channelMix
        ? normaliseMix({ ...state.plan.channelMix, ...patch.channelMix })
        : { ...state.plan.channelMix };
      const next: CampaignPlan = {
        ...state.plan,
        ...patch,
        channelMix,
        calendar: patch.calendar ? patch.calendar.map((row) => [...row]) : state.plan.calendar.map((row) => [...row])
      };
      if (typeof patch.inventoryHold === 'boolean') {
        next.inventoryHold = patch.inventoryHold;
      }
      return { plan: ensurePlan(next, state.objective), lastOptimizerChanges: [] };
    });
  },
  setCalendar: (row, column, value) => {
    set((state) => {
      const calendar = state.plan.calendar.map((r, idx) => (idx === row ? r.map((cell, colIdx) => (colIdx === column ? value : cell)) : [...r]));
      const plan = { ...state.plan, calendar };
      return { plan: ensurePlan(plan, state.objective), lastOptimizerChanges: [] };
    });
  },
  applyPreset: (goal) => {
    set((state) => {
      const objective = { ...state.objective, goal };
      return {
        objective,
        plan: createPlanFromObjective(objective),
        lastOptimizerChanges: []
      };
    });
  },
  fixIssue: (issue) => {
    const { plan, objective } = get();
    let next: CampaignPlan = { ...plan, channelMix: { ...plan.channelMix }, calendar: plan.calendar.map((row) => [...row]) };

    if (issue === 'budget') {
      next.promoMonths = Math.max(1, next.promoMonths - 1);
      next.promoDepthPct = Math.max(8, next.promoDepthPct - 1.5);
    }
    if (issue === 'cac') {
      next.channelMix = rebalanceMix(next.channelMix, 'Search', next.channelMix.Search + 4);
      next.deviceSubsidy = Math.max(10, next.deviceSubsidy - 3);
    }
    if (issue === 'payback') {
      next.channelMix = rebalanceMix(next.channelMix, 'Email', next.channelMix.Email + 3);
      next.promoMonths = Math.min(6, next.promoMonths + 1);
    }
    if (issue === 'margin') {
      next.price = Math.min(120, next.price + 2);
      next.promoDepthPct = Math.max(6, next.promoDepthPct - 2);
    }
    if (issue === 'calendar') {
      next.calendar = buildCalendarFix(next.calendar);
    }
    if (issue === 'confidence') {
      const boosted = next.calendar.map((row) => row.map((cell) => Math.min(3, cell + 1)));
      next.calendar = boosted;
    }

    set({ plan: ensurePlan(next, objective), lastOptimizerChanges: [] });
  },
  lockAndExport: async (elementId: string) => {
    const { plan, objective, cohortName } = get();
    set({ isExporting: true });
    try {
      exportPlanCsv(plan, objective, cohortName);
      await exportPlanPng(elementId);
    } finally {
      set({ isExporting: false });
    }
  },
  exportCsv: () => {
    const { plan, objective, cohortName } = get();
    exportPlanCsv(plan, objective, cohortName);
  },
  exportPng: async (elementId: string) => {
    set({ isExporting: true });
    try {
      await exportPlanPng(elementId);
    } finally {
      set({ isExporting: false });
    }
  }
}));

export const selectBudgetHealth = (state: OfferStoreState) => {
  const spend = estimatePlanSpend(state.plan);
  return { spend, within: spend <= state.objective.budget };
};

export const selectCac = (state: OfferStoreState) => estimateCac(state.plan);

export const selectCalendarCoverage = (state: OfferStoreState) => calendarCoverage(state.plan.calendar);

export const selectChecklistStatus = (state: OfferStoreState) => {
  const spend = estimatePlanSpend(state.plan);
  const cac = estimateCac(state.plan);
  const coverage = calendarCoverage(state.plan.calendar);
  const confidenceLevel = state.plan.confidence;

  return {
    budgetOk: spend <= state.objective.budget,
    cacOk: cac <= state.objective.cacCeiling,
    paybackOk: state.plan.kpis.paybackMo <= state.objective.paybackTarget,
    marginOk: state.plan.kpis.marginPct >= state.objective.marginTarget,
    calendarOk:
      coverage > 0.45 && Array.from({ length: 12 }).every((_, idx) => sumCalendarColumn(state.plan.calendar, idx) > 0),
    confidenceOk: confidenceLevel >= 0.5,
    spend,
    cac,
    coverage
  };
};

export const selectConfidenceLabel = (value: number) => {
  if (value < 0.45) return 'Low';
  if (value < 0.7) return 'Medium';
  return 'High';
};
