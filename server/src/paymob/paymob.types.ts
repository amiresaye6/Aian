// ─── Paymob Authentication ───────────────────────────────────────────────────

export interface PaymobAuthRequest {
  api_key: string;
}

export interface PaymobAuthResponse {
  token: string;
  profile: {
    id: number;
    user: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

// ─── Paymob Order ────────────────────────────────────────────────────────────

export interface PaymobOrderRequest {
  auth_token: string;
  delivery_needed: boolean;
  amount_cents: number;
  currency: string;
  merchant_order_id: string;
  items: PaymobOrderItem[];
}

export interface PaymobOrderItem {
  name: string;
  amount_cents: number;
  description: string;
  quantity: number;
}

export interface PaymobOrderResponse {
  id: number;
  created_at: string;
  delivery_needed: boolean;
  merchant: {
    id: number;
    created_at: string;
    state: string;
    country: string;
    city: string;
  };
  collector: null;
  amount_cents: number;
  shipping_data: null;
  currency: string;
  is_payment_locked: boolean;
  merchant_order_id: string;
  wallet_notification: null;
  paid_amount_cents: number;
  items: PaymobOrderItem[];
}

// ─── Paymob Payment Key ─────────────────────────────────────────────────────

export interface PaymobBillingData {
  apartment: string;
  email: string;
  floor: string;
  first_name: string;
  street: string;
  building: string;
  phone_number: string;
  shipping_method: string;
  postal_code: string;
  city: string;
  country: string;
  last_name: string;
  state: string;
}

export interface PaymobPaymentKeyRequest {
  auth_token: string;
  amount_cents: number;
  expiration: number;
  order_id: number;
  billing_data: PaymobBillingData;
  currency: string;
  integration_id: number;
  lock_order_when_paid: boolean;
}

export interface PaymobPaymentKeyResponse {
  token: string;
}

// ─── Paymob Callback / Webhook ───────────────────────────────────────────────

export interface PaymobTransactionData {
  id: number;
  pending: boolean;
  amount_cents: number;
  success: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_voided: boolean;
  is_refunded: boolean;
  is_3d_secure: boolean;
  integration_id: number;
  has_parent_transaction: boolean;
  order: {
    id: number;
    merchant_order_id: string;
  };
  created_at: string;
  currency: string;
  error_occured: boolean;
  owner: number;
  data: {
    message: string;
    txn_response_code: string;
  };
  source_data: {
    type: string;
    pan: string;
    sub_type: string;
  };
}

export interface PaymobCallbackPayload {
  type: string;
  obj: PaymobTransactionData;
  hmac: string;
}

export interface PaymobRedirectQuery {
  id: string;
  pending: string;
  amount_cents: string;
  success: string;
  is_auth: string;
  is_capture: string;
  is_standalone_payment: string;
  is_voided: string;
  is_refunded: string;
  is_3d_secure: string;
  integration_id: string;
  has_parent_transaction: string;
  order: string;
  created_at: string;
  currency: string;
  error_occured: string;
  owner: string;
  'source_data.type': string;
  'source_data.pan': string;
  'source_data.sub_type': string;
  merchant_order_id: string;
  hmac: string;
}

// ─── Payment Result ──────────────────────────────────────────────────────────

export type PaymobPaymentStatus = 'paid' | 'failed' | 'pending';

export interface PaymobPaymentResult {
  status: PaymobPaymentStatus;
  transactionId: number;
  orderId: number;
  merchantOrderId: string;
  amountCents: number;
  currency: string;
}

// ─── Initiate Payment ────────────────────────────────────────────────────────

export interface InitiatePaymentParams {
  amountCents: number;
  currency: string;
  merchantOrderId: string;
  billingData?: Partial<PaymobBillingData>;
}

export interface InitiatePaymentResult {
  paymentUrl: string;
  orderId: number | string;
  paymentKey: string;
}
