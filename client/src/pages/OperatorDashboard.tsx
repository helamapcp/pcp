import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { IndustrialButton } from '@/components/IndustrialButton';
import { useInventory } from '@/contexts/InventoryContext';
import { Barcode, Package, Trash2, LogOut, Check } from 'lucide-react';
import { toast } from 'sonner';

type ActionType = 'consume' | 'produce' | 'scrap' | null;

export default function OperatorDashboard() {
  const [, setLocation] = useLocation();
  const { logProduction, rawMaterials, finishedGoods } = useInventory();
  const [action, setAction] = useState<ActionType>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleScan = (barcode: string) => {
    setScannedBarcode(barcode);

    if (action === 'consume') {
      const material = rawMaterials.find(m => m.barcode === barcode);
      if (material) {
        setSelectedItem(material);
        toast.success(`Material encontrado: ${material.name}`);
      } else {
        toast.error('Material não encontrado');
        setScannedBarcode('');
      }
    } else if (action === 'produce' || action === 'scrap') {
      const product = finishedGoods.find(p => p.barcode === barcode);
      if (product) {
        setSelectedItem(product);
        toast.success(`Produto encontrado: ${product.name}`);
      } else {
        toast.error('Produto não encontrado');
        setScannedBarcode('');
      }
    }
  };

  const handleQuantityChange = (value: string | number) => {
    const numValue = String(value).replace(/\D/g, '');
    setQuantity(numValue);
  };

  const handleConfirm = () => {
    if (!quantity || !selectedItem || !action) {
      toast.error('Preencha todos os campos');
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error('Quantidade deve ser maior que 0');
      return;
    }

    logProduction(action, selectedItem.name, qty, selectedItem.unit);
    
    const actionLabel = {
      consume: 'Consumo registrado',
      produce: 'Produção registrada',
      scrap: 'Sucata registrada',
    }[action];

    toast.success(`${actionLabel}: ${qty} ${selectedItem.unit}`);

    // Reset
    setAction(null);
    setScannedBarcode('');
    setQuantity('');
    setSelectedItem(null);
    setShowConfirmation(false);
  };

  if (action && !showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex flex-col">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Escaneador</h1>
            <p className="text-slate-300 text-sm">
              {action === 'consume' && 'Escanear material a consumir'}
              {action === 'produce' && 'Escanear produto acabado'}
              {action === 'scrap' && 'Escanear sucata/perda'}
            </p>
          </div>
          <button
            onClick={() => {
              setAction(null);
              setScannedBarcode('');
              setSelectedItem(null);
            }}
            className="text-slate-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Scanner Simulation */}
        <div className="flex-1 flex flex-col items-center justify-center mb-6">
          <div className="w-full max-w-sm">
            <div className="bg-black/40 border-4 border-yellow-400 rounded-2xl p-8 mb-6 aspect-square flex items-center justify-center">
              <div className="text-center">
                <Barcode className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <p className="text-white text-sm font-semibold">Aponte a câmera para o código</p>
                <p className="text-slate-300 text-xs mt-2">ou use o campo abaixo para simular</p>
              </div>
            </div>

            {/* Manual Input */}
            <div className="mb-6">
              <label className="block text-white text-sm font-bold mb-2">Código de Barras (Simulado)</label>
              <input
                type="text"
                value={scannedBarcode}
                onChange={(e) => {
                  setScannedBarcode(e.target.value);
                  if (e.target.value.length === 4) {
                    handleScan(e.target.value);
                  }
                }}
                placeholder="Digite 4 dígitos (ex: 4001)"
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white text-lg font-bold text-center focus:outline-none focus:border-yellow-400"
                maxLength={4}
              />
              <p className="text-xs text-slate-400 mt-2">Materiais: 4001-4005 | Produtos: 5001-5003</p>
            </div>

            {/* Quick Scan Buttons */}
            {action === 'consume' && (
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[4001, 4002, 4003, 4004].map(code => (
                  <button
                    key={code}
                    onClick={() => handleScan(code.toString())}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded border border-slate-600 transition-colors"
                  >
                    Scan {code}
                  </button>
                ))}
              </div>
            )}

            {action !== 'consume' && (
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[5001, 5002, 5003].map(code => (
                  <button
                    key={code}
                    onClick={() => handleScan(code.toString())}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded border border-slate-600 transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Item Display */}
        {selectedItem && (
          <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-400 text-sm font-semibold mb-1">✓ Item Encontrado</p>
            <p className="text-white font-bold">{selectedItem.name}</p>
            <p className="text-slate-300 text-sm">Estoque: {selectedItem.quantity} {selectedItem.unit}</p>
          </div>
        )}

        {/* Quantity Input */}
        {selectedItem && (
          <div className="mb-6">
            <label className="block text-white text-sm font-bold mb-2">Quantidade ({selectedItem.unit})</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleQuantityChange(Math.max(0, parseInt(quantity || '0') - 1).toString())}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xl"
              >
                −
              </button>
              <input
                type="text"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="0"
                className="flex-1 px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-white text-2xl font-bold text-center focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={() => handleQuantityChange((parseInt(quantity || '0') + 1).toString())}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xl"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <IndustrialButton
            size="lg"
            variant="secondary"
            onClick={() => {
              setAction(null);
              setScannedBarcode('');
              setSelectedItem(null);
              setQuantity('');
            }}
            className="flex-1"
          >
            Cancelar
          </IndustrialButton>
          {selectedItem && quantity && (
            <IndustrialButton
              size="lg"
              variant="success"
              onClick={() => setShowConfirmation(true)}
              className="flex-1"
              icon={<Check className="w-5 h-5" />}
            >
              Revisar
            </IndustrialButton>
          )}
        </div>
      </div>
    );
  }

  if (showConfirmation && selectedItem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-slate-800 border-4 border-yellow-400 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Confirmar Operação</h2>

          <div className="bg-slate-700/50 rounded-lg p-6 mb-6 space-y-4">
            <div>
              <p className="text-slate-300 text-sm">Ação</p>
              <p className="text-white font-bold text-lg">
                {action === 'consume' && '📥 Consumir Material'}
                {action === 'produce' && '📦 Registrar Produção'}
                {action === 'scrap' && '🗑️ Registrar Sucata'}
              </p>
            </div>
            <div>
              <p className="text-slate-300 text-sm">Item</p>
              <p className="text-white font-bold text-lg">{selectedItem.name}</p>
            </div>
            <div>
              <p className="text-slate-300 text-sm">Quantidade</p>
              <p className="text-white font-bold text-3xl text-center">{quantity} {selectedItem.unit}</p>
            </div>
          </div>

          <p className="text-slate-400 text-center text-sm mb-6">
            Deslize para confirmar ou clique em Cancelar
          </p>

          <div className="flex gap-3">
            <IndustrialButton
              size="lg"
              variant="secondary"
              onClick={() => setShowConfirmation(false)}
              className="flex-1"
            >
              Cancelar
            </IndustrialButton>
            <IndustrialButton
              size="lg"
              variant="success"
              onClick={handleConfirm}
              className="flex-1"
              icon={<Check className="w-5 h-5" />}
            >
              Confirmar
            </IndustrialButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex flex-col">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Operador de Chão</h1>
          <p className="text-slate-300 text-sm">Linha de Produção 1</p>
        </div>
        <button
          onClick={() => setLocation('/login')}
          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          title="Sair"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 gap-4 flex-1">
        <IndustrialButton
          size="xl"
          variant="primary"
          onClick={() => setAction('consume')}
          icon={<Barcode className="w-8 h-8" />}
          className="h-24 text-lg"
        >
          Registrar Consumo
        </IndustrialButton>

        <IndustrialButton
          size="xl"
          variant="success"
          onClick={() => setAction('produce')}
          icon={<Package className="w-8 h-8" />}
          className="h-24 text-lg"
        >
          Registrar Produção
        </IndustrialButton>

        <IndustrialButton
          size="xl"
          variant="danger"
          onClick={() => setAction('scrap')}
          icon={<Trash2 className="w-8 h-8" />}
          className="h-24 text-lg"
        >
          Registrar Sucata
        </IndustrialButton>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <p className="text-slate-300 text-xs font-semibold mb-1">MATERIAIS EM ESTOQUE</p>
          <p className="text-white text-2xl font-bold">{rawMaterials.length}</p>
        </div>
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <p className="text-slate-300 text-xs font-semibold mb-1">PRODUTOS ACABADOS</p>
          <p className="text-white text-2xl font-bold">{finishedGoods.length}</p>
        </div>
      </div>
    </div>
  );
}
