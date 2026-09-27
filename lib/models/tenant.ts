// =============================================================================
// HR Pro Suite — Multi-Tenant Domain Models
// TypeScript interfaces for Companies, Subscriptions, and TenantContext
// =============================================================================

import type { PlanDuration } from '../subscription';

/** Company / Tenant record */
export interface Company {
  id?: string;
  companyCode?: string;
  name?: string;
  taxId?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: 'active' | 'expired' | 'pending_payment' | string;
  planDuration?: PlanDuration | string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  createdAt?: string;
  _row?: number;
  [key: string]: any;
}

/** Subscription / Payment record */
export interface Subscription {
  id?: string;
  companyCode?: string;
  amount?: number | string;
  months?: number | string;
  slipUrl?: string;
  paymentMethod?: 'promptpay' | 'bank_transfer' | 'credit_card' | string;
  status?: 'pending' | 'completed' | 'rejected' | string;
  createdAt?: string;
  _row?: number;
  [key: string]: any;
}

/** Tenant context extracted from a request */
export interface TenantContext {
  companyCode: string;
  userId: string;
  role: string;
}
