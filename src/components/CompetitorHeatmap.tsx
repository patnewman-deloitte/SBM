import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, CartesianGrid, Cell } from 'recharts';
import { competitors } from '../data/seeds';
import { InfoPopover } from './InfoPopover';

const data = competitors.map((competitor) => ({
  name: competitor.name,
  valueScore: competitor.valueScore,
  price: competitor.basePrice - competitor.promoDepth / 2,
  composite: Math.round((competitor.networkScore + competitor.coverageScore) / 2)
}));

const colorScale = (value: number) => {
  if (value > 85) return '#2563eb';
  if (value > 75) return '#3b82f6';
  if (value > 65) return '#60a5fa';
  return '#93c5fd';
};

export const CompetitorHeatmap = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Price vs. value perception</h3>
          <p className="text-sm text-slate-500">Higher value score indicates better perceived experience.</p>
        </div>
        <InfoPopover
          title="Competitive Heatmap"
          plainDescription="Relative price vs. perceived value among leading competitors."
          primarySourceHint="Synth sentiment + pricing"
        />
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="valueScore" name="Value score" domain={[60, 95]} tickFormatter={(value) => `${value}`}
              label={{ value: 'Perceived value ↑', position: 'insideBottom', offset: -10 }}
            />
            <YAxis type="number" dataKey="price" name="Effective price" domain={[45, 95]} tickFormatter={(value) => `$${value}`}
              label={{ value: 'Effective price ($)', angle: -90, position: 'insideLeft' }}
            />
            <ZAxis type="number" dataKey="composite" range={[120, 400]} name="Network + coverage" />
            <Tooltip cursor={{ strokeDasharray: '4 4' }} formatter={(value: number, name: string, payload) => {
              if (name === 'price') return [`$${value.toFixed(0)}`, 'Effective price'];
              if (name === 'valueScore') return [`${value}`, 'Value score'];
              if (name === 'composite') return [`${value}`, 'Network + coverage'];
              return [value, name];
            }} />
            <Scatter name="Competitors" data={data} shape="circle">
              {data.map((entry) => (
                <Cell key={entry.name} fill={colorScale(entry.composite)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-slate-500">Estimates from synthetic data.</p>
    </div>
  );
};
