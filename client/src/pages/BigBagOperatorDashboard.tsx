import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useBigBagInventory } from '@/contexts/BigBagInventoryContext';
import { LogOut, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { IndustrialButton } from '@/components/IndustrialButton';
import { ProductAccordion, type AccordionItem } from '@/components/ProductAccordion';
import { BatchEntryModal } from '@/components/BatchEntryModal';

export default function BigBagOperatorDashboard() {
  const [, setLocation] = useLocation();
  const { categories, getProductsByCategory, addBagEntry, getLastUsedProduct } = useBigBagInventory();
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; weight: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const lastUsedProduct = getLastUsedProduct();

  const accordionItems: AccordionItem[] = categories.map(cat => ({
    id: cat.id,
    label: cat.name,
    items: getProductsByCategory(cat.id).map(prod => ({
      id: prod.id,
      name: prod.name,
      standardBagWeight: prod.standardBagWeight,
    })),
  }));

  const handleSelectProduct = (productId: string, productName: string, standardBagWeight: number) => {
    setSelectedProduct({ id: productId, name: productName, weight: standardBagWeight });
    setShowModal(true);
  };

  const handleBatchSubmit = (batchNumber: string, weight: number) => {
    if (!selectedProduct) return;

    addBagEntry(selectedProduct.id, batchNumber, weight, 'receive');
    
    toast.success(`✓ Lote ${batchNumber} registrado\n${weight}kg de ${selectedProduct.name}`, {
      duration: 3000,
    });

    setShowModal(false);
    setSelectedProduct(null);
  };

  const handleQuickEntry = () => {
    if (lastUsedProduct) {
      handleSelectProduct(lastUsedProduct.id, lastUsedProduct.name, lastUsedProduct.standardBagWeight);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex flex-col">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Operador de Chão</h1>
          <p className="text-slate-300 text-sm">Entrada de Lotes - Big Bag</p>
        </div>
        <button
          onClick={() => setLocation('/login')}
          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          title="Sair"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Entry Section */}
      {lastUsedProduct && (
        <div className="mb-6 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-4 border-2 border-yellow-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-xs font-semibold mb-1">ÚLTIMO PRODUTO USADO</p>
              <p className="text-white font-bold text-lg">{lastUsedProduct.name}</p>
              <p className="text-yellow-100 text-sm">Padrão: {lastUsedProduct.standardBagWeight}kg</p>
            </div>
            <IndustrialButton
              size="lg"
              variant="primary"
              onClick={handleQuickEntry}
              icon={<Zap className="w-5 h-5" />}
              className="whitespace-nowrap"
            >
              Entrada Rápida
            </IndustrialButton>
          </div>
        </div>
      )}

      {/* Product Selection */}
      <div className="flex-1 overflow-y-auto mb-6">
        <h2 className="text-white font-bold text-lg mb-3">Selecione um Produto</h2>
        <ProductAccordion
          items={accordionItems}
          onSelectProduct={handleSelectProduct}
        />
      </div>

      {/* Batch Entry Modal */}
      {selectedProduct && (
        <BatchEntryModal
          isOpen={showModal}
          productName={selectedProduct.name}
          standardBagWeight={selectedProduct.weight}
          onClose={() => {
            setShowModal(false);
            setSelectedProduct(null);
          }}
          onSubmit={handleBatchSubmit}
        />
      )}
    </div>
  );
}
