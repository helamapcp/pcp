import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useEstoque } from '@/contexts/EstoqueContext';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { IndustrialButton } from '@/components/IndustrialButton';
import { ProductCategoryAccordionGeneric } from '@/components/ProductCategoryAccordionGeneric';
import { EstoqueCountModal } from '@/components/EstoqueCountModal';
import { InboundReceivingModal } from '@/components/InboundReceivingModal';
import { EstoqueTransferModal } from '@/components/EstoqueTransferModal';
import type { Product, Sector } from '@/contexts/EstoqueContext';

const SECTORS: Sector[] = ['CD', 'Fábrica', 'PMP', 'PCP'];

export default function EstoqueOperatorPage() {
  const [, setLocation] = useLocation();
  const { products, getAllCategories, recordStockCount, recordInboundReceiving, recordTransfer } = useEstoque();
  const [activeTab, setActiveTab] = useState<'estoque' | 'entrada' | 'movimentacao'>('estoque');
  const [selectedSector, setSelectedSector] = useState<Sector>('CD');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const categories = getAllCategories();

  const handleCountProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowCountModal(true);
  };

  const handleInboundProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowInboundModal(true);
  };

  const handleTransferProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowTransferModal(true);
  };

  const handleCountSubmit = (quantity: number, unit: 'units' | 'kg') => {
    if (!selectedProduct) return;

    recordStockCount(selectedProduct.id, selectedSector, quantity, unit, 'Operador');

    toast.success(
      `✓ Estoque Registrado\n${selectedProduct.name}\n${selectedSector}: ${quantity} ${unit === 'units' ? 'sacos' : 'kg'}`,
      { duration: 4000 }
    );

    setShowCountModal(false);
    setSelectedProduct(null);
  };

  const handleInboundSubmit = (quantity: number, unit: 'units' | 'kg', supplier: string) => {
    if (!selectedProduct) return;

    recordInboundReceiving(selectedProduct.id, quantity, unit, supplier, 'Operador');

    toast.success(
      `✓ Entrada Registrada\n${selectedProduct.name}\n${quantity} ${unit === 'units' ? 'sacos' : 'kg'} de ${supplier}`,
      { duration: 4000 }
    );

    setShowInboundModal(false);
    setSelectedProduct(null);
  };

  const handleTransferSubmit = (quantity: number, from: Sector, to: Sector) => {
    if (!selectedProduct) return;

    recordTransfer(selectedProduct.id, quantity, from, to, 'Operador');

    toast.success(
      `✓ Transferência Registrada\n${selectedProduct.name}\n${from} → ${to}\n${quantity} sacos`,
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
            <p className="text-slate-300 text-sm">Estoque & Movimentação</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="p-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-slate-700 bg-slate-800/30 px-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('estoque')}
          className={`px-4 py-3 font-bold transition-colors whitespace-nowrap ${
            activeTab === 'estoque'
              ? 'text-blue-400 border-b-3 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          📦 Estoque
        </button>
        <button
          onClick={() => setActiveTab('entrada')}
          className={`px-4 py-3 font-bold transition-colors whitespace-nowrap ${
            activeTab === 'entrada'
              ? 'text-green-400 border-b-3 border-green-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          📥 Entrada CD
        </button>
        <button
          onClick={() => setActiveTab('movimentacao')}
          className={`px-4 py-3 font-bold transition-colors whitespace-nowrap ${
            activeTab === 'movimentacao'
              ? 'text-purple-400 border-b-3 border-purple-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          🔄 Movimentação
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'estoque' && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4 mb-4">
              <p className="text-slate-300 text-sm">
                💡 <span className="font-semibold">Estoque:</span> Registre a quantidade atual em cada setor. O sistema calculará automaticamente a movimentação.
              </p>
            </div>

            {/* Sector Selection */}
            <div>
              <label className="block text-white text-base font-bold mb-3">Selecione o Setor</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {SECTORS.map(sector => (
                  <button
                    key={sector}
                    onClick={() => setSelectedSector(sector)}
                    className={`px-4 py-3 rounded-lg font-bold transition-all border-2 min-h-[48px] ${
                      selectedSector === sector
                        ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            <h2 className="text-white font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric
              categories={categories}
              products={products}
              onSelectProduct={handleCountProduct}
            />
          </div>
        )}

        {activeTab === 'entrada' && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4 mb-4">
              <p className="text-slate-300 text-sm">
                💡 <span className="font-semibold">Entrada no CD:</span> Registre novos recebimentos de fornecedores. O estoque do CD será aumentado automaticamente.
              </p>
            </div>

            <h2 className="text-white font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric
              categories={categories}
              products={products}
              onSelectProduct={handleInboundProduct}
            />
          </div>
        )}

        {activeTab === 'movimentacao' && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4 mb-4">
              <p className="text-slate-300 text-sm">
                💡 <span className="font-semibold">Movimentação:</span> Registre transferências de material entre setores (CD, Fábrica, PMP, PCP).
              </p>
            </div>

            <h2 className="text-white font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric
              categories={categories}
              products={products}
              onSelectProduct={handleTransferProduct}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <EstoqueCountModal
        isOpen={showCountModal}
        product={selectedProduct}
        sector={selectedSector}
        onClose={() => {
          setShowCountModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleCountSubmit}
      />

      <InboundReceivingModal
        isOpen={showInboundModal}
        product={selectedProduct}
        onClose={() => {
          setShowInboundModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleInboundSubmit}
      />

      <EstoqueTransferModal
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
