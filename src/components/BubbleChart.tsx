import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, CartesianGrid } from 'recharts';
import { Segment } from '../store/global';

export type BubblePoint = {
  id: string;
  opportunity: number;
  size: number;
  netAdds: number;
  category: string;
};

type Props = {
  segments: Segment[];
  data: BubblePoint[];
  onSelect: (id: string) => void;
};

const colors = ['#34d399', '#22d3ee', '#facc15', '#fb7185', '#818cf8', '#38bdf8'];

const renderNode = (props: any) => {
  const { cx, cy, payload } = props;
  const radius = Math.max(8, Math.sqrt(payload.netAdds) / 5);
  return <circle cx={cx} cy={cy} r={radius} fill={payload.fill} fillOpacity={0.8} stroke="#0f172a" strokeWidth={1.5} />;
};

const BubbleChart = ({ segments, data, onSelect }: Props) => {
  return (
    <div className="card h-80 w-full border border-slate-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Market Opportunity View</h3>
          <p className="text-xs text-slate-400">Bubble size = projected net adds • X = opportunity score • Y = cohort size</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="opportunity" name="Opportunity" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Opportunity score', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
          />
          <YAxis
            type="number"
            dataKey="size"
            name="Cohort size"
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Cohort size', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          <ZAxis dataKey="netAdds" range={[60, 400]} name="Net Adds" />
          <Tooltip
            cursor={{ stroke: '#22d3ee', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as BubblePoint;
              const segment = segments.find((s) => s.id === point.id);
              return (
                <div className="card border border-emerald-500/20 p-3 text-xs">
                  <p className="text-sm font-semibold text-white">{segment?.name ?? 'Segment'}</p>
                  <p className="text-slate-300">Opportunity score: {point.opportunity.toFixed(1)}</p>
                  <p className="text-slate-300">Projected net adds: {Math.round(point.netAdds).toLocaleString()}</p>
                  <p className="text-slate-300">Cohort size: {segment?.size.toLocaleString()}</p>
                </div>
              );
            }}
          />
          <Scatter
            name="Cohorts"
            data={data.map((point, idx) => ({ ...point, fill: colors[idx % colors.length] }))}
            shape={renderNode}
            onClick={(node) => {
              if (node && (node as any).id) {
                onSelect((node as any).id as string);
              }
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BubbleChart;
