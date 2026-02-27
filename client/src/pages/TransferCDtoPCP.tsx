import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import {
  useIndustrialProducts,
  useStock,
  useStockMovements,
  useTransfers,
  convertToKg,
  type Product,
  type TransferItem,
} from '@/hooks/useIndustrialData';
import { IndustrialButton } from '@/components/IndustrialButton';
import { LogOut, ArrowLeft, Plus, Trash2, Check, ArrowRight, Package } from 'lucide-react';
import { toast } from 'sonner';

interface TransferItemDraft {
  product_id: string;
  requested_quantity: number;
  requested_unit: string;
  sent_quantity: number;
  sent_unit: string;
}

export default function TransferCDtoPCP() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, getStock, upsertStock } = useStock();
  const { addMovement } = useStockMovements();
  const { transfers, createTransfer, confirmTransfer, getTransferItems } = useTransfers();

  const [mode, setMode] = useState<'list' | 'create' | 'confirm'>('list');
  const [items, setItems] = useState<TransferItemDraft[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // For confirming existing transfers
  const [selectedTransfer, setSelectedTransfer] = useState<string | null>(null);
  const [confirmItems, setConfirmItems] = useState<TransferItem[]>([]);
  const [sentQuantities, setSentQuantities] = useState<Record<string, string>>({});

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  const pendingTransfers = transfers.filter(
    t => t.from_location === 'CD' && t.to_location === 'PCP' && t.status === 'pending'
  );

  const addItem = (productId: string) => {
    if (items.some(i => i.product_id === productId)) {
      toast.error('Produto já adicionado');
      return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setItems([...items, {
      product_id: productId,
      requested_quantity: 0,
      requested_unit: 'kg',
      sent_quantity: 0,
      sent_unit: 'kg',
    }]);
    setShowProductPicker(false);
    setSearchTerm('');
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    // Auto-fill sent = requested
    if (field === 'requested_quantity') {
      newItems[index].sent_quantity = value;
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateTransfer = async () => {
    const validItems = items.filter(i => i.requested_quantity > 0);
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item com quantidade');
      return;
    }

    // Validate stock
    for (const item of validItems) {
      const product = products.find(p => p.id === item.product_id);
      if (!product) continue;
      const cdStock = getStock(item.product_id, 'CD');
      const sentKg = convertToKg(item.sent_quantity, item.sent_unit, product);
      const availableKg = Number(cdStock?.total_kg || 0);

      if (sentKg > availableKg) {
        toast.error(`Estoque insuficiente para ${product.name}. Disponível: ${availableKg.toFixed(1)} kg`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const transferItems = validItems.map(item => {
        const product = products.find(p => p.id === item.product_id)!;
        return {
          product_id: item.product_id,
          requested_quantity: item.requested_quantity,
          requested_unit: item.requested_unit,
          sent_quantity: item.sent_quantity,
          sent_unit: item.sent_unit,
          sent_total_kg: convertToKg(item.sent_quantity, item.sent_unit, product),
        };
      });

      const { error } = await createTransfer('CD', 'PCP', transferItems, user.id, user.fullName);

      if (error) {
        toast.error('Erro ao criar transferência');
      } else {
        toast.success('✓ Transferência criada com sucesso!', { duration: 4000 });
        setItems([]);
        setMode('list');
      }
    } catch (err) {
      toast.error('Erro inesperado');
    }
    setSubmitting(false);
  };

  const loadTransferItems = async (transferId: string) => {
    const { data } = await getTransferItems(transferId);
    if (data) {
      setConfirmItems(data);
      const quantities: Record<string, string> = {};
      data.forEach(item => {
        quantities[item.id] = String(item.sent_quantity);
      });
      setSentQuantities(quantities);
      setSelectedTransfer(transferId);
      setMode('confirm');
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTransfer) return;
    const transfer = transfers.find(t => t.id === selectedTransfer);
    if (!transfer) return;

    setSubmitting(true);
    try {
      const confirmed = confirmItems.map(item => {
        const product = products.find(p => p.id === item.product_id);
        const sentQty = parseFloat(sentQuantities[item.id] || '0');
        const sentKg = product ? convertToKg(sentQty, item.sent_unit, product) : 0;
        const requestedKg = product ? convertToKg(item.requested_quantity, item.requested_unit, product) : 0;

        let status = 'exact';
        if (sentKg < requestedKg * 0.99) status = 'below';
        else if (sentKg > requestedKg * 1.01) status = 'above';

        return {
          id: item.id,
          sent_quantity: sentQty,
          sent_unit: item.sent_unit,
          sent_total_kg: sentKg,
          status,
        };
      });

      await confirmTransfer(
        selectedTransfer,
        confirmed,
        user.id,
        user.fullName,
        { upsertStock, getStock, addMovement },
        transfer,
        products
      );

      toast.success('✓ Transferência confirmada! Estoque atualizado.', { duration: 4000 });
      setMode('list');
      setSelectedTransfer(null);
      setConfirmItems([]);
      setSentQuantities({});
    } catch (err) {
      toast.error('Erro ao confirmar transferência');
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      exact: 'bg-industrial-success/20 text-industrial-success',
      below: 'bg-industrial-warning/20 text-industrial-warning',
      above: 'bg-primary/20 text-primary',
      pending: 'bg-secondary text-secondary-foreground',
    };
    const labels: Record<string, string> = {
      exact: 'Exato',
      below: 'Abaixo',
      above: 'Acima',
      pending: 'Pendente',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  // ── Confirm existing transfer ──
  if (mode === 'confirm' && selectedTransfer) {
    const transfer = transfers.find(t => t.id === selectedTransfer);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setMode('list'); setSelectedTransfer(null); }} className="p-2 hover:bg-secondary rounded-lg touch-target">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-black text-foreground">Confirmar Transferência</h1>
              <p className="text-muted-foreground text-sm">CD → PCP • {transfer?.requested_by_name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {confirmItems.map(item => {
            const product = products.find(p => p.id === item.product_id);
            const cdStock = getStock(item.product_id, 'CD');
            const sentQty = parseFloat(sentQuantities[item.id] || '0');
            const sentKg = product ? convertToKg(sentQty, item.sent_unit, product) : 0;
            const requestedKg = product ? convertToKg(item.requested_quantity, item.requested_unit, product) : 0;

            let statusColor = 'border-border';
            if (sentKg > 0) {
              if (Math.abs(sentKg - requestedKg) / requestedKg < 0.01) statusColor = 'border-industrial-success';
              else if (sentKg < requestedKg) statusColor = 'border-industrial-warning';
              else statusColor = 'border-primary';
            }

            return (
              <div key={item.id} className={`bg-card border-2 ${statusColor} rounded-xl p-4 space-y-3`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-foreground font-bold">{product?.name || 'Produto'}</p>
                    <p className="text-muted-foreground text-xs">{product?.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">CD disponível</p>
                    <p className="text-foreground font-bold">{Number(cdStock?.total_kg || 0).toFixed(1)} kg</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-muted-foreground text-xs font-bold">SOLICITADO</p>
                    <p className="text-foreground text-lg font-black">{item.requested_quantity} {item.requested_unit}</p>
                    <p className="text-muted-foreground text-xs">{requestedKg.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-bold mb-1">ENVIADO</p>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={sentQuantities[item.id] || ''}
                      onChange={(e) => setSentQuantities({ ...sentQuantities, [item.id]: e.target.value })}
                      className="w-full px-3 py-2 bg-input border-2 border-border rounded-lg text-foreground text-lg font-black text-center touch-target"
                    />
                    <p className="text-muted-foreground text-xs mt-1 text-center">{sentKg.toFixed(1)} kg</p>
                  </div>
                </div>

                {sentQty > 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground text-xs">
                      Diferença: <span className={sentKg >= requestedKg ? 'text-industrial-success' : 'text-industrial-warning'}>
                        {sentKg >= requestedKg ? '+' : ''}{(sentKg - requestedKg).toFixed(1)} kg
                      </span>
                    </p>
                    {getStatusBadge(
                      Math.abs(sentKg - requestedKg) / requestedKg < 0.01 ? 'exact' :
                      sentKg < requestedKg ? 'below' : 'above'
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <IndustrialButton size="lg" variant="success" fullWidth onClick={handleConfirmTransfer}
            disabled={submitting || confirmItems.some(i => !sentQuantities[i.id] || parseFloat(sentQuantities[i.id]) <= 0)}
            icon={<Check className="w-5 h-5" />}>
            {submitting ? 'Confirmando...' : 'Confirmar Transferência'}
          </IndustrialButton>
        </div>
      </div>
    );
  }

  // ── Create new transfer ──
  if (mode === 'create') {
    const filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setMode('list'); setItems([]); }} className="p-2 hover:bg-secondary rounded-lg touch-target">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-black text-foreground">Nova Transferência</h1>
              <p className="text-muted-foreground text-sm">CD → PCP</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Added items */}
          {items.map((item, idx) => {
            const product = products.find(p => p.id === item.product_id);
            const cdStock = getStock(item.product_id, 'CD');
            const sentKg = product ? convertToKg(item.sent_quantity, item.sent_unit, product) : 0;

            return (
              <div key={idx} className="bg-card border-2 border-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-foreground font-bold">{product?.name}</p>
                    <p className="text-muted-foreground text-xs">
                      CD: {Number(cdStock?.total_kg || 0).toFixed(1)} kg disponível
                    </p>
                  </div>
                  <button onClick={() => removeItem(idx)} className="p-2 hover:bg-destructive/20 rounded-lg touch-target">
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground text-xs font-bold">Unidade</label>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {(['kg', 'units'] as const).map(u => (
                        <button key={u} onClick={() => updateItem(idx, 'requested_unit', u)}
                          className={`px-2 py-2 rounded text-xs font-bold border touch-target ${
                            item.requested_unit === u ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-secondary-foreground'
                          }`}>
                          {u === 'kg' ? 'kg' : 'und'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground text-xs font-bold">Quantidade</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.requested_quantity || ''}
                      onChange={(e) => updateItem(idx, 'requested_quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-input border-2 border-border rounded-lg text-foreground font-bold text-center touch-target mt-1"
                    />
                  </div>
                </div>

                {item.requested_quantity > 0 && (
                  <p className="text-muted-foreground text-xs text-center">
                    Total: {sentKg.toFixed(1)} kg
                  </p>
                )}
              </div>
            );
          })}

          {/* Add product button / picker */}
          {showProductPicker ? (
            <div className="bg-card border-2 border-primary rounded-xl p-4 space-y-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Buscar produto..."
                className="w-full px-3 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target"
                autoFocus
              />
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredProducts.map(p => {
                  const already = items.some(i => i.product_id === p.id);
                  const cdStock = getStock(p.id, 'CD');
                  return (
                    <button key={p.id} onClick={() => addItem(p.id)} disabled={already}
                      className={`w-full text-left px-3 py-3 rounded-lg flex justify-between items-center touch-target ${
                        already ? 'opacity-40' : 'hover:bg-secondary'
                      }`}>
                      <span className="text-foreground font-semibold text-sm">{p.name}</span>
                      <span className="text-muted-foreground text-xs">{Number(cdStock?.total_kg || 0).toFixed(1)} kg</span>
                    </button>
                  );
                })}
              </div>
              <IndustrialButton size="md" variant="secondary" fullWidth onClick={() => { setShowProductPicker(false); setSearchTerm(''); }}>
                Cancelar
              </IndustrialButton>
            </div>
          ) : (
            <IndustrialButton size="lg" variant="primary" fullWidth onClick={() => setShowProductPicker(true)} icon={<Plus className="w-5 h-5" />}>
              Adicionar Produto
            </IndustrialButton>
          )}

          {items.length > 0 && (
            <div className="pt-4">
              {/* Summary */}
              <div className="bg-card border-2 border-industrial-success rounded-xl p-4 mb-4">
                <p className="text-muted-foreground text-xs font-bold mb-2">RESUMO DA TRANSFERÊNCIA</p>
                <div className="space-y-1">
                  {items.filter(i => i.requested_quantity > 0).map((item, idx) => {
                    const product = products.find(p => p.id === item.product_id);
                    const kg = product ? convertToKg(item.sent_quantity, item.sent_unit, product) : 0;
                    return (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-foreground">{product?.name}</span>
                        <span className="text-foreground font-bold">{item.sent_quantity} {item.sent_unit === 'units' ? 'und' : 'kg'} ({kg.toFixed(1)} kg)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <IndustrialButton size="lg" variant="success" fullWidth onClick={handleCreateTransfer}
                disabled={submitting || items.every(i => i.requested_quantity <= 0)}
                icon={<ArrowRight className="w-5 h-5" />}>
                {submitting ? 'Criando...' : 'Criar Transferência CD → PCP'}
              </IndustrialButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Transfer list ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-foreground">🔄 Transferências</h1>
            <p className="text-muted-foreground text-sm">{user.fullName} • CD → PCP</p>
          </div>
          <button onClick={handleLogout} className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target" title="Sair">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <IndustrialButton size="lg" variant="success" fullWidth onClick={() => setMode('create')} icon={<Plus className="w-5 h-5" />}>
          Nova Transferência CD → PCP
        </IndustrialButton>

        {pendingTransfers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-foreground font-bold text-lg">Pendentes ({pendingTransfers.length})</h2>
            {pendingTransfers.map(t => (
              <button key={t.id} onClick={() => loadTransferItems(t.id)}
                className="w-full bg-card border-2 border-industrial-warning rounded-lg p-4 text-left hover:bg-secondary transition-colors touch-target">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-foreground font-bold">CD → PCP</p>
                    <p className="text-muted-foreground text-xs">
                      Solicitado por {t.requested_by_name} • {new Date(t.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {getStatusBadge('pending')}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Completed transfers */}
        <div className="space-y-3">
          <h2 className="text-foreground font-bold text-lg">Histórico</h2>
          {transfers.filter(t => t.from_location === 'CD' && t.to_location === 'PCP' && t.status === 'completed').slice(0, 20).map(t => (
            <div key={t.id} className="bg-card border-2 border-border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-foreground font-bold text-sm">CD → PCP</p>
                  <p className="text-muted-foreground text-xs">
                    {t.confirmed_by_name} • {new Date(t.confirmed_at || t.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span className="px-2 py-1 rounded text-xs font-bold bg-industrial-success/20 text-industrial-success">Concluída</span>
              </div>
            </div>
          ))}
          {transfers.filter(t => t.status === 'completed').length === 0 && (
            <p className="text-muted-foreground text-center py-6">Nenhuma transferência concluída ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
