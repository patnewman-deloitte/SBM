import React from 'react';
import { Info } from 'lucide-react';

export type InfoProps = {
  title: string;
  description: string;
  primarySource?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
};

const InfoPopover: React.FC<InfoProps> = ({ title, description, primarySource, placement = 'top' }) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const toggle = () => setOpen((prev) => !prev);

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
    placement === 'top'
      ? '-translate-y-full -top-3 left-1/2 -translate-x-1/2'
      : placement === 'bottom'
        ? 'top-full left-1/2 -translate-x-1/2 mt-2'
        : placement === 'left'
          ? 'right-full mr-2 top-1/2 -translate-y-1/2'
          : 'left-full ml-2 top-1/2 -translate-y-1/2';

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-300 transition hover:bg-emerald-500/20"
        aria-label={`More info about ${title}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          role="dialog"
          className={`card absolute z-40 w-64 border border-emerald-500/20 p-3 text-xs text-slate-200 shadow-emerald-500/10 ${positionClass}`}
        >
          <p className="text-sm font-semibold text-emerald-300">{title}</p>
          <p className="mt-2 leading-relaxed text-slate-200">{description}</p>
          {primarySource ? (
            <p className="mt-2 text-[11px] uppercase tracking-wide text-emerald-400">
              Primary data source (est.): {primarySource}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InfoPopover;
