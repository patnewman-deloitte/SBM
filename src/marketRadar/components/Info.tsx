/**
 * Info tooltip component providing quick feature guidance.
 */
import React, { useId, useState } from "react";

export type InfoProps = {
  title: string;
  lines: string[];
};

const Info: React.FC<InfoProps> = ({ title, lines }) => {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="focus-outline flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/60 bg-slate-900 text-emerald-200 shadow-soft transition hover:bg-emerald-500/20"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((prev) => !prev)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      >
        <span className="text-xs font-semibold">i</span>
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={title}
          className="absolute right-0 z-20 mt-2 w-64 rounded-2xl bg-slate-900 p-4 text-left text-sm text-slate-100 shadow-xl"
        >
          <p className="font-semibold text-emerald-200">{title}</p>
          <ul className="mt-2 space-y-1 text-slate-300">
            {lines.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
          <button
            className="mt-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-emerald-400"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default Info;
