/**
 * Mock data powering the Market Radar tab. All numbers are illustrative and consistent
 * with the guided experience we want to demo.
 */

export type Archetype = {
  id: number;
  title: string;
  reachable: string;
  cvr: string;
  payback: string;
  score: number;
  conf: "low" | "med" | "high";
  drivers: string[];
  rival: string;
  rivalNote: string;
  gaps: string[];
};

export type MicroSegment = {
  title: string;
  size: string;
  reach: string;
  cvr: string;
  payback: string;
  conf: string;
  why: string;
};

export const archetypes: Archetype[] = [
  {
    id: 1,
    title: "Remote Revivers",
    reachable: "180k",
    cvr: "2.0-2.4%",
    payback: "5-6 mo",
    score: 82,
    conf: "high",
    drivers: ["Flex billing", "One-week launch"],
    rival: "Nimbus",
    rivalNote: "Winning with bundled comms",
    gaps: ["Async support", "Payroll sync"]
  },
  {
    id: 2,
    title: "Hybrid HQs",
    reachable: "150k",
    cvr: "1.6-1.9%",
    payback: "6-7 mo",
    score: 74,
    conf: "med",
    drivers: ["Compliance auto", "Facilities dashboard"],
    rival: "AtlasSoft",
    rivalNote: "Leading with compliance services",
    gaps: ["Multi-region ops", "Mobile audit"]
  },
  {
    id: 3,
    title: "Field Fixers",
    reachable: "120k",
    cvr: "1.2-1.6%",
    payback: "4-5 mo",
    score: 68,
    conf: "med",
    drivers: ["Offline toolkit", "Crew messaging"],
    rival: "Groundly",
    rivalNote: "Price-led play",
    gaps: ["Inventory check", "Route planning"]
  },
  {
    id: 4,
    title: "Creator Collectives",
    reachable: "90k",
    cvr: "2.4-3.0%",
    payback: "3-4 mo",
    score: 88,
    conf: "high",
    drivers: ["Creator payouts", "Affiliate boosts"],
    rival: "Pulse",
    rivalNote: "Strong partner program",
    gaps: ["Tax wizard", "Campaign insights"]
  },
  {
    id: 5,
    title: "Legacy Lifters",
    reachable: "210k",
    cvr: "0.9-1.2%",
    payback: "8-9 mo",
    score: 58,
    conf: "low",
    drivers: ["White-glove onboarding", "Finance integrations"],
    rival: "FirmWare",
    rivalNote: "Enterprise lock-in",
    gaps: ["Change management", "Advanced reporting"]
  }
];

export const microSegments: Record<number, MicroSegment[]> = {
  1: [
    {
      title: "Series B remote-first",
      size: "45k",
      reach: "38k",
      cvr: "2.4%",
      payback: "5.2 mo",
      conf: "High",
      why: "Buying tools to consolidate vendor stack"
    },
    {
      title: "Global CS pods",
      size: "70k",
      reach: "62k",
      cvr: "2.1%",
      payback: "5.7 mo",
      conf: "High",
      why: "Need async escalations and quality tracking"
    }
  ],
  2: [
    {
      title: "Hybrid compliance leads",
      size: "34k",
      reach: "28k",
      cvr: "1.9%",
      payback: "6.1 mo",
      conf: "Medium",
      why: "Regulatory changes driving spend"
    },
    {
      title: "Facilities ops",
      size: "46k",
      reach: "39k",
      cvr: "1.6%",
      payback: "6.8 mo",
      conf: "Medium",
      why: "Need modern audit workflows"
    }
  ],
  3: [
    {
      title: "Regional field teams",
      size: "28k",
      reach: "24k",
      cvr: "1.4%",
      payback: "4.6 mo",
      conf: "Medium",
      why: "ROI tied to downtime reduction"
    },
    {
      title: "Maintenance subs",
      size: "35k",
      reach: "30k",
      cvr: "1.3%",
      payback: "4.9 mo",
      conf: "Low",
      why: "Evaluating pricing vs incumbents"
    }
  ],
  4: [
    {
      title: "Creator agencies",
      size: "22k",
      reach: "19k",
      cvr: "2.8%",
      payback: "3.2 mo",
      conf: "High",
      why: "Chasing faster payout cycles"
    },
    {
      title: "Collective platforms",
      size: "31k",
      reach: "26k",
      cvr: "2.5%",
      payback: "3.8 mo",
      conf: "High",
      why: "Need affiliate automation"
    }
  ],
  5: [
    {
      title: "Legacy ERP users",
      size: "80k",
      reach: "64k",
      cvr: "1.1%",
      payback: "8.4 mo",
      conf: "Low",
      why: "Exploring modernization budget"
    },
    {
      title: "Finance change teams",
      size: "48k",
      reach: "40k",
      cvr: "1.0%",
      payback: "8.9 mo",
      conf: "Low",
      why: "Need onboarding support"
    }
  ]
};

export const competitors = ["Nimbus", "AtlasSoft", "Groundly", "Pulse", "FirmWare"];

export const overlap: string[][] = [
  ["36%", "22%", "18%", "12%", "8%"],
  ["28%", "31%", "14%", "16%", "11%"],
  ["24%", "20%", "33%", "12%", "9%"],
  ["18%", "16%", "12%", "42%", "11%"],
  ["32%", "27%", "18%", "9%", "37%"]
];

export const usStates = [
  { id: "CA", name: "California", value: 0.82 },
  { id: "TX", name: "Texas", value: 0.64 },
  { id: "NY", name: "New York", value: 0.75 },
  { id: "FL", name: "Florida", value: 0.58 },
  { id: "IL", name: "Illinois", value: 0.52 },
  { id: "WA", name: "Washington", value: 0.69 },
  { id: "GA", name: "Georgia", value: 0.49 },
  { id: "NC", name: "North Carolina", value: 0.46 },
  { id: "CO", name: "Colorado", value: 0.55 },
  { id: "AZ", name: "Arizona", value: 0.43 }
];
