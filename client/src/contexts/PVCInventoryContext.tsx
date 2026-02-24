import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Product {
  id: string;
  name: string;
  category: string;
  standardBagWeight: number;
  unit: string;
}

export interface BatchEntry {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  weight: number;
  numberOfBags: number;
  timestamp: string;
  action: 'add' | 'consume';
}

export interface ProductInventory {
  productId: string;
  productName: string;
  category: string;
  totalWeight: number;
  numberOfBags: number;
  lastBatch?: string;
  lastUpdate?: string;
}

interface PVCInventoryContextType {
  products: Product[];
  inventory: ProductInventory[];
  batchHistory: BatchEntry[];
  addBatchEntry: (productId: string, batchNumber: string, weight: number, action: 'add' | 'consume') => void;
  getProductsByCategory: (category: string) => Product[];
  getProductInventory: (productId: string) => ProductInventory | undefined;
  getAllCategories: () => string[];
}

const PVCInventoryContext = createContext<PVCInventoryContextType | undefined>(undefined);

const PRODUCTS: Product[] = [
  // Resinas
  { id: 'prod1', name: 'Resina SP 750 PRIME', category: 'Resinas', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod2', name: 'Resina SP 750 OFF', category: 'Resinas', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod3', name: 'SP-90', category: 'Resinas', standardBagWeight: 1250, unit: 'kg' },
  
  // Cargas
  { id: 'prod4', name: 'Carbonato Ouro Branco', category: 'Cargas', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod5', name: 'Micron 1/9 CD', category: 'Cargas', standardBagWeight: 1250, unit: 'kg' },
  
  // Estabilizantes/Lubrificantes
  { id: 'prod6', name: 'CZ1856 P12', category: 'Estabilizantes/Lubrificantes', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod7', name: 'CZ1290 B', category: 'Estabilizantes/Lubrificantes', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod8', name: 'CZP 754', category: 'Estabilizantes/Lubrificantes', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod9', name: 'Estearato de calcio Ceasit Chemson', category: 'Estabilizantes/Lubrificantes', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod10', name: 'Estearina L-12', category: 'Estabilizantes/Lubrificantes', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod11', name: 'Cera SP 15', category: 'Estabilizantes/Lubrificantes', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod12', name: 'Drapex', category: 'Estabilizantes/Lubrificantes', standardBagWeight: 500, unit: 'kg' },
  
  // Aditivos
  { id: 'prod13', name: 'CPE', category: 'Aditivos', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod14', name: 'LP 40', category: 'Aditivos', standardBagWeight: 500, unit: 'kg' },
  
  // Pigmentos
  { id: 'prod15', name: 'Dióxido de Titânio', category: 'Pigmentos', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod16', name: 'Colormatch Ochre', category: 'Pigmentos', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod17', name: 'Colormatch Blue', category: 'Pigmentos', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod18', name: 'Pigmento Liquido Ochre', category: 'Pigmentos', standardBagWeight: 200, unit: 'kg' },
  { id: 'prod19', name: 'Pigmento Liquido Cinza', category: 'Pigmentos', standardBagWeight: 200, unit: 'kg' },
  { id: 'prod20', name: 'Pigmento Liquido Marfim', category: 'Pigmentos', standardBagWeight: 200, unit: 'kg' },
  
  // Capstock
  { id: 'prod21', name: 'Capstock Terracota Remo', category: 'Capstock', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod22', name: 'Capstock Marfim Remo', category: 'Capstock', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod23', name: 'Capstock Branco Remo', category: 'Capstock', standardBagWeight: 1250, unit: 'kg' },
];

const INITIAL_INVENTORY: ProductInventory[] = PRODUCTS.map(product => ({
  productId: product.id,
  productName: product.name,
  category: product.category,
  totalWeight: Math.floor(Math.random() * 15000) + 5000,
  numberOfBags: 0,
}));

export function PVCInventoryProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<ProductInventory[]>(INITIAL_INVENTORY);
  const [batchHistory, setBatchHistory] = useState<BatchEntry[]>([]);

  const addBatchEntry = useCallback((
    productId: string,
    batchNumber: string,
    weight: number,
    action: 'add' | 'consume'
  ) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const numberOfBags = Math.round(weight / product.standardBagWeight);

    const newEntry: BatchEntry = {
      id: `batch-${Date.now()}`,
      productId,
      productName: product.name,
      batchNumber,
      weight,
      numberOfBags,
      timestamp: new Date().toISOString(),
      action,
    };

    setBatchHistory(prev => [newEntry, ...prev]);

    setInventory(prev =>
      prev.map(inv =>
        inv.productId === productId
          ? {
              ...inv,
              totalWeight: action === 'consume' ? Math.max(0, inv.totalWeight - weight) : inv.totalWeight + weight,
              numberOfBags: action === 'consume' 
                ? Math.max(0, inv.numberOfBags - numberOfBags)
                : inv.numberOfBags + numberOfBags,
              lastBatch: batchNumber,
              lastUpdate: new Date().toLocaleTimeString('pt-BR'),
            }
          : inv
      )
    );
  }, []);

  const getProductsByCategory = useCallback((category: string) => {
    return PRODUCTS.filter(p => p.category === category);
  }, []);

  const getProductInventory = useCallback((productId: string) => {
    return inventory.find(inv => inv.productId === productId);
  }, [inventory]);

  const getAllCategories = useCallback(() => {
    return Array.from(new Set(PRODUCTS.map(p => p.category)));
  }, []);

  const value: PVCInventoryContextType = {
    products: PRODUCTS,
    inventory,
    batchHistory,
    addBatchEntry,
    getProductsByCategory,
    getProductInventory,
    getAllCategories,
  };

  return (
    <PVCInventoryContext.Provider value={value}>
      {children}
    </PVCInventoryContext.Provider>
  );
}

export function usePVCInventory() {
  const context = useContext(PVCInventoryContext);
  if (!context) {
    throw new Error('usePVCInventory must be used within PVCInventoryProvider');
  }
  return context;
}
