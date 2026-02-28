/**
 * Production Calculation Engine
 * Handles batch-based formulation calculations with package adjustment rules.
 */

import type { Product } from '@/hooks/useIndustrialData';

export interface FormulationItem {
  id: string;
  formulation_id: string;
  product_id: string;
  quantity_per_batch: number;
  unit: string;
}

export interface Formulation {
  id: string;
  name: string;
  final_product: string;
  machine: string;
  weight_per_batch: number;
  active: boolean;
}

export interface CalculatedItem {
  product_id: string;
  product_name: string;
  category: string;
  ideal_quantity_kg: number;
  adjusted_quantity_kg: number;
  difference_kg: number;
  package_type: string;
  package_weight: number;
  sacks_required: number | null;
  rounding_loss_kg: number;
  pcp_available_kg: number;
  has_enough_stock: boolean;
}

export interface ProductionSummary {
  formulation: Formulation;
  batches: number;
  total_compound_kg: number;
  items: CalculatedItem[];
  all_stock_sufficient: boolean;
  total_rounding_loss_kg: number;
}

/**
 * Calculate ideal quantity for a formulation item given a number of batches.
 * quantity_per_batch is stored in the formulation_items table (kg per batch).
 */
export function calculateIdealQuantity(quantityPerBatch: number, batches: number): number {
  return quantityPerBatch * batches;
}

/**
 * Apply package adjustment rules:
 * - bulk: use exact ideal quantity
 * - unit: use exact ideal quantity
 * - sealed_bag: round UP to nearest full bag
 */
export function adjustForPackaging(
  idealKg: number,
  packageType: string,
  packageWeight: number
): { adjusted: number; sacks: number | null } {
  if (packageType === 'sealed_bag' && packageWeight > 0) {
    const sacks = Math.ceil(idealKg / packageWeight);
    return { adjusted: sacks * packageWeight, sacks };
  }
  return { adjusted: idealKg, sacks: null };
}

/**
 * Full production calculation.
 * Takes a formulation, its items, number of batches, products map, and PCP stock map.
 * Returns a complete ProductionSummary.
 */
export function calculateProduction(
  formulation: Formulation,
  formulationItems: FormulationItem[],
  batches: number,
  productsMap: Map<string, Product>,
  pcpStockMap: Map<string, number> // product_id → total_kg at PCP
): ProductionSummary {
  const totalCompound = batches * formulation.weight_per_batch;

  const items: CalculatedItem[] = formulationItems.map(fi => {
    const product = productsMap.get(fi.product_id);
    const idealKg = calculateIdealQuantity(fi.quantity_per_batch, batches);
    const pkgType = product?.package_type || 'bulk';
    const pkgWeight = product?.package_weight || 0;
    const { adjusted, sacks } = adjustForPackaging(idealKg, pkgType, pkgWeight);
    const differenceKg = adjusted - idealKg;
    const roundingLoss = pkgType === 'sealed_bag' && pkgWeight > 0 ? adjusted - idealKg : 0;
    const pcpAvailable = pcpStockMap.get(fi.product_id) || 0;

    return {
      product_id: fi.product_id,
      product_name: product?.name || 'Desconhecido',
      category: product?.category || '',
      ideal_quantity_kg: idealKg,
      adjusted_quantity_kg: adjusted,
      difference_kg: differenceKg,
      package_type: pkgType,
      package_weight: pkgWeight,
      sacks_required: sacks,
      rounding_loss_kg: roundingLoss,
      pcp_available_kg: pcpAvailable,
      has_enough_stock: pcpAvailable >= adjusted,
    };
  });

  const totalRoundingLoss = items.reduce((sum, i) => sum + i.rounding_loss_kg, 0);

  return {
    formulation,
    batches,
    total_compound_kg: totalCompound,
    items,
    all_stock_sufficient: items.every(i => i.has_enough_stock),
    total_rounding_loss_kg: totalRoundingLoss,
  };
}
