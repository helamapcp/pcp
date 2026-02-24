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

export interface Separation {
  id: string;
  transferId: string;
  productId: string;
  productName: string;
  quantity: number;
  from: Sector;
  to: Sector;
  status: 'pending' | 'completed';
  createdAt: string;
  completedAt?: string;
  operator?: string;
}

export interface InboundReceiving {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: 'units' | 'kg';
  totalKg: number;
  timestamp: string;
  operator: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'stock_count' | 'inbound' | 'transfer' | 'separation_complete' | 'weight_update' | 'product_add' | 'product_delete' | 'category_add' | 'category_delete';
  description: string;
  productName?: string;
  quantity?: number;
  fromSector?: Sector;
  toSector?: Sector;
}

interface EstoqueContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  stockCounts: StockCount[];
  movements: Movement[];
  transfers: Transfer[];
  inboundReceivings: InboundReceiving[];
  unitWeights: UnitWeightConfig[];
  auditLog: AuditLogEntry[];
  
  recordStockCount: (productId: string, sector: Sector, currentQuantity: number, unit: 'units' | 'kg', operator: string) => void;
  recordInboundReceiving: (productId: string, quantity: number, unit: 'units' | 'kg', operator: string) => void;
  updateUnitWeight: (productId: string, unitWeight: number, operator?: string) => void;
  recordTransfer: (productId: string, quantity: number, from: Sector, to: Sector, operator: string) => void;
  completeSeparation: (separationId: string, operator: string) => void;
  
  addCategory: (name: string, description?: string, operator?: string) => void;
  updateCategory: (categoryId: string, name: string, description?: string) => void;
  deleteCategory: (categoryId: string, operator?: string) => void;
  addProduct: (name: string, categoryId: string, type: 'raw_material' | 'production' | 'scrap', defaultUnitWeight: number, operator?: string) => void;
  updateProduct: (productId: string, name: string, categoryId: string, defaultUnitWeight: number) => void;
  deleteProduct: (productId: string, operator?: string) => void;
  
  getProductsByCategory: (category: string) => Product[];
  getAllCategories: () => string[];
  getLatestStockCount: (productId: string, sector: Sector) => StockCount | undefined;
  getUnitWeight: (productId: string) => number;
  getTodayMovements: () => Movement[];
  getTodayTransfers: () => Transfer[];
  getTodayInboundReceivings: () => InboundReceiving[];
  getSectorTotalKg: (sector: Sector) => number;
  getProductTotalKgBySector: (productId: string, sector: Sector) => number;
  getPendingSeparations: () => Separation[];
  getProductTotalKgAllSectors: (productId: string) => number;
}

const EstoqueContext = createContext<EstoqueContextType | undefined>(undefined);

const DEFAULT_PRODUCTS: Product[] = [
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
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [inboundReceivings, setInboundReceivings] = useState<InboundReceiving[]>([]);
  const [separations, setSeparations] = useState<Separation[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [unitWeights, setUnitWeights] = useState<UnitWeightConfig[]>(
    DEFAULT_PRODUCTS.map(p => ({
      productId: p.id,
      productName: p.name,
      unitWeight: p.defaultUnitWeight,
    }))
  );

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLog(prev => [newEntry, ...prev]);
  }, []);

  const recordStockCount = useCallback((
    productId: string,
    sector: Sector,
    currentQuantity: number,
    unit: 'units' | 'kg',
    operator: string
  ) => {
    const product = products.find(p => p.id === productId);
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

    addAuditEntry({
      user: operator,
      action: 'stock_count',
      description: `Contagem de estoque: ${product.name} em ${sector} → ${currentQuantity} ${unit === 'units' ? 'sacos' : 'kg'}`,
      productName: product.name,
      quantity: currentQuantity,
      toSector: sector,
    });
  }, [stockCounts, unitWeights, products, addAuditEntry]);

  const recordInboundReceiving = useCallback((
    productId: string,
    quantity: number,
    unit: 'units' | 'kg',
    operator: string
  ) => {
    const product = products.find(p => p.id === productId);
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
      timestamp: new Date().toISOString(),
      operator,
    };

    setInboundReceivings(prev => [newInbound, ...prev]);

    const currentCDCount = stockCounts.find(s => s.productId === productId && s.sector === 'CD');
    const newCDQuantity = (currentCDCount?.currentQuantity || 0) + quantity;
    recordStockCount(productId, 'CD', newCDQuantity, unit, operator);

    addAuditEntry({
      user: operator,
      action: 'inbound',
      description: `Entrada no CD: ${product.name} → ${quantity} ${unit === 'units' ? 'sacos' : 'kg'} (${totalKg}kg)`,
      productName: product.name,
      quantity,
      toSector: 'CD',
    });
  }, [stockCounts, unitWeights, products, recordStockCount, addAuditEntry]);

  const updateUnitWeight = useCallback((productId: string, unitWeight: number, operator?: string) => {
    const product = products.find(p => p.id === productId);
    setUnitWeights(prev =>
      prev.map(uw =>
        uw.productId === productId ? { ...uw, unitWeight } : uw
      )
    );
    if (operator && product) {
      addAuditEntry({
        user: operator,
        action: 'weight_update',
        description: `Peso unitário atualizado: ${product.name} → ${unitWeight}kg`,
        productName: product.name,
      });
    }
  }, [products, addAuditEntry]);

  const recordTransfer = useCallback((
    productId: string,
    quantity: number,
    from: Sector,
    to: Sector,
    operator: string
  ): void => {
    const product = products.find(p => p.id === productId);
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

    const newSeparation: Separation = {
      id: `sep-${Date.now()}`,
      transferId: newTransfer.id,
      productId,
      productName: product.name,
      quantity,
      from,
      to,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setSeparations((prev: Separation[]) => [newSeparation, ...prev]);

    addAuditEntry({
      user: operator,
      action: 'transfer',
      description: `Transferência: ${product.name} → ${quantity} sacos de ${from} para ${to}`,
      productName: product.name,
      quantity,
      fromSector: from,
      toSector: to,
    });
  }, [products, addAuditEntry]);

  const completeSeparation = useCallback((separationId: string, operator: string) => {
    const sep = separations.find(s => s.id === separationId);
    setSeparations((prev: Separation[]) =>
      prev.map((s: Separation) =>
        s.id === separationId
          ? { ...s, status: 'completed', completedAt: new Date().toISOString(), operator }
          : s
      )
    );
    if (sep) {
      addAuditEntry({
        user: operator,
        action: 'separation_complete',
        description: `Separação confirmada: ${sep.productName} → ${sep.quantity} sacos de ${sep.from} para ${sep.to}`,
        productName: sep.productName,
        quantity: sep.quantity,
        fromSector: sep.from,
        toSector: sep.to,
      });
    }
  }, [separations, addAuditEntry]);

  const getProductsByCategory = useCallback((category: string) => {
    return products.filter(p => p.category === category);
  }, [products]);

  const getAllCategories = useCallback(() => {
    return Array.from(new Set(products.map(p => p.category)));
  }, [products]);

  const getLatestStockCount = useCallback((productId: string, sector: Sector) => {
    return stockCounts.find(s => s.productId === productId && s.sector === sector);
  }, [stockCounts]);

  const getUnitWeight = useCallback((productId: string) => {
    return unitWeights.find(uw => uw.productId === productId)?.unitWeight || 
           products.find(p => p.id === productId)?.defaultUnitWeight || 1;
  }, [unitWeights, products]);

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

  const getPendingSeparations = useCallback(() => {
    return separations.filter((s: Separation) => s.status === 'pending');
  }, [separations]);

  const getProductTotalKgAllSectors = useCallback((productId: string) => {
    const sectorList: Sector[] = ['CD', 'Fábrica', 'PMP', 'PCP'];
    return sectorList.reduce((sum, sector) => {
      const latest = stockCounts.find(s => s.productId === productId && s.sector === sector);
      return sum + (latest?.totalKg || 0);
    }, 0);
  }, [stockCounts]);

  const addCategory = useCallback((name: string, _description?: string, operator?: string) => {
    if (operator) {
      addAuditEntry({
        user: operator,
        action: 'category_add',
        description: `Categoria criada: ${name}`,
      });
    }
  }, [addAuditEntry]);

  const updateCategory = useCallback((_categoryId: string, _name: string, _description?: string) => {
    // Placeholder
  }, []);

  const deleteCategory = useCallback((categoryId: string, operator?: string) => {
    if (operator) {
      addAuditEntry({
        user: operator,
        action: 'category_delete',
        description: `Categoria removida: ${categoryId}`,
      });
    }
  }, [addAuditEntry]);

  const addProduct = useCallback((name: string, categoryId: string, type: 'raw_material' | 'production' | 'scrap', defaultUnitWeight: number, operator?: string) => {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name,
      category: categoryId,
      type,
      defaultUnitWeight,
    };
    setProducts(prev => [...prev, newProduct]);
    setUnitWeights(prev => [...prev, { productId: newProduct.id, productName: name, unitWeight: defaultUnitWeight }]);
    if (operator) {
      addAuditEntry({
        user: operator,
        action: 'product_add',
        description: `Produto criado: ${name} (${categoryId}) - ${defaultUnitWeight}kg/unidade`,
        productName: name,
      });
    }
  }, [addAuditEntry]);

  const updateProduct = useCallback((productId: string, name: string, categoryId: string, defaultUnitWeight: number) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, name, category: categoryId, defaultUnitWeight } : p));
  }, []);

  const deleteProduct = useCallback((productId: string, operator?: string) => {
    const product = products.find(p => p.id === productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
    setUnitWeights(prev => prev.filter(uw => uw.productId !== productId));
    if (operator && product) {
      addAuditEntry({
        user: operator,
        action: 'product_delete',
        description: `Produto removido: ${product.name}`,
        productName: product.name,
      });
    }
  }, [products, addAuditEntry]);

  const value: EstoqueContextType = {
    products,
    setProducts,
    categories: Array.from(new Set(products.map(p => p.category))).map((cat, idx) => ({ id: `cat-${idx}`, name: cat })),
    stockCounts,
    movements,
    transfers,
    inboundReceivings,
    unitWeights,
    auditLog,
    recordStockCount,
    recordInboundReceiving,
    updateUnitWeight,
    recordTransfer,
    completeSeparation,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductsByCategory,
    getAllCategories,
    getLatestStockCount,
    getUnitWeight,
    getTodayMovements,
    getTodayTransfers,
    getTodayInboundReceivings,
    getSectorTotalKg,
    getProductTotalKgBySector,
    getPendingSeparations,
    getProductTotalKgAllSectors,
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
