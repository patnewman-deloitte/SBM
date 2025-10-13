import * as React from 'react';

type Props = { title: string; body: string; className?: string };

export default function InfoIcon({ title, body, className }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-flex ${className ?? ''}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-800"
        title="What is this?"
      >
        i
      </button>
      {open ? (
        <div
          role="dialog"
          className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-slate-800 bg-slate-950 p-3 text-left shadow-xl"
        >
          <p className="text-xs font-semibold text-slate-200">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{body}</p>
          <div className="mt-2 text-right">
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
