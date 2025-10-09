import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import InfoPopover from '../../components/InfoPopover';
import KpiTile from '../../components/KpiTile';
import SelectionTray from '../../components/SelectionTray';
import Info from '../../components/Info';
import { useToast } from '../../components/ToastProvider';
import { simulateCampaign, AudienceSimInput } from '../../sim/tinySim';
import { useGlobalStore } from '../../store/global';
import type { Assumptions, Channel, MicroSegment, OfferArchetype, Segment } from '../../store/global';
import { ChannelKey, useAppStore } from '../../store/AppStore';

const channelKeyList: ChannelKey[] = ['Search', 'Social', 'Email', 'Retail', 'Field'];
const channelIdToKey: Record<string, ChannelKey> = {
  'ch-search': 'Search',
  'ch-social': 'Social',
  'ch-email': 'Email',
  'ch-retail': 'Retail',
  'ch-field': 'Field'
};

const nz = (v: number | null | undefined) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

type Maybe<T> = T | null | undefined;

type BuildAudienceDeps = {
  getMicro: (id: string) => Maybe<MicroSegment>;
  getSegment: (id: string) => Maybe<Segment>;
  defaultAssumptions: Assumptions;
};

function buildAudienceSimInputs(
  campaign: {
    audienceIds: string[];
    offer: OfferArchetype;
    channelMix?: Record<string, number>;
    channels?: Channel[];
    assumptions?: Assumptions;
  },
  deps: BuildAudienceDeps
): AudienceSimInput[] {
  const { getMicro, getSegment, defaultAssumptions } = deps;

  const out: AudienceSimInput[] = [];

  for (const audienceId of campaign.audienceIds ?? []) {
    const micro = getMicro(audienceId);
    const segment = getSegment(audienceId);

    if (!micro || !segment) continue;

    const segmentSize =
      nz((segment as any)?.size) ||
      nz((micro as any)?.segmentSize) ||
      nz((micro as any)?.sizeShare);

    out.push({
      micro,
      segment,
      offer: campaign.offer,
      channelMix: campaign.channelMix ?? {},
      assumptions: campaign.assumptions ?? defaultAssumptions,
      channels: campaign.channels ?? [],
      segmentSize,
    } as AudienceSimInput);
  }

  return out;
}

const infoCopy = {
  goalAudience: {
    _section:
      'Start by selecting a single measurable goal; the assistant will auto-tune tactics and budgets around it.',
    primaryGoal:
      'Choose one KPI to optimize (e.g., net adds, pre-orders, store visits). All pacing and testing will ladder to this.',
    targetSegment:
      'Pulled from Market Radar/Segment Studio. Edit here to narrow or broaden before building offers.',
    geoScope: 'Limit delivery to regions/ZIPs with inventory and positive expected ROI.'
  },
  offerBuilder: {
    _section: 'Assemble the offer. The engine checks competitiveness and margin in real time.',
    basePlan: 'Starting product or bundle. Impacts eligibility rules and device options.',
    priceTerm: 'Set list price, promo price, and duration. Term drives payback and clawback rules.',
    deviceOption: 'Choose BYOD or financed device; device promos can shift CAC and conversion.',
    incentives: 'Stackable promos (trade-in, gift cards, fee waivers). Keep within guardrails to preserve margin.',
    eligibilityRules:
      'Constraints like credit tiers, port-in only, new lines only, or address-level availability.'
  },
  channelMix: {
    _section:
      'Pick channels and the order they activate. The assistant will recommend weights and a simple flight plan.',
    channels:
      'Toggle on/off (paid social, search, programmatic, email/SMS, retail, telesales). Each has default CPM/CPC and reach.',
    weights: 'Initial budget split by channel. Use “Auto-allocate” to let the model set a starting mix.',
    flighting: 'Set start/end dates and bursts. Avoid overlapping heavy bursts across the same audience.'
  },
  creativeGuidance: {
    _section: 'Guidance powers copy/image suggestions and testing variants.',
    proposition:
      'One-line value statement tied to the goal and segment (e.g., “Switch now, keep your number, save $20/mo”).',
    mustInclude: 'Legal or brand phrases required in all assets.',
    personaAngle: 'Tone and hooks aligned to the segment (e.g., gamers, budget seekers, family planners).',
    variants: 'Number of creative variants per channel for lightweight A/B.'
  },
  budgetPacing: {
    _section: 'Set totals and boundaries; pacing auto-adjusts to hit your goal.',
    totalBudget: 'All-in spend cap, inclusive of media + promo costs if selected.',
    dailyCapRamp: 'Controls learning speed and spend smoothness; helpful for new geos.',
    cacGuardrail: 'Hard stop when modeled cost per acquisition exceeds this threshold.',
    inventoryConstraints: 'Optional device/installation caps by region to prevent overselling.'
  },
  measurementPlan: {
    _section: 'Define how success is measured and reported.',
    primaryKpi: 'Must match your goal. Drives optimization and weekly summaries.',
    secondaryKpis: 'Health metrics (CTR, CVR, ARPU delta, churn risk). Tracked but not optimized.',
    attribution: 'Pick method (MMM, MTA, rules-based). Defaults to pragmatic rules for near-term tests.',
    experimentSetup: 'Holdout or geo-split for lift; minimum sample sizes are auto-checked.'
  },
  riskCompliance: {
    _section: 'Pre-flight checks for brand, legal, and fairness.',
    brandGuardrails: 'Flags prohibited claims, tone, or imagery.',
    offerLegality: 'Validates price disclosures, promo durations, and regional restrictions.',
    fairnessScreen: 'Surfaces segmenting rules that may create bias; suggests neutral alternates.'
  },
  reviewExport: {
    _section: 'Lock the plan and share it.',
    autoSummary:
      'One-page summary with audience, offer, channels, budget, KPIs, and expected impact.',
    export: 'Download JSON for API handoff and PPT summary for stakeholders.',
    approvalChecklist: 'Confirms finance, legal, and operations sign-off before launch.'
  }
} as const;

export type PreviewModel = {
  goal: string;
  audience: string;
  geo: string;
  headline: string;
  sub: string;
  subject: string;
  preheader: string;
  price: { amount?: number; period?: string; promo?: string };
  bullets: string[];
  cta: { label: string; url: string };
  legal: string;
  persona?: string;
};

type DesignerFormState = {
  goal: string;
  audience: string;
  geo: string;
  subject: string;
  preheader: string;
  headline: string;
  sub: string;
  bullets: [string, string, string];
  ctaLabel: string;
  ctaUrl: string;
  legal: string;
  persona: string;
};

const tokenFallbacks: Record<string, string> = {
  first_name: 'Alex',
  city: 'Austin',
  plan: '5G Family',
  savings: '$20/mo'
};

const applyTokens = (value: string) =>
  value.replace(/{{\s*(\w+)\s*}}/g, (match, key) => tokenFallbacks[key] ?? match);

const selectPreviewModel = (form: DesignerFormState, offer: { price: number; promoMonths: number; promoValue: number }): PreviewModel => {
  const bullets = form.bullets.map((item) => item.trim()).filter(Boolean);
  return {
    goal: form.goal.trim() || 'Drive net adds',
    audience: form.audience.trim() || 'Priority micro-segments',
    geo: form.geo.trim() || 'National',
    headline: form.headline.trim() || 'Switch now, keep your number.',
    sub: form.sub.trim() || 'Bundle mobile + internet for the best savings.',
    subject: form.subject.trim() || 'Unlock exclusive savings today',
    preheader: form.preheader.trim() || 'Limited-time offer curated for your household.',
    price: {
      amount: Number.isFinite(offer.price) ? Number(offer.price) : undefined,
      period: offer.promoMonths ? `${offer.promoMonths}-month intro` : undefined,
      promo: offer.promoValue ? `$${offer.promoValue} bill credits` : undefined
    },
    bullets: bullets.length ? bullets : ['Same-day activation', 'Unlimited 5G data', 'Device credits for trade-ins'],
    cta: {
      label: form.ctaLabel.trim() || 'Build my plan',
      url: form.ctaUrl.trim() || 'sbm.io/offers'
    },
    legal:
      form.legal.trim() ||
      'Taxes, fees, and autopay discount apply. Credit approval required. Offers vary by location.',
    persona: form.persona.trim() || undefined
  };
};

const previewFrames = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'ad', label: 'Ad' },
  { key: 'landing', label: 'Landing' }
] as const;

type PreviewFrameKey = (typeof previewFrames)[number]['key'];

const modelsEqual = (a: PreviewModel | null, b: PreviewModel | null) => {
  if (!a || !b) return false;
  return (
    a.goal === b.goal &&
    a.audience === b.audience &&
    a.geo === b.geo &&
    a.headline === b.headline &&
    a.sub === b.sub &&
    a.subject === b.subject &&
    a.preheader === b.preheader &&
    a.legal === b.legal &&
    a.persona === b.persona &&
    a.cta.label === b.cta.label &&
    a.cta.url === b.cta.url &&
    a.price.amount === b.price.amount &&
    a.price.period === b.price.period &&
    a.price.promo === b.price.promo &&
    a.bullets.length === b.bullets.length &&
    a.bullets.every((value, index) => value === b.bullets[index])
  );
};

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

const tooltipPlacements: Record<TooltipPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2',
  left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2',
  right: 'left-full top-1/2 -translate-y-1/2 translate-x-2'
};

const InfoTooltip: React.FC<{ id: string; text: string; placement: TooltipPlacement; open: boolean }> = ({
  id,
  text,
  placement,
  open
}) => {
  if (!open) return null;
  return (
    <div
      id={id}
      role="tooltip"
      className={`pointer-events-none absolute z-50 max-w-xs rounded-md border border-emerald-500/30 bg-slate-950/95 px-3 py-2 text-left text-xs text-slate-100 shadow-lg shadow-emerald-500/20 sm:max-w-sm ${tooltipPlacements[placement]}`}
    >
      {text}
    </div>
  );
};

const InfoIcon: React.FC<{ text: string; placement?: TooltipPlacement; testId: string }> = ({
  text,
  placement = 'top',
  testId
}) => {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const tooltipId = `${id}-tooltip`;

  React.useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-emerald-400/70 bg-slate-900/80 text-[10px] font-semibold uppercase leading-none text-emerald-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        aria-label="More info"
        aria-describedby={open ? tooltipId : undefined}
        data-testid={testId}
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      >
        i
      </button>
      <InfoTooltip id={tooltipId} text={text} placement={placement} open={open} />
    </span>
  );
};

interface FieldLabelProps extends React.PropsWithChildren<{
  label: string;
  info?: string;
  infoTestId?: string;
  infoPlacement?: TooltipPlacement;
  className?: string;
  htmlFor?: string;
}> {}

const FieldLabel: React.FC<FieldLabelProps> = ({
  label,
  info,
  infoTestId,
  infoPlacement = 'top',
  className,
  htmlFor,
  children
}) => {
  return (
    <label
      className={`flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400 ${className ?? ''}`}
      htmlFor={htmlFor}
    >
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {info && infoTestId ? (
          <InfoIcon text={info} placement={infoPlacement} testId={infoTestId} />
        ) : null}
      </span>
      {children}
    </label>
  );
};

const SectionHeader: React.FC<{
  title: string;
  info?: string;
  infoTestId?: string;
  placement?: TooltipPlacement;
  actions?: React.ReactNode;
}> = ({ title, info, infoTestId, placement = 'top', actions }) => {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {info && infoTestId ? (
          <InfoIcon text={info} placement={placement} testId={infoTestId} />
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
};

const QuickEditButton: React.FC<{
  fieldKey: string;
  label: string;
  testId: string;
  onQuickEdit?: (fieldKey: string) => void;
}> = ({ fieldKey, label, testId, onQuickEdit }) => {
  if (!onQuickEdit) return null;
  return (
    <button
      type="button"
      title={`Edit ${label}`}
      aria-label={`Edit ${label}`}
      data-testid={testId}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-xs text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      onClick={() => onQuickEdit(fieldKey)}
    >
      ✎
    </button>
  );
};

const CampaignPreview: React.FC<{
  model: PreviewModel;
  frame: PreviewFrameKey;
  onFrameChange: (frame: PreviewFrameKey) => void;
  onQuickEdit?: (fieldKey: string) => void;
}> = ({ model, frame, onFrameChange, onQuickEdit }) => {
  const priceMain = model.price.amount ? `$${model.price.amount.toFixed(0)}` : 'Custom quote';
  const priceDetail = [model.price.period, model.price.promo].filter(Boolean).join(' • ');
  const heroHeadline = applyTokens(model.headline);
  const heroSub = applyTokens(model.sub);
  const subject = applyTokens(model.subject);
  const preheader = applyTokens(model.preheader);
  const bullets = model.bullets.slice(0, 3).map((line) => applyTokens(line));
  const ctaLabel = applyTokens(model.cta.label);
  const legal = applyTokens(model.legal);
  const persona = model.persona ? applyTokens(model.persona) : undefined;

  const smsMessageBase = [heroHeadline, heroSub, priceMain !== 'Custom quote' ? `${priceMain} ${priceDetail}`.trim() : '', ctaLabel]
    .filter(Boolean)
    .join(' • ');
  const smsFull = applyTokens(`${smsMessageBase} ${model.cta.url}`.trim());
  const smsTrimmed = smsFull.length > 160 ? `${smsFull.slice(0, 157)}…` : smsFull;
  const smsCount = Math.min(smsFull.length, 160);

  return (
    <div
      data-testid="preview-root"
      className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 shadow-xl shadow-black/40 backdrop-blur sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-200">{model.goal}</p>
          <p className="text-sm text-slate-300">{model.audience}</p>
          <p className="text-xs text-slate-500">{model.geo}</p>
        </div>
        <div
          role="tablist"
          aria-label="Preview frame"
          className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 p-1 text-xs text-slate-300"
        >
          {previewFrames.map((option) => (
            <button
              key={option.key}
              role="tab"
              type="button"
              aria-selected={frame === option.key}
              className={`min-w-[56px] rounded-full px-3 py-1 font-medium transition ${
                frame === option.key
                  ? 'bg-emerald-500/20 text-emerald-200 shadow-inner shadow-emerald-500/40'
                  : 'hover:text-emerald-200'
              }`}
              onClick={() => onFrameChange(option.key)}
              data-testid={`preview-tab-${option.key}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 space-y-5">
        {frame === 'email' ? (
          <div className="space-y-4 text-sm text-slate-200">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-emerald-200">Subject</p>
              <p className="text-base font-semibold text-white" data-testid="preview-subject">
                {subject}
              </p>
              <p className="text-xs text-slate-400">{preheader}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/60">
              <div className="aspect-[16/9] rounded-t-xl bg-slate-900/60" />
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-white" data-testid="preview-headline">
                      {heroHeadline}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">{heroSub}</p>
                  </div>
                  <QuickEditButton
                    fieldKey="headline"
                    label="headline"
                    testId="qe-headline"
                    onQuickEdit={onQuickEdit}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-100"
                      data-testid="preview-price"
                    >
                      {priceMain}
                    </span>
                    {priceDetail ? <span className="text-xs text-slate-400">{priceDetail}</span> : null}
                  </div>
                  <QuickEditButton
                    fieldKey="price"
                    label="price"
                    testId="qe-price"
                    onQuickEdit={onQuickEdit}
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <ul className="list-disc space-y-1 pl-4 text-sm" data-testid="preview-bullets">
                    {bullets.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                  <QuickEditButton
                    fieldKey="bullets"
                    label="bullets"
                    testId="qe-bullets"
                    onQuickEdit={onQuickEdit}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    data-testid="preview-cta"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    {ctaLabel}
                  </button>
                  <QuickEditButton
                    fieldKey="cta"
                    label="CTA"
                    testId="qe-cta"
                    onQuickEdit={onQuickEdit}
                  />
                </div>
                <div className="h-px bg-slate-700/60" />
                <p className="prose prose-invert max-w-none text-xs text-slate-400" data-testid="preview-legal">
                  {legal}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        {frame === 'sms' ? (
          <div className="space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>SMS preview</span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
                {smsCount}/160
              </span>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-inner shadow-black/20">
              <p className="text-xs text-slate-400">SBM Offers • {persona ?? 'Acquisition Team'}</p>
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-100" data-testid="preview-sms">
                {smsTrimmed}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                <span>sbm.io/offers</span>
              </div>
            </div>
          </div>
        ) : null}
        {frame === 'ad' ? (
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100">
            <div className="absolute inset-3 rounded-2xl border border-dashed border-white/15" aria-hidden />
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>SBM</span>
                <span>{persona ?? model.audience}</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-white" data-testid="preview-headline">
                  {heroHeadline}
                </h3>
                <p className="text-sm text-slate-300">{heroSub}</p>
                <div className="inline-flex items-center gap-2">
                  <span
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-100"
                    data-testid="preview-price"
                  >
                    {priceMain}
                  </span>
                  {priceDetail ? <span className="text-xs text-slate-400">{priceDetail}</span> : null}
                </div>
                <div
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200"
                  data-testid="preview-cta"
                >
                  <span>{ctaLabel}</span>
                  <span className="text-slate-500">›</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {frame === 'landing' ? (
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex flex-col gap-5 lg:flex-row">
                <div className="flex-1 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-200">Campaign landing</p>
                  <h2 className="text-3xl font-semibold text-white" data-testid="preview-headline">
                    {heroHeadline}
                  </h2>
                  <p className="text-sm text-slate-300">{heroSub}</p>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                    data-testid="preview-cta"
                  >
                    Choose plan
                  </button>
                </div>
                <div className="flex-1 space-y-3 rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{model.cta.label || 'Featured bundle'}</p>
                    <span
                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-100"
                      data-testid="preview-price"
                    >
                      {priceMain}
                    </span>
                  </div>
                  {priceDetail ? <p className="text-xs text-slate-400">{priceDetail}</p> : null}
                  <div className="aspect-[16/9] rounded-xl bg-slate-800/60" />
                  <ul className="list-disc space-y-1 pl-4 text-xs text-slate-300" data-testid="preview-bullets">
                    {bullets.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">5G ready</span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">Same-day activation</span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">Local install partners</span>
            </div>
            <p className="prose prose-invert max-w-none text-xs text-slate-500">{legal}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const CampaignDesigner: React.FC = () => {
  const assumptions = useGlobalStore((s) => s.assumptions);
  const channels = useGlobalStore((s) => s.channels);
  const offers = useGlobalStore((s) => s.offers);
  const segments = useGlobalStore((s) => s.segments);
  const microSegmentsByParent = useGlobalStore((s) => s.microSegmentsByParent);
  const campaign = useGlobalStore((s) => s.campaign);
  const updateCampaign = useGlobalStore((s) => s.updateCampaign);
  const navigate = useNavigate();
  const { campaigns: liveCampaigns, launchCampaign, scoreImpact } = useAppStore();
  const { pushToast } = useToast();

  const [launchOpen, setLaunchOpen] = React.useState(false);

  const [savedScenarios, setSavedScenarios] = React.useState<
    {
      id: string;
      label: string;
      payback: number | string;
      gm12: number;
      conversion: number;
      netAdds: number;
    }[]
  >([]);

  const [formState, setFormState] = React.useState<DesignerFormState>(() => ({
    goal: 'Boost net adds this quarter',
    audience: 'Young families upgrading devices',
    geo: 'Top 20 DMAs',
    subject: 'Unlock {{savings}} when you move to {{plan}}',
    preheader: 'Limited-time upgrade for {{city}} households — ends soon.',
    headline: 'Switch now. Keep your number.',
    sub: 'Bundle mobile + home internet to maximize savings and coverage.',
    bullets: ['Same-day activation', 'Unlimited 5G data', 'Device credits for trade-ins'],
    ctaLabel: 'Build my plan',
    ctaUrl: 'sbm.io/offers',
    legal:
      'Taxes, fees, and autopay discount apply. Credit approval required. Offers vary by location.',
    persona: 'Digital-forward families'
  }));

  const updateFormState = React.useCallback((patch: Partial<DesignerFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateBullet = React.useCallback((index: number, value: string) => {
    setFormState((prev) => {
      const next: DesignerFormState['bullets'] = [...prev.bullets] as DesignerFormState['bullets'];
      next[index] = value;
      return { ...prev, bullets: next };
    });
  }, []);

  const headlineRef = React.useRef<HTMLInputElement>(null);
  const priceRef = React.useRef<HTMLInputElement>(null);
  const bulletRef1 = React.useRef<HTMLInputElement>(null);
  const bulletRef2 = React.useRef<HTMLInputElement>(null);
  const bulletRef3 = React.useRef<HTMLInputElement>(null);
  const ctaRef = React.useRef<HTMLInputElement>(null);
  const headlineContainerRef = React.useRef<HTMLDivElement>(null);
  const priceContainerRef = React.useRef<HTMLLabelElement>(null);
  const bulletContainerRef = React.useRef<HTMLDivElement>(null);
  const ctaContainerRef = React.useRef<HTMLDivElement>(null);
  const highlightTimers = React.useRef<Record<string, number>>({});
  const bulletRefs = [bulletRef1, bulletRef2, bulletRef3];
  const [variantCount, setVariantCount] = React.useState(3);

  const microMap = React.useMemo(() => {
    const map = new Map<string, { parentId: string; data: MicroSegment }>();
    Object.entries(microSegmentsByParent).forEach(([parentId, items]) => {
      items.forEach((item) => {
        map.set(item.id, { parentId, data: item });
      });
    });
    return map;
  }, [microSegmentsByParent]);

  const segmentMap = React.useMemo(() => {
    const map = new Map<string, Segment>();
    segments.forEach((segment) => {
      map.set(segment.id, segment);
    });
    return map;
  }, [segments]);

  const audienceDeps = React.useMemo<BuildAudienceDeps>(() => ({
    getMicro: (id) => microMap.get(id)?.data ?? null,
    getSegment: (id) => {
      const entry = microMap.get(id);
      if (!entry) return null;
      return segmentMap.get(entry.parentId) ?? null;
    },
    defaultAssumptions: assumptions,
  }), [assumptions, microMap, segmentMap]);

  const audiences = React.useMemo(() => {
    return campaign.audienceIds.flatMap((audienceId) => {
      const offer = campaign.offerByAudience[audienceId] ?? offers[0];
      const mix = campaign.channelMixByAudience[audienceId] ?? {};
      return buildAudienceSimInputs(
        {
          audienceIds: [audienceId],
          offer,
          channelMix: mix,
          channels,
          assumptions,
        },
        audienceDeps
      );
    });
  }, [
    assumptions,
    audienceDeps,
    campaign.audienceIds,
    campaign.channelMixByAudience,
    campaign.offerByAudience,
    channels,
    offers,
  ]);

  const simResults = React.useMemo(() => {
    if (!audiences.length) {
      return null;
    }
    return simulateCampaign({ audiences });
  }, [audiences]);

  const handleOfferChange = (audienceId: string, patch: Partial<typeof offers[number]>) => {
    const next = { ...campaign.offerByAudience };
    const base = next[audienceId] ?? offers[0];
    next[audienceId] = { ...base, ...patch };
    updateCampaign({ offerByAudience: next });
  };

  const handleChannelChange = (audienceId: string, channelId: string, value: number) => {
    const baseMix =
      campaign.channelMixByAudience[audienceId] ??
      channels.reduce((acc, channel) => {
        acc[channel.id] = 1 / Math.max(1, channels.length);
        return acc;
      }, {} as Record<string, number>);
    const mix = { ...baseMix };
    mix[channelId] = value;
    const total = Object.values(mix).reduce((sum, weight) => sum + weight, 0) || 1;
    const normalised = Object.fromEntries(Object.entries(mix).map(([id, weight]) => [id, weight / total]));
    updateCampaign({ channelMixByAudience: { ...campaign.channelMixByAudience, [audienceId]: normalised } });
  };

  const saveScenario = () => {
    if (!simResults) return;
    const label = `Scenario ${savedScenarios.length + 1}`;
    setSavedScenarios([
      ...savedScenarios,
      {
        id: `${Date.now()}`,
        label,
        payback: simResults.blended.paybackMonths,
        gm12: simResults.blended.gm12m,
        conversion: simResults.blended.conversionRate,
        netAdds: simResults.blended.netAdds
      }
    ]);
  };

  const winning = React.useMemo(() => {
    if (!simResults) return null;
    const options = [
      {
        id: 'current',
        label: 'Current plan',
        payback: simResults.blended.paybackMonths,
        gm12: simResults.blended.gm12m,
        conversion: simResults.blended.conversionRate,
        netAdds: simResults.blended.netAdds
      },
      ...savedScenarios
    ];
    return options.reduce((best, scenario) => {
      const bestPayback = typeof best.payback === 'number' ? best.payback : 25;
      const scenarioPayback = typeof scenario.payback === 'number' ? scenario.payback : 25;
      return scenarioPayback < bestPayback ? scenario : best;
    });
  }, [savedScenarios, simResults]);

  const aggregatedCohorts = React.useMemo(() => {
    return campaign.audienceIds
      .map((id) => {
        const entry = microMap.get(id);
        if (!entry) return null;
        const segment = segmentMap.get(entry.parentId);
        if (!segment) return null;
        const segmentSize = nz(segment.size);
        const share = nz(entry.data.sizeShare);
        return {
          id,
          name: `${segment.name} — ${entry.data.name}`,
          size: Math.round(segmentSize * share)
        };
      })
      .filter((value): value is { id: string; name: string; size: number } => Boolean(value));
  }, [campaign.audienceIds, microMap, segmentMap]);

  const aggregatedChannels = React.useMemo(() => {
    const totals: Record<ChannelKey, number> = {
      Search: 0,
      Social: 0,
      Email: 0,
      Retail: 0,
      Field: 0
    };
    let weightSum = 0;
    campaign.audienceIds.forEach((id) => {
      const entry = microMap.get(id);
      if (!entry) return;
      const mix = campaign.channelMixByAudience[id] ?? {};
      const weight = nz(entry.data.sizeShare);
      weightSum += weight;
      Object.entries(mix).forEach(([channelId, value]) => {
        const key = channelIdToKey[channelId];
        if (!key) return;
        totals[key] += value * weight;
      });
    });
    if (weightSum === 0) return totals;
    return channelKeyList.reduce((acc, key) => {
      acc[key] = Number((totals[key] / weightSum).toFixed(3));
      return acc;
    }, {} as Record<ChannelKey, number>);
  }, [campaign.audienceIds, campaign.channelMixByAudience, microMap]);

  const aggregatedOffer = React.useMemo(() => {
    let totalWeight = 0;
    let price = 0;
    let promoMonths = 0;
    let promoValue = 0;
    let deviceSubsidy = 0;
    campaign.audienceIds.forEach((id) => {
      const entry = microMap.get(id);
      if (!entry) return;
      const offer = campaign.offerByAudience[id] ?? offers[0];
      const weight = nz(entry.data.sizeShare);
      totalWeight += weight;
      price += offer.monthlyPrice * weight;
      promoMonths += offer.promoMonths * weight;
      promoValue += offer.promoValue * weight;
      deviceSubsidy += offer.deviceSubsidy * weight;
    });
    if (totalWeight === 0) {
      const fallback = offers[0];
      return {
        price: fallback.monthlyPrice,
        promoMonths: fallback.promoMonths,
        promoValue: fallback.promoValue,
        deviceSubsidy: fallback.deviceSubsidy
      };
    }
    return {
      price: Number((price / totalWeight).toFixed(2)),
      promoMonths: Math.round(promoMonths / totalWeight),
      promoValue: Math.round(promoValue / totalWeight),
      deviceSubsidy: Math.round(deviceSubsidy / totalWeight)
    };
  }, [campaign.audienceIds, campaign.offerByAudience, microMap, offers]);

  const previewModel = React.useMemo(
    () => selectPreviewModel(formState, aggregatedOffer),
    [aggregatedOffer, formState]
  );

  const [frame, setFrame] = React.useState<PreviewFrameKey>('email');
  const [locked, setLocked] = React.useState(false);
  const [displayModel, setDisplayModel] = React.useState<PreviewModel>(previewModel);
  const [pendingModel, setPendingModel] = React.useState<PreviewModel | null>(null);

  React.useEffect(() => {
    if (!locked) {
      setDisplayModel(previewModel);
      setPendingModel(null);
      return;
    }
    setPendingModel(previewModel);
  }, [locked, previewModel]);

  const hasPending = Boolean(locked && pendingModel && !modelsEqual(pendingModel, displayModel));
  const activeModel = locked ? displayModel : previewModel;

  const applyPending = React.useCallback(() => {
    if (pendingModel) {
      setDisplayModel(pendingModel);
      setPendingModel(pendingModel);
    }
  }, [pendingModel]);

  const handleLockToggle = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.checked;
      setLocked(next);
      if (!next) {
        setDisplayModel(previewModel);
        setPendingModel(null);
      }
    },
    [previewModel]
  );

  const onQuickEdit = React.useCallback(
    (key: string) => {
      const focusTarget =
        key === 'headline'
          ? headlineRef.current
          : key === 'price'
          ? priceRef.current
          : key === 'bullets'
          ? bulletRef1.current
          : key === 'cta'
          ? ctaRef.current
          : null;
      if (focusTarget) {
        focusTarget.focus();
      }
      const container =
        key === 'headline'
          ? headlineContainerRef.current
          : key === 'price'
          ? priceContainerRef.current
          : key === 'bullets'
          ? bulletContainerRef.current
          : key === 'cta'
          ? ctaContainerRef.current
          : null;
      if (container) {
        container.classList.add('ring-2', 'ring-emerald-400/70', 'ring-offset-2', 'ring-offset-slate-950');
        const clear = typeof window !== 'undefined' ? window.clearTimeout : clearTimeout;
        const schedule = typeof window !== 'undefined' ? window.setTimeout : setTimeout;
        const existing = highlightTimers.current[key];
        if (existing) {
          clear(existing);
        }
        highlightTimers.current[key] = schedule(() => {
          container.classList.remove('ring-2', 'ring-emerald-400/70', 'ring-offset-2', 'ring-offset-slate-950');
        }, 1500);
      }
    },
    []
  );

  const launchReady = Boolean(simResults && campaign.audienceIds.length);
  const viewMonitoringDisabled = liveCampaigns.length === 0;

  const exportSummary = React.useCallback(() => {
    if (!simResults) return;
    const audienceLines = campaign.audienceIds
      .map((id) => {
        const entry = microMap.get(id);
        if (!entry) return null;
        const segment = segmentMap.get(entry.parentId);
        if (!segment) return null;
        return `- ${segment.name} • ${entry.data.name}`;
      })
      .filter((line): line is string => Boolean(line));
    const summaryLines = [
      'Campaign Summary',
      `Total budget: $${campaign.budgetTotal.toLocaleString()}`,
      'Audiences:',
      ...audienceLines,
      '',
      `Payback: ${typeof simResults.blended.paybackMonths === 'number' ? `${simResults.blended.paybackMonths} months` : simResults.blended.paybackMonths}`,
      `12-month GM: $${simResults.blended.gm12m.toLocaleString()}`,
      `Conversion: ${(simResults.blended.conversionRate * 100).toFixed(1)}%`,
      `Net adds: ${simResults.blended.netAdds.toLocaleString()}`,
      '',
      `Winning plan: ${winning ? winning.label : 'Current plan'}`
    ];
    const blob = new Blob([summaryLines.join('\n')], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign-summary.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }, [campaign.audienceIds, campaign.budgetTotal, microMap, segmentMap, simResults, winning]);

  const confirmLaunch = React.useCallback(() => {
    if (!simResults || !aggregatedCohorts.length) return;
    const heuristics = scoreImpact(aggregatedChannels, {
      price: aggregatedOffer.price,
      promoMonths: aggregatedOffer.promoMonths,
      promoValue: aggregatedOffer.promoValue,
      deviceSubsidy: aggregatedOffer.deviceSubsidy
    });
    const paybackValue =
      typeof simResults.blended.paybackMonths === 'number'
        ? simResults.blended.paybackMonths
        : heuristics.paybackMo;
    const launched = launchCampaign({
      name: `${winning ? winning.label : 'Studio Activation'} Launch`,
      cohorts: aggregatedCohorts.map((cohort) => ({
        id: cohort.id,
        name: cohort.name,
        size: cohort.size
      })),
      channels: aggregatedChannels,
      offer: {
        price: aggregatedOffer.price,
        promoMonths: aggregatedOffer.promoMonths,
        promoValue: aggregatedOffer.promoValue,
        deviceSubsidy: aggregatedOffer.deviceSubsidy
      },
      agent: 'Acquisition',
      kpis: {
        cvr: Number((simResults.blended.conversionRate * 100).toFixed(2)),
        arpuDelta: heuristics.arpuDelta,
        gm12: simResults.blended.gm12m,
        netAdds: simResults.blended.netAdds,
        paybackMo: Number(paybackValue.toFixed(2)),
        npsDelta: heuristics.npsDelta
      }
    });
    setLaunchOpen(false);
    pushToast({ description: 'Campaign launched to Execution Hub.', variant: 'success' });
    navigate('/execution-hub', { state: { selectedCampaignId: launched.id, fromLaunch: true } });
  }, [
    aggregatedChannels,
    aggregatedCohorts,
    aggregatedOffer,
    launchCampaign,
    navigate,
    pushToast,
    scoreImpact,
    simResults,
    winning
  ]);

  return (
    <>
      <div className="space-y-6">
      <div className="card border border-emerald-500/20 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Offering & Campaign Designer</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Design offers, channel mixes, and budgets for selected micro-segments, then simulate impact before exporting a leadership-ready summary.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Info
              title="Campaign Designer overview"
              body={(
                <>
                  <p><strong>How it is used:</strong> Tune pricing, promotions, and channel mix until guardrails are met.</p>
                  <p><strong>What it means:</strong> tinySim powers the live KPIs using synthetic economics and telemetry.</p>
                </>
              )}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${launchReady
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                  : 'border-slate-700 bg-slate-900/60 text-slate-500'
                  }`}
                onClick={() => setLaunchOpen(true)}
                disabled={!launchReady}
              >
                Launch to Execution Hub
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${viewMonitoringDisabled
                  ? 'border-slate-700 bg-slate-900/60 text-slate-500'
                  : 'border-slate-700 text-slate-200 hover:border-emerald-400/60 hover:text-emerald-200'
                  }`}
                onClick={() => navigate('/monitoring')}
                disabled={viewMonitoringDisabled}
              >
                View Monitoring
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
          <div className="flex items-start gap-2">
            <InfoPopover title="Align inputs" description="Adjust offer and channel levers to hit guardrails." />
            <span>Use the left rail controls to tweak pricing, promos, and channel allocations.</span>
          </div>
          <div className="flex items-start gap-2">
            <InfoPopover title="Simulate instantly" description="KPIs update as soon as you change assumptions." />
            <span>Watch payback, margin, and conversion respond immediately in the dashboard.</span>
          </div>
          <div className="flex items-start gap-2">
            <InfoPopover title="Share the story" description="Export a polished summary for stakeholders." />
            <span>Capture the winning play and export a PDF summary for leadership.</span>
          </div>
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] lg:items-start lg:gap-6">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-emerald-400">How to use</p>
                <InfoPopover title="How to use" description="Start with guardrails, then iterate on offers and channels." />
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Design and simulate offers, bundles, and channel mixes for your selected sub-segments. Adjust inputs to see conversion, CAC payback, and margin update in real time.
              </p>
            </div>
            <div className="card border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Audiences</h3>
                <InfoPopover title="Audiences" description="Micro-segments currently in scope for this campaign." />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {campaign.audienceIds.map((id) => {
                  const entry = microMap.get(id);
                  const segment = entry ? segmentMap.get(entry.parentId) : undefined;
                  return (
                    <span key={id} className="info-chip">
                      {segment?.name} • {entry?.data.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="card border border-slate-800 p-4">
            <SectionHeader
              title="Budget, Pacing & Constraints"
              info={infoCopy.budgetPacing._section}
              infoTestId="ocd-info-budgetPacing-section"
            />
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              <FieldLabel
                label="Total budget"
                info={infoCopy.budgetPacing.totalBudget}
                infoTestId="ocd-info-budgetPacing-totalBudget"
                htmlFor="budget-total"
              >
                <input
                  id="budget-total"
                  type="number"
                  value={campaign.budgetTotal}
                  onChange={(event) => updateCampaign({ budgetTotal: Number(event.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <div className="grid gap-2 md:grid-cols-2">
                <FieldLabel
                  label="CAC/CPA guardrail"
                  info={infoCopy.budgetPacing.cacGuardrail}
                  infoTestId="ocd-info-budgetPacing-cacGuardrail"
                  htmlFor="budget-cac"
                >
                  <input
                    id="budget-cac"
                    type="number"
                    value={campaign.guardrails.cacCeiling ?? ''}
                    onChange={(event) =>
                      updateCampaign({ guardrails: { ...campaign.guardrails, cacCeiling: Number(event.target.value) } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </FieldLabel>
                <FieldLabel label="Payback target" htmlFor="budget-payback">
                  <input
                    id="budget-payback"
                    type="number"
                    value={campaign.guardrails.paybackTarget ?? ''}
                    onChange={(event) =>
                      updateCampaign({ guardrails: { ...campaign.guardrails, paybackTarget: Number(event.target.value) } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </FieldLabel>
              </div>
            </div>
            <details className="mt-3 space-y-2 text-sm text-slate-300">
              <summary className="flex cursor-pointer items-center gap-2 text-xs uppercase tracking-wide text-emerald-400">
                Advanced assumptions
                <InfoPopover title="Advanced assumptions" description="Prototype keeps these fixed; adjust offline for deeper what-ifs." />
              </summary>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                Margin %
                <input
                  type="number"
                  step={0.01}
                  value={assumptions.grossMarginRate}
                  onChange={(event) => updateCampaign({})}
                  disabled
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </label>
              <p className="text-xs text-slate-500">Assumptions fixed for prototype; adjust in tinySim for deeper what-ifs.</p>
            </details>
          </div>
          <div className="card border border-slate-800 p-4">
            <SectionHeader
              title="Campaign Goal & Audience"
              info={infoCopy.goalAudience._section}
              infoTestId="ocd-info-goalAudience-section"
            />
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              <FieldLabel
                label="Primary goal"
                info={infoCopy.goalAudience.primaryGoal}
                infoTestId="ocd-info-goalAudience-primaryGoal"
                htmlFor="goal-primary"
              >
                <input
                  id="goal-primary"
                  type="text"
                  value={formState.goal}
                  onChange={(event) => updateFormState({ goal: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel
                label="Target segment"
                info={infoCopy.goalAudience.targetSegment}
                infoTestId="ocd-info-goalAudience-targetSegment"
                htmlFor="goal-segment"
              >
                <textarea
                  id="goal-segment"
                  rows={3}
                  value={formState.audience}
                  onChange={(event) => updateFormState({ audience: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel
                label="Geo scope"
                info={infoCopy.goalAudience.geoScope}
                infoTestId="ocd-info-goalAudience-geoScope"
                htmlFor="goal-geo"
              >
                <input
                  id="goal-geo"
                  type="text"
                  value={formState.geo}
                  onChange={(event) => updateFormState({ geo: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
            </div>
          </div>
          <div className="card border border-slate-800 p-4">
            <SectionHeader
              title="Creative Guidance"
              info={infoCopy.creativeGuidance._section}
              infoTestId="ocd-info-creativeGuidance-section"
            />
            <div className="mt-3 space-y-4 text-sm text-slate-300">
              <FieldLabel label="Subject line" htmlFor="creative-subject">
                <input
                  id="creative-subject"
                  type="text"
                  value={formState.subject}
                  onChange={(event) => updateFormState({ subject: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel label="Preheader" htmlFor="creative-preheader">
                <input
                  id="creative-preheader"
                  type="text"
                  value={formState.preheader}
                  onChange={(event) => updateFormState({ preheader: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <div
                ref={headlineContainerRef}
                className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <FieldLabel
                  label="Proposition"
                  info={infoCopy.creativeGuidance.proposition}
                  infoTestId="ocd-info-creativeGuidance-proposition"
                  htmlFor="creative-headline"
                >
                  <input
                    id="creative-headline"
                    ref={headlineRef}
                    type="text"
                    value={formState.headline}
                    onChange={(event) => updateFormState({ headline: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </FieldLabel>
                <FieldLabel label="Supporting subhead" htmlFor="creative-subhead">
                  <textarea
                    id="creative-subhead"
                    rows={2}
                    value={formState.sub}
                    onChange={(event) => updateFormState({ sub: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </FieldLabel>
              </div>
              <div
                ref={bulletContainerRef}
                className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">Benefit bullets</p>
                {bulletRefs.map((ref, index) => (
                  <input
                    key={index}
                    ref={ref}
                    type="text"
                    value={formState.bullets[index]}
                    onChange={(event) => updateBullet(index, event.target.value)}
                    placeholder={`Bullet ${index + 1}`}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                ))}
              </div>
              <div
                ref={ctaContainerRef}
                className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <FieldLabel label="CTA label" htmlFor="creative-cta-label">
                  <input
                    id="creative-cta-label"
                    ref={ctaRef}
                    type="text"
                    value={formState.ctaLabel}
                    onChange={(event) => updateFormState({ ctaLabel: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </FieldLabel>
                <FieldLabel label="CTA URL" htmlFor="creative-cta-url">
                  <input
                    id="creative-cta-url"
                    type="text"
                    value={formState.ctaUrl}
                    onChange={(event) => updateFormState({ ctaUrl: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </FieldLabel>
              </div>
              <FieldLabel
                label="Must-include claims"
                info={infoCopy.creativeGuidance.mustInclude}
                infoTestId="ocd-info-creativeGuidance-mustInclude"
                htmlFor="creative-claims"
              >
                <textarea
                  id="creative-claims"
                  rows={3}
                  value={formState.legal}
                  onChange={(event) => updateFormState({ legal: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel
                label="Persona angle"
                info={infoCopy.creativeGuidance.personaAngle}
                infoTestId="ocd-info-creativeGuidance-personaAngle"
                htmlFor="creative-persona"
              >
                <input
                  id="creative-persona"
                  type="text"
                  value={formState.persona}
                  onChange={(event) => updateFormState({ persona: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel
                label="Variants"
                info={infoCopy.creativeGuidance.variants}
                infoTestId="ocd-info-creativeGuidance-variants"
                htmlFor="creative-variants"
              >
                <input
                  id="creative-variants"
                  type="number"
                  min={1}
                  max={6}
                  value={variantCount}
                  onChange={(event) => setVariantCount(Number(event.target.value))}
                  className="mt-1 w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
            </div>
          </div>
          <div className="card border border-slate-800 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Campaign concept placeholder</h3>
                <p className="mt-1 text-sm text-slate-300">Use this visual as a stand-in for the eventual creative cover your team will produce.</p>
              </div>
              <InfoPopover title="Campaign concept" description="Placeholder showing how a finalized cover could appear." />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-6 text-white shadow-inner shadow-emerald-500/20">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Winning Play</p>
                <h4 className="mt-3 text-2xl font-semibold">{winning ? winning.label : 'Current plan'}</h4>
                <p className="mt-2 max-w-md text-sm text-emerald-100">
                  Digital-first bundles for priority micro-segments with tight promo discipline and high-margin channel mix.
                </p>
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase text-emerald-200">
                      <span>Payback</span>
                      <InfoPopover title="Payback highlight" description="Shows the timeline to recover acquisition costs for the leading scenario." />
                    </div>
                    <p className="text-lg font-semibold">{simResults ? (typeof simResults.blended.paybackMonths === 'number' ? `${simResults.blended.paybackMonths} mo` : simResults.blended.paybackMonths) : '–'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase text-emerald-200">
                      <span>12-mo GM</span>
                      <InfoPopover title="Gross margin highlight" description="Captures first-year gross margin after servicing and subsidies." />
                    </div>
                    <p className="text-lg font-semibold">{simResults ? `$${simResults.blended.gm12m.toLocaleString()}` : '–'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase text-emerald-200">
                      <span>Conversion</span>
                      <InfoPopover title="Conversion highlight" description="Percent of targeted audience expected to activate." />
                    </div>
                    <p className="text-lg font-semibold">{simResults ? `${(simResults.blended.conversionRate * 100).toFixed(1)}%` : '–'}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                <InfoPopover title="Cover checklist" description="What to include when you produce the real campaign cover." />
                <ul className="list-disc space-y-2 pl-4">
                  <li>Headline promise and supporting subtext.</li>
                  <li>Audience highlight with hero imagery.</li>
                  <li>Offer snapshot and KPIs for leadership.</li>
                </ul>
              </div>
            </div>
          </div>
          {simResults ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <KpiTile
                label="CAC Payback (mo)"
                value={typeof simResults.blended.paybackMonths === 'number' ? simResults.blended.paybackMonths : simResults.blended.paybackMonths}
                info={{
                  title: 'CAC Payback (months)',
                  description: 'Months until fully-loaded CAC is covered by cumulative contribution.'
                }}
              />
              <KpiTile
                label="12-mo Incremental GM"
                value={`$${simResults.blended.gm12m.toLocaleString()}`}
                info={{
                  title: '12-Month Incremental Gross Margin',
                  description: 'Gross margin over first 12 months after servicing costs and device amortization.'
                }}
              />
              <KpiTile
                label="Conversion %"
                value={`${(simResults.blended.conversionRate * 100).toFixed(1)}%`}
                info={{
                  title: 'Conversion rate',
                  description: 'Share of the audience expected to take the offer.'
                }}
              />
              <KpiTile
                label="Net adds"
                value={simResults.blended.netAdds.toLocaleString()}
                info={{
                  title: 'Net subscriber adds',
                  description: 'Projected incremental subscribers gained from this plan.'
                }}
              />
              <KpiTile
                label="Margin %"
                value={`${simResults.blended.marginPct}%`}
                info={{
                  title: 'Margin %',
                  description: 'Fully loaded contribution margin percentage for the plan.'
                }}
              />
            </div>
          ) : (
            <div className="card border border-slate-800 p-6 text-center text-sm text-slate-300">Add sub-segments to simulate.</div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card flex flex-col gap-4 border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Performance dashboard</h3>
                <Info
                  title="Performance dashboard"
                  body={(
                    <>
                      <p><strong>How it is used:</strong> Read the payback curve and cost breakdowns to validate if the play meets finance expectations.</p>
                      <p><strong>What it means:</strong> Sparkline reflects synthetic contribution by month using the same logic as Execution Hub.</p>
                    </>
                  )}
                />
              </div>
              {simResults ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simResults.blended.timeline}>
                      <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="card border border-emerald-500/20 p-2 text-xs">
                              Month {payload[0].payload.month}: {payload[0].payload.cumulativeContribution} per sub
                            </div>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="cumulativeContribution" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Run a simulation to see the payback curve.</p>
              )}
              {simResults ? (
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                      <span>CAC</span>
                      <InfoPopover title="Fully-loaded CAC" description="Acquisition costs including channel spend and execution." />
                    </div>
                    <p className="mt-1 text-lg font-semibold text-white">${simResults.blended.breakdown.cac.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                      <span>Promo cost</span>
                      <InfoPopover title="Promo cost" description="Value of incentives applied over the promo window." />
                    </div>
                    <p className="mt-1 text-lg font-semibold text-white">${simResults.blended.breakdown.promoCost.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                      <span>Device subsidy</span>
                      <InfoPopover title="Device subsidy" description="Upfront device incentives amortized over the term." />
                    </div>
                    <p className="mt-1 text-lg font-semibold text-white">${simResults.blended.breakdown.deviceSubsidy.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                      <span>Execution cost</span>
                      <InfoPopover title="Execution cost" description="One-time cost to launch and manage the campaign." />
                    </div>
                    <p className="mt-1 text-lg font-semibold text-white">${simResults.blended.breakdown.executionCost.toLocaleString()}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="card flex flex-col gap-4 border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Offer & channel designer</h3>
                <Info
                  title="Offer & channel designer"
                  body={(
                    <>
                      <p><strong>How it is used:</strong> Slide pricing, promo depth, and channel allocation to re-balance the play per micro-segment.</p>
                      <p><strong>What it means:</strong> Sliders feed tinySim’s synthetic take-rate and CAC models instantly.</p>
                    </>
                  )}
                />
              </div>
              {campaign.audienceIds.map((audienceId, index) => {
                const entry = microMap.get(audienceId);
                const segment = entry ? segmentMap.get(entry.parentId) : undefined;
                const currentOffer = campaign.offerByAudience[audienceId] ?? offers[0];
                const mix = campaign.channelMixByAudience[audienceId] ?? {};
                return (
                  <div key={audienceId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-white">{segment?.name} — {entry?.data.name}</h4>
                      <InfoPopover title="Audience card" description="Tweak offer and channel weightings for this audience." placement="left" />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label
                        ref={index === 0 ? priceContainerRef : undefined}
                        className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400"
                      >
                        <span className="flex items-center justify-between">
                          <span>Monthly price (${currentOffer.monthlyPrice})</span>
                          <InfoPopover title="Monthly price" description="Drag to set the customer-facing price point." placement="left" />
                        </span>
                        <input
                          ref={index === 0 ? priceRef : undefined}
                          type="range"
                          min={40}
                          max={90}
                          value={currentOffer.monthlyPrice}
                          onChange={(event) => handleOfferChange(audienceId, { monthlyPrice: Number(event.target.value) })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                        <span className="flex items-center justify-between">
                          <span>Promo months ({currentOffer.promoMonths})</span>
                          <InfoPopover title="Promo months" description="Number of months the promotional rate applies." placement="left" />
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={12}
                          value={currentOffer.promoMonths}
                          onChange={(event) => handleOfferChange(audienceId, { promoMonths: Number(event.target.value) })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                        <span className="flex items-center justify-between">
                          <span>Promo value (${currentOffer.promoValue})</span>
                          <InfoPopover title="Promo value" description="Adjust incentive depth applied during the promo window." placement="left" />
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={40}
                          value={currentOffer.promoValue}
                          onChange={(event) => handleOfferChange(audienceId, { promoValue: Number(event.target.value) })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400">
                        <span className="flex items-center justify-between">
                          <span>Device subsidy (${currentOffer.deviceSubsidy})</span>
                          <InfoPopover title="Device subsidy" description="Controls the equipment incentive amortized in the sim." placement="left" />
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={400}
                          step={20}
                          value={currentOffer.deviceSubsidy}
                          onChange={(event) => handleOfferChange(audienceId, { deviceSubsidy: Number(event.target.value) })}
                        />
                      </label>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                        <span>Channel allocation</span>
                        <InfoPopover title="Channel allocation" description="Drag sliders to rebalance spend across touchpoints." placement="left" />
                      </div>
                      {channels.map((channel) => (
                        <div key={channel.id} className="flex items-center gap-3 text-xs text-slate-300">
                          <span className="w-24 text-slate-400">{channel.name}</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={mix[channel.id] ?? 0}
                            onChange={(event) => handleChannelChange(audienceId, channel.id, Number(event.target.value))}
                          />
                          <span className="w-10 text-right">{Math.round((mix[channel.id] ?? 0) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card flex flex-col gap-4 border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">Scenario comparison</h3>
                <InfoPopover title="Scenario comparison" description="Save variations and compare outcomes." />
              </div>
              <button
                onClick={saveScenario}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-600"
              >
                Save Scenario
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-400">Scenario</span>
              <span className="text-xs uppercase tracking-wide text-slate-400">Payback</span>
              <span className="text-xs uppercase tracking-wide text-slate-400">12-mo GM</span>
              <span className="text-xs uppercase tracking-wide text-slate-400">Net adds</span>
              {savedScenarios.map((scenario) => (
                <React.Fragment key={scenario.id}>
                  <span className="font-semibold text-white">{scenario.label}</span>
                  <span>{typeof scenario.payback === 'number' ? `${scenario.payback} mo` : scenario.payback}</span>
                  <span>${scenario.gm12.toLocaleString()}</span>
                  <span>{scenario.netAdds.toLocaleString()}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          {winning ? (
            <div className="card flex items-center justify-between border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-wide">Winning play</p>
                  <InfoPopover title="Winning play" description="Snapshot of the scenario delivering the fastest payback." />
                </div>
                <p className="text-lg font-semibold text-white">{winning.label}</p>
                <p>
                  {typeof winning.payback === 'number' ? `${winning.payback} mo` : winning.payback} payback • ${winning.gm12.toLocaleString()} GM • {(winning.conversion * 100).toFixed(1)}% conversion
                </p>
              </div>
              <button className="rounded-full border border-emerald-500 bg-slate-900 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20">
                Set as Recommended Plan
              </button>
            </div>
          ) : null}
          <div className="card flex flex-col gap-4 border border-slate-800 p-4">
            <header className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-400">AI narrative & insights</p>
                <h3 className="text-lg font-semibold text-white">Here’s how to optimize your campaign.</h3>
              </div>
              <Info
                title="AI narrative"
                body={(
                  <>
                    <p><strong>How it is used:</strong> Digest coaching notes that summarize the best moves to reach guardrails.</p>
                    <p><strong>What it means:</strong> Insights combine synthetic telemetry, channel heuristics, and offer economics.</p>
                  </>
                )}
              />
            </header>
            {simResults ? (
              <ul className="space-y-2 text-sm text-slate-300">
                <li>Increase Search +5% to approach ≤ {typeof simResults.blended.paybackMonths === 'number' ? simResults.blended.paybackMonths - 1 : 8} mo payback.</li>
                <li>Lower promo depth by $5 to lift margin {Math.round(simResults.blended.marginPct * 0.1)} bps.</li>
                <li>Shift 3% from Retail to Email to boost reach efficiently.</li>
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Run a simulation to unlock insights.</p>
            )}
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-emerald-200">
              Confidence: {simResults ? 'High — rich digital signals' : 'Awaiting simulation'}
            </div>
            <button
              type="button"
              className={`w-full rounded-full border px-4 py-2 text-sm font-semibold transition ${launchReady
                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                : 'border-slate-700 bg-slate-900/60 text-slate-500'
                }`}
              onClick={() => setLaunchOpen(true)}
              disabled={!launchReady}
            >
              Launch to Execution Hub
            </button>
            <details className="text-xs text-slate-400">
              <summary className="flex cursor-pointer items-center gap-2 text-emerald-300">
                Supporting data
                <InfoPopover title="Supporting data" description="Lists the synthetic sources informing this view." />
              </summary>
              <p className="mt-2">Synth Cohort Econ / Channel Benchmarks / Offer Lab</p>
            </details>
          </div>
          <SelectionTray
            title="Campaign summary"
            items={campaign.audienceIds.map((id) => {
              const entry = microMap.get(id);
              const segment = entry ? segmentMap.get(entry.parentId) : undefined;
              const share = entry ? nz(entry.data.sizeShare) * 100 : 0;
              return {
                id,
                label: segment ? `${segment.name} — ${entry?.data.name}` : id,
                subtitle: entry ? `${share.toFixed(1)}% of cohort` : ''
              };
            })}
            metrics={simResults ? [
              { label: 'Payback', value: typeof simResults.blended.paybackMonths === 'number' ? `${simResults.blended.paybackMonths} mo` : simResults.blended.paybackMonths },
              { label: '12-mo GM', value: `$${simResults.blended.gm12m.toLocaleString()}` },
              { label: 'Net adds', value: simResults.blended.netAdds.toLocaleString() }
            ] : [
              { label: 'Payback', value: '–' },
              { label: '12-mo GM', value: '–' },
              { label: 'Net adds', value: '–' }
            ]}
            ctaLabel="Export Summary (PDF)"
            onCta={exportSummary}
            disabled={!simResults}
          />
        </div>
        <div className="mt-8 space-y-4 lg:mt-0 lg:sticky lg:top-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
                checked={locked}
                onChange={handleLockToggle}
              />
              <span>Lock look</span>
            </label>
            <span className="text-slate-500">{locked ? 'Preview paused' : 'Preview live'}</span>
          </div>
          {hasPending ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              <span>Preview paused — changes pending</span>
              <button
                type="button"
                className="rounded-full border border-amber-300/60 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-400/20"
                onClick={applyPending}
              >
                Apply
              </button>
            </div>
          ) : null}
          <CampaignPreview model={activeModel} frame={frame} onFrameChange={(value) => setFrame(value)} onQuickEdit={onQuickEdit} />
        </div>
        </div>
      </div>
      {launchOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-emerald-500/40 bg-slate-950/95 p-6 shadow-emerald-500/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Launch to Execution Hub</h3>
                <p className="text-sm text-slate-300">Confirm the cohorts, mix, and guardrails you are sending into activation.</p>
              </div>
              <button
                type="button"
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={() => setLaunchOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm text-slate-200">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Cohorts</p>
                <ul className="mt-1 space-y-1">
                  {aggregatedCohorts.map((cohort) => (
                    <li key={cohort.id} className="flex items-center justify-between gap-3">
                      <span>{cohort.name}</span>
                      <span className="text-xs text-slate-400">{cohort.size.toLocaleString()} ppl</span>
                    </li>
                  ))}
                  {aggregatedCohorts.length === 0 ? <li>No cohorts selected.</li> : null}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Channel mix</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {channelKeyList.map((key) => (
                    <span key={key} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                      <span>{key}</span>
                      <span>{Math.round((aggregatedChannels[key] ?? 0) * 100)}%</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Offer snapshot</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">Price ${aggregatedOffer.price.toFixed(2)}</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">Promo {aggregatedOffer.promoMonths} mo / ${aggregatedOffer.promoValue}</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">Device subsidy ${aggregatedOffer.deviceSubsidy}</span>
                  <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">Budget ${campaign.budgetTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                Guardrails: CAC ≤ {campaign.guardrails.cacCeiling ? `$${campaign.guardrails.cacCeiling.toLocaleString()}` : '—'} • Payback target {campaign.guardrails.paybackTarget ? `${campaign.guardrails.paybackTarget} mo` : '—'}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
                onClick={() => setLaunchOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${launchReady
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                  : 'border-slate-700 bg-slate-900/60 text-slate-500'
                  }`}
                onClick={confirmLaunch}
                disabled={!launchReady}
              >
                Launch campaign
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CampaignDesigner;

// QA checklist:
// - All 8 sections show a header info icon.
// - Each listed field has an info icon with the exact text above.
// - Tooltips work on mouse and keyboard; ESC closes.
// - No layout shift on reveal; z-index sits above modals.
// - Text centralized in infoCopy.
// - Split layout renders; preview sticky on desktop, stacked on mobile.
// - Four frames switch via tabs; no layout shift beyond the frame.
// - Preview reads from normalized model and reflects edits instantly (unless locked).
// - ✎ quick-edit focuses the correct left-panel field and highlights it.
// - Lock/Apply works; banner appears when locked.
// - No new dependencies; code remains compact and ASCII-only.
