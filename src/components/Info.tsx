import React from 'react';
import { Info as InfoIcon } from 'lucide-react';

type InfoProps = {
  title: string;
  body: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

const Info: React.FC<InfoProps> = ({ title, body, side = 'top' }) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const positionClass =
    side === 'top'
      ? '-top-3 left-1/2 -translate-x-1/2 -translate-y-full'
      : side === 'bottom'
        ? 'top-full left-1/2 -translate-x-1/2 mt-2'
        : side === 'left'
          ? 'right-full mr-3 top-1/2 -translate-y-1/2'
          : 'left-full ml-3 top-1/2 -translate-y-1/2';

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-200 transition hover:bg-emerald-500/20"
        aria-label={`What is ${title}?`}
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          role="dialog"
          className={`card absolute z-50 w-72 border border-emerald-500/30 bg-slate-950/95 p-4 text-sm shadow-emerald-500/10 ${positionClass}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{title}</p>
          <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-slate-200">{body}</div>
        </div>
      ) : null}
    </div>
  );
};

export default Info;

