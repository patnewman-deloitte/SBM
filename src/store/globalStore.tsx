import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { assumptions as seedAssumptions, channels, offerArchetypes, segments, type Assumptions, type ChannelMix, type MicroSegment, type Recommendation, type Segment } from '../data/seeds';
import { buildChannelMixFromOffer, getOfferById, summariseCohort } from '../sim/tinySim';

export interface CampaignOfferConfig {
  offerId: string;
  price: number;
  promoMonths: number;
  promoValue: number;
  deviceSubsidy: number;
}

export interface CampaignState {
  audienceIds: string[];
  offers: Record<string, CampaignOfferConfig>;
  channelMix: Record<string, ChannelMix>;
  budget: number;
  schedule: { weeks: number; waves: number };
  guardrails: { cacCeiling: number; paybackMax: number };
}

export interface InfoPanelState {
  title: string;
  description: string;
  hint?: string;
}

export interface SelectionState {
  activeSegmentId?: string;
  selectedMicroSegmentIds: string[];
  recommendationsByMicroSegment: Record<string, Recommendation>;
  campaign: CampaignState;
  assumptions: Assumptions;
}

export interface GlobalState extends SelectionState {
  infoPanel: InfoPanelState;
  setActiveSegmentId: (id: string) => void;
  toggleMicroSegment: (id: string) => void;
  setSelectedMicroSegments: (ids: string[]) => void;
  setRecommendationsForMicro: (id: string, recommendation: Recommendation) => void;
  setCampaign: (mutator: (campaign: CampaignState) => CampaignState) => void;
  resetCampaign: (audienceIds: string[]) => void;
  updateAssumptions: (assumptions: Partial<Assumptions>) => void;
  setInfoPanel: (info: InfoPanelState) => void;
  clearInfoPanel: () => void;
}

const createCampaignFromSegment = (segment: Segment): CampaignState => {
  const offer = getOfferById(segment.defaultOfferId);
  return {
    audienceIds: [],
    offers: {},
    channelMix: {},
    budget: Math.round(segment.size * 0.15),
    schedule: { weeks: 12, waves: 2 },
    guardrails: { cacCeiling: 350, paybackMax: 8 }
  };
};

const initialCampaign = createCampaignFromSegment(segments[0]);

const defaultState: SelectionState & { infoPanel: InfoPanelState } = {
  activeSegmentId: segments[0].id,
  selectedMicroSegmentIds: [],
  recommendationsByMicroSegment: {},
  campaign: initialCampaign,
  assumptions: seedAssumptions,
  infoPanel: {
    title: 'Need-to-know',
    description: 'Focus a widget to see curated context and assumptions.'
  }
};

const StoreContext = createContext<ReturnType<typeof createStore<GlobalState>> | null>(null);

const createGlobalState = () =>
  createStore<GlobalState>()(
    persist(
      (set, get) => ({
        ...defaultState,
        setActiveSegmentId: (id) => {
          set((state) => ({
            activeSegmentId: id,
            campaign: state.campaign.audienceIds.length ? state.campaign : createCampaignFromSegment(segments.find((s) => s.id === id) ?? segments[0])
          }));
        },
        toggleMicroSegment: (id) => {
          set((state) => {
            const existing = new Set(state.selectedMicroSegmentIds);
            if (existing.has(id)) {
              existing.delete(id);
            } else {
              existing.add(id);
            }
            return { selectedMicroSegmentIds: Array.from(existing) };
          });
        },
        setSelectedMicroSegments: (ids) => {
          set(() => ({ selectedMicroSegmentIds: Array.from(new Set(ids)) }));
        },
        setRecommendationsForMicro: (id, recommendation) => {
          set((state) => ({
            recommendationsByMicroSegment: {
              ...state.recommendationsByMicroSegment,
              [id]: recommendation
            }
          }));
        },
        setCampaign: (mutator) => {
          set((state) => ({ campaign: mutator(state.campaign) }));
        },
        resetCampaign: (audienceIds) => {
          set((state) => {
            const activeSegment = segments.find((seg) => seg.id === (state.activeSegmentId ?? segments[0].id)) ?? segments[0];
            const base = createCampaignFromSegment(activeSegment);
            base.audienceIds = audienceIds;
            return { campaign: base };
          });
        },
        updateAssumptions: (patch) => {
          set((state) => ({ assumptions: { ...state.assumptions, ...patch } }));
        },
        setInfoPanel: (info) => set(() => ({ infoPanel: info })),
        clearInfoPanel: () => set(() => ({ infoPanel: defaultState.infoPanel }))
      }),
      {
        name: 'sbm-acquire-store',
        storage: createJSONStorage(() => localStorage)
      }
    )
  );

export const GlobalStoreProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<ReturnType<typeof createGlobalState>>();
  if (!storeRef.current) {
    storeRef.current = createGlobalState();
  }

  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    const unsub = storeRef.current!.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    if (storeRef.current!.getState().activeSegmentId) {
      setHasHydrated(true);
    }
    return unsub;
  }, []);

  if (!hasHydrated) {
    return null;
  }

  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
};

export const useGlobalStore = <T,>(selector: (state: GlobalState) => T): T => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('Global store not found');
  }
  return useStore(store, selector);
};

export const useActiveSegment = () => {
  const activeSegmentId = useGlobalStore((state) => state.activeSegmentId);
  return segments.find((segment) => segment.id === activeSegmentId) ?? segments[0];
};

export const useCampaignSummary = () => {
  const { campaign, assumptions } = useGlobalStore((state) => ({ campaign: state.campaign, assumptions: state.assumptions }));
  const activeSegment = useActiveSegment();
  const offer = getOfferById(activeSegment.defaultOfferId);
  const summary = summariseCohort(activeSegment, offer.id, buildChannelMixFromOffer(offer));
  return { campaign, assumptions, summary };
};
