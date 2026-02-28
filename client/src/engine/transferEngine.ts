/**
 * Transfer Engine v2.0
 * Pure validation and calculation for stock transfers.
 */

export interface TransferValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate transfer items before submission.
 */
export function validateTransferItems(
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit: string;
    available_kg: number;
    equivalent_kg: number;
  }>
): TransferValidation {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('Nenhum item para transferir');
  }

  items.forEach(item => {
    if (item.quantity <= 0) {
      errors.push(`${item.product_name}: quantidade deve ser positiva`);
    }
    if (item.equivalent_kg > item.available_kg) {
      errors.push(`${item.product_name}: estoque insuficiente (${item.available_kg.toFixed(1)}kg disponível, ${item.equivalent_kg.toFixed(1)}kg necessário)`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Valid transfer routes in the industrial flow.
 */
export const VALID_TRANSFER_ROUTES: Array<{ from: string; to: string; label: string }> = [
  { from: 'CD', to: 'PCP', label: 'CD → PCP' },
  { from: 'PCP', to: 'PMP', label: 'PCP → PMP (Produção)' },
  { from: 'PMP', to: 'FABRICA', label: 'PMP → Fábrica' },
];

/**
 * Check if a transfer route is valid.
 */
export function isValidRoute(from: string, to: string): boolean {
  return VALID_TRANSFER_ROUTES.some(r => r.from === from && r.to === to);
}
