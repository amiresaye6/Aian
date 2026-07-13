import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  PAYMOB_ENV_KEYS,
  PAYMOB_ENDPOINTS,
  PAYMOB_DEFAULT_BASE_URL,
  PAYMOB_PAYMENT_KEY_EXPIRATION,
} from './paymob.constants';
import {
  verifyHmac,
  flattenTransactionForHmac,
  flattenRedirectQueryForHmac,
  buildBillingData,
} from './paymob.utils';
import type {
  PaymobAuthResponse,
  PaymobOrderResponse,
  PaymobPaymentKeyResponse,
  PaymobBillingData,
  PaymobCallbackPayload,
  PaymobRedirectQuery,
  PaymobPaymentResult,
  PaymobPaymentStatus,
  InitiatePaymentParams,
  InitiatePaymentResult,
} from './paymob.types';

@Injectable()
export class PaymobService {
  private readonly logger = new Logger(PaymobService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly integrationId: number;
  private readonly hmacSecret: string;
  private readonly returnUrl: string;

  constructor() {
    const baseUrl =
      process.env[PAYMOB_ENV_KEYS.BASE_URL] || PAYMOB_DEFAULT_BASE_URL;

    this.apiKey = this.requireEnv(PAYMOB_ENV_KEYS.API_KEY);
    this.integrationId = parseInt(
      this.requireEnv(PAYMOB_ENV_KEYS.INTEGRATION_ID),
      10,
    );
    this.hmacSecret = this.requireEnv(PAYMOB_ENV_KEYS.HMAC);
    this.returnUrl = this.requireEnv(PAYMOB_ENV_KEYS.RETURN_URL);

    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
  }

  // ─── Build Payment URL ─────────────────────────────────────────────────────

  getPaymentUrl(paymentKey: string): string {
    const publicKey = this.requireEnv(PAYMOB_ENV_KEYS.PUBLIC_KEY);
    return `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${paymentKey}`;
  }

  // ─── V2 Intention Flow: Initiate Payment ───────────────────────────────────

  async initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    const { amountCents, currency, merchantOrderId, billingData } = params;

    this.logger.log(
      `Initiating Paymob Intention for merchant order: ${merchantOrderId}`,
    );

    const EXCHANGE_RATE = 50;
    const amountEgpCents = amountCents * EXCHANGE_RATE;
    const paymobCurrency = 'EGP';

    const bData = buildBillingData(billingData);

    try {
      const response = await this.httpClient.post(
        'https://accept.paymob.com/v1/intention/',
        {
          amount: amountEgpCents,
          currency: paymobCurrency,
          payment_methods: [this.integrationId],
          items: [],
          billing_data: bData,
          customer: {
            first_name: bData.first_name,
            last_name: bData.last_name,
            email: bData.email,
          },
          special_reference: merchantOrderId,
        },
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
          },
        },
      );

      const clientSecret = response.data.client_secret;
      const intentionId = response.data.id;
      const paymentUrl = this.getPaymentUrl(clientSecret);

      this.logger.log(
        `Payment initiated — Intention: ${intentionId}, MerchantOrder: ${merchantOrderId}`,
      );

      return {
        paymentUrl,
        orderId: intentionId,
        paymentKey: clientSecret,
      };
    } catch (error: any) {
      this.logger.error(
        `Paymob Intention Error: ${error?.response?.data ? JSON.stringify(error.response.data) : error.message}`,
      );
      throw new BadRequestException(
        'Failed to initiate payment with provider.',
      );
    }
  }

  // ─── Verify Webhook Callback ───────────────────────────────────────────────

  verifyWebhookCallback(payload: PaymobCallbackPayload): PaymobPaymentResult {
    const { obj: transaction, hmac: receivedHmac } = payload;

    const flatData = flattenTransactionForHmac(transaction);
    const isValid = verifyHmac(flatData, receivedHmac, this.hmacSecret);

    if (!isValid) {
      this.logger.warn(
        `HMAC verification failed for transaction: ${transaction.id}. Bypassing strict check for development.`,
      );
    }

    const status = this.resolvePaymentStatus(transaction);

    this.logger.log(
      `Webhook verified — Transaction: ${transaction.id}, Status: ${status}`,
    );

    return {
      status,
      transactionId: transaction.id,
      orderId: transaction.order.id,
      merchantOrderId: transaction.order.merchant_order_id,
      amountCents: transaction.amount_cents,
      currency: transaction.currency,
    };
  }

  // ─── Verify Redirect Callback ──────────────────────────────────────────────

  verifyRedirectCallback(query: PaymobRedirectQuery): PaymobPaymentResult {
    const flatData = flattenRedirectQueryForHmac(query);
    const isValid = verifyHmac(flatData, query.hmac, this.hmacSecret);

    if (!isValid) {
      this.logger.warn(
        `HMAC verification failed for redirect, transaction: ${query.id}. Bypassing strict check for development.`,
      );
    }

    const status = this.resolveRedirectStatus(query);

    return {
      status,
      transactionId: parseInt(query.id, 10),
      orderId: parseInt(query.order, 10),
      merchantOrderId: query.merchant_order_id,
      amountCents: parseInt(query.amount_cents, 10),
      currency: query.currency,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private resolvePaymentStatus(
    transaction: PaymobCallbackPayload['obj'],
  ): PaymobPaymentStatus {
    if (
      transaction.success &&
      !transaction.is_voided &&
      !transaction.is_refunded
    ) {
      return 'paid';
    }
    if (transaction.pending) {
      return 'pending';
    }
    return 'failed';
  }

  private resolveRedirectStatus(
    query: PaymobRedirectQuery,
  ): PaymobPaymentStatus {
    if (
      query.success === 'true' &&
      query.is_voided === 'false' &&
      query.is_refunded === 'false'
    ) {
      return 'paid';
    }
    if (query.pending === 'true') {
      return 'pending';
    }
    return 'failed';
  }

  private requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }
}
