// =============================================================================
// HR Pro Suite — TenantService
// Core multi-tenant logic: company registration, validation, expiry checks
// =============================================================================

import { CompanyRepository } from '../repositories/CompanyRepository';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { BaseRepository } from '../repositories/BaseRepository';
import { AuthService } from './AuthService';
import {
  generateCompanyCode,
  calculateExpiryDate,
  isSubscriptionExpired,
  PLAN_PRICING,
  type PlanDuration,
} from '../subscription';
import type { Company, Subscription, TenantContext } from '../models/tenant';

export interface RegisterCompanyInput {
  companyName: string;
  taxId?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone?: string;
  planDuration: PlanDuration;
  slipUrl?: string;
  isSlipVerified?: boolean;
  transRef?: string;
}

export interface RegisterCompanyResult {
  companyCode: string;
  companyName: string;
  adminEmail: string;
  planDuration: PlanDuration;
  subscriptionEnd: string;
  paymentStatus: string;
}

export class TenantService {
  private static _instance: TenantService;
  private readonly companyRepo: CompanyRepository;
  private readonly subscriptionRepo: SubscriptionRepository;
  private readonly usersRepo: BaseRepository;
  private readonly authSvc: AuthService;

  private constructor() {
    this.companyRepo = CompanyRepository.getInstance();
    this.subscriptionRepo = SubscriptionRepository.getInstance();
    this.usersRepo = new BaseRepository('Users');
    this.authSvc = AuthService.getInstance();
  }

  static getInstance(): TenantService {
    if (!TenantService._instance) {
      TenantService._instance = new TenantService();
    }
    return TenantService._instance;
  }

  // ---------------------------------------------------------------------------
  // Company Registration
  // ---------------------------------------------------------------------------

  /** Register a new company with admin account and payment record */
  async registerCompany(input: RegisterCompanyInput): Promise<RegisterCompanyResult> {
    // Initialize sheets if they don't exist
    await this.companyRepo.initialize();
    await this.subscriptionRepo.initialize();

    // Generate unique company code (retry if taken)
    let companyCode: string;
    let attempts = 0;
    do {
      const prefix = input.companyName.slice(0, 3).replace(/[^a-zA-Z]/g, '') || 'CORP';
      companyCode = generateCompanyCode(prefix);
      attempts++;
      if (attempts > 10) {
        companyCode = generateCompanyCode('HR');
        break;
      }
    } while (await this.companyRepo.isCompanyCodeTaken(companyCode));

    const now = new Date();
    const expiryDate = calculateExpiryDate(input.planDuration, now);
    const hasSlip = !!input.slipUrl;
    const isApproved = input.isSlipVerified === true;

    // 1. Create company record
    const newCompany: Company = {
      companyCode,
      name: input.companyName,
      taxId: input.taxId || '',
      contactEmail: input.adminEmail,
      contactPhone: input.phone || '',
      status: isApproved ? 'active' : (hasSlip ? 'pending_payment' : 'active'),
      planDuration: input.planDuration,
      subscriptionStart: now.toISOString(),
      subscriptionEnd: expiryDate.toISOString(),
      createdAt: now.toISOString(),
    };
    await this.companyRepo.add(newCompany);

    // 2. Create admin user with companyCode
    const hashedPassword = this.authSvc.hashPassword(input.adminPassword);
    await this.usersRepo.add({
      companyCode,
      email: input.adminEmail,
      password: hashedPassword,
      name: input.adminName,
      role: 'admin',
      status: 'active',
      createdAt: now.toISOString(),
    } as any);

    // 3. Create payment record
    const plan = PLAN_PRICING[input.planDuration];
    const paymentRecord: Subscription = {
      companyCode,
      amount: plan?.price || 0,
      months: plan?.months || 1,
      slipUrl: input.slipUrl || '',
      paymentMethod: 'promptpay',
      status: isApproved ? 'completed' : (hasSlip ? 'pending' : 'completed'),
      createdAt: now.toISOString(),
    };
    await this.subscriptionRepo.add(paymentRecord);

    return {
      companyCode,
      companyName: input.companyName,
      adminEmail: input.adminEmail,
      planDuration: input.planDuration,
      subscriptionEnd: expiryDate.toISOString(),
      paymentStatus: paymentRecord.status!,
    };
  }

  // ---------------------------------------------------------------------------
  // Company Validation
  // ---------------------------------------------------------------------------

  /** Validate that a company exists and is active (not expired / pending) */
  async validateCompany(companyCode: string): Promise<{
    valid: boolean;
    company?: Company;
    error?: string;
    errorCode?: number;
  }> {
    const company = await this.companyRepo.getByCompanyCode(companyCode);

    if (!company) {
      return { valid: false, error: 'ไม่พบรหัสบริษัทนี้ในระบบ', errorCode: 404 };
    }

    // Check if subscription has expired
    if (company.subscriptionEnd && isSubscriptionExpired(company.subscriptionEnd)) {
      // Auto-update status to expired if still marked active
      if (company.status !== 'expired' && company.id) {
        await this.companyRepo.update(company.id, { status: 'expired' });
      }
      return {
        valid: false,
        company,
        error: 'บัญชีบริษัทนี้หมดอายุการใช้งานแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อต่ออายุแพ็กเกจ',
        errorCode: 403,
      };
    }

    if ((company.status || '').toLowerCase() === 'pending_payment') {
      return {
        valid: false,
        company,
        error: 'บัญชีบริษัทอยู่ระหว่างการตรวจสอบยอดชำระเงิน',
        errorCode: 403,
      };
    }

    if ((company.status || '').toLowerCase() === 'expired') {
      return {
        valid: false,
        company,
        error: 'บัญชีบริษัทนี้หมดอายุการใช้งานแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อต่ออายุแพ็กเกจ',
        errorCode: 403,
      };
    }

    return { valid: true, company };
  }

  // ---------------------------------------------------------------------------
  // Expiry Cron
  // ---------------------------------------------------------------------------

  /** Mark all expired companies as 'expired' — designed to be called by a cron job */
  async markExpiredCompanies(): Promise<number> {
    const expired = await this.companyRepo.getExpiredCompanies();
    let count = 0;

    for (const company of expired) {
      if (company.id) {
        await this.companyRepo.update(company.id, { status: 'expired' });
        count++;
      }
    }

    return count;
  }

  // ---------------------------------------------------------------------------
  // Subscription Renewal
  // ---------------------------------------------------------------------------

  /** Renew a company's subscription with a new plan */
  async renewSubscription(
    companyCode: string,
    planDuration: PlanDuration,
    slipUrl?: string,
  ): Promise<{ newExpiryDate: string; paymentStatus: string }> {
    const company = await this.companyRepo.getByCompanyCode(companyCode);
    if (!company || !company.id) {
      throw new Error('ไม่พบรหัสบริษัทนี้ในระบบ');
    }

    const now = new Date();
    // If the current subscription is still active, extend from the current end date
    const baseDate = company.subscriptionEnd && !isSubscriptionExpired(company.subscriptionEnd)
      ? new Date(company.subscriptionEnd)
      : now;

    const newExpiry = calculateExpiryDate(planDuration, baseDate);
    const hasSlip = !!slipUrl;

    // Update company
    await this.companyRepo.update(company.id, {
      status: hasSlip ? 'pending_payment' : 'active',
      planDuration,
      subscriptionEnd: newExpiry.toISOString(),
    });

    // Create payment record
    const plan = PLAN_PRICING[planDuration];
    await this.subscriptionRepo.add({
      companyCode,
      amount: plan.price,
      months: plan.months,
      slipUrl: slipUrl || '',
      paymentMethod: hasSlip ? 'promptpay' : 'credit_card',
      status: hasSlip ? 'pending' : 'completed',
      createdAt: now.toISOString(),
    });

    return {
      newExpiryDate: newExpiry.toISOString(),
      paymentStatus: hasSlip ? 'pending' : 'completed',
    };
  }
}
