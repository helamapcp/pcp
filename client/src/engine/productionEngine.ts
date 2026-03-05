/**
 * Production Calculation Engine v3.0
 * Pure business logic — no DB calls, no UI.
 * Now includes sack-based calculation with PMP excess reuse.
 */

export interface Formulation {
  id: string;
  name: string;
  final_product: string;
  machine: string | null;
  weight_per_batch: number;
  active: boolean;
}

export interface FormulationItem {
  id: string;
  formulation_id: string;
  product_id: string;
  quantity_per_batch: number;
  unit: string;
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
  /** PMP excess available before this production */
  pmp_excess_available_kg: number;
  /** Amount of PMP excess consumed by this production */
  pmp_excess_used_kg: number;
  /** Net kg needed after subtracting PMP excess */
  net_required_kg: number;
  /** Total kg from sacks (for the net requirement only) */
  sacks_total_kg: number;
  /** New excess generated from this production's rounding */
  new_excess_kg: number;
}

export interface ProductionSummary {
  formulation: Formulation;
  batches: number;
  total_compound_kg: number;
  items: CalculatedItem[];
  all_stock_sufficient: boolean;
  total_rounding_loss_kg: number;
  total_new_excess_kg: number;
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
 * Calculate required sacks for a given kg requirement.
 * Always rounds UP using CEIL — partial sacks cannot be taken.
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
 * Apply package adjustment rules (legacy compat).
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
 * Full production calculation with sack conversion and PMP excess reuse — pure function.
 *
 * @param pmpExcessMap - Map<product_id, available_excess_kg> from material_excess table
 */
export function calculateProduction(
  formulation: ProductionSummary['formulation'],
  formulationItems: FormulationItemInfo[],
  batches: number,
  productsMap: Map<string, ProductInfo>,
  pcpStockMap: Map<string, number>,
  pmpExcessMap?: Map<string, number>
): ProductionSummary {
  const totalCompound = batches * formulation.weight_per_batch;
  const excessMap = pmpExcessMap || new Map<string, number>();

  const items: CalculatedItem[] = formulationItems.map(fi => {
    const product = productsMap.get(fi.product_id);
    const idealKg = fi.quantity_per_batch * batches;
    const pkgType = product?.package_type || 'bulk';
    const pkgWeight = product?.package_weight || 0;
    const pcpAvailable = pcpStockMap.get(fi.product_id) || 0;
    const pmpExcessAvailable = excessMap.get(fi.product_id) || 0;

    // Step 1: Subtract available PMP excess from requirement
    const excessUsed = Math.min(pmpExcessAvailable, idealKg);
    const netRequired = idealKg - excessUsed;

    // Step 2: Calculate sacks for the net requirement
    let sacksRequired: number | null = null;
    let sacksTotal = netRequired;
    let roundingLoss = 0;
    let newExcess = 0;

    if (pkgType === 'sealed_bag' && pkgWeight > 0 && netRequired > 0) {
      const sacks = Math.ceil(netRequired / pkgWeight);
      sacksRequired = sacks;
      sacksTotal = sacks * pkgWeight;
      roundingLoss = sacksTotal - netRequired;
      // New excess = rounding surplus (material from opened sack not consumed)
      newExcess = roundingLoss;
    } else if (netRequired <= 0) {
      // Fully covered by excess
      sacksRequired = 0;
      sacksTotal = 0;
      roundingLoss = 0;
      newExcess = 0;
    }

    // adjusted_quantity_kg = what actually gets consumed from PCP (sacks)
    const adjustedKg = sacksTotal;
    // Total consumption = excess used + sacks total
    const totalConsumed = excessUsed + sacksTotal;
    const differenceKg = totalConsumed - idealKg;

    return {
      product_id: fi.product_id,
      product_name: product?.name || 'Desconhecido',
      category: product?.category || '',
      ideal_quantity_kg: idealKg,
      adjusted_quantity_kg: adjustedKg,
      difference_kg: differenceKg,
      package_type: pkgType,
      package_weight: pkgWeight,
      sacks_required: sacksRequired,
      rounding_loss_kg: roundingLoss,
      pcp_available_kg: pcpAvailable,
      has_enough_stock: pcpAvailable >= adjustedKg,
      pmp_excess_available_kg: pmpExcessAvailable,
      pmp_excess_used_kg: excessUsed,
      net_required_kg: netRequired,
      sacks_total_kg: sacksTotal,
      new_excess_kg: newExcess,
    };
  });

  return {
    formulation,
    batches,
    total_compound_kg: totalCompound,
    items,
    all_stock_sufficient: items.every(i => i.has_enough_stock),
    total_rounding_loss_kg: items.reduce((sum, i) => sum + i.rounding_loss_kg, 0),
    total_new_excess_kg: items.reduce((sum, i) => sum + i.new_excess_kg, 0),
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
