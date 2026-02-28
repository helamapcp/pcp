import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DivergencePoint } from '@/hooks/useDashboardData';

export default function InventoryDivergenceChart({ data }: { data: DivergencePoint[] }) {
  if (data.length === 0) return <p className="text-muted-foreground text-center py-8">Sem dados de divergência</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 28%)" />
        <XAxis dataKey="date" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} unit="%" />
        <Tooltip
          contentStyle={{ background: 'hsl(217, 33%, 17%)', border: '1px solid hsl(215, 20%, 28%)', borderRadius: 8, color: 'hsl(210, 40%, 98%)' }}
          formatter={(v: number) => [`${v.toFixed(2)}%`, 'Divergência']}
        />
        <Line type="monotone" dataKey="divergencePercent" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(38, 92%, 50%)' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
