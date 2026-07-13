import * as crypto from 'crypto';
import { PAYMOB_HMAC_FIELDS } from './paymob.constants';
import type {
  PaymobBillingData,
  PaymobRedirectQuery,
  PaymobTransactionData,
} from './paymob.types';

export function verifyHmac(
  data: Record<string, string | number | boolean>,
  receivedHmac: string,
  hmacSecret: string,
): boolean {
  const concatenated = PAYMOB_HMAC_FIELDS.map((field) => {
    const value = data[field];
    return value !== undefined ? String(value) : '';
  }).join('');

  const computedHmac = crypto
    .createHmac('sha512', hmacSecret)
    .update(concatenated)
    .digest('hex');

  return computedHmac === receivedHmac;
}

export function flattenTransactionForHmac(
  transaction: PaymobTransactionData,
): Record<string, string | number | boolean> {
  return {
    amount_cents: transaction.amount_cents,
    created_at: transaction.created_at,
    currency: transaction.currency,
    error_occured: transaction.error_occured,
    has_parent_transaction: transaction.has_parent_transaction,
    id: transaction.id,
    integration_id: transaction.integration_id,
    is_3d_secure: transaction.is_3d_secure,
    is_auth: transaction.is_auth,
    is_capture: transaction.is_capture,
    is_refunded: transaction.is_refunded,
    is_standalone_payment: transaction.is_standalone_payment,
    is_voided: transaction.is_voided,
    order: transaction.order.id,
    owner: transaction.owner,
    pending: transaction.pending,
    'source_data.pan': transaction.source_data.pan,
    'source_data.sub_type': transaction.source_data.sub_type,
    'source_data.type': transaction.source_data.type,
    success: transaction.success,
  };
}

export function flattenRedirectQueryForHmac(
  query: PaymobRedirectQuery,
): Record<string, string | number | boolean> {
  return {
    amount_cents: query.amount_cents,
    created_at: query.created_at,
    currency: query.currency,
    error_occured: query.error_occured,
    has_parent_transaction: query.has_parent_transaction,
    id: query.id,
    integration_id: query.integration_id,
    is_3d_secure: query.is_3d_secure,
    is_auth: query.is_auth,
    is_capture: query.is_capture,
    is_refunded: query.is_refunded,
    is_standalone_payment: query.is_standalone_payment,
    is_voided: query.is_voided,
    order: query.order,
    owner: query.owner,
    pending: query.pending,
    'source_data.pan': query['source_data.pan'],
    'source_data.sub_type': query['source_data.sub_type'],
    'source_data.type': query['source_data.type'],
    success: query.success,
  };
}

export function buildBillingData(
  overrides?: Partial<PaymobBillingData>,
): PaymobBillingData {
  return {
    apartment: 'NA',
    email: 'customer@aian.com',
    floor: 'NA',
    first_name: 'AIAN',
    street: 'NA',
    building: 'NA',
    phone_number: '+201000000000',
    shipping_method: 'NA',
    postal_code: 'NA',
    city: 'NA',
    country: 'NA',
    last_name: 'Customer',
    state: 'NA',
    ...overrides,
  };
}
