import { migrationMatrix } from '../data/seeds';
import { InfoPopover } from './InfoPopover';

const actors = ['Us', 'AlphaMobile', 'BetaTel', 'CableCoMobile', 'MagentaNet'];

const buildMatrix = () => {
  const matrix: Record<string, Record<string, number>> = {};
  for (const from of actors) {
    matrix[from] = {};
    for (const to of actors) {
      matrix[from][to] = 0;
    }
  }
  migrationMatrix.forEach((flow) => {
    if (!matrix[flow.from]) {
      matrix[flow.from] = {} as Record<string, number>;
    }
    matrix[flow.from][flow.to] = flow.value;
  });
  return matrix;
};

const matrix = buildMatrix();

export const MigrationMatrix = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Migration flows (last 90 days)</h3>
          <p className="text-sm text-slate-500">Share of switchers between leading brands.</p>
        </div>
        <InfoPopover
          title="Migration Matrix"
          plainDescription="Estimated share of recent switchers flowing between us and top competitors."
          primarySourceHint="Synth churn + porting signals"
        />
      </div>
      <div className="overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                From/To
              </th>
              {actors.map((actor) => (
                <th key={actor} scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {actor}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actors.map((from) => (
              <tr key={from} className="even:bg-slate-50/60">
                <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2 text-left font-medium text-slate-700">
                  {from}
                </th>
                {actors.map((to) => (
                  <td key={`${from}-${to}`} className="px-4 py-2 text-slate-600">
                    {from === to ? '—' : `${(matrix[from]?.[to] ?? 0) * 100}%`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">Estimates from synthetic data.</p>
    </div>
  );
};
