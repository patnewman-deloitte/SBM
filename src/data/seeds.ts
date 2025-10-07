import { Assumptions, CampaignPlan, Channel, Competitor, MicroSegment, OfferArchetype, Segment } from '../store/global';

export const assumptionsSeed: Assumptions = {
  grossMarginRate: 0.55,
  servicingCostPerSubMo: 12,
  deviceSubsidyAmortMo: 12,
  executionCost: 20
};

export const segmentsSeed: Segment[] = [
  {
    id: 'seg-value-seekers',
    name: 'Value Seekers',
    size: 520_000,
    traits: ['Budget-conscious', 'Digital-first', 'Promo responsive'],
    priceSensitivity: 0.8,
    valueSensitivity: 0.7,
    region: 'National',
    notes: 'Looking to upgrade from prepaid to postpaid bundles.'
  },
  {
    id: 'seg-premium-loyal',
    name: 'Premium Network Loyalists',
    size: 310_000,
    traits: ['Coverage focused', 'High ARPU', 'Family lines'],
    priceSensitivity: 0.3,
    valueSensitivity: 0.9,
    region: 'Urban',
    notes: 'Care deeply about reliability and device perks.'
  },
  {
    id: 'seg-rural-seniors',
    name: 'Rural Seniors',
    size: 190_000,
    traits: ['Fixed income', 'Voice heavy', 'Caregiver influenced'],
    priceSensitivity: 0.6,
    valueSensitivity: 0.4,
    region: 'Rural',
    notes: 'Interested in simple plans with support.'
  },
  {
    id: 'seg-urban-streamers',
    name: 'Urban Streamers',
    size: 470_000,
    traits: ['5G enthusiasts', 'Video heavy', 'Bundle ready'],
    priceSensitivity: 0.4,
    valueSensitivity: 0.8,
    region: 'Urban',
    notes: 'Need fast network and streaming perks.'
  },
  {
    id: 'seg-family-bundlers',
    name: 'Family Bundlers',
    size: 260_000,
    traits: ['Multiple lines', 'Home broadband', 'Device upgrade'],
    priceSensitivity: 0.5,
    valueSensitivity: 0.7,
    region: 'Suburban',
    notes: 'Open to switching if bundle value is clear.'
  },
  {
    id: 'seg-switch-prepaid',
    name: 'Switch-Prone Prepaid',
    size: 340_000,
    traits: ['Prepaid to postpaid drift', 'Promo savvy', 'High churn'],
    priceSensitivity: 0.9,
    valueSensitivity: 0.5,
    region: 'National',
    notes: 'Respond to price locks and device subsidies.'
  },
  {
    id: 'seg-smallbiz-byod',
    name: 'Small Biz BYOD',
    size: 120_000,
    traits: ['Business owners', 'Need support', 'Device flexibility'],
    priceSensitivity: 0.45,
    valueSensitivity: 0.65,
    region: 'National',
    notes: 'Care about service uptime and discounts.'
  }
];

export const competitorsSeed: Competitor[] = [
  { id: 'comp-alpha', name: 'AlphaMobile', basePrice: 65, promoDepth: 15, coverageScore: 82, valueScore: 74 },
  { id: 'comp-beta', name: 'BetaTel', basePrice: 60, promoDepth: 20, coverageScore: 76, valueScore: 69 },
  { id: 'comp-cable', name: 'CableCoMobile', basePrice: 55, promoDepth: 25, coverageScore: 68, valueScore: 71 },
  { id: 'comp-magenta', name: 'MagentaNet', basePrice: 70, promoDepth: 18, coverageScore: 88, valueScore: 80 }
];

export const offersSeed: OfferArchetype[] = [
  {
    id: 'offer-value-bundle',
    name: 'Value Bundle',
    monthlyPrice: 55,
    promoMonths: 3,
    promoValue: 15,
    deviceSubsidy: 120,
    bundleFlags: ['Mobile', 'Streaming']
  },
  {
    id: 'offer-device-boost',
    name: 'Device Boost',
    monthlyPrice: 68,
    promoMonths: 6,
    promoValue: 20,
    deviceSubsidy: 200,
    bundleFlags: ['Mobile', 'Device']
  },
  {
    id: 'offer-price-lock',
    name: 'Price-Lock 12',
    monthlyPrice: 62,
    promoMonths: 12,
    promoValue: 10,
    deviceSubsidy: 150,
    bundleFlags: ['Mobile']
  },
  {
    id: 'offer-streamer-pack',
    name: 'Streamer Pack',
    monthlyPrice: 72,
    promoMonths: 4,
    promoValue: 25,
    deviceSubsidy: 160,
    bundleFlags: ['Mobile', 'Streaming', 'Broadband']
  }
];

export const channelsSeed: Channel[] = [
  { id: 'ch-search', name: 'Search', cac: 65, eff: 0.9 },
  { id: 'ch-social', name: 'Social', cac: 85, eff: 0.85 },
  { id: 'ch-retail', name: 'Retail', cac: 140, eff: 0.75 },
  { id: 'ch-field', name: 'Field', cac: 180, eff: 0.6 },
  { id: 'ch-email', name: 'Email', cac: 50, eff: 0.7 }
];

const microTemplate = (
  parentId: string,
  names: string[],
  baseTraits: string[][],
  attractiveness: number[]
): MicroSegment[] =>
  names.map((name, idx) => ({
    id: `${parentId}-micro-${idx + 1}`,
    parentSegmentId: parentId,
    name,
    sizeShare: 0.08 + idx * 0.04,
    traits: baseTraits[idx],
    attractiveness: attractiveness[idx]
  }));

export const microSegmentsSeed: Record<string, MicroSegment[]> = {
  'seg-value-seekers': microTemplate(
    'seg-value-seekers',
    ['Promo Loyal Switchers', 'Device Upgraders', 'Bundle Curious Families', 'New Mover Deal Seekers', 'Cord Cutters', 'Budget Gamers'],
    [
      ['High churn', 'Respond to promo emails', 'Metro mix'],
      ['Need financing', 'Flagship interest', 'Trade-in ready'],
      ['Two-line households', 'Streaming heavy', 'Looking for savings'],
      ['Recent movers', 'Prepaid history', 'Fiber newly available'],
      ['OTT heavy', '5G curious', 'Social buzz'],
      ['Mobile gaming', 'Price sensitive', 'Low loyalty']
    ],
    [0.68, 0.72, 0.65, 0.7, 0.74, 0.6]
  ),
  'seg-premium-loyal': microTemplate(
    'seg-premium-loyal',
    ['Network Purists', 'Experience Seekers', 'Business Travelers', 'Family Coverage Maximizers', 'Early Tech Adopters', 'Luxury Device Fans'],
    [
      ['Need best coverage', '5G priority', 'Low churn'],
      ['Care about perks', 'High NPS', 'Refer friends'],
      ['Travel internationally', 'Roaming pain', 'Wi-Fi calling'],
      ['Multiple lines', 'Coverage sharing', 'Kids streaming'],
      ['Test new tech', 'Device pre-orders', 'Influencer'],
      ['High device spend', 'Premium accessories', 'Low promo need']
    ],
    [0.82, 0.78, 0.7, 0.69, 0.75, 0.68]
  ),
  'seg-rural-seniors': microTemplate(
    'seg-rural-seniors',
    ['Caregiver Coordinated', 'Assisted Living Residents', 'Value Phone Loyalists', 'Seasonal Travelers', 'Community Connectors', 'Health Monitoring Users'],
    [
      ['Family plan decisions', 'Need simplicity', 'Phone insurance'],
      ['Facility Wi-Fi gaps', 'Support heavy', 'Care staff influence'],
      ['Discount watchers', 'Coupon usage', 'Device financing'],
      ['Snowbirds', 'Coverage anxiety', 'Service bundlers'],
      ['Local events', 'Word-of-mouth', 'Trust us brand'],
      ['Wearables interested', 'Remote monitoring', 'Care team engaged']
    ],
    [0.54, 0.52, 0.48, 0.5, 0.47, 0.56]
  ),
  'seg-urban-streamers': microTemplate(
    'seg-urban-streamers',
    ['Live Stream Creators', 'Smart Home Leaders', 'Gaming Marathoners', 'Culture Shapers', 'Bundle Hackers', 'Gig Economy Power Users'],
    [
      ['Need uplink speed', 'Social heavy', 'Night owl usage'],
      ['Device ecosystem', 'Automation heavy', 'Wi-Fi 6'],
      ['Latency sensitive', 'Esports watchers', '5G mmWave'],
      ['Trend setters', 'Bundle share', 'High data'],
      ['Stack promos', 'OTT aggregator', 'Family plan'],
      ['On-the-go', 'Multiple sims', 'Portable hotspot']
    ],
    [0.79, 0.74, 0.77, 0.71, 0.76, 0.72]
  ),
  'seg-family-bundlers': microTemplate(
    'seg-family-bundlers',
    ['Dual Income Parents', 'Hybrid Workers', 'Connected Teens', 'Budget Maximizers', 'New Parents', 'Smart Home Families'],
    [
      ['Time starved', 'Need clarity', 'Bundle ready'],
      ['Hotspot heavy', 'Needs reliability', 'Device support'],
      ['Gaming + streaming', 'Multiple devices', 'Social heavy'],
      ['Coupon fans', 'Referral ready', 'Finance savvy'],
      ['New baby', 'Monitoring interest', 'Safety first'],
      ['IoT usage', 'Security cams', 'Voice assistant']
    ],
    [0.71, 0.69, 0.73, 0.66, 0.64, 0.68]
  ),
  'seg-switch-prepaid': microTemplate(
    'seg-switch-prepaid',
    ['Promo Hoppers', 'Credit Rebuilders', 'Device Switch Seekers', 'Gig Workers', 'College Streamers', 'Multi-line Savers'],
    [
      ['Churn monthly', 'Follow deals', 'Social influence'],
      ['Need credit help', 'Auto pay challenged', 'Cash heavy'],
      ['Want premium device', 'Bring own phone', 'Need financing'],
      ['Flexible hours', 'Hotspot heavy', 'On the go'],
      ['Campus deals', 'Streaming watch', 'Group plan interest'],
      ['Multiple prepaid lines', 'Family sharing', 'International calling']
    ],
    [0.67, 0.6, 0.7, 0.65, 0.68, 0.63]
  ),
  'seg-smallbiz-byod': microTemplate(
    'seg-smallbiz-byod',
    ['Retail Owners', 'Professional Services', 'Contractor Crews', 'Food Truck Ops', 'Healthcare Practices', 'Remote Teams'],
    [
      ['POS reliant', 'Need support', 'Weekend spikes'],
      ['Client facing', 'Conference heavy', 'White-glove'],
      ['Field workers', 'Rugged devices', 'Coverage first'],
      ['Mobile office', 'Seasonal demand', 'Cash flow focus'],
      ['HIPAA aware', 'Device security', 'Care messaging'],
      ['Collaborative tools', 'Video meetings', 'Data pooling']
    ],
    [0.66, 0.64, 0.58, 0.6, 0.62, 0.65]
  )
};

export const defaultCampaign: CampaignPlan = {
  audienceIds: [],
  offerByAudience: {},
  channelMixByAudience: {},
  budgetTotal: 250000,
  guardrails: { cacCeiling: 150, paybackTarget: 8 }
};
