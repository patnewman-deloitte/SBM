import React from 'react';

export type Mode = 'acquire' | 'grow' | 'retain';
export type Step = 1 | 2 | 3 | 4 | 5;

export type Subsegment = {
  id: string;
  label: string;
  population: number;
  traits: string[];
  score?: number;
};

export interface AppState {
  mode: Mode;
  setMode: (mode: Mode) => void;
  step: Step;
  setStep: (step: Step) => void;
  selectedSegment?: { id: string; name: string; size: number };
  planId?: string;
  setSelectedSegment: (segment?: { id: string; name: string; size: number }) => void;
  setPlanId: (id?: string) => void;
  selectedSubsegments: Subsegment[];
  setSelectedSubsegments: (segments: Subsegment[]) => void;
}

const STORAGE_KEY = 'sbm-app-state';

const AppStateContext = React.createContext<AppState | undefined>(undefined);

type StoredState = {
  mode?: Mode;
  selectedSegment?: { id: string; name: string; size: number };
  planId?: string;
  selectedSubsegments?: Subsegment[];
};

const readStorage = (): StoredState | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredState;
  } catch (error) {
    console.warn('Failed to parse app state from sessionStorage', error);
    return null;
  }
};

const writeStorage = (state: StoredState) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist app state to sessionStorage', error);
  }
};

export const AppStateProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const stored = React.useRef<StoredState | null>(null);
  if (stored.current === null) {
    stored.current = readStorage();
  }

  const [mode, setModeState] = React.useState<Mode>(() => stored.current?.mode ?? 'acquire');
  const [step, setStep] = React.useState<Step>(1);
  const [selectedSegment, setSelectedSegmentState] = React.useState<AppState['selectedSegment']>(() => stored.current?.selectedSegment);
  const [planId, setPlanIdState] = React.useState<string | undefined>(() => stored.current?.planId);
  const [selectedSubsegments, setSelectedSubsegments] = React.useState<Subsegment[]>(
    () => stored.current?.selectedSubsegments ?? []
  );

  React.useEffect(() => {
    stored.current = { mode, selectedSegment, planId, selectedSubsegments };
    writeStorage(stored.current);
  }, [mode, selectedSegment, planId, selectedSubsegments]);

  const value = React.useMemo<AppState>(
    () => ({
      mode,
      setMode: setModeState,
      step,
      setStep,
      selectedSegment,
      planId,
      setSelectedSegment: setSelectedSegmentState,
      setPlanId: setPlanIdState,
      selectedSubsegments,
      setSelectedSubsegments
    }),
    [mode, step, selectedSegment, planId, selectedSubsegments]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = React.useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

export const aggregateSubsegments = (subs: Subsegment[]) => ({
  id: subs.map((item) => item.id).join(','),
  name: subs.length ? `${subs.length} subsegments` : '',
  size: subs.reduce((total, item) => total + item.population, 0)
});
