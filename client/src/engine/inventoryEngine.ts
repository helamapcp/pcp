/**
 * Inventory Engine v2.0
 * Pure calculation logic for inventory counts.
 */

export interface CountRowCalc {
  product_id: string;
  system_total_kg: number;
  counted_total_kg: number;
  difference_kg: number;
  needs_justification: boolean;
}

/**
 * Calculate difference between counted and system values.
 */
export function calculateDifference(countedKg: number, systemKg: number): number {
  return countedKg - systemKg;
}

/**
 * Determine if justification is required based on difference threshold.
 */
export function requiresJustification(differenceKg: number, threshold: number = 0.001): boolean {
  return Math.abs(differenceKg) > threshold;
}

/**
 * Validate all count rows before submission.
 */
export function validateCountRows(rows: CountRowCalc[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  rows.forEach((row, idx) => {
    if (isNaN(row.counted_total_kg)) {
      errors.push(`Item ${idx + 1}: contagem inválida`);
    }
    if (row.counted_total_kg < 0) {
      errors.push(`Item ${idx + 1}: contagem negativa não permitida`);
    }
    if (row.needs_justification) {
      errors.push(`Item ${idx + 1}: justificativa obrigatória`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate divergence percentage.
 */
export function calculateDivergencePercent(differenceKg: number, systemKg: number): number {
  if (systemKg === 0) return differenceKg === 0 ? 0 : 100;
  return (differenceKg / systemKg) * 100;
}
