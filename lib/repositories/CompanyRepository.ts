// =============================================================================
// HR Pro Suite — CompanyRepository
// Extends BaseRepository for the Companies sheet with tenant-specific queries
// =============================================================================

import { BaseRepository } from './BaseRepository';
import type { Company } from '../models/tenant';

const COMPANIES_HEADERS = [
  'id', 'companyCode', 'name', 'taxId', 'contactEmail', 'contactPhone',
  'status', 'planDuration', 'subscriptionStart', 'subscriptionEnd', 'createdAt',
];

export class CompanyRepository extends BaseRepository<Company> {
  private static _instance: CompanyRepository;

  constructor() {
    super('Companies');
  }

  static getInstance(): CompanyRepository {
    if (!CompanyRepository._instance) {
      CompanyRepository._instance = new CompanyRepository();
    }
    return CompanyRepository._instance;
  }

  /** Ensure the Companies sheet exists with correct headers */
  async initialize(): Promise<void> {
    await this.ensureHeaders(COMPANIES_HEADERS);
  }

  /** Find a company by its unique company code */
  async getByCompanyCode(companyCode: string): Promise<Company | undefined> {
    const companies = await this.getAll();
    return companies.find(
      (c) => (c.companyCode || '').toUpperCase() === companyCode.toUpperCase(),
    );
  }

  /** Check if a company code already exists */
  async isCompanyCodeTaken(companyCode: string): Promise<boolean> {
    const company = await this.getByCompanyCode(companyCode);
    return !!company;
  }

  /** Get all expired companies that are still marked active */
  async getExpiredCompanies(): Promise<Company[]> {
    const companies = await this.getAll();
    const now = new Date();
    return companies.filter((c) => {
      if (c.status === 'expired') return false;
      if (!c.subscriptionEnd) return false;
      return new Date(c.subscriptionEnd) < now;
    });
  }
}
