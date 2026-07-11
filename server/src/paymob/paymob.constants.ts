// ─── Environment Variable Keys ───────────────────────────────────────────────

export const PAYMOB_ENV_KEYS = {
  API_KEY: 'PAYMOB_SECRET_KEY',
  PUBLIC_KEY: 'PAYMOB_PUBLIC_KEY',
  INTEGRATION_ID: 'PAYMOB_PAYMENT_METHODS',
  HMAC: 'PAYMOB_HMAC_SECRET',
  BASE_URL: 'PAYMOB_BASE_URL',
  RETURN_URL: 'APP_URL',
  WEBHOOK_SECRET: 'PAYMOB_WEBHOOK_SECRET',
} as const;

// ─── API Endpoints ───────────────────────────────────────────────────────────

export const PAYMOB_ENDPOINTS = {
  AUTH: '/auth/tokens',
  ORDER: '/ecommerce/orders',
  PAYMENT_KEY: '/acceptance/payment_keys',
} as const;

// ─── Defaults ────────────────────────────────────────────────────────────────

export const PAYMOB_DEFAULT_BASE_URL = 'https://accept.paymob.com/api';
export const PAYMOB_PAYMENT_KEY_EXPIRATION = 3600; // seconds
export const PAYMOB_PROVIDER_NAME = 'paymob';

// ─── HMAC Concatenation Order ────────────────────────────────────────────────
// Paymob requires these fields concatenated in this exact order for HMAC validation

export const PAYMOB_HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const;
