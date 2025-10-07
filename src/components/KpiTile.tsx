import InfoPopover, { InfoProps } from './InfoPopover';

export type KpiTileProps = {
  label: string;
  value: string | number;
  suffix?: string;
  sublabel?: string;
  info?: InfoProps;
  onClick?: () => void;
};

const KpiTile = ({ label, value, suffix, sublabel, info, onClick }: KpiTileProps) => {
  return (
    <button
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`card group flex w-full flex-col items-start gap-2 border border-slate-800 p-4 text-left transition hover:border-emerald-500/40 hover:shadow-emerald-500/20 ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
        {info ? <InfoPopover {...info} placement="left" /> : null}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-white">
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
        </span>
        {suffix ? <span className="text-sm text-slate-400">{suffix}</span> : null}
      </div>
      {sublabel ? <p className="text-xs text-slate-400">{sublabel}</p> : null}
    </button>
  );
};

export default KpiTile;
