import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { ArrowLeft, BarChart3, Factory, Package, TrendingUp, AlertTriangle, Scale, Truck } from 'lucide-react';
import StockByLocationChart from '@/components/dashboard/StockByLocationChart';
import InventoryDivergenceChart from '@/components/dashboard/InventoryDivergenceChart';
import MachineConsumptionChart from '@/components/dashboard/MachineConsumptionChart';
import SealedLossChart from '@/components/dashboard/SealedLossChart';
import AdminAdjustmentHistory from '@/components/dashboard/AdminAdjustmentHistory';

function KPICard({ icon: Icon, iconColor, label, value, sub }: { icon: any; iconColor: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border-2 border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <p className="text-muted-foreground text-xs font-bold">{label}</p>
      </div>
      <p className="text-foreground text-2xl font-black">{value}</p>
      {sub && <p className="text-muted-foreground text-xs mt-1">{sub}</p>}
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-foreground font-black text-base">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [, setNav] = useLocation();
  const { user } = useAuth();
  const {
    stockByLocation,
    divergenceTrend,
    machineConsumption,
    sealedBagLosses,
    adminAdjustments,
    adminAdjByLocation,
    adminAdjByUser,
    productsMap,
    totalStockKg,
    totalProducedKg,
    confirmedOrders,
    completedTransfers,
    pendingTransfers,
    totalRoundingLoss,
  } = useDashboardData();

  if (!user || (user.role !== 'gerente' && user.role !== 'admin')) {
    setNav('/login'); return null;
  }

  const backPath = user.role === 'admin' ? '/admin' : '/manager';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setNav(backPath)} className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors touch-target">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Dashboard Executivo
            </h1>
            <p className="text-muted-foreground text-xs">KPIs Industriais • Visão Estratégica</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={Package} iconColor="text-primary" label="Estoque Total" value={`${(totalStockKg / 1000).toFixed(1)}t`} sub={`${totalStockKg.toLocaleString()} kg`} />
          <KPICard icon={Factory} iconColor="text-industrial-success" label="Total Produzido" value={`${(totalProducedKg / 1000).toFixed(1)}t`} sub={`${confirmedOrders} ordens`} />
          <KPICard icon={Truck} iconColor="text-chart-1" label="Transferências" value={String(completedTransfers)} sub={`${pendingTransfers} pendentes`} />
          <KPICard icon={AlertTriangle} iconColor="text-industrial-warning" label="Perda Arredond." value={`${totalRoundingLoss.toFixed(1)} kg`} sub="sealed_bag" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSection title="📦 Estoque por Local">
            <StockByLocationChart data={stockByLocation} />
          </ChartSection>

          <ChartSection title="⚙️ Consumo por Misturador">
            <MachineConsumptionChart data={machineConsumption} />
          </ChartSection>

          <ChartSection title="📉 Divergência de Inventário">
            <InventoryDivergenceChart data={divergenceTrend} />
          </ChartSection>

          <ChartSection title="📦 Perdas por Arredondamento (sealed_bag)">
            <SealedLossChart data={sealedBagLosses} />
          </ChartSection>
        </div>

        {/* Admin Adjustments */}
        <ChartSection title="🛠 Histórico de Ajustes Admin">
          <AdminAdjustmentHistory
            adjustments={adminAdjustments}
            byLocation={adminAdjByLocation}
            byUser={adminAdjByUser}
            productsMap={productsMap}
          />
        </ChartSection>
      </div>
    </div>
  );
}
