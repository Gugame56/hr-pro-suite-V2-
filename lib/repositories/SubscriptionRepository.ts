// =============================================================================
// HR Pro Suite — SubscriptionRepository
// Extends BaseRepository for the Subscriptions/Payments sheet
// =============================================================================

import { BaseRepository } from './BaseRepository';
import type { Subscription } from '../models/tenant';

const SUBSCRIPTIONS_HEADERS = [
  'id', 'companyCode', 'amount', 'months', 'slipUrl',
  'paymentMethod', 'status', 'createdAt',
];

export class SubscriptionRepository extends BaseRepository<Subscription> {
  private static _instance: SubscriptionRepository;

  constructor() {
    super('Subscriptions');
  }

  static getInstance(): SubscriptionRepository {
    if (!SubscriptionRepository._instance) {
      SubscriptionRepository._instance = new SubscriptionRepository();
    }
    return SubscriptionRepository._instance;
  }

  /** Ensure the Subscriptions sheet exists with correct headers */
  async initialize(): Promise<void> {
    await this.ensureHeaders(SUBSCRIPTIONS_HEADERS);
  }

  /** Get all payment records for a company */
  async getByCompanyCode(companyCode: string): Promise<Subscription[]> {
    return this.getByField('companyCode', companyCode);
  }

  /** Get pending payments awaiting verification */
  async getPendingPayments(): Promise<Subscription[]> {
    const all = await this.getAll();
    return all.filter((s) => (s.status || '').toLowerCase() === 'pending');
  }
}
