/**
 * Production Planning Engine (MRP)
 * Pure business logic for production scheduling, bag rounding,
 * excess reuse, BOM explosion, projected stock, and purchase suggestions.
 */

export interface PlanningIngredient {
  product_id: string;
  product_name: string;
  quantity_per_batch: number; // kg per batch
  package_type: string;
  package_weight: number;
}

export interface BagCalculation {
  product_id: string;
  product_name: string;
  ideal_kg: number;
  bags_required: number;
  bags_kg: number;
  excess_kg: number;
  reused_excess_kg: number;
  adjusted_ideal_kg: number; // after reuse
}

export interface ProductionSimulation {
  formulation_id: string;
  formulation_name: string;
  mixer_id: string;
  mixer_name: string;
  mixer_capacity_kg: number;
  max_batches_per_day: number;
  batches: number;
  production_date: string;
  weight_per_batch: number;
  total_weight_kg: number;
  capacity_usage_percent: number;
  exceeds_capacity: boolean;
  ingredients: BagCalculation[];
  stock_shortages: PurchaseSuggestion[];
  total_excess_kg: number;
}

export interface PurchaseSuggestion {
  product_id: string;
  product_name: string;
  required_kg: number;
  available_kg: number;
  suggested_purchase_kg: number;
}

export interface ProjectedStock {
  product_id: string;
  product_name: string;
  current_kg: number;
  incoming_kg: number;
  planned_consumption_kg: number;
  projected_kg: number;
}

export interface BOMItem {
  product_id: string;
  product_name: string;
  total_kg: number;
  level: number;
  is_raw: boolean;
}

// ── Bag Calculation ──

export function calculateBags(
  idealKg: number,
  packageType: string,
  packageWeight: number
): { bags: number; totalKg: number; excessKg: number } {
  if (packageType !== 'sealed_bag' || packageWeight <= 0) {
    return { bags: 0, totalKg: idealKg, excessKg: 0 };
  }
  const bags = Math.ceil(idealKg / packageWeight);
  const totalKg = bags * packageWeight;
  const excessKg = totalKg - idealKg;
  return { bags, totalKg, excessKg };
}

// ── Excess Reuse ──

export function applyExcessReuse(
  ingredients: Array<{
    product_id: string;
    product_name: string;
    ideal_kg: number;
    package_type: string;
    package_weight: number;
  }>,
  availableExcess: Map<string, number> // product_id -> excess_kg from previous mixers
): BagCalculation[] {
  return ingredients.map(ing => {
    const excess = availableExcess.get(ing.product_id) || 0;
    const adjustedIdeal = Math.max(0, ing.ideal_kg - excess);
    const reused = ing.ideal_kg - adjustedIdeal;

    const { bags, totalKg, excessKg } = calculateBags(
      adjustedIdeal,
      ing.package_type,
      ing.package_weight
    );

    return {
      product_id: ing.product_id,
      product_name: ing.product_name,
      ideal_kg: ing.ideal_kg,
      bags_required: bags,
      bags_kg: totalKg,
      excess_kg: excessKg,
      reused_excess_kg: reused,
      adjusted_ideal_kg: adjustedIdeal,
    };
  });
}

// ── Production Simulation ──

export function simulateProduction(
  formulation: {
    id: string;
    name: string;
    weight_per_batch: number;
    items: PlanningIngredient[];
  },
  mixer: {
    id: string;
    name: string;
    capacity_kg: number;
    max_batches_per_day: number;
  },
  batches: number,
  productionDate: string,
  stockMap: Map<string, number>, // product_id -> available_kg at location
  excessMap: Map<string, number> // product_id -> available excess from same day
): ProductionSimulation {
  const totalWeight = batches * formulation.weight_per_batch;
  const capacityUsage = mixer.max_batches_per_day > 0
    ? (batches / mixer.max_batches_per_day) * 100
    : 0;

  const rawIngredients = formulation.items.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name,
    ideal_kg: item.quantity_per_batch * batches,
    package_type: item.package_type,
    package_weight: item.package_weight,
  }));

  const ingredients = applyExcessReuse(rawIngredients, excessMap);

  const stockShortages: PurchaseSuggestion[] = [];
  for (const ing of ingredients) {
    const available = stockMap.get(ing.product_id) || 0;
    const required = ing.bags_required > 0 ? ing.bags_kg : ing.ideal_kg;
    if (required > available) {
      stockShortages.push({
        product_id: ing.product_id,
        product_name: ing.product_name,
        required_kg: required,
        available_kg: available,
        suggested_purchase_kg: required - available,
      });
    }
  }

  return {
    formulation_id: formulation.id,
    formulation_name: formulation.name,
    mixer_id: mixer.id,
    mixer_name: mixer.name,
    mixer_capacity_kg: mixer.capacity_kg,
    max_batches_per_day: mixer.max_batches_per_day,
    batches,
    production_date: productionDate,
    weight_per_batch: formulation.weight_per_batch,
    total_weight_kg: totalWeight,
    capacity_usage_percent: capacityUsage,
    exceeds_capacity: batches > mixer.max_batches_per_day,
    ingredients,
    stock_shortages: stockShortages,
    total_excess_kg: ingredients.reduce((sum, i) => sum + i.excess_kg, 0),
  };
}

// ── Projected Stock ──

export function calculateProjectedStock(
  products: Array<{ id: string; name: string }>,
  currentStock: Map<string, number>,
  incomingTransfers: Map<string, number>,
  plannedConsumption: Map<string, number>
): ProjectedStock[] {
  return products.map(p => {
    const current = currentStock.get(p.id) || 0;
    const incoming = incomingTransfers.get(p.id) || 0;
    const consumption = plannedConsumption.get(p.id) || 0;
    return {
      product_id: p.id,
      product_name: p.name,
      current_kg: current,
      incoming_kg: incoming,
      planned_consumption_kg: consumption,
      projected_kg: current + incoming - consumption,
    };
  }).filter(p => p.current_kg > 0 || p.incoming_kg > 0 || p.planned_consumption_kg > 0);
}

// ── BOM Explosion (recursive) ──

export function explodeBOM(
  formulationId: string,
  batches: number,
  formulationsMap: Map<string, {
    name: string;
    weight_per_batch: number;
    items: Array<{ product_id: string; quantity_per_batch: number }>;
    parent_formulation_id?: string | null;
  }>,
  productsMap: Map<string, { name: string; is_formulation: boolean; formulation_id?: string }>,
  level: number = 0,
  visited: Set<string> = new Set()
): BOMItem[] {
  if (visited.has(formulationId)) return []; // prevent cycles
  visited.add(formulationId);

  const formulation = formulationsMap.get(formulationId);
  if (!formulation) return [];

  const results: BOMItem[] = [];

  for (const item of formulation.items) {
    const totalKg = item.quantity_per_batch * batches;
    const product = productsMap.get(item.product_id);

    if (product?.is_formulation && product.formulation_id) {
      // This product has its own formulation — explode recursively
      const subBatches = totalKg / (formulationsMap.get(product.formulation_id)?.weight_per_batch || 1);
      const subItems = explodeBOM(product.formulation_id, subBatches, formulationsMap, productsMap, level + 1, visited);
      results.push(...subItems);
    } else {
      results.push({
        product_id: item.product_id,
        product_name: product?.name || 'Desconhecido',
        total_kg: totalKg,
        level,
        is_raw: true,
      });
    }
  }

  return results;
}

// ── Weekly Simulation ──

export interface WeeklyPlan {
  date: string;
  schedules: ProductionSimulation[];
  total_batches: number;
  total_weight_kg: number;
  total_raw_materials: Map<string, number>; // product_id -> total_kg
  purchase_requirements: PurchaseSuggestion[];
}

export function simulateWeek(
  dailyPlans: Array<{
    date: string;
    formulation: {
      id: string;
      name: string;
      weight_per_batch: number;
      items: PlanningIngredient[];
    };
    mixer: {
      id: string;
      name: string;
      capacity_kg: number;
      max_batches_per_day: number;
    };
    batches: number;
  }>,
  stockMap: Map<string, number>
): WeeklyPlan[] {
  const dailyExcess = new Map<string, Map<string, number>>(); // date -> product_id -> excess
  const cumulativeConsumption = new Map<string, number>();
  const results: WeeklyPlan[] = [];

  // Group by date
  const byDate = new Map<string, typeof dailyPlans>();
  for (const plan of dailyPlans) {
    const list = byDate.get(plan.date) || [];
    list.push(plan);
    byDate.set(plan.date, list);
  }

  const sortedDates = Array.from(byDate.keys()).sort();

  for (const date of sortedDates) {
    const plans = byDate.get(date) || [];
    const dayExcess = dailyExcess.get(date) || new Map<string, number>();
    const schedules: ProductionSimulation[] = [];

    // Calculate remaining stock after previous days consumption
    const adjustedStock = new Map(stockMap);
    for (const [pid, consumed] of cumulativeConsumption) {
      adjustedStock.set(pid, (adjustedStock.get(pid) || 0) - consumed);
    }

    for (const plan of plans) {
      const sim = simulateProduction(
        plan.formulation,
        plan.mixer,
        plan.batches,
        date,
        adjustedStock,
        dayExcess
      );
      schedules.push(sim);

      // Accumulate excess for same-day reuse by next mixer
      for (const ing of sim.ingredients) {
        if (ing.excess_kg > 0) {
          dayExcess.set(ing.product_id, (dayExcess.get(ing.product_id) || 0) + ing.excess_kg);
        }
        // Track consumption
        const consumed = ing.bags_required > 0 ? ing.bags_kg : ing.ideal_kg;
        cumulativeConsumption.set(
          ing.product_id,
          (cumulativeConsumption.get(ing.product_id) || 0) + consumed
        );
      }
    }

    const totalRaw = new Map<string, number>();
    const allShortages: PurchaseSuggestion[] = [];

    for (const sim of schedules) {
      for (const ing of sim.ingredients) {
        const qty = ing.bags_required > 0 ? ing.bags_kg : ing.ideal_kg;
        totalRaw.set(ing.product_id, (totalRaw.get(ing.product_id) || 0) + qty);
      }
      allShortages.push(...sim.stock_shortages);
    }

    // Deduplicate shortages
    const uniqueShortages = new Map<string, PurchaseSuggestion>();
    for (const s of allShortages) {
      const existing = uniqueShortages.get(s.product_id);
      if (existing) {
        existing.required_kg += s.required_kg;
        existing.suggested_purchase_kg = Math.max(0, existing.required_kg - existing.available_kg);
      } else {
        uniqueShortages.set(s.product_id, { ...s });
      }
    }

    results.push({
      date,
      schedules,
      total_batches: schedules.reduce((s, sim) => s + sim.batches, 0),
      total_weight_kg: schedules.reduce((s, sim) => s + sim.total_weight_kg, 0),
      total_raw_materials: totalRaw,
      purchase_requirements: Array.from(uniqueShortages.values()).filter(s => s.suggested_purchase_kg > 0),
    });

    dailyExcess.set(date, dayExcess);
  }

  return results;
}
