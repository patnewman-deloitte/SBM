/**
 * storage helpers manage Segment Studio payloads in localStorage for the demo router.
 */
export type SegmentPayload = {
  id: string;
  name: string;
  label?: string;
  chips: string[];
  filters: Record<string, string[]>;
  geoWindow: { geo: string; window: string; grain: string };
  kpis: {
    opportunityScore: number;
    reachable: number;
    expectedCVR: [number, number];
    paybackMonths: number;
  };
  rivals?: string[];
  pressureIndex?: number;
  whiteSpace?: number;
  createdAt: string;
  version: number;
};

export const SEG_KEY = "acq_demo_segments_v1";

const getStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

export function loadAll(): SegmentPayload[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(SEG_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as SegmentPayload[];
    }
    return [];
  } catch (error) {
    console.warn("Failed to parse segments", error);
    return [];
  }
}

export function saveAll(list: SegmentPayload[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(SEG_KEY, JSON.stringify(list));
}

export function saveOne(payload: SegmentPayload) {
  const list = loadAll();
  const index = list.findIndex((item) => item.id === payload.id);
  if (index >= 0) {
    list[index] = payload;
  } else {
    list.push(payload);
  }
  saveAll(list);
}

export function getOne(id: string): SegmentPayload | null {
  const list = loadAll();
  return list.find((item) => item.id === id) ?? null;
}
