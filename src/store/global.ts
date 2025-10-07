import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { assumptionsSeed, channelsSeed, competitorsSeed, defaultCampaign, microSegmentsSeed, offersSeed, segmentsSeed } from '../data/seeds';

type IdMap<T extends { id: string }> = Record<string, T>;

export type Assumptions = {
  grossMarginRate: number;
  servicingCostPerSubMo: number;
  deviceSubsidyAmortMo: number;
  executionCost: number;
};

export type Segment = {
  id: string;
  name: string;
  size: number;
  traits: string[];
  priceSensitivity: number;
  valueSensitivity: number;
  region: string;
  notes?: string;
};

export type Competitor = {
  id: string;
  name: string;
  basePrice: number;
  promoDepth: number;
  coverageScore: number;
  valueScore: number;
};

export type OfferArchetype = {
  id: string;
  name: string;
  monthlyPrice: number;
  promoMonths: number;
  promoValue: number;
  deviceSubsidy: number;
  bundleFlags: string[];
};

export type Channel = {
  id: string;
  name: string;
  cac: number;
  eff: number;
};

export type MicroSegment = {
  id: string;
  parentSegmentId: string;
  name: string;
  sizeShare: number;
  traits: string[];
  attractiveness: number;
};

export type CampaignPlan = {
  audienceIds: string[];
  offerByAudience: Record<string, OfferArchetype>;
  channelMixByAudience: Record<string, Record<string, number>>;
  budgetTotal: number;
  guardrails: { cacCeiling?: number; paybackTarget?: number };
};

export type GlobalState = {
  assumptions: Assumptions;
  segments: Segment[];
  competitors: Competitor[];
  offers: OfferArchetype[];
  channels: Channel[];
  activeFilters: Record<string, any>;
  recommendedSegmentIds: string[];
  cartSegmentIds: string[];
  activeSegmentId?: string;
  microSegmentsByParent: Record<string, MicroSegment[]>;
  selectedMicroIds: string[];
  campaign: CampaignPlan;
  setFilters: (patch: Record<string, any>) => void;
  setRecommendedSegmentIds: (ids: string[]) => void;
  addSegmentToCart: (id: string) => void;
  removeSegmentFromCart: (id: string) => void;
  setActiveSegment: (id?: string) => void;
  setSelectedMicro: (ids: string[]) => void;
  initCampaignFromSelection: () => void;
  updateCampaign: (partial: Partial<CampaignPlan>) => void;
  hydrate: () => void;
  persist: () => void;
};

const STORAGE_KEY = 'sbm-global-state-v1';

const baseState = {
  assumptions: assumptionsSeed,
  segments: segmentsSeed,
  competitors: competitorsSeed,
  offers: offersSeed,
  channels: channelsSeed,
  activeFilters: {},
  recommendedSegmentIds: segmentsSeed.map((s) => s.id),
  cartSegmentIds: [] as string[],
  activeSegmentId: segmentsSeed[0]?.id,
  microSegmentsByParent: microSegmentsSeed,
  selectedMicroIds: [] as string[],
  campaign: defaultCampaign
};

const withDevtools = devtools<GlobalState>((set, get) => ({
  ...baseState,
  setFilters: (patch) => {
    const next = { ...get().activeFilters, ...patch };
    Object.keys(next).forEach((key) => {
      if (next[key] === undefined || next[key] === '') {
        delete next[key];
      }
    });
    set({ activeFilters: next });
    get().persist();
  },
  setRecommendedSegmentIds: (ids) => {
    set({ recommendedSegmentIds: ids });
    get().persist();
  },
  addSegmentToCart: (id) => {
    const cart = new Set(get().cartSegmentIds);
    cart.add(id);
    set({ cartSegmentIds: Array.from(cart) });
    get().persist();
  },
  removeSegmentFromCart: (id) => {
    set({ cartSegmentIds: get().cartSegmentIds.filter((seg) => seg !== id) });
    get().persist();
  },
  setActiveSegment: (id) => {
    set({ activeSegmentId: id });
    get().persist();
  },
  setSelectedMicro: (ids) => {
    set({ selectedMicroIds: ids });
    get().persist();
  },
  initCampaignFromSelection: () => {
    const { selectedMicroIds, offers, channels, campaign } = get();
    if (selectedMicroIds.length === 0) return;
    const defaultOffer = offers[0];
    const defaultMix: Record<string, number> = {};
    channels.forEach((ch) => {
      defaultMix[ch.id] = ch.id === 'ch-search' ? 0.3 : ch.id === 'ch-social' ? 0.25 : ch.id === 'ch-email' ? 0.15 : 0.15;
    });
    const normalised = Object.entries(defaultMix).reduce((acc, [id, val]) => {
      acc[id] = val;
      return acc;
    }, {} as Record<string, number>);
    const offerByAudience: Record<string, OfferArchetype> = {};
    const channelMixByAudience: Record<string, Record<string, number>> = {};
    selectedMicroIds.forEach((id) => {
      offerByAudience[id] = campaign.offerByAudience[id] ?? defaultOffer;
      channelMixByAudience[id] = campaign.channelMixByAudience[id] ?? normalised;
    });
    set({
      campaign: {
        ...campaign,
        audienceIds: selectedMicroIds,
        offerByAudience,
        channelMixByAudience
      }
    });
    get().persist();
  },
  updateCampaign: (partial) => {
    set({ campaign: { ...get().campaign, ...partial } });
    get().persist();
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<GlobalState>;
      set({
        ...baseState,
        ...parsed,
        campaign: { ...defaultCampaign, ...parsed.campaign }
      });
    }
  },
  persist: () => {
    if (typeof window === 'undefined') return;
    const state = get();
    const payload: Partial<GlobalState> = {
      activeFilters: state.activeFilters,
      recommendedSegmentIds: state.recommendedSegmentIds,
      cartSegmentIds: state.cartSegmentIds,
      activeSegmentId: state.activeSegmentId,
      selectedMicroIds: state.selectedMicroIds,
      campaign: state.campaign
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
}));

export const useGlobalStore = create(withDevtools);

export const segmentsById = (): IdMap<Segment> =>
  useGlobalStore.getState().segments.reduce((acc, seg) => {
    acc[seg.id] = seg;
    return acc;
  }, {} as IdMap<Segment>);
