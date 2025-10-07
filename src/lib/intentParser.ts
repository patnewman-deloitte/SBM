import { channels, offerArchetypes, type Channel, type MicroSegment, type OfferArchetype } from '../data/seeds';

export interface ChannelShift {
  from?: string;
  to?: string;
  delta: number;
}

export interface ChannelAdjust {
  channelId: string;
  delta: number;
}

export interface OfferAdjustments {
  priceDelta?: number;
  promoMonthsDelta?: number;
  promoValueDelta?: number;
  deviceSubsidyDelta?: number;
}

export interface AudienceChange {
  include?: string[];
  exclude?: string[];
}

export interface ParsedIntent {
  channelShifts: ChannelShift[];
  channelAdjusts: ChannelAdjust[];
  offerAdjustments: OfferAdjustments;
  audienceChange?: AudienceChange;
  budgetDelta?: number;
  paybackTarget?: number;
  notes: string[];
}

const normaliseName = (value: string) => value.trim().toLowerCase();

const channelByName = (label: string, channelData: Channel[]) => {
  const normalised = normaliseName(label);
  return channelData.find((channel) => normaliseName(channel.name) === normalised);
};

const offerByName = (label: string, offerData: OfferArchetype[]) => {
  const normalised = normaliseName(label);
  return offerData.find((offer) => normaliseName(offer.name) === normalised);
};

const microByName = (label: string, micros: MicroSegment[]) => {
  const normalised = normaliseName(label);
  return micros.find((micro) => normaliseName(micro.name) === normalised);
};

export const parseIntent = (input: string, context: { microSegments: MicroSegment[] }) => {
  const text = input.toLowerCase();
  const parsed: ParsedIntent = {
    channelShifts: [],
    channelAdjusts: [],
    offerAdjustments: {},
    notes: []
  };

  const percentPattern = /(-?\d+(?:\.\d+)?)%/g;
  const moneyPattern = /\$(-?\d+(?:\.\d+)?)/g;

  const shiftRegex = /shift\s+(\d+(?:\.\d+)?)%\s+budget\s+from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\.|$|,)/g;
  let shiftMatch: RegExpExecArray | null;
  while ((shiftMatch = shiftRegex.exec(text))) {
    const [, pctRaw, fromLabel, toLabel] = shiftMatch;
    const pct = parseFloat(pctRaw);
    const fromChannel = channelByName(fromLabel, channels);
    const toChannel = channelByName(toLabel, channels);
    if (fromChannel && toChannel) {
      parsed.channelShifts.push({ from: fromChannel.id, to: toChannel.id, delta: pct / 100 });
      parsed.notes.push(`Shift ${pct}% from ${fromChannel.name} to ${toChannel.name}`);
    }
  }

  const increaseRegex = /(increase|decrease)\s+([a-zA-Z\s]+?)\s+by\s+(\d+(?:\.\d+)?)%/g;
  let incMatch: RegExpExecArray | null;
  while ((incMatch = increaseRegex.exec(text))) {
    const [, direction, label, pctRaw] = incMatch;
    const channel = channelByName(label, channels);
    if (channel) {
      const sign = direction === 'increase' ? 1 : -1;
      parsed.channelAdjusts.push({ channelId: channel.id, delta: (parseFloat(pctRaw) / 100) * sign });
      parsed.notes.push(`${direction} ${channel.name} by ${pctRaw}%`);
    }
  }

  const priceRegex = /(raise|increase|drop|decrease)\s+(?:price|monthly price)\s+(?:by\s+)?\$?(\d+(?:\.\d+)?)/;
  const priceMatch = priceRegex.exec(text);
  if (priceMatch) {
    const [, direction, amount] = priceMatch;
    const sign = direction === 'raise' || direction === 'increase' ? 1 : -1;
    parsed.offerAdjustments.priceDelta = sign * parseFloat(amount);
    parsed.notes.push(`${direction} price by $${amount}`);
  }

  const promoRegex = /(add|remove|extend|shorten)\s+(\d+)\s+promo\s+months/;
  const promoMatch = promoRegex.exec(text);
  if (promoMatch) {
    const [, action, months] = promoMatch;
    const sign = action === 'add' || action === 'extend' ? 1 : -1;
    parsed.offerAdjustments.promoMonthsDelta = sign * parseInt(months, 10);
    parsed.notes.push(`${action} ${months} promo months`);
  }

  const promoValueRegex = /(increase|decrease|drop|raise)\s+promo\s+value\s+by\s+\$?(\d+(?:\.\d+)?)/;
  const promoValueMatch = promoValueRegex.exec(text);
  if (promoValueMatch) {
    const [, direction, amount] = promoValueMatch;
    const sign = direction === 'increase' || direction === 'raise' ? 1 : -1;
    parsed.offerAdjustments.promoValueDelta = sign * parseFloat(amount);
    parsed.notes.push(`${direction} promo value by $${amount}`);
  }

  const deviceRegex = /(drop|reduce|increase|raise)\s+(?:device\s+subsidy|device\s+credit)\s+\$?(\d+(?:\.\d+)?)/;
  const deviceMatch = deviceRegex.exec(text);
  if (deviceMatch) {
    const [, direction, amount] = deviceMatch;
    const sign = direction === 'increase' || direction === 'raise' ? 1 : -1;
    parsed.offerAdjustments.deviceSubsidyDelta = sign * parseFloat(amount);
    parsed.notes.push(`${direction} device subsidy by $${amount}`);
  }

  const includeRegex = /(include|add)\s+([a-zA-Z\s]+?)(?:,|$|\.)/g;
  let includeMatch: RegExpExecArray | null;
  const includes: string[] = [];
  while ((includeMatch = includeRegex.exec(text))) {
    const [, , label] = includeMatch;
    const micro = microByName(label, context.microSegments);
    if (micro) {
      includes.push(micro.id);
    }
  }

  const excludeRegex = /(exclude|remove|drop)\s+([a-zA-Z\s]+?)(?:,|$|\.)/g;
  let excludeMatch: RegExpExecArray | null;
  const excludes: string[] = [];
  while ((excludeMatch = excludeRegex.exec(text))) {
    const [, , label] = excludeMatch;
    const micro = microByName(label, context.microSegments);
    if (micro) {
      excludes.push(micro.id);
    }
  }

  if (includes.length || excludes.length) {
    parsed.audienceChange = {};
    if (includes.length) {
      parsed.audienceChange.include = includes;
      parsed.notes.push(`Include: ${includes.length} micro-segment(s)`);
    }
    if (excludes.length) {
      parsed.audienceChange.exclude = excludes;
      parsed.notes.push(`Exclude: ${excludes.length} micro-segment(s)`);
    }
  }

  const budgetRegex = /(increase|decrease|raise|lower|drop)\s+budget\s+by\s+\$?(\d+(?:\.\d+)?)/;
  const budgetMatch = budgetRegex.exec(text);
  if (budgetMatch) {
    const [, direction, amount] = budgetMatch;
    const sign = direction === 'increase' || direction === 'raise' ? 1 : -1;
    parsed.budgetDelta = sign * parseFloat(amount);
    parsed.notes.push(`${direction} budget by $${amount}`);
  }

  const paybackRegex = /payback\s*(?:<=|≤|under|below)\s*(\d+(?:\.\d+)?)/;
  const paybackMatch = paybackRegex.exec(text.replace('months', '').replace('mos', ''));
  if (paybackMatch) {
    parsed.paybackTarget = parseFloat(paybackMatch[1]);
    parsed.notes.push(`Target payback ≤ ${paybackMatch[1]} months`);
  }

  if (!parsed.notes.length) {
    parsed.notes.push('No actionable instructions detected.');
  }

  return parsed;
};

export const describeIntent = (intent: ParsedIntent) => intent.notes.join('; ');

export const defaultChannels = channels;
export const defaultOffers = offerArchetypes;
