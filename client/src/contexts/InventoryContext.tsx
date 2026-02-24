import React, { createContext, useContext, useState, useCallback } from 'react';

export interface RawMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  barcode: string;
}

export interface WIPItem {
  id: string;
  productName: string;
  quantity: number;
  stage: string;
  line: string;
  startTime: string;
}

export interface FinishedGood {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  barcode: string;
}

export interface ProductionLog {
  id: string;
  timestamp: string;
  operatorId: string;
  action: 'consume' | 'produce' | 'scrap';
  material: string;
  quantity: number;
  unit: string;
}

interface InventoryContextType {
  rawMaterials: RawMaterial[];
  wipItems: WIPItem[];
  finishedGoods: FinishedGood[];
  productionLogs: ProductionLog[];
  logProduction: (action: 'consume' | 'produce' | 'scrap', material: string, quantity: number, unit: string) => void;
  getRawMaterialByBarcode: (barcode: string) => RawMaterial | undefined;
  getFinishedGoodByBarcode: (barcode: string) => FinishedGood | undefined;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  { id: '1', name: 'PVC Resin (Grade A)', quantity: 5000, unit: 'kg', location: 'Warehouse A1', barcode: '4001' },
  { id: '2', name: 'Pigment White', quantity: 200, unit: 'kg', location: 'Warehouse B2', barcode: '4002' },
  { id: '3', name: 'Stabilizer (Heat)', quantity: 150, unit: 'kg', location: 'Warehouse B3', barcode: '4003' },
  { id: '4', name: 'Plasticizer DOP', quantity: 300, unit: 'kg', location: 'Warehouse C1', barcode: '4004' },
  { id: '5', name: 'PVC Resin (Grade B)', quantity: 3200, unit: 'kg', location: 'Warehouse A2', barcode: '4005' },
];

const INITIAL_WIP: WIPItem[] = [
  { id: 'w1', productName: 'PVC Tiles (Red)', quantity: 450, stage: 'Extrusion', line: 'Line 1', startTime: '08:30' },
  { id: 'w2', productName: 'Ceiling Panels (White)', quantity: 200, stage: 'Cooling', line: 'Line 2', startTime: '07:45' },
  { id: 'w3', productName: 'PVC Tiles (Natural)', quantity: 320, stage: 'Packaging', line: 'Line 1', startTime: '06:15' },
];

const INITIAL_FINISHED_GOODS: FinishedGood[] = [
  { id: 'f1', name: 'PVC Tiles (Red)', quantity: 2400, unit: 'units', location: 'Warehouse D1', barcode: '5001' },
  { id: 'f2', name: 'Ceiling Panels (White)', quantity: 1800, unit: 'units', location: 'Warehouse D2', barcode: '5002' },
  { id: 'f3', name: 'PVC Tiles (Natural)', quantity: 1200, unit: 'units', location: 'Warehouse D3', barcode: '5003' },
];

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(INITIAL_RAW_MATERIALS);
  const [wipItems, setWipItems] = useState<WIPItem[]>(INITIAL_WIP);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>(INITIAL_FINISHED_GOODS);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);

  const logProduction = useCallback((
    action: 'consume' | 'produce' | 'scrap',
    material: string,
    quantity: number,
    unit: string
  ) => {
    const newLog: ProductionLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operatorId: 'OP001',
      action,
      material,
      quantity,
      unit,
    };

    setProductionLogs(prev => [newLog, ...prev]);

    // Update inventory based on action
    if (action === 'consume') {
      setRawMaterials(prev =>
        prev.map(rm =>
          rm.name === material ? { ...rm, quantity: Math.max(0, rm.quantity - quantity) } : rm
        )
      );
    } else if (action === 'produce') {
      setFinishedGoods(prev =>
        prev.map(fg =>
          fg.name === material ? { ...fg, quantity: fg.quantity + quantity } : fg
        )
      );
    } else if (action === 'scrap') {
      setFinishedGoods(prev =>
        prev.map(fg =>
          fg.name === material ? { ...fg, quantity: Math.max(0, fg.quantity - quantity) } : fg
        )
      );
    }
  }, []);

  const getRawMaterialByBarcode = useCallback((barcode: string) => {
    return rawMaterials.find(rm => rm.barcode === barcode);
  }, [rawMaterials]);

  const getFinishedGoodByBarcode = useCallback((barcode: string) => {
    return finishedGoods.find(fg => fg.barcode === barcode);
  }, [finishedGoods]);

  const value: InventoryContextType = {
    rawMaterials,
    wipItems,
    finishedGoods,
    productionLogs,
    logProduction,
    getRawMaterialByBarcode,
    getFinishedGoodByBarcode,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
}
