import React from 'react';
import { Mode } from '../appState';

export type ActionDrawerProps = {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  onAddToPlan?: (id: string) => void;
};

type ActionConfig = {
  id: string;
  title: string;
  subject: string;
  sms: [string, string];
  offer: Record<string, unknown>;
};

const actionTemplates: Record<Mode, ActionConfig[]> = {
  acquire: [
    {
      id: 'win-back',
      title: 'Generate win-back sequence',
      subject: 'We saved your spot on 5G Family',
      sms: ['Still ready for faster 5G + home internet?', 'Reply YES to lock in install + $20/mo credit.'],
      offer: { incentive: '$20/mo for 6 mo', cadence: 'Email + SMS + call', focus: 'Switch-ready prepaid movers' },
    },
    {
      id: 'price-offer',
      title: 'Create price-sensitive offer',
      subject: 'Your best price on 5G + Home is here',
      sms: ['Bundle mobile + home save $25/mo.', 'Tap the link for concierge setup.'],
      offer: { bundle: ['Mobile', 'Home'], promo: '$25/mo savings', guardrail: 'CAC <= $140' },
    },
    {
      id: 'loyalty-nudge',
      title: 'Design loyalty nudge',
      subject: 'Unlock priority install & device perks',
      sms: ['Members get install in 48h + device credit.', 'Reply CLAIM to confirm appointment.'],
      offer: { perk: 'Priority install', bonus: 'Device credit $120', journey: 'Retention concierge follow-up' },
    },
  ],
  grow: [
    {
      id: 'win-back',
      title: 'Generate win-back sequence',
      subject: 'Come back to Premium 5G with perks',
      sms: ['Premium plan ready with loyalty credit.', 'Reply YES for white-glove return setup.'],
      offer: { incentive: '$15/mo credit', cadence: 'Email + push + SMS', focus: 'Lapsed premium bundle fans' },
    },
    {
      id: 'price-offer',
      title: 'Create price-sensitive offer',
      subject: 'Upgrade bundle, save more each month',
      sms: ['Add Home Internet and save $25/mo.', 'Tap to stack loyalty and autopay.'],
      offer: { bundle: ['Wireless', 'Home'], promo: '$25/mo stack', guardrail: 'Attach rate >= 24%' },
    },
    {
      id: 'loyalty-nudge',
      title: 'Design loyalty nudge',
      subject: 'Loyalty perk unlocked: premium care',
      sms: ['Unlock concierge support + device credits.', 'Reply PERK to activate your bundle bonus.'],
      offer: { perk: 'Concierge care', bonus: 'Accessory credit $80', journey: 'Email + in-app + call' },
    },
  ],
  retain: [
    {
      id: 'win-back',
      title: 'Generate win-back sequence',
      subject: 'We are holding your loyalty credit',
      sms: ['Stay with us for $15 loyalty credit.', 'Reply STAY to trigger concierge save team.'],
      offer: { incentive: '$15 loyalty credit', cadence: 'SMS + call + email', focus: 'At-risk premium households' },
    },
    {
      id: 'price-offer',
      title: 'Create price-sensitive offer',
      subject: 'Lock your rate and add device protection',
      sms: ['Keep your plan + device protection for $10.', 'Reply LOCK to secure rate + care team support.'],
      offer: { perk: 'Device protection', promo: '$10 loyalty rate lock', guardrail: 'Churn delta <= -30bps' },
    },
    {
      id: 'loyalty-nudge',
      title: 'Design loyalty nudge',
      subject: 'Your loyalty concierge is on standby',
      sms: ['Schedule a priority call with our care team.', 'Reply CARE for your tailored retention bundle.'],
      offer: { perk: 'Priority care', bonus: 'Fee waiver', journey: 'Care call + SMS follow up' },
    },
  ],
};

const ActionDrawer: React.FC<ActionDrawerProps> = ({ open, onClose, mode, onAddToPlan }) => {
  const [added, setAdded] = React.useState<Record<string, boolean>>({});

  const handleCopy = React.useCallback((text: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  }, []);

  const handleAdd = React.useCallback(
    (id: string) => {
      setAdded((prev) => ({ ...prev, [id]: true }));
      onAddToPlan?.(id);
    },
    [onAddToPlan],
  );

  const actions = actionTemplates[mode];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/60">
      <aside className="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Agentic actions</p>
            <p className="text-xs text-slate-400">Spin up journeys, offers, and guardrails instantly.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Close actions drawer"
          >
            Close
          </button>
        </div>
        <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-2">
          {actions.map((action) => {
            const offerJson = JSON.stringify(action.offer, null, 2);
            return (
              <section key={action.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{action.title}</p>
                    <p className="text-xs text-slate-400">Ready-to-ship creative + config.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(action.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      added[action.id]
                        ? 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : 'border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                    }`}
                    aria-label={`Add ${action.title} to plan`}
                  >
                    {added[action.id] ? 'Added' : 'Add to plan'}
                  </button>
                </header>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Subject line</p>
                    <p className="mt-1 text-sm text-slate-100">{action.subject}</p>
                    <button
                      type="button"
                      onClick={() => handleCopy(action.subject)}
                      className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      aria-label={`Copy ${action.title} subject`}
                    >
                      Copy subject
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">SMS flow</p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-200">
                      <li>{action.sms[0]}</li>
                      <li>{action.sms[1]}</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${action.sms[0]}\n${action.sms[1]}`)}
                      className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      aria-label={`Copy ${action.title} SMS`}
                    >
                      Copy SMS
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Offer config</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-5 text-emerald-200">{offerJson}</pre>
                    <button
                      type="button"
                      onClick={() => handleCopy(offerJson)}
                      className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      aria-label={`Copy ${action.title} offer config`}
                    >
                      Copy config
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

export default ActionDrawer;
