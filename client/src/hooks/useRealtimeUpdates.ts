import { useEffect, useRef } from 'react';
import { useInventory } from '@/contexts/InventoryContext';

/**
 * Hook para simular atualizações em tempo real do inventário.
 * Simula mudanças de estoque e produção em intervalos aleatórios.
 */
export function useRealtimeUpdates() {
  const { logProduction, rawMaterials, finishedGoods } = useInventory();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Simular atualizações em tempo real a cada 5-15 segundos
    const startRealtimeSimulation = () => {
      intervalRef.current = setInterval(() => {
        const actions: Array<'consume' | 'produce' | 'scrap'> = ['consume', 'produce', 'scrap'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        if (randomAction === 'consume' && rawMaterials.length > 0) {
          const randomMaterial = rawMaterials[Math.floor(Math.random() * rawMaterials.length)];
          const quantity = Math.floor(Math.random() * 50) + 10;
          logProduction('consume', randomMaterial.name, quantity, randomMaterial.unit);
        } else if (randomAction === 'produce' && finishedGoods.length > 0) {
          const randomProduct = finishedGoods[Math.floor(Math.random() * finishedGoods.length)];
          const quantity = Math.floor(Math.random() * 100) + 50;
          logProduction('produce', randomProduct.name, quantity, randomProduct.unit);
        } else if (randomAction === 'scrap' && finishedGoods.length > 0) {
          const randomProduct = finishedGoods[Math.floor(Math.random() * finishedGoods.length)];
          const quantity = Math.floor(Math.random() * 20) + 5;
          logProduction('scrap', randomProduct.name, quantity, randomProduct.unit);
        }
      }, Math.random() * 10000 + 5000); // 5-15 segundos
    };

    startRealtimeSimulation();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [logProduction, rawMaterials, finishedGoods]);
}
