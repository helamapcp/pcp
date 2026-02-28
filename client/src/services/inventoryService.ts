import { supabase } from '@/integrations/supabase/client';

/**
 * Confirm inventory count via server-side RPC.
 * The RPC fetches real stock values from DB (never trusts frontend).
 */
export async function confirmInventoryCountRPC(
  countId: string,
  items: Array<{
    id: string;
    product_id: string;
    counted_quantity: number;
    counted_total_kg: number;
    justification: string | null;
  }>,
  userId: string,
  userName: string
) {
  const { data, error } = await supabase.rpc('confirm_inventory_count', {
    p_count_id: countId,
    p_user_id: userId,
    p_user_name: userName,
    p_items: JSON.stringify(items),
  });

  return { data, error };
}
