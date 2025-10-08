import React from 'react';
import clsx from 'clsx';
import { useOfferStore } from '../store/offerStore';

const channelLabels = ['Search', 'Social', 'Email', 'Retail'] as const;
const intensityColors = ['bg-slate-800/60', 'bg-emerald-900/40', 'bg-emerald-700/60', 'bg-emerald-500/70'];

const CampaignCalendar: React.FC = () => {
  const { calendar, setCalendar } = useOfferStore((state) => ({
    calendar: state.plan.calendar,
    setCalendar: state.setCalendar
  }));

  const [dragValue, setDragValue] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (dragValue === null) return;
    const endDrag = () => setDragValue(null);
    window.addEventListener('pointerup', endDrag);
    return () => window.removeEventListener('pointerup', endDrag);
  }, [dragValue]);

  const handleCellInput = (rowIdx: number, colIdx: number, next: number) => {
    setCalendar(rowIdx, colIdx, next);
  };

  const handlePointerDown = (rowIdx: number, colIdx: number) => {
    const current = calendar[rowIdx]?.[colIdx] ?? 0;
    const next = (current + 1) % 4;
    setDragValue(next);
    handleCellInput(rowIdx, colIdx, next);
  };

  const handlePointerEnter = (rowIdx: number, colIdx: number) => {
    if (dragValue === null) return;
    handleCellInput(rowIdx, colIdx, dragValue);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">12-week activation calendar</h3>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {[0, 1, 2, 3].map((level) => (
            <span key={level} className="flex items-center gap-1">
              <span className={clsx('h-3 w-3 rounded-sm', intensityColors[level])} />
              {level}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-max">
          <div className="grid grid-cols-[120px_repeat(12,minmax(40px,1fr))] text-xs font-medium text-slate-300">
            <div className="px-3 py-2 text-slate-400">Channel</div>
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="px-2 py-2 text-center text-slate-500">
                W{idx + 1}
              </div>
            ))}
            {channelLabels.map((channel, rowIdx) => (
              <React.Fragment key={channel}>
                <div className="border-t border-slate-700/40 px-3 py-3 text-sm font-semibold text-slate-200">{channel}</div>
                {Array.from({ length: 12 }).map((_, colIdx) => {
                  const value = calendar[rowIdx]?.[colIdx] ?? 0;
                  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handlePointerDown(rowIdx, colIdx);
                    }
                  };
                  return (
                    <button
                      key={colIdx}
                      type="button"
                      onPointerDown={() => handlePointerDown(rowIdx, colIdx)}
                      onPointerEnter={() => handlePointerEnter(rowIdx, colIdx)}
                      onKeyDown={handleKeyDown}
                      className={clsx(
                        'border-t border-slate-800/60 px-1 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-400',
                        intensityColors[value]
                      )}
                      aria-label={`${channel} week ${colIdx + 1} intensity ${value}`}
                    >
                      {value}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">Click to cycle intensity, drag to paint adjacent weeks. Intensity scales conversion with diminishing returns.</p>
    </div>
  );
};

export default CampaignCalendar;
