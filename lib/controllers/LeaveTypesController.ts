// =============================================================================
// LeaveTypesController — แปลงจาก app/api/leave-types/route.ts
// CRUD + seeding default types + boolean field conversion
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseController } from './BaseController';
import { BaseRepository } from '../repositories/BaseRepository';

const LEAVE_TYPES_SHEET = 'LeaveTypes';
const LEAVE_TYPE_HEADERS = ['id', 'name', 'maxDays', 'paid', 'active', 'minTenureMonths'];

const DEFAULT_LEAVE_TYPES = [
  { name: 'ลาป่วย', maxDays: '30', paid: 'Yes', active: 'Yes', minTenureMonths: '0' },
  { name: 'ลากิจ', maxDays: '3', paid: 'Yes', active: 'Yes', minTenureMonths: '0' },
  { name: 'ลาพักร้อน', maxDays: '6', paid: 'Yes', active: 'Yes', minTenureMonths: '12' },
  { name: 'ลาคลอด', maxDays: '98', paid: 'Yes', active: 'Yes', minTenureMonths: '0' },
  { name: 'ลาบวช', maxDays: '15', paid: 'Yes', active: 'Yes', minTenureMonths: '12' },
  { name: 'ลาไม่รับค่าจ้าง', maxDays: '0', paid: 'No', active: 'Yes', minTenureMonths: '0' },
];

/** Convert boolean fields to Yes/No for sheet storage */
function toSheet(data: any) {
  const out = { ...data };
  if (out.paid !== undefined) out.paid = (out.paid === true || out.paid === 'Yes' || out.paid === 'true') ? 'Yes' : 'No';
  if (out.active !== undefined) out.active = (out.active === true || out.active === 'Yes' || out.active === 'true') ? 'Yes' : 'No';
  return out;
}

/** Normalize a raw sheet row to a typed leave type object */
function normalizeLeaveType(row: any) {
  return {
    ...row,
    id: row.id || '',
    name: row.name || '',
    maxDays: parseFloat(row.maxDays) || 0,
    paid: row.paid === 'Yes' || row.paid === true,
    active: row.active !== 'No' && row.active !== false,
    minTenureMonths: parseInt(row.minTenureMonths) || 0,
  };
}

export class LeaveTypesController extends BaseController {
  private static _instance: LeaveTypesController;

  constructor() {
    super(LEAVE_TYPES_SHEET, { requireManager: true });
    this.handleGet = this.handleGet.bind(this);
    this.handlePost = this.handlePost.bind(this);
    this.handlePatch = this.handlePatch.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
  }

  static getInstance(): LeaveTypesController {
    if (!LeaveTypesController._instance) {
      LeaveTypesController._instance = new LeaveTypesController();
    }
    return LeaveTypesController._instance;
  }

  async handleGet(): Promise<NextResponse> {
    try {
      await this.repository.ensureHeaders(LEAVE_TYPE_HEADERS);
      let rows = await this.repository.getAll();

      // Seed defaults if empty
      if (rows.length === 0) {
        for (const t of DEFAULT_LEAVE_TYPES) {
          await this.repository.add(toSheet(t));
        }
        rows = await this.repository.getAll();
      }

      return NextResponse.json(
        rows.map(normalizeLeaveType).filter((t: any) => t.name),
      );
    } catch (error) {
      console.error('API Error (LeaveTypes GET):', error);
      return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
    }
  }

  async handlePost(request: Request): Promise<NextResponse> {
    const denied = this.checkManager(request);
    if (denied) return denied;

    try {
      await this.repository.ensureHeaders(LEAVE_TYPE_HEADERS);
      const body = await request.json();
      if (!body.name || !String(body.name).trim()) {
        return NextResponse.json({ error: 'กรุณาระบุชื่อประเภทการลา' }, { status: 400 });
      }
      await this.repository.add(toSheet(body));
      return NextResponse.json({ message: 'Leave type added successfully' });
    } catch (error) {
      console.error('API Error (LeaveTypes POST):', error);
      return NextResponse.json({ error: 'Failed to add leave type' }, { status: 500 });
    }
  }

  async handlePatch(request: Request): Promise<NextResponse> {
    const denied = this.checkManager(request);
    if (denied) return denied;

    try {
      const body = await request.json();
      const { id, ...updated } = body;
      if (!id) return NextResponse.json({ error: 'Leave type ID is required' }, { status: 400 });
      await this.repository.update(id, toSheet(updated));
      return NextResponse.json({ message: 'Leave type updated successfully' });
    } catch (error) {
      console.error('API Error (LeaveTypes PATCH):', error);
      return NextResponse.json({ error: 'Failed to update leave type' }, { status: 500 });
    }
  }
}
