import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSnapshotInventory } from '@/contexts/SnapshotInventoryContext';
import { LogOut, Save } from 'lucide-react';
import { toast } from 'sonner';
import { IndustrialButton } from '@/components/IndustrialButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function SnapshotManagerPage() {
  const [, setLocation] = useLocation();
  const { products, snapshots, movements, transfers, unitWeights, updateUnitWeight, getTodayMovements, getTodayTransfers } = useSnapshotInventory();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'movements' | 'transfers'>('dashboard');
  const [editingWeights, setEditingWeights] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const initialWeights: Record<string, number> = {};
    unitWeights.forEach(uw => {
      initialWeights[uw.productId] = uw.unitWeight;
    });
    setEditingWeights(initialWeights);
  }, [unitWeights]);

  const handleWeightChange = (productId: string, newWeight: number) => {
    setEditingWeights(prev => ({
      ...prev,
      [productId]: newWeight,
    }));
    setHasChanges(true);
  };

  const handleSaveWeights = () => {
    Object.entries(editingWeights).forEach(([productId, weight]) => {
      const original = unitWeights.find(uw => uw.productId === productId)?.unitWeight;
      if (original !== weight) {
        updateUnitWeight(productId, weight);
      }
    });
    setHasChanges(false);
    toast.success('✓ Pesos unitários atualizados com sucesso!');
  };

  const todayMovements = getTodayMovements();
  const todayTransfers = getTodayTransfers();

  // Calculate current inventory
  const currentInventory = products.map(product => {
    const latestSnapshot = snapshots.find(s => s.productId === product.id);
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      quantity: latestSnapshot?.currentQuantity || 0,
      totalKg: latestSnapshot?.totalKg || 0,
    };
  });

  // Movement chart data
  const movementChartData = todayMovements.slice(0, 10).reverse().map((mov, idx) => ({
    time: `${idx}h`,
    movement: mov.movementKg,
    type: mov.type,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white">🖥️ Gerente</h1>
            <p className="text-slate-300 text-sm">Dashboard & Configurações</p>
          </div>
          <button
            onClick={() => setLocation('/pvc-login')}
            className="p-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-slate-700 bg-slate-800/30 px-4 overflow-x-auto">
        {(['dashboard', 'settings', 'movements', 'transfers'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-bold transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'text-blue-400 border-b-3 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'dashboard' && '📊 Dashboard'}
            {tab === 'settings' && '⚙️ Configurações'}
            {tab === 'movements' && '📈 Movimentações'}
            {tab === 'transfers' && '🔄 Transferências'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                <p className="text-slate-300 text-xs font-bold mb-2">PESO TOTAL</p>
                <p className="text-white text-3xl font-black">
                  {(currentInventory.reduce((sum, inv) => sum + inv.totalKg, 0) / 1000).toFixed(1)}t
                </p>
              </div>

              <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                <p className="text-slate-300 text-xs font-bold mb-2">PRODUTOS</p>
                <p className="text-white text-3xl font-black">{products.length}</p>
              </div>

              <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                <p className="text-slate-300 text-xs font-bold mb-2">MOVIMENTOS HOJE</p>
                <p className="text-white text-3xl font-black">{todayMovements.length}</p>
              </div>

              <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                <p className="text-slate-300 text-xs font-bold mb-2">TRANSFERÊNCIAS</p>
                <p className="text-white text-3xl font-black">{todayTransfers.length}</p>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-slate-800 border-b-2 border-slate-600">
                <h3 className="text-white font-bold text-lg">Inventário Atual</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b-2 border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Categoria</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Quantidade</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Total (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {currentInventory.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-600/30 transition-colors">
                        <td className="px-4 py-3 text-white font-semibold">{inv.name}</td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{inv.category}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{inv.quantity}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{inv.totalKg.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
              <h3 className="text-white font-bold text-lg mb-6">Pesos Unitários por Produto</h3>
              
              <div className="space-y-4">
                {products.map(product => (
                  <div key={product.id} className="flex items-center gap-4 pb-4 border-b border-slate-600 last:border-0">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{product.name}</p>
                      <p className="text-slate-400 text-xs">{product.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editingWeights[product.id] || 0}
                        onChange={(e) => handleWeightChange(product.id, parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 bg-slate-800 border-2 border-slate-600 rounded-lg text-white font-bold text-right"
                      />
                      <span className="text-slate-300 font-semibold">kg</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <IndustrialButton
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    setEditingWeights(
                      Object.fromEntries(
                        unitWeights.map(uw => [uw.productId, uw.unitWeight])
                      )
                    );
                    setHasChanges(false);
                  }}
                  disabled={!hasChanges}
                  className="flex-1"
                >
                  Descartar
                </IndustrialButton>
                <IndustrialButton
                  size="lg"
                  variant="success"
                  onClick={handleSaveWeights}
                  disabled={!hasChanges}
                  icon={<Save className="w-6 h-6" />}
                  className="flex-1"
                >
                  Salvar Alterações
                </IndustrialButton>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
            {todayMovements.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p>Nenhuma movimentação registrada hoje.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b-2 border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Anterior</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Atual</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Movimentação</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {todayMovements.map(mov => (
                      <tr key={mov.id} className="hover:bg-slate-600/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {new Date(mov.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{mov.productName}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{mov.previousQuantity}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{mov.currentQuantity}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{mov.movementKg}kg</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            mov.type === 'in'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-red-900/50 text-red-300'
                          }`}>
                            {mov.type === 'in' ? '📥 Entrada' : '📤 Saída'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
            {todayTransfers.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p>Nenhuma transferência registrada hoje.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b-2 border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                      <th className="px-4 py-3 text-left text-white font-bold">De</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Para</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {todayTransfers.map(trans => (
                      <tr key={trans.id} className="hover:bg-slate-600/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {new Date(trans.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{trans.productName}</td>
                        <td className="px-4 py-3 text-white font-bold">{trans.from}</td>
                        <td className="px-4 py-3 text-white font-bold">{trans.to}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{trans.quantity} sacos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
