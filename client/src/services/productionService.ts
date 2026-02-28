import { supabase } from '@/integrations/supabase/client';

/**
 * Confirm production via server-side RPC.
 * All stock deduction, batch creation, and traceability handled in DB.
 */
export async function confirmProductionRPC(
  formulationId: string,
  finalProduct: string,
  machine: string,
  batches: number,
  weightPerBatch: number,
  totalCompoundKg: number,
  userId: string,
  userName: string,
  items: Array<{
    product_id: string;
    ideal_quantity_kg: number;
    adjusted_quantity_kg: number;
    difference_kg: number;
    package_type: string;
    package_weight: number;
    justification?: string | null;
  }>,
  notes?: string
) {
  const { data, error } = await supabase.rpc('confirm_production', {
    p_formulation_id: formulationId,
    p_final_product: finalProduct,
    p_machine: machine,
    p_batches: batches,
    p_weight_per_batch: weightPerBatch,
    p_total_compound_kg: totalCompoundKg,
    p_user_id: userId,
    p_user_name: userName,
    p_items: JSON.stringify(items),
    p_notes: notes || null,
  });

  return { data, error };
}
