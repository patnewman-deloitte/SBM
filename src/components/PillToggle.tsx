import React from 'react';

export type PillToggleOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  options: PillToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

const PillToggle = <T extends string>({ options, value, onChange }: Props<T>) => {
  return (
    <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-slate-900 p-1 text-xs">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-full px-3 py-1 font-medium transition ${
              active ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-emerald-500/10'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default PillToggle;
