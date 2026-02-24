import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ProductCategory {
  id: string;
  name: string;
  type: 'raw_material' | 'finished_good';
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  standardBagWeight: number; // kg
  unit: string; // kg
}

export interface BatchEntry {
  id: string;
  productId: string;
  batchNumber: string;
  weight: number; // kg
  numberOfBags: number;
  timestamp: string;
  operatorId: string;
  action: 'receive' | 'consume' | 'produce';
}

export interface ProductInventory {
  productId: string;
  productName: string;
  categoryId: string;
  totalWeight: number; // kg
  numberOfBags: number;
  batches: BatchEntry[];
}

interface BigBagInventoryContextType {
  categories: ProductCategory[];
  products: Product[];
  inventory: ProductInventory[];
  batchHistory: BatchEntry[];
  addBagEntry: (productId: string, batchNumber: string, weight: number, action: 'receive' | 'consume' | 'produce') => void;
  getProductsByCategory: (categoryId: string) => Product[];
  getProductInventory: (productId: string) => ProductInventory | undefined;
  getLastUsedProduct: () => Product | null;
}

const BigBagInventoryContext = createContext<BigBagInventoryContextType | undefined>(undefined);

const CATEGORIES: ProductCategory[] = [
  { id: 'cat1', name: 'Resinas', type: 'raw_material' },
  { id: 'cat2', name: 'Aditivos', type: 'raw_material' },
  { id: 'cat3', name: 'Telhas', type: 'finished_good' },
  { id: 'cat4', name: 'Forros', type: 'finished_good' },
];

const PRODUCTS: Product[] = [
  // Resinas
  { id: 'prod1', categoryId: 'cat1', name: 'Resina Suspensão', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod2', categoryId: 'cat1', name: 'Resina Emulsão', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod3', categoryId: 'cat1', name: 'Resina Homopolímero', standardBagWeight: 1250, unit: 'kg' },
  // Aditivos
  { id: 'prod4', categoryId: 'cat2', name: 'Pigmento Branco', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod5', categoryId: 'cat2', name: 'Estabilizador Térmico', standardBagWeight: 500, unit: 'kg' },
  { id: 'prod6', categoryId: 'cat2', name: 'Plastificante DOP', standardBagWeight: 1000, unit: 'kg' },
  // Telhas
  { id: 'prod7', categoryId: 'cat3', name: 'Telha Colonial Vermelha', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod8', categoryId: 'cat3', name: 'Telha Colonial Natural', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod9', categoryId: 'cat3', name: 'Telha Francesa Branca', standardBagWeight: 1250, unit: 'kg' },
  // Forros
  { id: 'prod10', categoryId: 'cat4', name: 'Forro 200mm Branco', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod11', categoryId: 'cat4', name: 'Forro 200mm Bege', standardBagWeight: 1250, unit: 'kg' },
  { id: 'prod12', categoryId: 'cat4', name: 'Forro 250mm Branco', standardBagWeight: 1500, unit: 'kg' },
];

const INITIAL_INVENTORY: ProductInventory[] = PRODUCTS.map(product => ({
  productId: product.id,
  productName: product.name,
  categoryId: product.categoryId,
  totalWeight: Math.floor(Math.random() * 10000) + 5000, // 5000-15000 kg
  numberOfBags: 0,
  batches: [],
}));

export function BigBagInventoryProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<ProductInventory[]>(INITIAL_INVENTORY);
  const [batchHistory, setBatchHistory] = useState<BatchEntry[]>([]);
  const [lastUsedProductId, setLastUsedProductId] = useState<string | null>(null);

  const addBagEntry = useCallback((
    productId: string,
    batchNumber: string,
    weight: number,
    action: 'receive' | 'consume' | 'produce'
  ) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const numberOfBags = Math.round(weight / product.standardBagWeight);

    const newEntry: BatchEntry = {
      id: `batch-${Date.now()}`,
      productId,
      batchNumber,
      weight,
      numberOfBags,
      timestamp: new Date().toISOString(),
      operatorId: 'OP001',
      action,
    };

    setBatchHistory(prev => [newEntry, ...prev]);
    setLastUsedProductId(productId);

    // Update inventory
    setInventory(prev =>
      prev.map(inv =>
        inv.productId === productId
          ? {
              ...inv,
              totalWeight: action === 'consume' ? inv.totalWeight - weight : inv.totalWeight + weight,
              numberOfBags: action === 'consume' 
                ? Math.max(0, inv.numberOfBags - numberOfBags)
                : inv.numberOfBags + numberOfBags,
              batches: [newEntry, ...inv.batches],
            }
          : inv
      )
    );
  }, []);

  const getProductsByCategory = useCallback((categoryId: string) => {
    return PRODUCTS.filter(p => p.categoryId === categoryId);
  }, []);

  const getProductInventory = useCallback((productId: string) => {
    return inventory.find(inv => inv.productId === productId);
  }, [inventory]);

  const getLastUsedProduct = useCallback(() => {
    if (!lastUsedProductId) return null;
    return PRODUCTS.find(p => p.id === lastUsedProductId) || null;
  }, [lastUsedProductId]);

  const value: BigBagInventoryContextType = {
    categories: CATEGORIES,
    products: PRODUCTS,
    inventory,
    batchHistory,
    addBagEntry,
    getProductsByCategory,
    getProductInventory,
    getLastUsedProduct,
  };

  return (
    <BigBagInventoryContext.Provider value={value}>
      {children}
    </BigBagInventoryContext.Provider>
  );
}

export function useBigBagInventory() {
  const context = useContext(BigBagInventoryContext);
  if (!context) {
    throw new Error('useBigBagInventory must be used within BigBagInventoryProvider');
  }
  return context;
}
