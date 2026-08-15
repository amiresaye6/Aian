import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  
  private cachedRate: number | null = null;
  private lastFetchTime: number = 0;
  
  // Cache duration: 1 hour in milliseconds
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000;
  // Fallback exchange rate if the API fails entirely
  private readonly FALLBACK_RATE = Number(process.env.FALLBACK_EXCHANGE_RATE) || 50;

  /**
   * Fetches the latest USD to EGP exchange rate.
   * Uses an in-memory cache to avoid hitting rate limits and reduce latency.
   */
  async getUsdToEgpRate(): Promise<number> {
    const now = Date.now();

    // Return cached rate if it's still valid
    if (this.cachedRate !== null && (now - this.lastFetchTime) < this.CACHE_DURATION_MS) {
      return this.cachedRate;
    }

    try {
      this.logger.log('Fetching live USD to EGP exchange rate from exchangerate-api.com...');
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
        timeout: 5000,
      });

      const rate = response.data?.rates?.EGP;
      
      if (!rate || isNaN(Number(rate))) {
        throw new Error('Invalid or missing EGP rate in API response');
      }

      this.cachedRate = Number(rate);
      this.lastFetchTime = now;
      this.logger.log(`Successfully fetched and cached USD to EGP rate: ${this.cachedRate}`);
      
      return this.cachedRate;
    } catch (error: any) {
      this.logger.error(`Failed to fetch exchange rate: ${error.message}`);
      
      // If we have a stale cached rate, fall back to it
      if (this.cachedRate !== null) {
        this.logger.warn(`Falling back to stale cached exchange rate: ${this.cachedRate}`);
        return this.cachedRate;
      }

      // Otherwise, fall back to environment variable or hardcoded default
      this.logger.warn(`No cached rate available. Falling back to default rate: ${this.FALLBACK_RATE}`);
      return this.FALLBACK_RATE;
    }
  }
}
