import * as Popover from '@radix-ui/react-popover';
import { InfoIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface InfoPopoverProps {
  title: string;
  plainDescription: string;
  primarySourceHint: string;
  children?: ReactNode;
}

export const InfoPopover = ({ title, plainDescription, primarySourceHint, children }: InfoPopoverProps) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Info: ${title}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 focus-visible:ring-offset-0"
        >
          <InfoIcon className="h-3.5 w-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          className="z-50 max-w-xs rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl focus:outline-none"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-primary/10 p-1 text-primary">
              <InfoIcon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{title}</h4>
              <p className="mt-1 text-slate-600">{plainDescription}</p>
              {children ? <div className="mt-2 text-slate-600">{children}</div> : null}
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Primary data source (est.)</p>
              <p className="text-xs text-slate-600">{primarySourceHint}</p>
            </div>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
