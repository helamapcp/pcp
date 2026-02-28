import { supabase } from '@/integrations/supabase/client';

/**
 * Create a transfer request (pending status).
 * Stock is NOT deducted until confirmation.
 */
export async function createTransferRequest(
  fromLocation: string,
  toLocation: string,
  items: Array<{
    product_id: string;
    requested_quantity: number;
    requested_unit: string;
  }>,
  userId: string,
  userName: string,
  notes?: string
) {
  const { data: transfer, error: transferError } = await supabase
    .from('transfers')
    .insert({
      from_location: fromLocation,
      to_location: toLocation,
      status: 'pending',
      requested_by: userId,
      requested_by_name: userName,
      notes,
    })
    .select()
    .single();

  if (transferError || !transfer) return { error: transferError, data: null };

  const transferItems = items.map(item => ({
    transfer_id: transfer.id,
    product_id: item.product_id,
    requested_quantity: item.requested_quantity,
    requested_unit: item.requested_unit,
    sent_quantity: item.requested_quantity,
    sent_unit: item.requested_unit,
    sent_total_kg: 0,
    status: 'pending',
  }));

  const { error: itemsError } = await supabase
    .from('transfer_items')
    .insert(transferItems);

  if (itemsError) return { error: itemsError, data: null };
  return { data: transfer, error: null };
}

/**
 * Confirm a transfer via server-side RPC.
 * All unit conversion, stock validation, and deduction happens in the DB.
 */
export async function confirmTransferRPC(
  transferId: string,
  confirmedItems: Array<{
    id: string;
    sent_quantity: number;
    sent_unit: string;
  }>,
  userId: string,
  userName: string
) {
  const { data, error } = await supabase.rpc('confirm_transfer', {
    p_transfer_id: transferId,
    p_confirmed_items: JSON.stringify(confirmedItems),
    p_user_id: userId,
    p_user_name: userName,
  });

  return { data, error };
}

/**
 * Fetch transfer items for a given transfer.
 */
export async function getTransferItems(transferId: string) {
  const { data, error } = await supabase
    .from('transfer_items')
    .select('*')
    .eq('transfer_id', transferId);
  return { data, error };
}
