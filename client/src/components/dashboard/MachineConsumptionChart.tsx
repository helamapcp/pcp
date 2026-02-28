import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MachineConsumption } from '@/hooks/useDashboardData';

export default function MachineConsumptionChart({ data }: { data: MachineConsumption[] }) {
  if (data.length === 0) return <p className="text-muted-foreground text-center py-8">Sem dados de produção</p>;

  const chartData = data.map(d => ({ ...d, totalTon: +(d.totalKg / 1000).toFixed(2) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 28%)" />
        <XAxis dataKey="machine" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} unit="t" />
        <Tooltip
          contentStyle={{ background: 'hsl(217, 33%, 17%)', border: '1px solid hsl(215, 20%, 28%)', borderRadius: 8, color: 'hsl(210, 40%, 98%)' }}
          formatter={(v: number) => [`${v.toLocaleString()} t`, 'Consumo']}
        />
        <Bar dataKey="totalTon" fill="hsl(142, 71%, 45%)" radius={[6, 6, 0, 0]} maxBarSize={60} />
      </BarChart>
    </ResponsiveContainer>
  );
}
