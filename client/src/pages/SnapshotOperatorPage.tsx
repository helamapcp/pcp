import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useSnapshotInventory } from '@/contexts/SnapshotInventoryContext';
import { LogOut, Plus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { IndustrialButton } from '@/components/IndustrialButton';
import { ProductCategoryAccordionGeneric } from '@/components/ProductCategoryAccordionGeneric';
import { SnapshotInputModal } from '@/components/SnapshotInputModal';
import { TransferModal } from '@/components/TransferModal';
import type { Product } from '@/contexts/SnapshotInventoryContext';

export default function SnapshotOperatorPage() {
  const [, setLocation] = useLocation();
  const { products, getAllCategories, recordSnapshot, recordTransfer } = useSnapshotInventory();
  const [activeTab, setActiveTab] = useState<'snapshot' | 'transfer'>('snapshot');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const categories = getAllCategories();

  const handleSnapshotProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowSnapshotModal(true);
  };

  const handleTransferProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowTransferModal(true);
  };

  const handleSnapshotSubmit = (quantity: number, unit: 'units' | 'kg') => {
    if (!selectedProduct) return;

    recordSnapshot(selectedProduct.id, quantity, unit, 'Operador');

    toast.success(
      `✓ Snapshot Registrado\n${selectedProduct.name}\nQuantidade: ${quantity} ${unit === 'units' ? 'sacos' : 'kg'}`,
      { duration: 4000 }
    );

    setShowSnapshotModal(false);
    setSelectedProduct(null);
  };

  const handleTransferSubmit = (quantity: number, from: 'CD' | 'Factory' | 'PMP', to: 'CD' | 'Factory' | 'PMP') => {
    if (!selectedProduct) return;

    recordTransfer(selectedProduct.id, quantity, from, to, 'Operador');

    toast.success(
      `✓ Transferência Registrada\n${selectedProduct.name}\n${from} → ${to}\nQuantidade: ${quantity} sacos`,
      { duration: 4000 }
    );

    setShowTransferModal(false);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white">📱 Operador</h1>
            <p className="text-slate-300 text-sm">Snapshots & Transferências</p>
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
      <div className="flex gap-2 border-b-2 border-slate-700 bg-slate-800/30 px-4">
        <button
          onClick={() => setActiveTab('snapshot')}
          className={`px-4 py-3 font-bold transition-colors ${
            activeTab === 'snapshot'
              ? 'text-blue-400 border-b-3 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          📊 Snapshots
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`px-4 py-3 font-bold transition-colors ${
            activeTab === 'transfer'
              ? 'text-purple-400 border-b-3 border-purple-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          🔄 Transferências
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'snapshot' && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4 mb-4">
              <p className="text-slate-300 text-sm">
                💡 <span className="font-semibold">Snapshot:</span> Registre a quantidade atual em estoque. O sistema calculará automaticamente a movimentação comparando com o registro anterior.
              </p>
            </div>

            <h2 className="text-white font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric
              categories={categories}
              products={products}
              onSelectProduct={handleSnapshotProduct}
            />
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4 mb-4">
              <p className="text-slate-300 text-sm">
                💡 <span className="font-semibold">Transferência:</span> Registre movimentação de material entre setores (CD, Fábrica, PMP).
              </p>
            </div>

            <h2 className="text-white font-bold text-lg">Selecione um Produto</h2>
            <div className="space-y-3">
              {categories.map(category => {
                const categoryProducts = products.filter(p => p.category === category);
                return (
                  <div key={category} className="border-2 border-slate-600 rounded-xl overflow-hidden bg-slate-800/50">
                    <div className="bg-slate-700/70 px-4 py-3 font-bold text-white">
                      {category}
                    </div>
                    <div className="border-t border-slate-600 divide-y divide-slate-600">
                      {categoryProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleTransferProduct(product)}
                          className="w-full px-4 py-4 text-left hover:bg-purple-600/20 transition-colors flex items-center justify-between group active:bg-purple-600/40"
                        >
                          <div className="flex-1">
                            <p className="text-white font-semibold text-base">{product.name}</p>
                          </div>
                          <div className="text-purple-400 group-hover:text-purple-300 text-2xl ml-2">→</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SnapshotInputModal
        isOpen={showSnapshotModal}
        product={selectedProduct}
        onClose={() => {
          setShowSnapshotModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleSnapshotSubmit}
      />

      <TransferModal
        isOpen={showTransferModal}
        product={selectedProduct}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleTransferSubmit}
      />
    </div>
  );
}
