# Subscriber Base Management — Acquire Prototype

This prototype showcases a three-step flow for identifying, refining, and activating subscriber cohorts across Market Radar, Segment Studio, and the Offering & Campaign Designer. It is a React + TypeScript + Vite application with Tailwind CSS styling, Zustand state management, and Recharts visualizations.

## Getting Started

```bash
pnpm install
pnpm dev
```

or use your preferred package manager (`npm install`, `yarn install`). The dev server runs on [http://localhost:5173](http://localhost:5173).

## Key Features

- **Market Radar** – Filter cohorts, visualize opportunity bubbles, drill into competitive maps, and curate a cart of promising cohorts.
- **Segment Studio** – Break cohorts into micro-segments, evaluate attractiveness, and send selected audiences forward.
- **Offering & Campaign Designer** – Adjust offers, channel mix, and budgets with live simulation via a deterministic tinySim engine.
- **Persistence** – Cohort selections, filters, and campaign plans persist to `localStorage` so your workflow resumes on reload.

Synthetic data lives in `src/data/seeds.ts`, and the simulation logic is implemented in `src/sim/tinySim.ts`.
