import React, { createContext, useContext, useState, useCallback } from 'react';

export type Sector = 'CD' | 'Fábrica' | 'PMP' | 'PCP';

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

export interface StockCount {
  id: string;
  productId: string;
  productName: string;
  category: string;
  sector: Sector;
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
  sector: Sector;
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
  from: Sector;
  to: Sector;
  timestamp: string;
  operator: string;
}

export interface InboundReceiving {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: 'units' | 'kg';
  totalKg: number;
  supplier: string;
  timestamp: string;
  operator: string;
}

interface EstoqueContextType {
  products: Product[];
  stockCounts: StockCount[];
  movements: Movement[];
  transfers: Transfer[];
  inboundReceivings: InboundReceiving[];
  unitWeights: UnitWeightConfig[];
  
  recordStockCount: (productId: string, sector: Sector, currentQuantity: number, unit: 'units' | 'kg', operator: string) => void;
  recordInboundReceiving: (productId: string, quantity: number, unit: 'units' | 'kg', supplier: string, operator: string) => void;
  updateUnitWeight: (productId: string, unitWeight: number) => void;
  recordTransfer: (productId: string, quantity: number, from: Sector, to: Sector, operator: string) => void;
  
  getProductsByCategory: (category: string) => Product[];
  getAllCategories: () => string[];
  getLatestStockCount: (productId: string, sector: Sector) => StockCount | undefined;
  getUnitWeight: (productId: string) => number;
  getTodayMovements: () => Movement[];
  getTodayTransfers: () => Transfer[];
  getTodayInboundReceivings: () => InboundReceiving[];
  getSectorTotalKg: (sector: Sector) => number;
  getProductTotalKgBySector: (productId: string, sector: Sector) => number;
}

const EstoqueContext = createContext<EstoqueContextType | undefined>(undefined);

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
  
  // Produção (PMP)
  { id: 'prod24', name: 'Composto Telha', category: 'Produção (PMP)', type: 'production', defaultUnitWeight: 1250 },
  { id: 'prod25', name: 'Composto Forro', category: 'Produção (PMP)', type: 'production', defaultUnitWeight: 1250 },
  
  // Sucata
  { id: 'prod26', name: 'Varredura', category: 'Sucata', type: 'scrap', defaultUnitWeight: 1 },
];

export function EstoqueProvider({ children }: { children: React.ReactNode }) {
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [inboundReceivings, setInboundReceivings] = useState<InboundReceiving[]>([]);
  const [unitWeights, setUnitWeights] = useState<UnitWeightConfig[]>(
    PRODUCTS.map(p => ({
      productId: p.id,
      productName: p.name,
      unitWeight: p.defaultUnitWeight,
    }))
  );

  const recordStockCount = useCallback((
    productId: string,
    sector: Sector,
    currentQuantity: number,
    unit: 'units' | 'kg',
    operator: string
  ) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const unitWeight = unitWeights.find(uw => uw.productId === productId)?.unitWeight || product.defaultUnitWeight;
    const totalKg = unit === 'units' ? currentQuantity * unitWeight : currentQuantity;

    const newStockCount: StockCount = {
      id: `count-${Date.now()}`,
      productId,
      productName: product.name,
      category: product.category,
      sector,
      currentQuantity,
      unit,
      totalKg,
      timestamp: new Date().toISOString(),
      operator,
    };

    setStockCounts(prev => [newStockCount, ...prev]);

    // Calculate movement
    const previousCount = stockCounts.find(s => s.productId === productId && s.sector === sector);
    if (previousCount) {
      const movementQuantity = currentQuantity - previousCount.currentQuantity;
      const movementKg = totalKg - previousCount.totalKg;

      const newMovement: Movement = {
        id: `mov-${Date.now()}`,
        productId,
        productName: product.name,
        sector,
        previousQuantity: previousCount.currentQuantity,
        currentQuantity,
        movement: movementQuantity,
        movementKg,
        timestamp: new Date().toISOString(),
        type: movementQuantity > 0 ? 'in' : 'out',
      };

      setMovements(prev => [newMovement, ...prev]);
    }
  }, [stockCounts, unitWeights]);

  const recordInboundReceiving = useCallback((
    productId: string,
    quantity: number,
    unit: 'units' | 'kg',
    supplier: string,
    operator: string
  ) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const unitWeight = unitWeights.find(uw => uw.productId === productId)?.unitWeight || product.defaultUnitWeight;
    const totalKg = unit === 'units' ? quantity * unitWeight : quantity;

    const newInbound: InboundReceiving = {
      id: `inbound-${Date.now()}`,
      productId,
      productName: product.name,
      quantity,
      unit,
      totalKg,
      supplier,
      timestamp: new Date().toISOString(),
      operator,
    };

    setInboundReceivings(prev => [newInbound, ...prev]);

    // Automatically increase CD stock
    const currentCDCount = stockCounts.find(s => s.productId === productId && s.sector === 'CD');
    const newCDQuantity = (currentCDCount?.currentQuantity || 0) + quantity;
    recordStockCount(productId, 'CD', newCDQuantity, unit, operator);
  }, [stockCounts, unitWeights, recordStockCount]);

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
    from: Sector,
    to: Sector,
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

  const getLatestStockCount = useCallback((productId: string, sector: Sector) => {
    return stockCounts.find(s => s.productId === productId && s.sector === sector);
  }, [stockCounts]);

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

  const getTodayInboundReceivings = useCallback(() => {
    const today = new Date().toDateString();
    return inboundReceivings.filter(i => new Date(i.timestamp).toDateString() === today);
  }, [inboundReceivings]);

  const getSectorTotalKg = useCallback((sector: Sector) => {
    return stockCounts
      .filter(s => s.sector === sector)
      .reduce((sum, s) => sum + s.totalKg, 0);
  }, [stockCounts]);

  const getProductTotalKgBySector = useCallback((productId: string, sector: Sector) => {
    const latest = stockCounts.find(s => s.productId === productId && s.sector === sector);
    return latest?.totalKg || 0;
  }, [stockCounts]);

  const value: EstoqueContextType = {
    products: PRODUCTS,
    stockCounts,
    movements,
    transfers,
    inboundReceivings,
    unitWeights,
    recordStockCount,
    recordInboundReceiving,
    updateUnitWeight,
    recordTransfer,
    getProductsByCategory,
    getAllCategories,
    getLatestStockCount,
    getUnitWeight,
    getTodayMovements,
    getTodayTransfers,
    getTodayInboundReceivings,
    getSectorTotalKg,
    getProductTotalKgBySector,
  };

  return (
    <EstoqueContext.Provider value={value}>
      {children}
    </EstoqueContext.Provider>
  );
}

export function useEstoque() {
  const context = useContext(EstoqueContext);
  if (!context) {
    throw new Error('useEstoque must be used within EstoqueProvider');
  }
  return context;
}
