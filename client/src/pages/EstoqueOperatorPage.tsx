import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useSeparations, useStockSnapshots, useInventoryLogs, type Sector } from '@/hooks/useSupabaseData';
import { LogOut, Check } from 'lucide-react';
import { toast } from 'sonner';
import { IndustrialButton } from '@/components/IndustrialButton';
import { ProductCategoryAccordionGeneric } from '@/components/ProductCategoryAccordionGeneric';
import { EstoqueCountModal } from '@/components/EstoqueCountModal';
import { InboundReceivingModal } from '@/components/InboundReceivingModal';
import { EstoqueTransferModal } from '@/components/EstoqueTransferModal';

const SECTORS: Sector[] = ['CD', 'Fábrica', 'PMP', 'PCP'];

export default function EstoqueOperatorPage() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { products } = useProducts();
  const { pendingSeparations, completeSeparation: completeSep, addSeparation } = useSeparations();
  const { addSnapshot, getLatestSnapshot } = useStockSnapshots();
  const { addLog } = useInventoryLogs();

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  const [activeTab, setActiveTab] = useState<'estoque' | 'entrada' | 'movimentacao' | 'separacao'>('estoque');
  const [selectedSector, setSelectedSector] = useState<Sector>('CD');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  if (!user) {
    setLocation('/login');
    return null;
  }

  const operatorName = user.fullName;
  const categories = Array.from(new Set(products.map(p => p.category)));

  const handleCountProduct = (product: any) => {
    setSelectedProduct(product);
    setShowCountModal(true);
  };

  const handleInboundProduct = (product: any) => {
    setSelectedProduct(product);
    setShowInboundModal(true);
  };

  const handleTransferProduct = (product: any) => {
    setSelectedProduct(product);
    setShowTransferModal(true);
  };

  const handleCountSubmit = async (quantity: number, unit: 'units' | 'kg') => {
    if (!selectedProduct) return;
    const totalKg = unit === 'units' ? quantity * selectedProduct.unit_weight_kg : quantity;

    await addSnapshot({
      product_id: selectedProduct.id,
      sector: selectedSector,
      quantity,
      unit,
      total_kg: totalKg,
      user_id: user.id,
      user_name: operatorName,
    });

    await addLog({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      from_sector: null,
      to_sector: selectedSector,
      user_id: user.id,
      user_name: operatorName,
      action_type: 'stock_count',
      notes: `Contagem: ${quantity} ${unit === 'units' ? 'sacos' : 'kg'} em ${selectedSector}`,
    });

    toast.success(`✓ Estoque Registrado\n${selectedProduct.name}\n${selectedSector}: ${quantity} ${unit === 'units' ? 'sacos' : 'kg'}`, { duration: 4000 });
    setShowCountModal(false);
    setSelectedProduct(null);
  };

  const handleInboundSubmit = async (quantity: number, unit: 'units' | 'kg') => {
    if (!selectedProduct) return;
    const totalKg = unit === 'units' ? quantity * selectedProduct.unit_weight_kg : quantity;

    // Get current CD stock and add
    const currentSnap = getLatestSnapshot(selectedProduct.id, 'CD');
    const newQty = (currentSnap?.quantity || 0) + quantity;
    const newTotalKg = (Number(currentSnap?.total_kg) || 0) + totalKg;

    await addSnapshot({
      product_id: selectedProduct.id,
      sector: 'CD',
      quantity: newQty,
      unit,
      total_kg: newTotalKg,
      user_id: user.id,
      user_name: operatorName,
    });

    await addLog({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      from_sector: null,
      to_sector: 'CD',
      user_id: user.id,
      user_name: operatorName,
      action_type: 'inbound',
      notes: `Entrada no CD: ${quantity} ${unit === 'units' ? 'sacos' : 'kg'} (${totalKg}kg)`,
    });

    toast.success(`✓ Entrada Registrada\n${selectedProduct.name}\n${quantity} ${unit === 'units' ? 'sacos' : 'kg'}`, { duration: 4000 });
    setShowInboundModal(false);
    setSelectedProduct(null);
  };

  const handleTransferSubmit = async (quantity: number, from: Sector, to: Sector) => {
    if (!selectedProduct) return;

    await addSeparation({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      from_sector: from,
      to_sector: to,
      status: 'pending',
      operator: null,
    });

    await addLog({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      from_sector: from,
      to_sector: to,
      user_id: user.id,
      user_name: operatorName,
      action_type: 'transfer',
      notes: `Transferência: ${quantity} sacos de ${from} para ${to}`,
    });

    toast.success(`✓ Transferência Registrada\n${selectedProduct.name}\n${from} → ${to}\n${quantity} sacos`, { duration: 4000 });
    setShowTransferModal(false);
    setSelectedProduct(null);
  };

  const handleCompleteSeparation = async (separationId: string) => {
    await completeSep(separationId, operatorName);

    const sep = pendingSeparations.find(s => s.id === separationId);
    if (sep) {
      await addLog({
        product_id: sep.product_id,
        product_name: sep.product_name,
        quantity: sep.quantity,
        from_sector: sep.from_sector,
        to_sector: sep.to_sector,
        user_id: user.id,
        user_name: operatorName,
        action_type: 'separation_complete',
        notes: `Separação confirmada: ${sep.product_name} ${sep.from_sector} → ${sep.to_sector}`,
      });

      setCompletedIds(prev => new Set(prev).add(separationId));
      toast.success(`✓ Separação Confirmada\n${sep.product_name}\n${sep.from_sector} → ${sep.to_sector}\n${sep.quantity} sacos`, { duration: 3000 });

      setTimeout(() => {
        setCompletedIds(prev => {
          const next = new Set(prev);
          next.delete(separationId);
          return next;
        });
      }, 600);
    }
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
          <button onClick={handleLogout} className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target" title="Sair">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-border bg-card/50 px-2 overflow-x-auto">
        {tabConfig.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-bold transition-colors whitespace-nowrap touch-target text-sm ${
              activeTab === tab.id ? tab.color + ' border-b-3' : 'text-muted-foreground hover:text-foreground'
            }`}>
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
                💡 <span className="font-semibold text-foreground">Estoque:</span> Registre a quantidade atual em cada setor.
              </p>
            </div>
            <div>
              <label className="block text-foreground text-base font-bold mb-3">Selecione o Setor</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {SECTORS.map(sector => (
                  <button key={sector} onClick={() => setSelectedSector(sector)}
                    className={`px-4 py-3 rounded-lg font-bold transition-all border-2 touch-target ${
                      selectedSector === sector
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                        : 'bg-card text-secondary-foreground border-border hover:bg-secondary'
                    }`}>
                    {sector}
                  </button>
                ))}
              </div>
            </div>
            <h2 className="text-foreground font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric categories={categories} products={products} onSelectProduct={handleCountProduct} />
          </div>
        )}

        {activeTab === 'entrada' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4 mb-4">
              <p className="text-muted-foreground text-sm">
                💡 <span className="font-semibold text-foreground">Entrada no CD:</span> Registre novos recebimentos.
              </p>
            </div>
            <h2 className="text-foreground font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric categories={categories} products={products} onSelectProduct={handleInboundProduct} />
          </div>
        )}

        {activeTab === 'movimentacao' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4 mb-4">
              <p className="text-muted-foreground text-sm">
                💡 <span className="font-semibold text-foreground">Movimentação:</span> Registre transferências (CD → PCP → PMP → Fábrica).
              </p>
            </div>
            <h2 className="text-foreground font-bold text-lg">Selecione um Produto</h2>
            <ProductCategoryAccordionGeneric categories={categories} products={products} onSelectProduct={handleTransferProduct} />
          </div>
        )}

        {activeTab === 'separacao' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg p-4 mb-4">
              <p className="text-muted-foreground text-sm">
                💡 <span className="font-semibold text-foreground">Separação:</span> Confirme cada transferência após preparar o material.
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
                  <div key={separation.id}
                    className={`bg-card border-3 border-industrial-warning rounded-lg p-5 transition-all ${
                      completedIds.has(separation.id) ? 'animate-slide-out' : ''
                    }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-foreground font-bold text-lg">{separation.product_name}</p>
                        <p className="text-muted-foreground text-sm mt-1">
                          {separation.from_sector} <span className="text-industrial-warning font-bold">→</span> {separation.to_sector}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground font-black text-2xl">{separation.quantity}</p>
                        <p className="text-muted-foreground text-xs">sacos</p>
                      </div>
                    </div>
                    <IndustrialButton size="lg" variant="success"
                      onClick={() => handleCompleteSeparation(separation.id)}
                      icon={<Check className="w-6 h-6" />} fullWidth>
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
      <EstoqueCountModal isOpen={showCountModal} product={selectedProduct} sector={selectedSector}
        onClose={() => { setShowCountModal(false); setSelectedProduct(null); }}
        onSubmit={handleCountSubmit} />
      <InboundReceivingModal isOpen={showInboundModal} product={selectedProduct}
        onClose={() => { setShowInboundModal(false); setSelectedProduct(null); }}
        onSubmit={handleInboundSubmit} />
      <EstoqueTransferModal isOpen={showTransferModal} product={selectedProduct}
        onClose={() => { setShowTransferModal(false); setSelectedProduct(null); }}
        onSubmit={handleTransferSubmit} />
    </div>
  );
}
