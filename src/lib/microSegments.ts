import { channels, type MicroSegment, type Segment } from '../data/seeds';
import { getOfferById, runCohort } from '../sim/tinySim';

const personaLabels = [
  'Value Seekers',
  'Network Loyalists',
  'Streaming Enthusiasts',
  'Bundle Builders',
  'Device Upgraders',
  'Switch Sprinters',
  'Coverage Conscious'
];

export const seededRandom = (seed: number) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const nameByPersona = (segment: Segment, index: number) => {
  const regionFocus = Object.entries(segment.regionMix).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'mixed';
  const persona = personaLabels[(index + segment.name.length) % personaLabels.length];
  return `${persona} (${regionFocus.charAt(0).toUpperCase()}${regionFocus.slice(1)})`;
};

export const buildTraits = (segment: Segment, variation: number) => {
  const traits: string[] = [];
  if (segment.priceSensitivity + variation > 0.75) traits.push('Price reactive');
  if (segment.valueSensitivity + variation > 0.75) traits.push('Value maximisers');
  if (segment.demographics.household === 'family') traits.push('Multi-line households');
  if (segment.demographics.age === 'senior') traits.push('Needs assisted onboarding');
  if (segment.demographics.age === 'youth') traits.push('Digital-first journeys');
  if (!traits.length) traits.push('Balanced motivations');
  return traits.slice(0, 3);
};

export const generateMicroSegments = (segment: Segment) => {
  const clusters = 5;
  const micros: MicroSegment[] = [];
  const baseWeights = [0.18, 0.22, 0.2, 0.2, 0.2];
  for (let i = 0; i < clusters; i += 1) {
    const seed = segment.size * (i + 1);
    const variation = seededRandom(seed) * 0.2 - 0.1;
    const price = Math.min(0.95, Math.max(0.2, segment.priceSensitivity + variation));
    const value = Math.min(0.95, Math.max(0.2, segment.valueSensitivity + variation * -1));
    const size = Math.round(segment.size * baseWeights[i]);
    const defaultOfferId = price > 0.7 ? 'offer-value-bundle' : segment.defaultOfferId;
    const defaultChannelMix = Object.fromEntries(
      Object.entries(segment.defaultChannelMix).map(([channelId, weight], idx) => {
        const noise = seededRandom(seed + idx) * 0.1 - 0.05;
        return [channelId, Math.max(0.05, weight + noise)];
      })
    );
    micros.push({
      id: `${segment.id}-micro-${i}`,
      parentSegmentId: segment.id,
      name: nameByPersona(segment, i),
      size,
      traits: buildTraits(segment, variation),
      priceSensitivity: price,
      valueSensitivity: value,
      defaultChannelMix,
      defaultOfferId
    });
  }
  return micros;
};

export const normaliseMix = (mix: Record<string, number>) => {
  const total = Object.values(mix).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(Object.entries(mix).map(([key, value]) => [key, value / (total || 1)]));
};

export const buildRecommendation = (micro: MicroSegment) => {
  const offer = getOfferById(micro.defaultOfferId);
  const channelMix = normaliseMix(micro.defaultChannelMix);
  const summary = runCohort({
    segment: {
      id: micro.id,
      name: micro.name,
      size: micro.size,
      priceSensitivity: micro.priceSensitivity,
      valueSensitivity: micro.valueSensitivity,
      growthRate: 0.06
    },
    offer,
    channelMix
  });
  const rationale = [
    micro.priceSensitivity > 0.7 ? 'Lead with promo-led storytelling' : 'Reinforce network reliability',
    micro.valueSensitivity > 0.75 ? 'Bundle emphasises perceived value' : 'Keep CAC disciplined with targeted channels'
  ];
  const creativeTone = micro.traits.includes('Digital-first journeys')
    ? ['Energetic', 'Youthful social proof', 'Streaming hero moments']
    : ['Pragmatic savings', 'Service reassurance', 'Family use-cases'];

  return {
    channelMix,
    offerArchetypeId: offer.id,
    rationale,
    creativeTone,
    expected: {
      paybackMonths: summary.paybackMonths,
      grossMargin12Mo: summary.grossMargin12Mo,
      netAdds: summary.netAdds
    }
  };
};
