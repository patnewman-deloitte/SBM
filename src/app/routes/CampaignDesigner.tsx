import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import InfoPopover from '../../components/InfoPopover';
import KpiTile from '../../components/KpiTile';
import SelectionTray from '../../components/SelectionTray';
import Info from '../../components/Info';
import { useToast } from '../../components/ToastProvider';
import { simulateCampaign, AudienceSimInput } from '../../sim/tinySim';
import { MicroSegment, useGlobalStore } from '../../store/global';
import { ChannelKey, useAppStore } from '../../store/AppStore';

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
    eligibilityRules: 'Constraints like credit tiers, port-in only, new lines only, or address-level availability.'
  },
  channelMix: {
    _section: 'Pick channels and the order they activate. The assistant will recommend weights and a simple flight plan.',
    channels:
      'Toggle on/off (paid social, search, programmatic, email/SMS, retail, telesales). Each has default CPM/CPC and reach.',
    weights: 'Initial budget split by channel. Use “Auto-allocate” to let the model set a starting mix.',
    flighting: 'Set start/end dates and bursts. Avoid overlapping heavy bursts across the same audience.'
  },
  creativeGuidance: {
    _section: 'Guidance powers copy/image suggestions and testing variants.',
    proposition:
      'One-line value statement tied to the goal and segment (e.g., ‘Switch now, keep your number, save $20/mo’).',
    mustInclude: 'Legal or brand phrases required in all assets.',
    personaAngle: 'Tone and hooks aligned to the segment (e.g., gamers, budget seekers, family planners).',
    variants: 'Number of creative variants per channel for lightweight A/B.'
  },
  budgetPacing: {
    _section: 'Set totals and boundaries; pacing auto-adjusts to hit your goal.',
    totalBudget: 'All-in spend cap, inclusive of media + promo costs if selected.',
    dailyCapRamp: 'Controls learning speed and spend smoothness; helpful for new geos.',
    cacCpaGuardrail: 'Hard stop when modeled cost per acquisition exceeds this threshold.',
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
    autoSummary: 'One-page summary with audience, offer, channels, budget, KPIs, and expected impact.',
    export: 'Download JSON for API handoff and PPT summary for stakeholders.',
    approvalChecklist: 'Confirms finance, legal, and operations sign-off before launch.'
  }
} as const;

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  id: string;
  text: string;
  placement?: TooltipPlacement;
  visible: boolean;
};

const Tooltip: React.FC<TooltipProps> = ({ id, text, placement = 'top', visible }) => {
  const basePosition =
    placement === 'bottom'
      ? 'top-full mt-1 left-1/2 -translate-x-1/2'
      : placement === 'left'
      ? 'right-full mr-2 top-1/2 -translate-y-1/2'
      : placement === 'right'
      ? 'left-full ml-2 top-1/2 -translate-y-1/2'
      : 'bottom-full mb-1 left-1/2 -translate-x-1/2';

  return (
    <div
      id={id}
      role="tooltip"
      className={`pointer-events-none absolute z-50 max-w-xs rounded-lg border border-emerald-500/30 bg-slate-900/95 p-2 text-left text-xs text-slate-200 shadow-lg shadow-emerald-500/20 transition-opacity sm:max-w-sm ${basePosition} ${visible ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden={!visible}
    >
      {text}
    </div>
  );
};

type InfoIconProps = {
  text: string;
  placement?: TooltipPlacement;
  testId: string;
};

const InfoIcon: React.FC<InfoIconProps> = ({ text, placement, testId }) => {
  const [open, setOpen] = React.useState(false);
  const tooltipId = React.useId();
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <span
      className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-emerald-400/70 bg-slate-900 text-[10px] font-semibold text-emerald-300 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      tabIndex={0}
      data-testid={testId}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onFocus={() => setOpen(true)}
      onBlur={close}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
      aria-describedby={open ? tooltipId : undefined}
    >
      i
      <Tooltip id={tooltipId} text={text} placement={placement} visible={open} />
    </span>
  );
};

type FieldLabelProps = {
  label: string;
  info?: string;
  infoTestId: string;
  placement?: TooltipPlacement;
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
};

const FieldLabel: React.FC<FieldLabelProps> = ({
  label,
  info,
  infoTestId,
  placement,
  children,
  className,
  highlight
}) => {
  return (
    <label
      className={`relative flex flex-col gap-1 text-xs uppercase tracking-wide text-slate-400 ${
        className ?? ''
      } ${highlight ? 'rounded-lg ring-1 ring-emerald-400/70 ring-offset-1 ring-offset-slate-900 transition-shadow' : ''}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {info ? <InfoIcon text={info} placement={placement} testId={infoTestId} /> : null}
      </span>
      {children}
    </label>
  );
};

type SectionHeaderProps = {
  title: string;
  info?: string;
  infoTestId: string;
  placement?: TooltipPlacement;
  className?: string;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, info, infoTestId, placement, className }) => {
  return (
    <div className={`flex items-center justify-between ${className ?? ''}`}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {info ? <InfoIcon text={info} placement={placement} testId={infoTestId} /> : null}
    </div>
  );
};

const channelKeyList: ChannelKey[] = ['Search', 'Social', 'Email', 'Retail', 'Field'];
const channelIdToKey: Record<string, ChannelKey> = {
  'ch-search': 'Search',
  'ch-social': 'Social',
  'ch-email': 'Email',
  'ch-retail': 'Retail',
  'ch-field': 'Field'
};

type PreviewFrame = 'email' | 'sms' | 'ad' | 'landing';

type PreviewModel = {
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

type PreviewModelSource = {
  goal: string;
  audience: string;
  geo: string;
  proposition: string;
  mustInclude: string;
  persona: string;
  aggregatedOffer: { price: number; promoMonths: number; promoValue: number };
  inventoryNotes: string;
};

const tokenFallbacks: Record<string, string> = {
  first_name: 'Alex',
  city: 'Austin',
  plan: '5G Family',
  savings: '$20/mo'
};

const applyTokens = (value: string) =>
  value.replace(/\{\{\s*(first_name|city|plan|savings)\s*\}\}/g, (_, key: keyof typeof tokenFallbacks) => tokenFallbacks[key]);

const limitChars = (value: string, max: number) => (value.length <= max ? value : `${value.slice(0, max - 1)}…`);

const selectPreviewModel = ({
  goal,
  audience,
  geo,
  proposition,
  mustInclude,
  persona,
  aggregatedOffer,
  inventoryNotes
}: PreviewModelSource): PreviewModel => {
  const bulletSource = mustInclude
    .split(/[•\n]/)
    .map((item) => item.replace(/^[-•]/, '').trim())
    .filter(Boolean);
  const bullets = bulletSource.length
    ? bulletSource.slice(0, 3)
    : ['No hidden fees', '5G included', 'Keep your number'];
  const price = Number.isFinite(aggregatedOffer.price) ? aggregatedOffer.price : undefined;
  const promoParts: string[] = [];
  if (aggregatedOffer.promoMonths) {
    promoParts.push(`${aggregatedOffer.promoMonths} mo promo`);
  }
  if (aggregatedOffer.promoValue) {
    promoParts.push(`$${aggregatedOffer.promoValue} incentive`);
  }
  const subject = limitChars(`${goal}: ${proposition}`, 62);
  const preheader = limitChars(bullets[0] ?? proposition, 80);
  const ctaLabel = goal === 'Store visits' ? 'Plan a visit' : goal === 'Pre-orders' ? 'Pre-order now' : 'Start your switch';
  const ctaUrl = goal === 'Store visits' ? 'https://sbm.link/visit' : goal === 'Pre-orders' ? 'https://sbm.link/preorder' : 'https://sbm.link/switch';
  const legal = inventoryNotes.trim()
    ? inventoryNotes.trim()
    : 'Limited-time offer. Taxes, fees, and device charges extra. Subject to credit approval.';

  return {
    goal,
    audience,
    geo,
    headline: proposition || 'Switch now, keep your number, save $20/mo.',
    sub: persona ? `${persona} • ${geo}` : `Serving ${geo}`,
    subject,
    preheader,
    price: { amount: price, period: 'per month', promo: promoParts.join(' • ') || undefined },
    bullets,
    cta: { label: ctaLabel, url: ctaUrl },
    legal,
    persona: persona || undefined
  };
};

const modelsEqual = (a: PreviewModel, b: PreviewModel) => JSON.stringify(a) === JSON.stringify(b);

type CampaignPreviewProps = {
  model: PreviewModel;
  frame: PreviewFrame;
  onFrameChange: (frame: PreviewFrame) => void;
  onQuickEdit?: (fieldKey: string) => void;
};

const CampaignPreview: React.FC<CampaignPreviewProps> = ({ model, frame, onFrameChange, onQuickEdit }) => {
  const frames: { key: PreviewFrame; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'sms', label: 'SMS' },
    { key: 'ad', label: 'Ad' },
    { key: 'landing', label: 'Landing' }
  ];

  const QuickEditButton = ({ field, label }: { field: string; label: string }) => (
    <button
      type="button"
      className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
      onClick={() => onQuickEdit?.(field)}
      aria-label={`Edit ${label}`}
      title={`Edit ${label}`}
      data-testid={`qe-${field}`}
    >
      ✎
    </button>
  );

  const resolvedHeadline = applyTokens(model.headline);
  const resolvedSub = applyTokens(model.sub);
  const resolvedSubject = applyTokens(model.subject);
  const resolvedPreheader = applyTokens(model.preheader);
  const resolvedBullets = model.bullets.map((item) => applyTokens(item));
  const resolvedLegal = applyTokens(model.legal);
  const priceText = model.price.amount ? `$${model.price.amount.toFixed(2)}/${model.price.period ?? 'mo'}` : undefined;
  const promoText = model.price.promo;

  const smsRaw = `${resolvedHeadline} ${resolvedSub} ${model.cta.label} ${model.cta.url}`.trim();
  const smsText = smsRaw.length > 160 ? `${smsRaw.slice(0, 157)}…` : smsRaw;
  const smsCount = smsText.length;

  const renderEmail = () => (
    <div className="mt-4 space-y-4 text-slate-100">
      <div className="space-y-1 border-b border-white/10 pb-3 text-xs text-slate-300">
        <div className="flex items-center justify-between gap-3">
          <span data-testid="preview-subject">Subject: {resolvedSubject}</span>
          <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
            {model.geo}
          </span>
        </div>
        <div data-testid="preview-preheader">Preheader: {resolvedPreheader}</div>
      </div>
      <div className="aspect-[16/9] w-full rounded-xl border border-slate-700/60 bg-slate-800/60"></div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-lg font-semibold text-white" data-testid="preview-headline">
            {resolvedHeadline}
          </h4>
          <p className="mt-1 text-sm text-slate-300">{resolvedSub}</p>
        </div>
        <QuickEditButton field="headline" label="headline" />
      </div>
      <div className="flex flex-wrap items-center gap-2" data-testid="preview-price">
        {priceText ? (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            {priceText}
          </span>
        ) : null}
        {promoText ? <span className="text-[11px] text-emerald-200">{promoText}</span> : null}
        <QuickEditButton field="price" label="price" />
      </div>
      <div>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
          <span>Benefits</span>
          <QuickEditButton field="bullets" label="bullets" />
        </div>
        <ul className="mt-2 space-y-2 text-sm" data-testid="preview-bullets">
          {resolvedBullets.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-2">
              <span className="mt-1 text-emerald-300">•</span>
              <span className="text-slate-200">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400"
          data-testid="preview-cta"
        >
          {model.cta.label}
        </button>
        <QuickEditButton field="cta" label="CTA" />
      </div>
      <p className="text-[11px] text-slate-400" data-testid="preview-legal">
        {resolvedLegal}
      </p>
    </div>
  );

  const renderSms = () => (
    <div className="mt-4 space-y-3 text-slate-100">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Sender · {applyTokens(model.audience)}</span>
        <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px]">{smsCount}/160</span>
      </div>
      <div className="relative max-w-xs rounded-2xl border border-slate-600 bg-slate-800/80 p-4 text-sm shadow-inner shadow-black/40">
        <p>{smsText}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
          {model.cta.label}
          <span className="text-emerald-300">{model.cta.url.replace('https://', '')}</span>
        </div>
      </div>
    </div>
  );

  const renderAd = () => (
    <div className="mt-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 text-slate-100 shadow-inner shadow-slate-900/50">
        <div className="absolute inset-3 rounded-xl border border-white/10"></div>
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="rounded-full border border-slate-600 px-2 py-0.5">SBM</span>
            <span>{model.geo}</span>
          </div>
          <div>
            <h4 className="text-xl font-semibold text-white">{resolvedHeadline}</h4>
            <p className="mt-1 text-sm text-slate-300">{resolvedSub}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{priceText ?? '$79/mo'}</span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
              {model.cta.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLanding = () => (
    <div className="mt-4 space-y-4 text-slate-100">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-semibold text-white" data-testid="preview-headline">
                  {resolvedHeadline}
                </h2>
                <p className="mt-2 text-sm text-slate-300">{resolvedSub}</p>
              </div>
              <QuickEditButton field="headline" label="headline" />
            </div>
            <div className="flex flex-wrap items-center gap-3" data-testid="preview-price">
              {priceText ? (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  {priceText}
                </span>
              ) : null}
              {promoText ? <span className="text-xs text-emerald-200">{promoText}</span> : null}
              <QuickEditButton field="price" label="price" />
            </div>
            <ul className="grid gap-2 text-sm" data-testid="preview-bullets">
              {resolvedBullets.map((item, index) => (
                <li key={`landing-${index}`} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-200">{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400"
                data-testid="preview-cta"
              >
                Choose plan
              </button>
              <QuickEditButton field="cta" label="CTA" />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="rounded-full border border-slate-600 px-3 py-1">Trusted network</span>
              <span className="rounded-full border border-slate-600 px-3 py-1">5G ready</span>
              <span className="rounded-full border border-slate-600 px-3 py-1">24/7 support</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="aspect-[16/9] w-full rounded-xl border border-slate-700/60 bg-slate-800/60"></div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-4 text-sm text-slate-200">
              <h4 className="font-semibold text-white">{applyTokens(model.cta.label)}</h4>
              <p className="mt-1 text-xs text-slate-400">{model.cta.url}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="prose prose-invert text-xs text-slate-400" data-testid="preview-legal">
        {resolvedLegal}
      </p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 shadow-xl shadow-slate-950/40 backdrop-blur sm:p-6" data-testid="preview-root">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 text-slate-200">
          <p className="text-xs uppercase tracking-wide text-emerald-300">Campaign preview</p>
          <p className="text-sm font-semibold text-white">{applyTokens(model.goal)}</p>
          <div className="text-xs text-slate-400">
            {applyTokens(model.audience)} · {model.geo}
          </div>
        </div>
        <div role="tablist" aria-label="Preview frame" className="inline-flex rounded-full border border-slate-700 bg-slate-900/70 p-1 text-xs">
          {frames.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={frame === key}
              className={`px-3 py-1.5 font-semibold transition ${
                frame === key
                  ? 'rounded-full bg-emerald-500/20 text-emerald-100'
                  : 'rounded-full text-slate-300 hover:text-emerald-200'
              }`}
              onClick={() => onFrameChange(key)}
              data-testid={`preview-tab-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {frame === 'email' ? renderEmail() : null}
      {frame === 'sms' ? renderSms() : null}
      {frame === 'ad' ? renderAd() : null}
      {frame === 'landing' ? renderLanding() : null}
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
  const [inventoryConstraints, setInventoryConstraints] = React.useState('');
  const [eligibilityByAudience, setEligibilityByAudience] = React.useState<Record<string, string>>({});
  const [flightingByAudience, setFlightingByAudience] = React.useState<Record<string, { start: string; end: string }>>({});
  const [primaryGoal, setPrimaryGoal] = React.useState('Net adds');
  const [targetSegment, setTargetSegment] = React.useState('Priority micro-segments');
  const [geoScope, setGeoScope] = React.useState('National');
  const [creativeProposition, setCreativeProposition] = React.useState('Switch now, keep your number, save $20/mo.');
  const [creativeMustInclude, setCreativeMustInclude] = React.useState('No hidden fees • 5G included.');
  const [creativePersona, setCreativePersona] = React.useState('Budget seekers');
  const [creativeVariants, setCreativeVariants] = React.useState(3);
  const [measurementPrimary, setMeasurementPrimary] = React.useState('Net adds');
  const [measurementSecondary, setMeasurementSecondary] = React.useState<string[]>(['CTR', 'CVR']);
  const [measurementAttribution, setMeasurementAttribution] = React.useState('Rules-based');
  const [measurementExperiment, setMeasurementExperiment] = React.useState('Geo split');
  const [riskBrand, setRiskBrand] = React.useState(true);
  const [riskLegality, setRiskLegality] = React.useState(true);
  const [riskFairness, setRiskFairness] = React.useState(false);

  const primaryGoalRef = React.useRef<HTMLSelectElement>(null);
  const headlineRef = React.useRef<HTMLInputElement>(null);
  const bulletsRef = React.useRef<HTMLTextAreaElement>(null);
  const priceRef = React.useRef<HTMLInputElement>(null);
  const highlightTimer = React.useRef<number | null>(null);
  const [highlightKey, setHighlightKey] = React.useState<string | null>(null);
  const fieldRefs = React.useMemo<Record<string, React.RefObject<HTMLElement>>>(
    () => ({
      headline: headlineRef as React.RefObject<HTMLElement>,
      bullets: bulletsRef as React.RefObject<HTMLElement>,
      price: priceRef as React.RefObject<HTMLElement>,
      cta: primaryGoalRef as React.RefObject<HTMLElement>
    }),
    []
  );

  const handleQuickEdit = React.useCallback(
    (key: string) => {
      const ref = fieldRefs[key];
      if (ref && ref.current) {
        const element = ref.current as unknown as HTMLElement;
        element.focus();
        if (typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      setHighlightKey(key);
      if (typeof window !== 'undefined') {
        if (highlightTimer.current) {
          window.clearTimeout(highlightTimer.current);
        }
        highlightTimer.current = window.setTimeout(() => setHighlightKey(null), 1500);
      }
    },
    [fieldRefs]
  );

  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && highlightTimer.current) {
        window.clearTimeout(highlightTimer.current);
      }
    };
  }, []);

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

  const microMap = React.useMemo(() => {
    const map = new Map<string, { parentId: string; data: MicroSegment }>();
    Object.entries(microSegmentsByParent).forEach(([parentId, items]) => {
      items.forEach((item) => {
        map.set(item.id, { parentId, data: item });
      });
    });
    return map;
  }, [microSegmentsByParent]);

  const audiences = React.useMemo(() => {
    return campaign.audienceIds
      .map((audienceId) => {
        const entry = microMap.get(audienceId);
        if (!entry) return null;
        const segment = segments.find((seg) => seg.id === entry.parentId);
        if (!segment) return null;
        const mix = campaign.channelMixByAudience[audienceId] ?? {};
        return {
          micro: entry.data,
          segment,
          offer: campaign.offerByAudience[audienceId] ?? offers[0],
          channelMix: mix,
          assumptions,
          channels
        };
      })
      .filter(Boolean) as unknown as AudienceSimInput[];
  }, [assumptions, campaign, channels, microMap, offers, segments]);

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

  const handleOfferPresetChange = (audienceId: string, offerId: string) => {
    const preset = offers.find((offer) => offer.id === offerId);
    if (!preset) return;
    const next = { ...campaign.offerByAudience };
    next[audienceId] = { ...preset };
    updateCampaign({ offerByAudience: next });
  };

  const toggleSecondaryMetric = (metric: string) => {
    setMeasurementSecondary((prev) =>
      prev.includes(metric) ? prev.filter((item) => item !== metric) : [...prev, metric]
    );
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
        const segment = segments.find((seg) => seg.id === entry.parentId);
        if (!segment) return null;
        return {
          id,
          name: `${segment.name} — ${entry.data.name}`,
          size: Math.round(segment.size * entry.data.sizeShare)
        };
      })
      .filter(Boolean) as { id: string; name: string; size: number }[];
  }, [campaign.audienceIds, microMap, segments]);

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
      const weight = entry.data.sizeShare;
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
      const weight = entry.data.sizeShare;
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

  const previewSourceModel = React.useMemo(
    () =>
      selectPreviewModel({
        goal: primaryGoal,
        audience: targetSegment,
        geo: geoScope,
        proposition: creativeProposition,
        mustInclude: creativeMustInclude,
        persona: creativePersona,
        aggregatedOffer: {
          price: aggregatedOffer.price,
          promoMonths: aggregatedOffer.promoMonths,
          promoValue: aggregatedOffer.promoValue
        },
        inventoryNotes: inventoryConstraints
      }),
    [
      aggregatedOffer.price,
      aggregatedOffer.promoMonths,
      aggregatedOffer.promoValue,
      creativeMustInclude,
      creativePersona,
      creativeProposition,
      geoScope,
      inventoryConstraints,
      primaryGoal,
      targetSegment
    ]
  );

  const [previewFrame, setPreviewFrame] = React.useState<PreviewFrame>('email');
  const [previewLocked, setPreviewLocked] = React.useState(false);
  const [previewSnapshot, setPreviewSnapshot] = React.useState<PreviewModel>(previewSourceModel);

  React.useEffect(() => {
    if (!previewLocked) {
      setPreviewSnapshot(previewSourceModel);
    }
  }, [previewLocked, previewSourceModel]);

  const previewDirty = React.useMemo(
    () => previewLocked && !modelsEqual(previewSnapshot, previewSourceModel),
    [previewLocked, previewSnapshot, previewSourceModel]
  );

  const handleApplyPreview = React.useCallback(() => {
    setPreviewSnapshot(previewSourceModel);
  }, [previewSourceModel]);

  const handleToggleLock = React.useCallback(
    (next: boolean) => {
      if (next) {
        setPreviewSnapshot(previewSourceModel);
        setPreviewLocked(true);
      } else {
        setPreviewLocked(false);
        setPreviewSnapshot(previewSourceModel);
      }
    },
    [previewSourceModel]
  );

  const launchReady = Boolean(simResults && campaign.audienceIds.length);
  const viewMonitoringDisabled = liveCampaigns.length === 0;

  const exportSummary = React.useCallback(() => {
    if (!simResults) return;
    const audienceLines = campaign.audienceIds
      .map((id) => {
        const entry = microMap.get(id);
        if (!entry) return null;
        const segment = segments.find((seg) => seg.id === entry.parentId);
        if (!segment) return null;
        return `- ${segment.name} • ${entry.data.name}`;
      })
      .filter(Boolean) as string[];
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
  }, [campaign.audienceIds, campaign.budgetTotal, microMap, segments, simResults, winning]);

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
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-4">
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
            <SectionHeader
              title="Campaign Goal & Audience"
              info={infoCopy.goalAudience._section}
              infoTestId="ocd-info-goalAudience-section"
            />
            <div className="mt-3 space-y-3 text-sm text-slate-200">
              <FieldLabel
                label="Primary goal"
                info={infoCopy.goalAudience.primaryGoal}
                infoTestId="ocd-info-goalAudience-primaryGoal"
                placement="left"
                highlight={highlightKey === 'cta'}
              >
                <select
                  ref={primaryGoalRef}
                  value={primaryGoal}
                  onChange={(event) => setPrimaryGoal(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Net adds">Net adds</option>
                  <option value="Pre-orders">Pre-orders</option>
                  <option value="Store visits">Store visits</option>
                </select>
              </FieldLabel>
              <FieldLabel
                label="Target segment"
                info={infoCopy.goalAudience.targetSegment}
                infoTestId="ocd-info-goalAudience-targetSegment"
                placement="left"
              >
                <input
                  type="text"
                  value={targetSegment}
                  onChange={(event) => setTargetSegment(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <FieldLabel
                label="Geo scope"
                info={infoCopy.goalAudience.geoScope}
                infoTestId="ocd-info-goalAudience-geoScope"
                placement="left"
              >
                <select
                  value={geoScope}
                  onChange={(event) => setGeoScope(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="National">National</option>
                  <option value="Region">Region</option>
                  <option value="State">State</option>
                  <option value="ZIP">ZIP</option>
                </select>
              </FieldLabel>
            </div>
          </div>
          <div className="card border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Audiences</h3>
              <InfoPopover title="Audiences" description="Micro-segments currently in scope for this campaign." />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {campaign.audienceIds.map((id) => {
                const entry = microMap.get(id);
                const segment = entry ? segments.find((seg) => seg.id === entry.parentId) : undefined;
                return (
                  <span key={id} className="info-chip">
                    {segment?.name} • {entry?.data.name}
                  </span>
                );
              })}
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
                placement="right"
              >
                <input
                  type="number"
                  value={campaign.budgetTotal}
                  onChange={(event) => updateCampaign({ budgetTotal: Number(event.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <FieldLabel
                  label="CAC/CPA guardrail"
                  info={infoCopy.budgetPacing.cacCpaGuardrail}
                  infoTestId="ocd-info-budgetPacing-cacCpaGuardrail"
                  placement="left"
                >
                  <input
                    type="number"
                    value={campaign.guardrails.cacCeiling ?? ''}
                    onChange={(event) =>
                      updateCampaign({ guardrails: { ...campaign.guardrails, cacCeiling: Number(event.target.value) } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </FieldLabel>
                <FieldLabel
                  label="Daily cap & ramp"
                  info={infoCopy.budgetPacing.dailyCapRamp}
                  infoTestId="ocd-info-budgetPacing-dailyCapRamp"
                  placement="left"
                >
                  <input
                    type="number"
                    value={campaign.guardrails.paybackTarget ?? ''}
                    onChange={(event) =>
                      updateCampaign({ guardrails: { ...campaign.guardrails, paybackTarget: Number(event.target.value) } })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </FieldLabel>
              </div>
              <FieldLabel
                label="Inventory constraints"
                info={infoCopy.budgetPacing.inventoryConstraints}
                infoTestId="ocd-info-budgetPacing-inventoryConstraints"
                placement="right"
              >
                <textarea
                  value={inventoryConstraints}
                  onChange={(event) => setInventoryConstraints(event.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Optional notes by region or SKU"
                />
              </FieldLabel>
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
          </div>
          <div className="flex min-w-0 flex-col gap-6">
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
        <div className="card border border-slate-800 p-4">
          <SectionHeader
            title="Creative Guidance"
            info={infoCopy.creativeGuidance._section}
            infoTestId="ocd-info-creativeGuidance-section"
            className="text-base"
          />
          <div className="mt-3 space-y-3 text-sm text-slate-200">
            <FieldLabel
              label="Proposition"
              info={infoCopy.creativeGuidance.proposition}
              infoTestId="ocd-info-creativeGuidance-proposition"
              placement="right"
              highlight={highlightKey === 'headline'}
            >
              <input
                type="text"
                value={creativeProposition}
                onChange={(event) => setCreativeProposition(event.target.value)}
                ref={headlineRef}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </FieldLabel>
            <FieldLabel
              label="Must-include claims"
              info={infoCopy.creativeGuidance.mustInclude}
              infoTestId="ocd-info-creativeGuidance-mustInclude"
              placement="right"
              highlight={highlightKey === 'bullets'}
            >
              <textarea
                value={creativeMustInclude}
                onChange={(event) => setCreativeMustInclude(event.target.value)}
                rows={2}
                ref={bulletsRef}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </FieldLabel>
            <FieldLabel
              label="Persona angle"
              info={infoCopy.creativeGuidance.personaAngle}
              infoTestId="ocd-info-creativeGuidance-personaAngle"
              placement="right"
            >
              <input
                type="text"
                value={creativePersona}
                onChange={(event) => setCreativePersona(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </FieldLabel>
            <FieldLabel
              label="Variants"
              info={infoCopy.creativeGuidance.variants}
              infoTestId="ocd-info-creativeGuidance-variants"
              placement="right"
            >
              <input
                type="number"
                min={1}
                max={8}
                value={creativeVariants}
                onChange={(event) => setCreativeVariants(Number(event.target.value))}
                className="mt-1 w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </FieldLabel>
          </div>
        </div>
        {simResults ? (
          <div className="grid grid-cols-5 gap-3">
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
          <div className="grid grid-cols-2 gap-4">
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
                      <RechartsTooltip
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
            <SectionHeader
              title="Offer Builder (plans, price, promos)"
              info={infoCopy.offerBuilder._section}
              infoTestId="ocd-info-offerBuilder-section"
              className="text-base"
            />
            {campaign.audienceIds.map((audienceId, index) => {
              const entry = microMap.get(audienceId);
              const segment = entry ? segments.find((seg) => seg.id === entry.parentId) : undefined;
              const currentOffer = campaign.offerByAudience[audienceId] ?? offers[0];
              const mix = campaign.channelMixByAudience[audienceId] ?? {};
              const eligibility = eligibilityByAudience[audienceId] ?? 'None';
              const flighting = flightingByAudience[audienceId] ?? { start: '', end: '' };
              return (
                <div key={audienceId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-white">{segment?.name} — {entry?.data.name}</h4>
                    <InfoPopover title="Audience card" description="Tweak offer and channel weightings for this audience." placement="left" />
                  </div>
                  <div className="mt-3 space-y-3">
                    <FieldLabel
                      label="Base plan"
                      info={infoCopy.offerBuilder.basePlan}
                      infoTestId="ocd-info-offerBuilder-basePlan"
                      placement="left"
                    >
                      <select
                        value={currentOffer.id}
                        onChange={(event) => handleOfferPresetChange(audienceId, event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 focus:border-emerald-500 focus:outline-none"
                      >
                        {offers.map((offer) => (
                          <option key={offer.id} value={offer.id}>
                            {offer.name}
                          </option>
                        ))}
                      </select>
                    </FieldLabel>
                    <FieldLabel
                      label="Price & term"
                      info={infoCopy.offerBuilder.priceTerm}
                      infoTestId="ocd-info-offerBuilder-priceTerm"
                      placement="left"
                      highlight={highlightKey === 'price' && index === 0}
                    >
                      <div className="mt-1 space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>List price</span>
                          <span className="font-semibold text-white">${currentOffer.monthlyPrice}</span>
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={90}
                          value={currentOffer.monthlyPrice}
                          onChange={(event) => handleOfferChange(audienceId, { monthlyPrice: Number(event.target.value) })}
                          ref={index === 0 ? priceRef : undefined}
                        />
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>Promo duration</span>
                          <span className="font-semibold text-white">{currentOffer.promoMonths} mo</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={12}
                          value={currentOffer.promoMonths}
                          onChange={(event) => handleOfferChange(audienceId, { promoMonths: Number(event.target.value) })}
                        />
                      </div>
                    </FieldLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldLabel
                        label="Incentives"
                        info={infoCopy.offerBuilder.incentives}
                        infoTestId="ocd-info-offerBuilder-incentives"
                        placement="left"
                      >
                        <div className="mt-1 space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Promo value</span>
                            <span className="font-semibold text-white">${currentOffer.promoValue}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={40}
                            value={currentOffer.promoValue}
                            onChange={(event) => handleOfferChange(audienceId, { promoValue: Number(event.target.value) })}
                          />
                        </div>
                      </FieldLabel>
                      <FieldLabel
                        label="Device option"
                        info={infoCopy.offerBuilder.deviceOption}
                        infoTestId="ocd-info-offerBuilder-deviceOption"
                        placement="left"
                      >
                        <div className="mt-1 space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Subsidy</span>
                            <span className="font-semibold text-white">${currentOffer.deviceSubsidy}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={400}
                            step={20}
                            value={currentOffer.deviceSubsidy}
                            onChange={(event) => handleOfferChange(audienceId, { deviceSubsidy: Number(event.target.value) })}
                          />
                        </div>
                      </FieldLabel>
                      <FieldLabel
                        label="Eligibility rules"
                        info={infoCopy.offerBuilder.eligibilityRules}
                        infoTestId="ocd-info-offerBuilder-eligibilityRules"
                        placement="left"
                        className="col-span-2"
                      >
                        <select
                          value={eligibility}
                          onChange={(event) =>
                            setEligibilityByAudience((prev) => ({ ...prev, [audienceId]: event.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="None">No additional filters</option>
                          <option value="Credit650">Credit ≥ 650</option>
                          <option value="PortIn">Port-in only</option>
                          <option value="NewLines">New lines only</option>
                        </select>
                      </FieldLabel>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <SectionHeader
                      title="Channel Mix & Sequencing"
                      info={infoCopy.channelMix._section}
                      infoTestId="ocd-info-channelMix-section"
                      className="text-xs"
                    />
                    <FieldLabel
                      label="Channels"
                      info={infoCopy.channelMix.channels}
                      infoTestId="ocd-info-channelMix-channels"
                      placement="left"
                    >
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-300">
                        {channels.map((channel) => (
                          <span key={`tag-${audienceId}-${channel.id}`} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                            {channel.name}
                          </span>
                        ))}
                      </div>
                    </FieldLabel>
                    <FieldLabel
                      label="Weights"
                      info={infoCopy.channelMix.weights}
                      infoTestId="ocd-info-channelMix-weights"
                      placement="left"
                    >
                      <div className="mt-1 space-y-2">
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
                    </FieldLabel>
                    <FieldLabel
                      label="Flighting"
                      info={infoCopy.channelMix.flighting}
                      infoTestId="ocd-info-channelMix-flighting"
                      placement="left"
                    >
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <label className="flex flex-col gap-1">
                          <span>Start</span>
                          <input
                            type="date"
                            value={flighting.start}
                            onChange={(event) =>
                              setFlightingByAudience((prev) => ({
                                ...prev,
                                [audienceId]: { ...flighting, start: event.target.value }
                              }))
                            }
                            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:border-emerald-500 focus:outline-none"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>End</span>
                          <input
                            type="date"
                            value={flighting.end}
                            onChange={(event) =>
                              setFlightingByAudience((prev) => ({
                                ...prev,
                                [audienceId]: { ...flighting, end: event.target.value }
                              }))
                            }
                            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:border-emerald-500 focus:outline-none"
                          />
                        </label>
                      </div>
                    </FieldLabel>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
          <div className="card border border-slate-800 p-4">
            <SectionHeader
              title="Measurement Plan"
              info={infoCopy.measurementPlan._section}
              infoTestId="ocd-info-measurementPlan-section"
              className="text-base"
            />
            <div className="mt-3 space-y-3 text-sm text-slate-200">
              <FieldLabel
                label="Primary KPI"
                info={infoCopy.measurementPlan.primaryKpi}
                infoTestId="ocd-info-measurementPlan-primaryKpi"
                placement="left"
              >
                <select
                  value={measurementPrimary}
                  onChange={(event) => setMeasurementPrimary(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Net adds">Net adds</option>
                  <option value="Conversion">Conversion %</option>
                  <option value="ARPU delta">ARPU delta</option>
                </select>
              </FieldLabel>
              <FieldLabel
                label="Secondary KPIs"
                info={infoCopy.measurementPlan.secondaryKpis}
                infoTestId="ocd-info-measurementPlan-secondaryKpis"
                placement="left"
              >
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  {['CTR', 'CVR', 'ARPU delta', 'Churn risk'].map((metric) => (
                    <label key={metric} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={measurementSecondary.includes(metric)}
                        onChange={() => toggleSecondaryMetric(metric)}
                        className="rounded border-slate-700 bg-slate-900"
                      />
                      {metric}
                    </label>
                  ))}
                </div>
              </FieldLabel>
              <FieldLabel
                label="Attribution"
                info={infoCopy.measurementPlan.attribution}
                infoTestId="ocd-info-measurementPlan-attribution"
                placement="left"
              >
                <select
                  value={measurementAttribution}
                  onChange={(event) => setMeasurementAttribution(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="MMM">MMM</option>
                  <option value="MTA">MTA</option>
                  <option value="Rules-based">Rules-based</option>
                </select>
              </FieldLabel>
              <FieldLabel
                label="Experiment setup"
                info={infoCopy.measurementPlan.experimentSetup}
                infoTestId="ocd-info-measurementPlan-experimentSetup"
                placement="left"
              >
                <select
                  value={measurementExperiment}
                  onChange={(event) => setMeasurementExperiment(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Holdout">Holdout</option>
                  <option value="Geo split">Geo split</option>
                  <option value="Matched market">Matched market</option>
                </select>
              </FieldLabel>
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
          </div>
        <aside className="card flex h-full flex-col gap-4 border border-slate-800 p-4">
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
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <SectionHeader
              title="Risk & Compliance"
              info={infoCopy.riskCompliance._section}
              infoTestId="ocd-info-riskCompliance-section"
              className="text-xs"
            />
            <div className="mt-3 space-y-3 text-xs text-slate-300">
              <FieldLabel
                label="Brand guardrails"
                info={infoCopy.riskCompliance.brandGuardrails}
                infoTestId="ocd-info-riskCompliance-brandGuardrails"
                placement="left"
              >
                <label className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={riskBrand}
                    onChange={(event) => setRiskBrand(event.target.checked)}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  All messaging approved
                </label>
              </FieldLabel>
              <FieldLabel
                label="Offer legality"
                info={infoCopy.riskCompliance.offerLegality}
                infoTestId="ocd-info-riskCompliance-offerLegality"
                placement="left"
              >
                <label className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={riskLegality}
                    onChange={(event) => setRiskLegality(event.target.checked)}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  Disclosures reviewed
                </label>
              </FieldLabel>
              <FieldLabel
                label="Fairness screen"
                info={infoCopy.riskCompliance.fairnessScreen}
                infoTestId="ocd-info-riskCompliance-fairnessScreen"
                placement="left"
              >
                <label className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={riskFairness}
                    onChange={(event) => setRiskFairness(event.target.checked)}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  Neutral language confirmed
                </label>
              </FieldLabel>
            </div>
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
        </aside>
          <div className="space-y-3">
          <SectionHeader
            title="Review & Export"
            info={infoCopy.reviewExport._section}
            infoTestId="ocd-info-reviewExport-section"
            className="text-base"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <FieldLabel
              label="Auto-summary"
              info={infoCopy.reviewExport.autoSummary}
              infoTestId="ocd-info-reviewExport-autoSummary"
              placement="top"
            >
              <p className="mt-1 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
                Preview the one-pager that leadership sees when you launch or export this plan.
              </p>
            </FieldLabel>
            <FieldLabel
              label="Export"
              info={infoCopy.reviewExport.export}
              infoTestId="ocd-info-reviewExport-export"
              placement="top"
            >
              <button
                type="button"
                onClick={exportSummary}
                className="mt-1 w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
              >
                Export summary now
              </button>
            </FieldLabel>
            <FieldLabel
              label="Approval checklist"
              info={infoCopy.reviewExport.approvalChecklist}
              infoTestId="ocd-info-reviewExport-approvalChecklist"
              placement="top"
            >
              <div className="mt-1 space-y-1 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-slate-700 bg-slate-900" defaultChecked /> Finance
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-slate-700 bg-slate-900" /> Legal
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-slate-700 bg-slate-900" /> Operations
                </label>
              </div>
            </FieldLabel>
          </div>
          <SelectionTray
            title="Campaign summary"
            items={campaign.audienceIds.map((id) => {
              const entry = microMap.get(id);
              const segment = entry ? segments.find((seg) => seg.id === entry.parentId) : undefined;
              return {
                id,
                label: segment ? `${segment.name} — ${entry?.data.name}` : id,
                subtitle: entry ? `${(entry.data.sizeShare * 100).toFixed(1)}% of cohort` : ''
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
        </div>
        <div className="flex flex-col gap-3 lg:sticky lg:top-24">
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Lock look</span>
            <input
              type="checkbox"
              aria-label="Lock preview look"
              className="h-4 w-8 rounded-full border border-slate-700 bg-slate-800 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              checked={previewLocked}
              onChange={(event) => handleToggleLock(event.target.checked)}
            />
          </label>
          {previewLocked && previewDirty ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              <div className="flex items-center justify-between gap-3">
                <span>Preview paused — changes pending</span>
                <button
                  type="button"
                  className="rounded-full border border-amber-400/50 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                  onClick={handleApplyPreview}
                >
                  Apply
                </button>
              </div>
            </div>
          ) : null}
          <CampaignPreview
            model={previewSnapshot}
            frame={previewFrame}
            onFrameChange={setPreviewFrame}
            onQuickEdit={handleQuickEdit}
          />
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
    </div>
);
};

export default CampaignDesigner;

// QA: All 8 sections show a header ⓘ.
// QA: Each listed field has an ⓘ with the exact text above.
// QA: Tooltips work on mouse and keyboard; ESC closes.
// QA: No layout shift on reveal; z-index sits above modals.
// QA: Text centralized in infoCopy.
// QA: Split layout renders; preview sticky on desktop, stacked on mobile.
// QA: Four frames switch via tabs without layout shift.
// QA: Preview reads from normalized model and reflects edits instantly unless locked.
// QA: Quick-edit buttons focus matching fields and highlight them.
// QA: Lock/Apply works; banner appears when locked with pending edits.
