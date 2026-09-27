// =============================================================================
// HR Pro Suite — CompanyController
// Handles company registration, validation, renewal API endpoints
// =============================================================================

import { NextResponse } from 'next/server';
import { TenantService, type RegisterCompanyInput } from '../services/TenantService';
import { PLAN_PRICING, type PlanDuration } from '../subscription';

export class CompanyController {
  private static _instance: CompanyController;
  private readonly tenantSvc: TenantService;

  constructor() {
    this.tenantSvc = TenantService.getInstance();
    this.handleRegister = this.handleRegister.bind(this);
    this.handleValidate = this.handleValidate.bind(this);
    this.handleRenew = this.handleRenew.bind(this);
    this.handleCheckExpiry = this.handleCheckExpiry.bind(this);
  }

  static getInstance(): CompanyController {
    if (!CompanyController._instance) {
      CompanyController._instance = new CompanyController();
    }
    return CompanyController._instance;
  }

  /** POST /api/auth/register-company — Register new company + admin */
  async handleRegister(request: Request): Promise<NextResponse> {
    try {
      const body = await request.json();
      const {
        companyName,
        taxId,
        adminName,
        adminEmail,
        adminPassword,
        phone,
        planDuration,
        slipUrl,
      } = body;

      // Validation
      if (!companyName || !adminEmail || !adminPassword || !planDuration) {
        return NextResponse.json(
          { error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (ชื่อบริษัท, อีเมล, รหัสผ่าน, ระยะเวลาแพ็กเกจ)' },
          { status: 400 },
        );
      }

      if (!PLAN_PRICING[planDuration as PlanDuration]) {
        return NextResponse.json(
          { error: 'ระยะเวลาแพ็กเกจไม่ถูกต้อง กรุณาเลือก 1m, 3m, 5m, 1y หรือ 2y' },
          { status: 400 },
        );
      }

      if (!adminName) {
        return NextResponse.json(
          { error: 'กรุณาระบุชื่อ-นามสกุลผู้ดูแลระบบ' },
          { status: 400 },
        );
      }

      const result = await this.tenantSvc.registerCompany({
        companyName,
        taxId,
        adminName,
        adminEmail,
        adminPassword,
        phone,
        planDuration: planDuration as PlanDuration,
        slipUrl,
        isSlipVerified: body.isSlipVerified === true,
        transRef: body.transRef,
      });

      return NextResponse.json({
        success: true,
        message: 'สมัครสมาชิกบริษัทสำเร็จ',
        data: result,
      });
    } catch (error: any) {
      console.error('API Error (REGISTER COMPANY):', error);
      return NextResponse.json(
        { error: error.message || 'เกิดข้อผิดพลาดในการลงทะเบียนบริษัท' },
        { status: 500 },
      );
    }
  }

  /** POST /api/auth/validate-company — Validate a company code */
  async handleValidate(request: Request): Promise<NextResponse> {
    try {
      const { companyCode } = await request.json();

      if (!companyCode) {
        return NextResponse.json(
          { error: 'กรุณาระบุรหัสบริษัท' },
          { status: 400 },
        );
      }

      const result = await this.tenantSvc.validateCompany(companyCode);

      if (!result.valid) {
        return NextResponse.json(
          { error: result.error, valid: false },
          { status: result.errorCode || 403 },
        );
      }

      return NextResponse.json({
        valid: true,
        company: {
          name: result.company?.name,
          companyCode: result.company?.companyCode,
          subscriptionEnd: result.company?.subscriptionEnd,
          status: result.company?.status,
        },
      });
    } catch (error: any) {
      console.error('API Error (VALIDATE COMPANY):', error);
      return NextResponse.json(
        { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบบริษัท' },
        { status: 500 },
      );
    }
  }

  /** POST /api/auth/renew-subscription — Renew company subscription */
  async handleRenew(request: Request): Promise<NextResponse> {
    try {
      const { companyCode, planDuration, slipUrl } = await request.json();

      if (!companyCode || !planDuration) {
        return NextResponse.json(
          { error: 'กรุณาระบุรหัสบริษัทและระยะเวลาแพ็กเกจ' },
          { status: 400 },
        );
      }

      const result = await this.tenantSvc.renewSubscription(
        companyCode,
        planDuration as PlanDuration,
        slipUrl,
      );

      return NextResponse.json({
        success: true,
        message: 'ต่ออายุแพ็กเกจสำเร็จ',
        data: result,
      });
    } catch (error: any) {
      console.error('API Error (RENEW SUBSCRIPTION):', error);
      return NextResponse.json(
        { error: error.message || 'เกิดข้อผิดพลาดในการต่ออายุแพ็กเกจ' },
        { status: 500 },
      );
    }
  }

  /** POST /api/cron/check-expiry — Cron job to auto-expire companies */
  async handleCheckExpiry(_request: Request): Promise<NextResponse> {
    try {
      const count = await this.tenantSvc.markExpiredCompanies();
      return NextResponse.json({
        success: true,
        message: `ตรวจสอบเสร็จสิ้น — พบบริษัทหมดอายุ ${count} รายการ`,
        expiredCount: count,
      });
    } catch (error: any) {
      console.error('API Error (CHECK EXPIRY):', error);
      return NextResponse.json(
        { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบวันหมดอายุ' },
        { status: 500 },
      );
    }
  }
}
