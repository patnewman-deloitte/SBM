import React from 'react';

export type WhyChipProps = {
  reasons: string[];
  title?: string;
};

const WhyChip: React.FC<WhyChipProps> = ({ reasons, title }) => {
  const [open, setOpen] = React.useState(false);
  const items = React.useMemo(() => reasons.filter(Boolean).slice(0, 5), [reasons]);
  const dialogTitle = title ?? 'Key drivers';

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        onClick={() => setOpen(true)}
        aria-label={dialogTitle}
      >
        Why
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-label={dialogTitle}
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{dialogTitle}</p>
                <p className="text-xs text-slate-400">Signals behind this callout.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Close drivers"
              >
                Close
              </button>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {items.length ? (
                items.map((reason, index) => (
                  <li key={`${reason}-${index}`} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
                    {reason}
                  </li>
                ))
              ) : (
                <li className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
                  Drivers coming soon.
                </li>
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default WhyChip;
