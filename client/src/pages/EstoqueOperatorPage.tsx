import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useUserManagement } from '@/contexts/UserManagementContext';
import { LogOut, Check } from 'lucide-react';
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
  const { currentUser, setCurrentUser } = useUserManagement();
  const { products, getAllCategories, recordStockCount, recordInboundReceiving, recordTransfer, getPendingSeparations, completeSeparation } = useEstoque();

  const handleLogout = () => {
    setCurrentUser(null);
    setLocation('/login');
  };

  const [activeTab, setActiveTab] = useState<'estoque' | 'entrada' | 'movimentacao' | 'separacao'>('estoque');
  const [selectedSector, setSelectedSector] = useState<Sector>('CD');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  if (!currentUser) {
    setLocation('/login');
    return null;
  }

  const operatorName = currentUser.name;
  const categories = getAllCategories();
  const pendingSeparations = getPendingSeparations();

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
    recordStockCount(selectedProduct.id, selectedSector, quantity, unit, operatorName);
    toast.success(
      `✓ Estoque Registrado\n${selectedProduct.name}\n${selectedSector}: ${quantity} ${unit === 'units' ? 'sacos' : 'kg'}`,
      { duration: 4000 }
    );
    setShowCountModal(false);
    setSelectedProduct(null);
  };

  const handleInboundSubmit = (quantity: number, unit: 'units' | 'kg') => {
    if (!selectedProduct) return;
    recordInboundReceiving(selectedProduct.id, quantity, unit, operatorName);
    toast.success(
      `✓ Entrada Registrada\n${selectedProduct.name}\n${quantity} ${unit === 'units' ? 'sacos' : 'kg'}`,
      { duration: 4000 }
    );
    setShowInboundModal(false);
    setSelectedProduct(null);
  };

  const handleTransferSubmit = (quantity: number, from: Sector, to: Sector) => {
    if (!selectedProduct) return;
    recordTransfer(selectedProduct.id, quantity, from, to, operatorName);
    toast.success(
      `✓ Transferência Registrada\n${selectedProduct.name}\n${from} → ${to}\n${quantity} sacos`,
      { duration: 4000 }
    );
    setShowTransferModal(false);
    setSelectedProduct(null);
  };

  const handleCompleteSeparation = (separationId: string) => {
    completeSeparation(separationId, operatorName);
    setCompletedIds(prev => new Set(prev).add(separationId));
    const sep = pendingSeparations.find(s => s.id === separationId);
    if (sep) {
      toast.success(
        `✓ Separação Confirmada\n${sep.productName}\n${sep.from} → ${sep.to}\n${sep.quantity} sacos`,
        { duration: 3000 }
      );
    }
    // Remove from completed set after animation
    setTimeout(() => {
      setCompletedIds(prev => {
        const next = new Set(prev);
        next.delete(separationId);
        return next;
      });
    }, 600);
  };

  const tabConfig = [
    { id: 'estoque' as const, label: '📦 Estoque', color: 'text-primary border-primary' },
    { id: 'entrada' as const, label: '📥 Entrada CD', color: 'text-industrial-success border-industrial-success' },
    { id: 'movimentacao' as const, label: '🔄 Movimentação', color: 'text-chart-4 border-chart-4' },
    { id: 'separacao' as const, label: `📋 Separação (${pendingSeparations.length})`, color: 'text-industrial-warning border-industrial-warning' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">📱 Operador</h1>
            <p className="text-muted-foreground text-sm">{operatorName} • Estoque & Movimentação</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-border bg-card/50 px-2 overflow-x-auto">
        {tabConfig.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-bold transition-colors whitespace-nowrap touch-target text-sm ${
              activeTab === tab.id
                ? tab.color + ' border-b-3'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'estoque' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4 mb-4">
              <p className="text-muted-foreground text-sm">
                💡 <span className="font-semibold text-foreground">Estoque:</span> Registre a quantidade atual em cada setor. O sistema calculará automaticamente a movimentação (delta).
              </p>
            </div>

            {/* Sector Selection */}
            <div>
              <label className="block text-foreground text-base font-bold mb-3">Selecione o Setor</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {SECTORS.map(sector => (
                  <button
                    key={sector}
                    onClick={() => setSelectedSector(sector)}
                    className={`px-4 py-3 rounded-lg font-bold transition-all border-2 touch-target ${
                      selectedSector === sector
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                        : 'bg-card text-secondary-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            <h2 className="text-foreground font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric
              categories={categories}
              products={products}
              onSelectProduct={handleCountProduct}
            />
          </div>
        )}

        {activeTab === 'entrada' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4 mb-4">
              <p className="text-muted-foreground text-sm">
                💡 <span className="font-semibold text-foreground">Entrada no CD:</span> Registre novos recebimentos. O estoque do CD será aumentado automaticamente.
              </p>
            </div>

            <h2 className="text-foreground font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric
              categories={categories}
              products={products}
              onSelectProduct={handleInboundProduct}
            />
          </div>
        )}

        {activeTab === 'movimentacao' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4 mb-4">
              <p className="text-muted-foreground text-sm">
                💡 <span className="font-semibold text-foreground">Movimentação:</span> Registre transferências entre setores (CD → PCP → PMP → Fábrica).
              </p>
            </div>

            <h2 className="text-foreground font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric
              categories={categories}
              products={products}
              onSelectProduct={handleTransferProduct}
            />
          </div>
        )}

        {activeTab === 'separacao' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4 mb-4">
              <p className="text-muted-foreground text-sm">
                💡 <span className="font-semibold text-foreground">Separação:</span> Confirme cada transferência após preparar o material fisicamente.
              </p>
            </div>

            {pendingSeparations.length === 0 ? (
              <div className="bg-card border-2 border-border rounded-lg p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-foreground text-lg font-bold">Nenhuma separação pendente</p>
                <p className="text-muted-foreground text-sm mt-2">Todas as transferências foram confirmadas!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSeparations.map((separation) => (
                  <div
                    key={separation.id}
                    className={`bg-card border-3 border-industrial-warning rounded-lg p-5 transition-all ${
                      completedIds.has(separation.id) ? 'animate-slide-out' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-foreground font-bold text-lg">{separation.productName}</p>
                        <p className="text-muted-foreground text-sm mt-1">
                          {separation.from} <span className="text-industrial-warning font-bold">→</span> {separation.to}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground font-black text-2xl">{separation.quantity}</p>
                        <p className="text-muted-foreground text-xs">sacos</p>
                      </div>
                    </div>

                    <div className="bg-secondary rounded-lg p-3 mb-4">
                      <p className="text-muted-foreground text-xs font-bold mb-2">INSTRUÇÕES:</p>
                      <p className="text-secondary-foreground text-sm">
                        Localize e prepare {separation.quantity} saco(s) de <span className="font-bold">{separation.productName}</span> para transferência.
                      </p>
                    </div>

                    <IndustrialButton
                      size="lg"
                      variant="success"
                      onClick={() => handleCompleteSeparation(separation.id)}
                      icon={<Check className="w-6 h-6" />}
                      fullWidth
                    >
                      ✓ Confirmar Separação
                    </IndustrialButton>
                  </div>
                ))}
              </div>
            )}
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
