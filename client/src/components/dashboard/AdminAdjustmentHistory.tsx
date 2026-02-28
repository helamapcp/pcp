import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AdminAdjustmentRow } from '@/hooks/useDashboardData';

interface Props {
  adjustments: AdminAdjustmentRow[];
  byLocation: Array<{ location: string; count: number }>;
  byUser: Array<{ user: string; count: number }>;
  productsMap: Map<string, string>;
}

export default function AdminAdjustmentHistory({ adjustments, byLocation, byUser, productsMap }: Props) {
  return (
    <div className="space-y-4">
      {/* Frequency chart by location */}
      {byLocation.length > 0 && (
        <div>
          <h3 className="text-foreground font-bold text-sm mb-2">Ajustes por Local</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byLocation} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 28%)" />
              <XAxis dataKey="location" tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(217, 33%, 17%)', border: '1px solid hsl(215, 20%, 28%)', borderRadius: 8, color: 'hsl(210, 40%, 98%)' }} />
              <Bar dataKey="count" fill="hsl(0, 84%, 60%)" radius={[6, 6, 0, 0]} maxBarSize={50} name="Ajustes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By user */}
      {byUser.length > 0 && (
        <div>
          <h3 className="text-foreground font-bold text-sm mb-2">Ajustes por Usuário</h3>
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {byUser.map(u => (
              <div key={u.user} className="px-4 py-2 flex justify-between items-center">
                <span className="text-foreground text-sm font-semibold">{u.user}</span>
                <span className="text-destructive font-black text-sm">{u.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent table */}
      <div>
        <h3 className="text-foreground font-bold text-sm mb-2">Últimos Ajustes</h3>
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-2 text-left font-bold">Data</th>
                <th className="px-3 py-2 text-left font-bold">Produto</th>
                <th className="px-3 py-2 text-left font-bold">Local</th>
                <th className="px-3 py-2 text-right font-bold">Diferença</th>
                <th className="px-3 py-2 text-left font-bold">Motivo</th>
                <th className="px-3 py-2 text-left font-bold">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {adjustments.slice(0, 20).map(a => (
                <tr key={a.id}>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-2 text-foreground">{productsMap.get(a.productId) || a.productId.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-foreground">{a.locationCode}</td>
                  <td className={`px-3 py-2 text-right font-bold ${a.differenceKg >= 0 ? 'text-industrial-success' : 'text-destructive'}`}>
                    {a.differenceKg >= 0 ? '+' : ''}{a.differenceKg.toFixed(2)} kg
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[150px] truncate">{a.reason || '—'}</td>
                  <td className="px-3 py-2 text-foreground">{a.userName || '—'}</td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhum ajuste administrativo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
