/**
 * Atoms: re-usable UI primitives with Tailwind styling and built-in accessibility.
 */
import React from "react";
import clsx from "clsx";

type BadgeProps = {
  children: React.ReactNode;
  color?: "emerald" | "slate" | "amber";
  className?: string;
};

export const Badge: React.FC<BadgeProps> = ({ children, color = "emerald", className }) => {
  const styles = {
    emerald: "bg-emerald-500/15 text-emerald-200",
    slate: "bg-slate-800 text-slate-200",
    amber: "bg-amber-400/20 text-amber-200"
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        styles[color],
        className
      )}
    >
      {children}
    </span>
  );
};

type StatProps = {
  label: string;
  value: string;
  accent?: string;
  ariaLabel?: string;
};

export const Stat: React.FC<StatProps> = ({ label, value, accent, ariaLabel }) => (
  <div
    className="flex flex-col gap-1 rounded-2xl bg-slate-900/80 px-4 py-3 text-slate-100 shadow-soft"
    aria-label={ariaLabel ?? label}
  >
    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
    <span className="text-lg font-semibold text-white">{value}</span>
    {accent && <span className="text-xs text-emerald-300">{accent}</span>}
  </div>
);

type MeterProps = {
  label: string;
  value: number;
  max?: number;
  tone?: "emerald" | "amber" | "slate";
  helper?: string;
};

export const Meter: React.FC<MeterProps> = ({ label, value, max = 100, tone = "emerald", helper }) => {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const toneClass =
    tone === "emerald"
      ? "bg-gradient-to-r from-emerald-500 to-emerald-300"
      : tone === "amber"
      ? "bg-gradient-to-r from-amber-500 to-amber-300"
      : "bg-gradient-to-r from-slate-500 to-slate-300";
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={`${label} meter`}>
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-semibold text-slate-100">{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700">
        <div
          className={clsx("h-2 rounded-full transition-all", toneClass)}
          style={{ width: `${percent}%` }}
          role="meter"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {helper && <span className="text-xs text-slate-400">{helper}</span>}
    </div>
  );
};

type SectionTitleProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-slate-300">{subtitle}</p>}
    </div>
    {action}
  </div>
);
