import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useInventory } from '@/contexts/InventoryContext';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { LogOut, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ManagerDashboard() {
  const [, setLocation] = useLocation();
  const { rawMaterials, wipItems, finishedGoods, productionLogs } = useInventory();
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'logs'>('overview');
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Ativar simulação de atualizações em tempo real
  useRealtimeUpdates();

  useEffect(() => {
    // Generate chart data from inventory
    const data = [
      {
        name: 'Matérias-Primas',
        total: rawMaterials.reduce((sum, m) => sum + m.quantity, 0),
        items: rawMaterials.length,
      },
      {
        name: 'WIP',
        total: wipItems.reduce((sum, w) => sum + w.quantity, 0),
        items: wipItems.length,
      },
      {
        name: 'Produtos Acabados',
        total: finishedGoods.reduce((sum, f) => sum + f.quantity, 0),
        items: finishedGoods.length,
      },
    ];
    setChartData(data);
  }, [rawMaterials, wipItems, finishedGoods]);

  const totalInventoryValue = chartData.reduce((sum, item) => sum + item.total, 0);
  const lowStockItems = rawMaterials.filter(m => m.quantity < 500);

  const recentLogs = productionLogs.slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">PCP Manager Dashboard</h1>
            <p className="text-slate-300 text-sm">Visão em Tempo Real do Inventário e Produção</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-semibold mb-2">TOTAL INVENTÁRIO</p>
            <p className="text-white text-3xl font-bold">{totalInventoryValue.toLocaleString()}</p>
            <p className="text-slate-400 text-xs mt-2">unidades</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-semibold mb-2">MATÉRIAS-PRIMAS</p>
            <p className="text-white text-3xl font-bold">{rawMaterials.length}</p>
            <p className="text-slate-400 text-xs mt-2">tipos de material</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-semibold mb-2">WIP</p>
            <p className="text-white text-3xl font-bold">{wipItems.length}</p>
            <p className="text-slate-400 text-xs mt-2">em processamento</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-semibold mb-2">PRODUTOS ACABADOS</p>
            <p className="text-white text-3xl font-bold">{finishedGoods.length}</p>
            <p className="text-slate-400 text-xs mt-2">tipos de produto</p>
          </div>
        </div>

        {/* Alerts */}
        {lowStockItems.length > 0 && (
          <div className="mb-8 bg-red-900/30 border-2 border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-red-400 font-bold mb-2">Alertas de Estoque Baixo</h3>
                <div className="space-y-1">
                  {lowStockItems.map(item => (
                    <p key={item.id} className="text-red-300 text-sm">
                      • {item.name}: {item.quantity} {item.unit} (Mínimo: 500)
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          {(['overview', 'inventory', 'logs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'overview' && 'Visão Geral'}
              {tab === 'inventory' && 'Inventário Detalhado'}
              {tab === 'logs' && 'Registros Recentes'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inventory Distribution */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-white font-bold mb-4">Distribuição de Inventário</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Inventory Composition */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-white font-bold mb-4">Composição do Inventário</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Raw Materials */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
              <div className="bg-slate-800 px-6 py-4 border-b border-slate-600">
                <h3 className="text-white font-bold">Matérias-Primas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 border-b border-slate-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Material</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Quantidade</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Localização</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Código</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterials.map(material => (
                      <tr key={material.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-white">{material.name}</td>
                        <td className="px-6 py-4 text-white font-semibold">{material.quantity} {material.unit}</td>
                        <td className="px-6 py-4 text-slate-300">{material.location}</td>
                        <td className="px-6 py-4 text-slate-400 font-mono">{material.barcode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Finished Goods */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
              <div className="bg-slate-800 px-6 py-4 border-b border-slate-600">
                <h3 className="text-white font-bold">Produtos Acabados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 border-b border-slate-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Produto</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Quantidade</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Localização</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Código</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finishedGoods.map(product => (
                      <tr key={product.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-white">{product.name}</td>
                        <td className="px-6 py-4 text-white font-semibold">{product.quantity} {product.unit}</td>
                        <td className="px-6 py-4 text-slate-300">{product.location}</td>
                        <td className="px-6 py-4 text-slate-400 font-mono">{product.barcode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 border-b border-slate-600">
              <h3 className="text-white font-bold">Registros de Produção Recentes</h3>
            </div>
            {recentLogs.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p>Nenhum registro de produção ainda. Comece registrando ações no painel do operador.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 border-b border-slate-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Hora</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Ação</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Material/Produto</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-slate-300 text-xs">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            log.action === 'consume' ? 'bg-blue-900/50 text-blue-300' :
                            log.action === 'produce' ? 'bg-green-900/50 text-green-300' :
                            'bg-red-900/50 text-red-300'
                          }`}>
                            {log.action === 'consume' ? '📥 Consumo' :
                             log.action === 'produce' ? '📦 Produção' :
                             '🗑️ Sucata'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white">{log.material}</td>
                        <td className="px-6 py-4 text-white font-semibold">{log.quantity} {log.unit}</td>
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
