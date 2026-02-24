import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { usePVCInventory } from '@/contexts/PVCInventoryContext';
import { LogOut, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { IndustrialButton } from '@/components/IndustrialButton';
import { ProductCategoryAccordion } from '@/components/ProductCategoryAccordion';
import { BatchInputModal } from '@/components/BatchInputModal';
import type { Product } from '@/contexts/PVCInventoryContext';

export default function PVCOperatorDashboard() {
  const [, setLocation] = useLocation();
  const { products, getAllCategories, addBatchEntry } = usePVCInventory();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentAction, setCurrentAction] = useState<'add' | 'consume'>('add');
  const [showModal, setShowModal] = useState(false);

  const categories = getAllCategories();

  const handleSelectProduct = (product: Product, action: 'add' | 'consume') => {
    setSelectedProduct(product);
    setCurrentAction(action);
    setShowModal(true);
  };

  const handleBatchSubmit = (batchNumber: string, weight: number) => {
    if (!selectedProduct) return;

    addBatchEntry(selectedProduct.id, batchNumber, weight, currentAction);

    const actionText = currentAction === 'add' ? 'Adicionado' : 'Consumido';
    toast.success(
      `✓ ${actionText}\n${selectedProduct.name}\nLote: ${batchNumber}\nPeso: ${weight}kg`,
      { duration: 4000 }
    );

    setShowModal(false);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white">📱 Operador</h1>
            <p className="text-slate-300 text-sm">Entrada de Lotes</p>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 sticky top-20 z-10 bg-slate-900/80 backdrop-blur p-4 -mx-4 rounded-b-xl">
          <IndustrialButton
            size="lg"
            variant="success"
            onClick={() => {
              // Placeholder - will be replaced when product is selected
            }}
            icon={<Plus className="w-5 h-5" />}
            fullWidth
            disabled
            className="opacity-50"
          >
            ➕ Adicionar
          </IndustrialButton>
          <IndustrialButton
            size="lg"
            variant="danger"
            onClick={() => {
              // Placeholder - will be replaced when product is selected
            }}
            icon={<Minus className="w-5 h-5" />}
            fullWidth
            disabled
            className="opacity-50"
          >
            ➖ Consumir
          </IndustrialButton>
        </div>

        {/* Products Accordion */}
        <div>
          <h2 className="text-white font-bold text-lg mb-3 mt-4">Selecione um Produto</h2>
          <ProductCategoryAccordion
            categories={categories}
            products={products}
            onSelectProduct={(product) => handleSelectProduct(product, 'add')}
          />
        </div>

        {/* Quick Actions Info */}
        <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4 mt-8">
          <p className="text-slate-300 text-xs">
            💡 <span className="font-semibold">Dica:</span> Clique em um produto para abrir o modal de entrada. Escolha entre adicionar ou consumir.
          </p>
        </div>
      </div>

      {/* Batch Input Modal */}
      <BatchInputModal
        isOpen={showModal}
        product={selectedProduct}
        action={currentAction}
        onClose={() => {
          setShowModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleBatchSubmit}
      />
    </div>
  );
}
