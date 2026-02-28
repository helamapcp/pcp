import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock, convertToKg } from '@/hooks/useIndustrialData';
import { stockEntryRPC } from '@/services/stockService';
import { IndustrialButton } from '@/components/IndustrialButton';
import { LogOut, Package, Plus, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function CDStockEntry() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { products } = useIndustrialProducts();
  const { getStock, refetch: refetchStock } = useStock();

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'kg' | 'units'>('kg');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  const product = products.find(p => p.id === selectedProduct);
  const currentStock = product ? getStock(product.id, 'CD') : undefined;
  const parsedQty = parseFloat(quantity) || 0;

  // Preview conversion (display only — real conversion is server-side)
  const totalKg = product ? convertToKg(parsedQty, unit, product) : 0;
  const newStockKg = (Number(currentStock?.total_kg) || 0) + totalKg;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(filteredProducts.map(p => p.category)));

  const handleSubmit = async () => {
    if (!product || parsedQty <= 0) return;
    setSubmitting(true);

    try {
      // Use server-side RPC for entry — conversion happens in DB
      const { data, error } = await stockEntryRPC(
        product.id,
        'CD',
        parsedQty,
        unit,
        user.id,
        user.fullName,
        `Entrada no CD: ${parsedQty} ${unit === 'units' ? 'unidades' : 'kg'}`
      );

      if (error) throw error;

      const resultKg = (data as any)?.total_kg || totalKg;
      await refetchStock();

      toast.success(
        `✓ Entrada Registrada\n${product.name}\n${parsedQty} ${unit === 'units' ? 'unidades' : 'kg'} (${resultKg.toFixed ? resultKg.toFixed(1) : resultKg} kg)`,
        { duration: 4000 }
      );

      // Reset
      setSelectedProduct(null);
      setQuantity('');
      setUnit('kg');
      setShowConfirm(false);
    } catch (err: any) {
      toast.error('Erro ao registrar entrada: ' + (err.message || err));
    }

    setSubmitting(false);
  };

  // ── Confirmation screen ──
  if (showConfirm && product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowConfirm(false)} className="p-2 hover:bg-secondary rounded-lg touch-target">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-xl font-black text-foreground">Confirmar Entrada</h1>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4">
          <div className="bg-card border-2 border-industrial-success rounded-xl p-6 space-y-4">
            <h2 className="text-foreground font-black text-xl">{product.name}</h2>
            <p className="text-muted-foreground text-sm">{product.category}</p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-secondary rounded-lg p-4">
                <p className="text-muted-foreground text-xs font-bold">QUANTIDADE</p>
                <p className="text-foreground text-2xl font-black">{parsedQty}</p>
                <p className="text-muted-foreground text-xs">{unit === 'units' ? 'unidades' : 'kg'}</p>
              </div>
              <div className="bg-secondary rounded-lg p-4">
                <p className="text-muted-foreground text-xs font-bold">TOTAL KG (estimado)</p>
                <p className="text-foreground text-2xl font-black">{totalKg.toFixed(1)}</p>
                <p className="text-muted-foreground text-xs">quilogramas</p>
              </div>
            </div>

            <div className="bg-industrial-surface rounded-lg p-4 mt-4">
              <p className="text-muted-foreground text-xs font-bold">ESTOQUE CD APÓS ENTRADA</p>
              <p className="text-industrial-success text-2xl font-black">{newStockKg.toFixed(1)} kg</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <IndustrialButton size="lg" variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">
              Voltar
            </IndustrialButton>
            <IndustrialButton size="lg" variant="success" onClick={handleSubmit} disabled={submitting} className="flex-1" icon={<Check className="w-5 h-5" />}>
              {submitting ? 'Salvando...' : 'Confirmar'}
            </IndustrialButton>
          </div>
        </div>
      </div>
    );
  }

  // ── Product quantity input ──
  if (selectedProduct && product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedProduct(null); setQuantity(''); }} className="p-2 hover:bg-secondary rounded-lg touch-target">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-black text-foreground">Entrada no CD</h1>
              <p className="text-muted-foreground text-sm">{product.name}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-6">
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-foreground font-bold text-lg">{product.name}</h2>
                <p className="text-muted-foreground text-sm">{product.category}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs font-bold">ESTOQUE ATUAL CD</p>
                <p className="text-foreground text-xl font-black">{Number(currentStock?.total_kg || 0).toFixed(1)} kg</p>
              </div>
            </div>

            {product.package_type !== 'bulk' && (
              <div className="bg-secondary rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Tipo: </span>
                <span className="text-foreground font-bold">
                  {product.package_type === 'sealed_bag' ? `Saco selado (${product.package_weight} kg)` : 'Unitário'}
                </span>
                {product.unit_weight_kg > 0 && (
                  <>
                    <span className="text-muted-foreground"> • Peso unitário: </span>
                    <span className="text-foreground font-bold">{product.unit_weight_kg} kg</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-foreground font-bold text-sm mb-2">Unidade</label>
              <div className="grid grid-cols-2 gap-3">
                {(['kg', 'units'] as const).map(u => (
                  <button key={u} onClick={() => setUnit(u)}
                    className={`px-4 py-3 rounded-lg font-bold transition-all border-2 touch-target ${
                      unit === u
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-secondary-foreground border-border hover:bg-secondary'
                    }`}>
                    {u === 'kg' ? 'Quilogramas (kg)' : 'Unidades'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-foreground font-bold text-sm mb-2">Quantidade</label>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-4 bg-input border-2 border-border rounded-lg text-foreground text-2xl font-black text-center placeholder-muted-foreground touch-target"
                autoFocus
              />
              {parsedQty > 0 && unit === 'units' && (
                <p className="text-muted-foreground text-sm mt-2 text-center">
                  = {totalKg.toFixed(1)} kg
                  {product.package_type === 'sealed_bag' && product.package_weight > 0 && (
                    <span className="text-primary"> ({parsedQty} × {product.package_weight}kg)</span>
                  )}
                </p>
              )}
            </div>
          </div>

          <IndustrialButton
            size="lg"
            variant="success"
            fullWidth
            disabled={parsedQty <= 0}
            onClick={() => setShowConfirm(true)}
            icon={<Plus className="w-5 h-5" />}
          >
            Registrar Entrada
          </IndustrialButton>
        </div>
      </div>
    );
  }

  // ── Product selection ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/operator')} className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors touch-target">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground">📥 Entrada CD</h1>
            <p className="text-muted-foreground text-sm">{user.fullName} • Registro de Entrada</p>
          </div>
          <button onClick={handleLogout} className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target" title="Sair">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-card border-2 border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            💡 <span className="font-semibold text-foreground">Entrada Simplificada:</span> Selecione o produto e informe a quantidade recebida. Conversão de unidades é feita no servidor.
          </p>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Buscar produto..."
          className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground placeholder-muted-foreground font-semibold touch-target"
        />

        {categories.map(cat => (
          <div key={cat} className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-wider px-1">{cat}</h3>
            {filteredProducts.filter(p => p.category === cat).map(p => {
              const stock = getStock(p.id, 'CD');
              return (
                <button key={p.id} onClick={() => setSelectedProduct(p.id)}
                  className="w-full bg-card border-2 border-border hover:border-primary rounded-lg p-4 flex items-center justify-between transition-colors touch-target text-left">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-foreground font-bold">{p.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {p.package_type === 'sealed_bag' ? `Saco ${p.package_weight}kg` : p.package_type === 'unit' ? 'Unitário' : 'A granel'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-black">{Number(stock?.total_kg || 0).toFixed(1)}</p>
                    <p className="text-muted-foreground text-xs">kg em CD</p>
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="bg-card border-2 border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">Nenhum produto encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
