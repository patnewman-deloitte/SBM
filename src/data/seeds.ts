export interface Segment {
  id: string;
  name: string;
  size: number;
  growthRate: number;
  priceSensitivity: number;
  valueSensitivity: number;
  regionMix: Record<string, number>;
  demographics: {
    income: 'low' | 'mid' | 'high';
    age: 'youth' | 'adult' | 'senior';
    household: 'single' | 'family';
  };
  notes: string;
  defaultOfferId: string;
  defaultChannelMix: Record<string, number>;
}

export interface Competitor {
  id: string;
  name: string;
  basePrice: number;
  promoStyle: string;
  networkScore: number;
  coverageScore: number;
  valueScore: number;
  churnInflow: number;
  churnOutflow: number;
  bundleFlag: boolean;
  promoDepth: number;
}

export interface OfferArchetype {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  promoMonths: number;
  promoValue: number;
  deviceSubsidy: number;
  bundleFlag: boolean;
  channelMixDefaults: Record<string, number>;
}

export interface Channel {
  id: string;
  name: string;
  cac: number;
  convCurveParams: {
    reach: number;
    efficiency: number;
  };
}

export interface Assumptions {
  grossMarginRate: number;
  servicingCostPerSubMo: number;
  deviceSubsidyAmortMo: number;
  executionCost: number;
}

export const segments: Segment[] = [
  {
    id: 'seg-value-seekers',
    name: 'Value Seekers',
    size: 420000,
    growthRate: 0.08,
    priceSensitivity: 0.82,
    valueSensitivity: 0.64,
    regionMix: { urban: 0.42, suburban: 0.33, rural: 0.25 },
    demographics: { income: 'low', age: 'adult', household: 'family' },
    notes: 'Large prepaid skew, hunt for discounts but respond to bundles.',
    defaultOfferId: 'offer-value-bundle',
    defaultChannelMix: { 'channel-paid-social': 0.35, 'channel-search': 0.35, 'channel-retail': 0.2, 'channel-field': 0.1 }
  },
  {
    id: 'seg-premium-network',
    name: 'Premium Network Loyalists',
    size: 250000,
    growthRate: 0.05,
    priceSensitivity: 0.38,
    valueSensitivity: 0.74,
    regionMix: { urban: 0.55, suburban: 0.35, rural: 0.1 },
    demographics: { income: 'high', age: 'adult', household: 'single' },
    notes: 'Expect flawless coverage and premium support; low churn but high ARPU.',
    defaultOfferId: 'offer-price-lock',
    defaultChannelMix: { 'channel-search': 0.25, 'channel-retail': 0.3, 'channel-field': 0.2, 'channel-paid-social': 0.25 }
  },
  {
    id: 'seg-rural-seniors',
    name: 'Rural Seniors',
    size: 150000,
    growthRate: 0.02,
    priceSensitivity: 0.55,
    valueSensitivity: 0.48,
    regionMix: { urban: 0.08, suburban: 0.22, rural: 0.7 },
    demographics: { income: 'mid', age: 'senior', household: 'single' },
    notes: 'Need reliability and assisted onboarding; limited data usage.',
    defaultOfferId: 'offer-device-boost',
    defaultChannelMix: { 'channel-field': 0.35, 'channel-retail': 0.4, 'channel-paid-social': 0.1, 'channel-search': 0.15 }
  },
  {
    id: 'seg-urban-streamers',
    name: 'Urban Streamers',
    size: 310000,
    growthRate: 0.11,
    priceSensitivity: 0.58,
    valueSensitivity: 0.86,
    regionMix: { urban: 0.68, suburban: 0.27, rural: 0.05 },
    demographics: { income: 'mid', age: 'youth', household: 'single' },
    notes: 'Heavy data + entertainment usage; respond to bundles and speed.',
    defaultOfferId: 'offer-streamer-pack',
    defaultChannelMix: { 'channel-paid-social': 0.4, 'channel-search': 0.3, 'channel-retail': 0.2, 'channel-field': 0.1 }
  },
  {
    id: 'seg-family-bundlers',
    name: 'Family Bundlers',
    size: 380000,
    growthRate: 0.07,
    priceSensitivity: 0.6,
    valueSensitivity: 0.79,
    regionMix: { urban: 0.32, suburban: 0.46, rural: 0.22 },
    demographics: { income: 'mid', age: 'adult', household: 'family' },
    notes: 'Multiline households balancing price with perks and parental controls.',
    defaultOfferId: 'offer-value-bundle',
    defaultChannelMix: { 'channel-retail': 0.32, 'channel-paid-social': 0.28, 'channel-search': 0.25, 'channel-field': 0.15 }
  },
  {
    id: 'seg-switch-prepaid',
    name: 'Switch-Prone Prepaid',
    size: 270000,
    growthRate: 0.09,
    priceSensitivity: 0.9,
    valueSensitivity: 0.52,
    regionMix: { urban: 0.5, suburban: 0.3, rural: 0.2 },
    demographics: { income: 'low', age: 'adult', household: 'single' },
    notes: 'Churn-heavy prepaid shoppers; move for promos and device deals.',
    defaultOfferId: 'offer-device-boost',
    defaultChannelMix: { 'channel-paid-social': 0.4, 'channel-search': 0.3, 'channel-retail': 0.2, 'channel-field': 0.1 }
  }
];

export const offerArchetypes: OfferArchetype[] = [
  {
    id: 'offer-value-bundle',
    name: 'Value Bundle',
    description: '2-line bundle with streaming perk and $15/mo promo for 3 months.',
    monthlyPrice: 65,
    promoMonths: 3,
    promoValue: 15,
    deviceSubsidy: 120,
    bundleFlag: true,
    channelMixDefaults: { 'channel-paid-social': 0.35, 'channel-search': 0.3, 'channel-retail': 0.25, 'channel-field': 0.1 }
  },
  {
    id: 'offer-device-boost',
    name: 'Device Boost',
    description: '$200 device credit with 24-month installment.',
    monthlyPrice: 75,
    promoMonths: 2,
    promoValue: 10,
    deviceSubsidy: 200,
    bundleFlag: false,
    channelMixDefaults: { 'channel-retail': 0.38, 'channel-field': 0.24, 'channel-search': 0.2, 'channel-paid-social': 0.18 }
  },
  {
    id: 'offer-price-lock',
    name: 'Price-Lock 12',
    description: 'Premium unlimited with price locked for 12 months.',
    monthlyPrice: 90,
    promoMonths: 1,
    promoValue: 20,
    deviceSubsidy: 150,
    bundleFlag: false,
    channelMixDefaults: { 'channel-retail': 0.3, 'channel-field': 0.25, 'channel-search': 0.25, 'channel-paid-social': 0.2 }
  },
  {
    id: 'offer-streamer-pack',
    name: 'Streamer Pack',
    description: 'Unlimited premium data with 3 streaming services included.',
    monthlyPrice: 85,
    promoMonths: 3,
    promoValue: 18,
    deviceSubsidy: 160,
    bundleFlag: true,
    channelMixDefaults: { 'channel-paid-social': 0.42, 'channel-search': 0.28, 'channel-retail': 0.18, 'channel-field': 0.12 }
  }
];

export const channels: Channel[] = [
  {
    id: 'channel-paid-social',
    name: 'Paid Social',
    cac: 85,
    convCurveParams: { reach: 0.42, efficiency: 0.65 }
  },
  {
    id: 'channel-search',
    name: 'Search',
    cac: 65,
    convCurveParams: { reach: 0.36, efficiency: 0.72 }
  },
  {
    id: 'channel-retail',
    name: 'Retail',
    cac: 140,
    convCurveParams: { reach: 0.28, efficiency: 0.58 }
  },
  {
    id: 'channel-field',
    name: 'Field',
    cac: 180,
    convCurveParams: { reach: 0.22, efficiency: 0.55 }
  }
];

export const assumptions: Assumptions = {
  grossMarginRate: 0.55,
  servicingCostPerSubMo: 12,
  deviceSubsidyAmortMo: 12,
  executionCost: 20
};

export const competitors: Competitor[] = [
  {
    id: 'comp-alpha',
    name: 'AlphaMobile',
    basePrice: 75,
    promoStyle: 'Flash promo, $200 device credit',
    networkScore: 82,
    coverageScore: 85,
    valueScore: 74,
    churnInflow: 0.28,
    churnOutflow: 0.22,
    bundleFlag: true,
    promoDepth: 18
  },
  {
    id: 'comp-beta',
    name: 'BetaTel',
    basePrice: 68,
    promoStyle: 'Always-on 2 for $120',
    networkScore: 74,
    coverageScore: 70,
    valueScore: 77,
    churnInflow: 0.21,
    churnOutflow: 0.27,
    bundleFlag: false,
    promoDepth: 12
  },
  {
    id: 'comp-cableco',
    name: 'CableCoMobile',
    basePrice: 60,
    promoStyle: 'Bundle with home internet',
    networkScore: 68,
    coverageScore: 66,
    valueScore: 71,
    churnInflow: 0.26,
    churnOutflow: 0.24,
    bundleFlag: true,
    promoDepth: 20
  },
  {
    id: 'comp-magenta',
    name: 'MagentaNet',
    basePrice: 80,
    promoStyle: 'VIP perks + streaming',
    networkScore: 88,
    coverageScore: 83,
    valueScore: 81,
    churnInflow: 0.31,
    churnOutflow: 0.19,
    bundleFlag: true,
    promoDepth: 22
  }
];

export const migrationMatrix = [
  { from: 'Us', to: 'AlphaMobile', value: 0.12 },
  { from: 'Us', to: 'BetaTel', value: 0.09 },
  { from: 'Us', to: 'CableCoMobile', value: 0.06 },
  { from: 'Us', to: 'MagentaNet', value: 0.08 },
  { from: 'AlphaMobile', to: 'Us', value: 0.15 },
  { from: 'BetaTel', to: 'Us', value: 0.11 },
  { from: 'CableCoMobile', to: 'Us', value: 0.1 },
  { from: 'MagentaNet', to: 'Us', value: 0.12 },
  { from: 'AlphaMobile', to: 'MagentaNet', value: 0.07 },
  { from: 'BetaTel', to: 'CableCoMobile', value: 0.05 },
  { from: 'CableCoMobile', to: 'BetaTel', value: 0.04 },
  { from: 'MagentaNet', to: 'AlphaMobile', value: 0.03 }
];

export type ChannelMix = Record<string, number>;

export interface MicroSegment {
  id: string;
  parentSegmentId: string;
  name: string;
  size: number;
  traits: string[];
  priceSensitivity: number;
  valueSensitivity: number;
  defaultChannelMix: ChannelMix;
  defaultOfferId: string;
}

export interface Recommendation {
  channelMix: ChannelMix;
  offerArchetypeId: string;
  rationale: string[];
  creativeTone: string[];
  expected: {
    paybackMonths: string;
    grossMargin12Mo: number;
    netAdds: number;
  };
}
