import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface Product {
  id: string;
  name: string;
  category: string;
  type: 'raw_material' | 'production' | 'scrap';
  defaultUnitWeight: number;
}

export interface UnitWeightConfig {
  productId: string;
  productName: string;
  unitWeight: number;
}

export interface InventorySnapshot {
  id: string;
  productId: string;
  productName: string;
  category: string;
  currentQuantity: number;
  unit: 'units' | 'kg';
  totalKg: number;
  timestamp: string;
  operator: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  previousQuantity: number;
  currentQuantity: number;
  movement: number;
  movementKg: number;
  timestamp: string;
  type: 'in' | 'out';
}

export interface Transfer {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  from: 'CD' | 'Factory' | 'PMP';
  to: 'CD' | 'Factory' | 'PMP';
  timestamp: string;
  operator: string;
}

interface SnapshotInventoryContextType {
  products: Product[];
  snapshots: InventorySnapshot[];
  movements: Movement[];
  transfers: Transfer[];
  unitWeights: UnitWeightConfig[];
  
  recordSnapshot: (productId: string, currentQuantity: number, unit: 'units' | 'kg', operator: string) => void;
  updateUnitWeight: (productId: string, unitWeight: number) => void;
  recordTransfer: (productId: string, quantity: number, from: 'CD' | 'Factory' | 'PMP', to: 'CD' | 'Factory' | 'PMP', operator: string) => void;
  
  getProductsByCategory: (category: string) => Product[];
  getAllCategories: () => string[];
  getLatestSnapshot: (productId: string) => InventorySnapshot | undefined;
  getUnitWeight: (productId: string) => number;
  getTodayMovements: () => Movement[];
  getTodayTransfers: () => Transfer[];
}

const SnapshotInventoryContext = createContext<SnapshotInventoryContextType | undefined>(undefined);

const PRODUCTS: Product[] = [
  // Resinas
  { id: 'prod1', name: 'Resina SP 750 PRIME', category: 'Resinas', type: 'raw_material', defaultUnitWeight: 1250 },
  { id: 'prod2', name: 'Resina SP 750 OFF', category: 'Resinas', type: 'raw_material', defaultUnitWeight: 1250 },
  { id: 'prod3', name: 'SP-90', category: 'Resinas', type: 'raw_material', defaultUnitWeight: 1250 },
  
  // Cargas/Aditivos
  { id: 'prod4', name: 'Dióxido de Titânio', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 25 },
  { id: 'prod5', name: 'Micron 1/9 CD', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 1250 },
  { id: 'prod6', name: 'CPE', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  { id: 'prod7', name: 'Estearato de calcio Ceasit Chemson', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  { id: 'prod8', name: 'Carbonato Ouro Branco', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 1250 },
  { id: 'prod9', name: 'CZ1856 P12', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  { id: 'prod10', name: 'CZ1290 B', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  { id: 'prod11', name: 'Estearina L-12', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  { id: 'prod12', name: 'Cera SP 15', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  { id: 'prod13', name: 'CZP 754', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  { id: 'prod14', name: 'Drapex', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  { id: 'prod15', name: 'LP 40', category: 'Cargas/Aditivos', type: 'raw_material', defaultUnitWeight: 500 },
  
  // Pigmentos
  { id: 'prod16', name: 'Colormatch Ochre', category: 'Pigmentos', type: 'raw_material', defaultUnitWeight: 25 },
  { id: 'prod17', name: 'Colormatch Blue', category: 'Pigmentos', type: 'raw_material', defaultUnitWeight: 25 },
  { id: 'prod18', name: 'Pigmento Liquido Ochre', category: 'Pigmentos', type: 'raw_material', defaultUnitWeight: 200 },
  { id: 'prod19', name: 'Pigmento Liquido Cinza', category: 'Pigmentos', type: 'raw_material', defaultUnitWeight: 200 },
  { id: 'prod20', name: 'Pigmento Liquido Marfim', category: 'Pigmentos', type: 'raw_material', defaultUnitWeight: 200 },
  
  // Capstock
  { id: 'prod21', name: 'Capstock Terracota Remo', category: 'Capstock', type: 'raw_material', defaultUnitWeight: 1250 },
  { id: 'prod22', name: 'Capstock Marfim Remo', category: 'Capstock', type: 'raw_material', defaultUnitWeight: 1250 },
  { id: 'prod23', name: 'Capstock Branco Remo', category: 'Capstock', type: 'raw_material', defaultUnitWeight: 1250 },
  
  // Produção
  { id: 'prod24', name: 'Composto Telha', category: 'Produção', type: 'production', defaultUnitWeight: 1250 },
  { id: 'prod25', name: 'Composto Forro', category: 'Produção', type: 'production', defaultUnitWeight: 1250 },
  
  // Sucata
  { id: 'prod26', name: 'Varredura', category: 'Sucata', type: 'scrap', defaultUnitWeight: 1 },
];

export function SnapshotInventoryProvider({ children }: { children: React.ReactNode }) {
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [unitWeights, setUnitWeights] = useState<UnitWeightConfig[]>(
    PRODUCTS.map(p => ({
      productId: p.id,
      productName: p.name,
      unitWeight: p.defaultUnitWeight,
    }))
  );

  const recordSnapshot = useCallback((
    productId: string,
    currentQuantity: number,
    unit: 'units' | 'kg',
    operator: string
  ) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const unitWeight = unitWeights.find(uw => uw.productId === productId)?.unitWeight || product.defaultUnitWeight;
    const totalKg = unit === 'units' ? currentQuantity * unitWeight : currentQuantity;

    const newSnapshot: InventorySnapshot = {
      id: `snap-${Date.now()}`,
      productId,
      productName: product.name,
      category: product.category,
      currentQuantity,
      unit,
      totalKg,
      timestamp: new Date().toISOString(),
      operator,
    };

    setSnapshots(prev => [newSnapshot, ...prev]);

    // Calculate movement
    const previousSnapshot = snapshots.find(s => s.productId === productId);
    if (previousSnapshot) {
      const movementQuantity = currentQuantity - previousSnapshot.currentQuantity;
      const movementKg = totalKg - previousSnapshot.totalKg;

      const newMovement: Movement = {
        id: `mov-${Date.now()}`,
        productId,
        productName: product.name,
        previousQuantity: previousSnapshot.currentQuantity,
        currentQuantity,
        movement: movementQuantity,
        movementKg,
        timestamp: new Date().toISOString(),
        type: movementQuantity > 0 ? 'in' : 'out',
      };

      setMovements(prev => [newMovement, ...prev]);
    }
  }, [snapshots, unitWeights]);

  const updateUnitWeight = useCallback((productId: string, unitWeight: number) => {
    setUnitWeights(prev =>
      prev.map(uw =>
        uw.productId === productId ? { ...uw, unitWeight } : uw
      )
    );
  }, []);

  const recordTransfer = useCallback((
    productId: string,
    quantity: number,
    from: 'CD' | 'Factory' | 'PMP',
    to: 'CD' | 'Factory' | 'PMP',
    operator: string
  ) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const newTransfer: Transfer = {
      id: `trans-${Date.now()}`,
      productId,
      productName: product.name,
      quantity,
      from,
      to,
      timestamp: new Date().toISOString(),
      operator,
    };

    setTransfers(prev => [newTransfer, ...prev]);
  }, []);

  const getProductsByCategory = useCallback((category: string) => {
    return PRODUCTS.filter(p => p.category === category);
  }, []);

  const getAllCategories = useCallback(() => {
    return Array.from(new Set(PRODUCTS.map(p => p.category)));
  }, []);

  const getLatestSnapshot = useCallback((productId: string) => {
    return snapshots.find(s => s.productId === productId);
  }, [snapshots]);

  const getUnitWeight = useCallback((productId: string) => {
    return unitWeights.find(uw => uw.productId === productId)?.unitWeight || 
           PRODUCTS.find(p => p.id === productId)?.defaultUnitWeight || 1;
  }, [unitWeights]);

  const getTodayMovements = useCallback(() => {
    const today = new Date().toDateString();
    return movements.filter(m => new Date(m.timestamp).toDateString() === today);
  }, [movements]);

  const getTodayTransfers = useCallback(() => {
    const today = new Date().toDateString();
    return transfers.filter(t => new Date(t.timestamp).toDateString() === today);
  }, [transfers]);

  const value: SnapshotInventoryContextType = {
    products: PRODUCTS,
    snapshots,
    movements,
    transfers,
    unitWeights,
    recordSnapshot,
    updateUnitWeight,
    recordTransfer,
    getProductsByCategory,
    getAllCategories,
    getLatestSnapshot,
    getUnitWeight,
    getTodayMovements,
    getTodayTransfers,
  };

  return (
    <SnapshotInventoryContext.Provider value={value}>
      {children}
    </SnapshotInventoryContext.Provider>
  );
}

export function useSnapshotInventory() {
  const context = useContext(SnapshotInventoryContext);
  if (!context) {
    throw new Error('useSnapshotInventory must be used within SnapshotInventoryProvider');
  }
  return context;
}
