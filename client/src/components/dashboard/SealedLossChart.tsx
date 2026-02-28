import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SealedBagLoss } from '@/hooks/useDashboardData';

export default function SealedLossChart({ data }: { data: SealedBagLoss[] }) {
  if (data.length === 0) return <p className="text-muted-foreground text-center py-8">Sem perdas por arredondamento</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 28%)" />
        <XAxis dataKey="productName" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
        <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} unit="kg" />
        <Tooltip
          contentStyle={{ background: 'hsl(217, 33%, 17%)', border: '1px solid hsl(215, 20%, 28%)', borderRadius: 8, color: 'hsl(210, 40%, 98%)' }}
          formatter={(v: number, name: string) => {
            const label = name === 'lossKg' ? 'Perda' : name === 'idealKg' ? 'Ideal' : 'Ajustado';
            return [`${v.toFixed(2)} kg`, label];
          }}
        />
        <Bar dataKey="idealKg" fill="hsl(217, 91%, 60%)" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={50} name="idealKg" />
        <Bar dataKey="lossKg" fill="hsl(38, 92%, 50%)" stackId="a" radius={[6, 6, 0, 0]} maxBarSize={50} name="lossKg" />
      </BarChart>
    </ResponsiveContainer>
  );
}
