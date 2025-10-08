export type StateKpi = {
  stateCode: string;
  stateName: string;
  paybackDeltaMonths: number;
  stateScore: number;
  opportunities: number;
  riskFlag: 'Low' | 'Medium' | 'High';
};

const baseStates: Array<Pick<StateKpi, 'stateCode' | 'stateName'>> = [
  { stateCode: 'AL', stateName: 'Alabama' },
  { stateCode: 'AK', stateName: 'Alaska' },
  { stateCode: 'AZ', stateName: 'Arizona' },
  { stateCode: 'AR', stateName: 'Arkansas' },
  { stateCode: 'CA', stateName: 'California' },
  { stateCode: 'CO', stateName: 'Colorado' },
  { stateCode: 'CT', stateName: 'Connecticut' },
  { stateCode: 'DE', stateName: 'Delaware' },
  { stateCode: 'DC', stateName: 'District of Columbia' },
  { stateCode: 'FL', stateName: 'Florida' },
  { stateCode: 'GA', stateName: 'Georgia' },
  { stateCode: 'HI', stateName: 'Hawaii' },
  { stateCode: 'ID', stateName: 'Idaho' },
  { stateCode: 'IL', stateName: 'Illinois' },
  { stateCode: 'IN', stateName: 'Indiana' },
  { stateCode: 'IA', stateName: 'Iowa' },
  { stateCode: 'KS', stateName: 'Kansas' },
  { stateCode: 'KY', stateName: 'Kentucky' },
  { stateCode: 'LA', stateName: 'Louisiana' },
  { stateCode: 'ME', stateName: 'Maine' },
  { stateCode: 'MD', stateName: 'Maryland' },
  { stateCode: 'MA', stateName: 'Massachusetts' },
  { stateCode: 'MI', stateName: 'Michigan' },
  { stateCode: 'MN', stateName: 'Minnesota' },
  { stateCode: 'MS', stateName: 'Mississippi' },
  { stateCode: 'MO', stateName: 'Missouri' },
  { stateCode: 'MT', stateName: 'Montana' },
  { stateCode: 'NE', stateName: 'Nebraska' },
  { stateCode: 'NV', stateName: 'Nevada' },
  { stateCode: 'NH', stateName: 'New Hampshire' },
  { stateCode: 'NJ', stateName: 'New Jersey' },
  { stateCode: 'NM', stateName: 'New Mexico' },
  { stateCode: 'NY', stateName: 'New York' },
  { stateCode: 'NC', stateName: 'North Carolina' },
  { stateCode: 'ND', stateName: 'North Dakota' },
  { stateCode: 'OH', stateName: 'Ohio' },
  { stateCode: 'OK', stateName: 'Oklahoma' },
  { stateCode: 'OR', stateName: 'Oregon' },
  { stateCode: 'PA', stateName: 'Pennsylvania' },
  { stateCode: 'RI', stateName: 'Rhode Island' },
  { stateCode: 'SC', stateName: 'South Carolina' },
  { stateCode: 'SD', stateName: 'South Dakota' },
  { stateCode: 'TN', stateName: 'Tennessee' },
  { stateCode: 'TX', stateName: 'Texas' },
  { stateCode: 'UT', stateName: 'Utah' },
  { stateCode: 'VT', stateName: 'Vermont' },
  { stateCode: 'VA', stateName: 'Virginia' },
  { stateCode: 'WA', stateName: 'Washington' },
  { stateCode: 'WV', stateName: 'West Virginia' },
  { stateCode: 'WI', stateName: 'Wisconsin' },
  { stateCode: 'WY', stateName: 'Wyoming' }
];

const overrides: Partial<Record<string, Partial<StateKpi>>> = {
  CA: { paybackDeltaMonths: 8.2, stateScore: 0.72, opportunities: 13400, riskFlag: 'Medium' },
  TX: { paybackDeltaMonths: 7.4, stateScore: 0.69, opportunities: 12850, riskFlag: 'Medium' },
  NY: { paybackDeltaMonths: 9.1, stateScore: 0.75, opportunities: 15200, riskFlag: 'Medium' },
  FL: { paybackDeltaMonths: 6.6, stateScore: 0.68, opportunities: 14250, riskFlag: 'Low' },
  IL: { paybackDeltaMonths: 8.7, stateScore: 0.7, opportunities: 11340, riskFlag: 'Medium' }
};

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const stateKpis: StateKpi[] = baseStates.map((state, index) => {
  const seed = index + 1;
  const paybackBase = 5 + pseudoRandom(seed) * 7.5;
  const stateScore = 0.45 + pseudoRandom(seed * 1.7) * 0.5;
  const opportunities = Math.round(4000 + pseudoRandom(seed * 2.3) * 20000);
  const paybackDeltaMonths = Math.round(paybackBase * 10) / 10;
  const riskFlag: StateKpi['riskFlag'] = paybackDeltaMonths >= 10 ? 'High' : paybackDeltaMonths >= 7.5 ? 'Medium' : 'Low';

  const override = overrides[state.stateCode];
  if (override) {
    return {
      ...state,
      paybackDeltaMonths: override.paybackDeltaMonths ?? paybackDeltaMonths,
      stateScore: override.stateScore ?? Math.round(stateScore * 100) / 100,
      opportunities: override.opportunities ?? opportunities,
      riskFlag: override.riskFlag ?? riskFlag
    } satisfies StateKpi;
  }

  return {
    ...state,
    paybackDeltaMonths,
    stateScore: Math.round(stateScore * 100) / 100,
    opportunities,
    riskFlag
  } satisfies StateKpi;
});

export default stateKpis;
