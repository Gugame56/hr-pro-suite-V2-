// =============================================================================
// HR Pro Suite — BaseController<T>
// Base class สำหรับ CRUD API route handlers
// แปลงจาก crud.ts + API route pattern ที่ซ้ำกัน ~18 routes
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseRepository } from '../repositories/BaseRepository';
import { AuditService } from '../services/AuditService';
import { AuthorizationService } from '../services/AuthorizationService';

export interface ControllerOptions {
  /** Default values merged into every created row */
  defaults?: Record<string, unknown>;
  /** Record create/update/delete to AuditLogs (default true) */
  audit?: boolean;
  /** Require manager role for POST/PATCH/DELETE (default true) */
  requireManager?: boolean;
  /** Field to filter by in GET (e.g. 'employeeId') */
  filterField?: string;
}

export class BaseController<T extends Record<string, any> = Record<string, any>> {
  protected readonly repository: BaseRepository<T>;
  protected readonly auditService: AuditService;
  protected readonly authService: AuthorizationService;
  protected readonly options: Required<ControllerOptions>;
  protected readonly sheetName: string;

  constructor(sheetName: string, options: ControllerOptions = {}) {
    this.sheetName = sheetName;
    this.repository = new BaseRepository<T>(sheetName);
    this.auditService = AuditService.getInstance();
    this.authService = AuthorizationService.getInstance();
    this.options = {
      defaults: options.defaults ?? {},
      audit: options.audit ?? true,
      requireManager: options.requireManager ?? true,
      filterField: options.filterField ?? '',
    };

    // Bind methods เพื่อให้ใช้ใน route.ts ได้ถูกต้อง
    this.handleGet = this.handleGet.bind(this);
    this.handlePost = this.handlePost.bind(this);
    this.handlePatch = this.handlePatch.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** ดึง actor จาก request header */
  protected getActor(request: Request): string {
    return request.headers.get('x-actor') || 'system';
  }

  /** ตรวจสอบสิทธิ์ manager — return NextResponse 403 ถ้าไม่ผ่าน */
  protected checkManager(request: Request): NextResponse | null {
    if (!this.options.requireManager) return null;
    return this.authService.requireManager(request);
  }

  // ---------------------------------------------------------------------------
  // Route Handlers
  // ---------------------------------------------------------------------------

  /** GET — ดึงข้อมูลทั้งหมด หรือ filter ด้วย ?employeeId= หรือ ?id= */
  async handleGet(request: Request): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const employeeId = searchParams.get('employeeId');

      const rows = (await this.repository.getAll()).map(BaseRepository.stripInternal);

      if (id) {
        const found = rows.find((r: any) => r.id?.toString() === id);
        return NextResponse.json(found ?? null);
      }
      if (employeeId && this.options.filterField) {
        return NextResponse.json(
          rows.filter((r: any) => r[this.options.filterField] === employeeId),
        );
      }
      if (employeeId) {
        return NextResponse.json(
          rows.filter((r: any) => r.employeeId === employeeId),
        );
      }
      return NextResponse.json(rows);
    } catch (error) {
      console.error(`API Error (GET ${this.sheetName}):`, error);
      return NextResponse.json(
        { error: `Failed to fetch ${this.sheetName}` },
        { status: 500 },
      );
    }
  }

  /** POST — สร้าง record ใหม่ */
  async handlePost(request: Request): Promise<NextResponse> {
    const denied = this.checkManager(request);
    if (denied) return denied;

    try {
      const body = await request.json();
      const data = { ...this.options.defaults, ...body };
      await this.repository.add(data);

      if (this.options.audit) {
        await this.auditService.log({
          actor: this.getActor(request),
          action: 'CREATE',
          entity: this.sheetName,
          entityId: data.id,
          changes: data,
        });
      }

      return NextResponse.json({ message: `${this.sheetName} created successfully` });
    } catch (error) {
      console.error(`API Error (POST ${this.sheetName}):`, error);
      return NextResponse.json(
        { error: `Failed to create ${this.sheetName}` },
        { status: 500 },
      );
    }
  }

  /** PATCH — อัปเดต record */
  async handlePatch(request: Request): Promise<NextResponse> {
    const denied = this.checkManager(request);
    if (denied) return denied;

    try {
      const body = await request.json();
      const { id, ...updatedData } = body;
      if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
      }

      await this.repository.update(id, updatedData);

      if (this.options.audit) {
        await this.auditService.log({
          actor: this.getActor(request),
          action: 'UPDATE',
          entity: this.sheetName,
          entityId: id,
          changes: updatedData,
        });
      }

      return NextResponse.json({ message: `${this.sheetName} updated successfully` });
    } catch (error) {
      console.error(`API Error (PATCH ${this.sheetName}):`, error);
      return NextResponse.json(
        { error: `Failed to update ${this.sheetName}` },
        { status: 500 },
      );
    }
  }

  /** DELETE — ลบ record */
  async handleDelete(request: Request): Promise<NextResponse> {
    const denied = this.checkManager(request);
    if (denied) return denied;

    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
      }

      await this.repository.delete(id);

      if (this.options.audit) {
        await this.auditService.log({
          actor: this.getActor(request),
          action: 'DELETE',
          entity: this.sheetName,
          entityId: id,
        });
      }

      return NextResponse.json({ message: `${this.sheetName} deleted successfully` });
    } catch (error) {
      console.error(`API Error (DELETE ${this.sheetName}):`, error);
      return NextResponse.json(
        { error: `Failed to delete ${this.sheetName}` },
        { status: 500 },
      );
    }
  }
}
