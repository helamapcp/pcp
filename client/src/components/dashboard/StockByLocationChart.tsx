import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { StockByLocation } from '@/hooks/useDashboardData';

const COLORS = [
  'hsl(217, 91%, 60%)',   // primary
  'hsl(142, 71%, 45%)',   // success
  'hsl(38, 92%, 50%)',    // warning
  'hsl(0, 84%, 60%)',     // destructive
  'hsl(217, 91%, 70%)',   // chart-1
];

export default function StockByLocationChart({ data }: { data: StockByLocation[] }) {
  if (data.length === 0) return <p className="text-muted-foreground text-center py-8">Sem dados de estoque</p>;

  const chartData = data.map(d => ({ ...d, totalTon: +(d.totalKg / 1000).toFixed(2) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 28%)" />
        <XAxis dataKey="location" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} />
        <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} unit="t" />
        <Tooltip
          contentStyle={{ background: 'hsl(217, 33%, 17%)', border: '1px solid hsl(215, 20%, 28%)', borderRadius: 8, color: 'hsl(210, 40%, 98%)' }}
          formatter={(v: number) => [`${v.toLocaleString()} t`, 'Estoque']}
        />
        <Bar dataKey="totalTon" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
