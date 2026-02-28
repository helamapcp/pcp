/**
 * Production Calculation Engine v2.0
 * Pure business logic — no DB calls, no UI.
 */

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
  formulation: { id: string; name: string; final_product: string; machine: string; weight_per_batch: number; active: boolean };
  batches: number;
  total_compound_kg: number;
  items: CalculatedItem[];
  all_stock_sufficient: boolean;
  total_rounding_loss_kg: number;
}

export interface ProductInfo {
  id: string;
  name: string;
  category: string;
  package_type: string;
  package_weight: number;
}

export interface FormulationItemInfo {
  product_id: string;
  quantity_per_batch: number;
}

/**
 * Calculate required units for sealed_bag products.
 * Always rounds UP using CEIL.
 */
export function calculateRequiredUnits(idealKg: number, packageWeight: number): {
  requiredUnits: number;
  equivalentKg: number;
  roundingLossKg: number;
} {
  if (packageWeight <= 0) return { requiredUnits: 0, equivalentKg: idealKg, roundingLossKg: 0 };
  const requiredUnits = Math.ceil(idealKg / packageWeight);
  const equivalentKg = requiredUnits * packageWeight;
  const roundingLossKg = equivalentKg - idealKg;
  return { requiredUnits, equivalentKg, roundingLossKg };
}

/**
 * Apply package adjustment rules.
 */
export function adjustForPackaging(
  idealKg: number,
  packageType: string,
  packageWeight: number
): { adjusted: number; sacks: number | null; roundingLoss: number } {
  if (packageType === 'sealed_bag' && packageWeight > 0) {
    const { requiredUnits, equivalentKg, roundingLossKg } = calculateRequiredUnits(idealKg, packageWeight);
    return { adjusted: equivalentKg, sacks: requiredUnits, roundingLoss: roundingLossKg };
  }
  return { adjusted: idealKg, sacks: null, roundingLoss: 0 };
}

/**
 * Full production calculation — pure function.
 */
export function calculateProduction(
  formulation: ProductionSummary['formulation'],
  formulationItems: FormulationItemInfo[],
  batches: number,
  productsMap: Map<string, ProductInfo>,
  pcpStockMap: Map<string, number>
): ProductionSummary {
  const totalCompound = batches * formulation.weight_per_batch;

  const items: CalculatedItem[] = formulationItems.map(fi => {
    const product = productsMap.get(fi.product_id);
    const idealKg = fi.quantity_per_batch * batches;
    const pkgType = product?.package_type || 'bulk';
    const pkgWeight = product?.package_weight || 0;
    const { adjusted, sacks, roundingLoss } = adjustForPackaging(idealKg, pkgType, pkgWeight);
    const pcpAvailable = pcpStockMap.get(fi.product_id) || 0;

    return {
      product_id: fi.product_id,
      product_name: product?.name || 'Desconhecido',
      category: product?.category || '',
      ideal_quantity_kg: idealKg,
      adjusted_quantity_kg: adjusted,
      difference_kg: adjusted - idealKg,
      package_type: pkgType,
      package_weight: pkgWeight,
      sacks_required: sacks,
      rounding_loss_kg: roundingLoss,
      pcp_available_kg: pcpAvailable,
      has_enough_stock: pcpAvailable >= adjusted,
    };
  });

  return {
    formulation,
    batches,
    total_compound_kg: totalCompound,
    items,
    all_stock_sufficient: items.every(i => i.has_enough_stock),
    total_rounding_loss_kg: items.reduce((sum, i) => sum + i.rounding_loss_kg, 0),
  };
}

/**
 * Validate sealed_bag override is a multiple of package_weight.
 */
export function validateSealedBagMultiple(adjustedKg: number, packageWeight: number): boolean {
  if (packageWeight <= 0) return true;
  return (adjustedKg % packageWeight) < 0.001;
}

/**
 * Convert units to kg based on product type.
 */
export function convertUnitsToKg(quantity: number, packageType: string, packageWeight: number, unitWeightKg: number): number {
  if (packageType === 'sealed_bag' && packageWeight > 0) {
    return quantity * packageWeight;
  }
  return quantity * (unitWeightKg || 1);
}

/**
 * Convert kg to units based on product type.
 */
export function convertKgToUnits(kg: number, packageType: string, packageWeight: number, unitWeightKg: number): number {
  if (packageType === 'sealed_bag' && packageWeight > 0) {
    return packageWeight > 0 ? kg / packageWeight : 0;
  }
  return unitWeightKg > 0 ? kg / unitWeightKg : 0;
}
