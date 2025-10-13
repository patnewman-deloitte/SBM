import * as React from 'react';

export function useTicker(enabled: boolean, ms: number) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      setTick((value) => value + 1);
    }, ms);
    return () => window.clearInterval(id);
  }, [enabled, ms]);

  return tick;
}

export function stepSeries(series: number[], drift = 0, noise = 0.02) {
  const last = series[series.length - 1] ?? 1;
  const next = Math.max(0, last * (1 + drift + (Math.random() - 0.5) * noise));
  const out = [...series.slice(-31), next];
  return out;
}
