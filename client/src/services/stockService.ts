import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side stock entry via RPC.
 * All unit conversion happens in the database.
 */
export async function stockEntryRPC(
  productId: string,
  locationCode: string,
  quantity: number,
  unit: string,
  userId: string,
  userName: string,
  notes?: string
) {
  const { data, error } = await supabase.rpc('stock_entry', {
    p_product_id: productId,
    p_location_code: locationCode,
    p_quantity: quantity,
    p_unit: unit,
    p_user_id: userId,
    p_user_name: userName,
    p_notes: notes || null,
  });

  return { data, error };
}

/**
 * Admin stock adjustment via RPC.
 */
export async function adminStockAdjustmentRPC(
  productId: string,
  locationCode: string,
  newQuantity: number,
  newTotalKg: number,
  justification: string,
  userId: string,
  userName: string
) {
  const { data, error } = await supabase.rpc('admin_stock_adjustment', {
    p_product_id: productId,
    p_location_code: locationCode,
    p_new_quantity: newQuantity,
    p_new_total_kg: newTotalKg,
    p_justification: justification,
    p_user_id: userId,
    p_user_name: userName,
  });

  return { data, error };
}
