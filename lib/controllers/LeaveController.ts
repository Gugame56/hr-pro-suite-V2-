// =============================================================================
// LeaveController — แปลงจาก app/api/leave/route.ts
// CRUD + quota enforcement
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseController } from './BaseController';
import { BaseRepository } from '../repositories/BaseRepository';
import { AuthorizationService } from '../services/AuthorizationService';

const SHEET_NAME = 'LeaveRequests';
const EMPLOYEES_SHEET = 'Employees';
const LEAVE_TYPES_SHEET = 'LeaveTypes';
const LEAVE_REQUEST_EXTRA_HEADERS = ['id', 'employeeId', 'leaveType', 'durationType', 'startDate', 'endDate', 'startTime', 'endTime', 'reason', 'status'];

export class LeaveController extends BaseController {
  private static _instance: LeaveController;
  private readonly employeesRepo: BaseRepository;
  private readonly leaveTypesRepo: BaseRepository;

  constructor() {
    super(SHEET_NAME, { requireManager: false });
    this.employeesRepo = new BaseRepository(EMPLOYEES_SHEET);
    this.leaveTypesRepo = new BaseRepository(LEAVE_TYPES_SHEET);

    this.handleGet = this.handleGet.bind(this);
    this.handlePost = this.handlePost.bind(this);
    this.handlePatch = this.handlePatch.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
  }

  static getInstance(): LeaveController {
    if (!LeaveController._instance) {
      LeaveController._instance = new LeaveController();
    }
    return LeaveController._instance;
  }

  async handleGet(request: Request): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url);
      const employeeId = searchParams.get('employeeId');
      const rows = (await this.repository.getAll()).map(BaseRepository.stripInternal);

      if (employeeId) {
        return NextResponse.json(rows.filter((r: any) => (r.employeeId || '').toString() === employeeId));
      }
      return NextResponse.json(rows);
    } catch (error) {
      console.error('API Error (GET):', error);
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }
  }

  async handlePost(request: Request): Promise<NextResponse> {
    try {
      await this.repository.ensureHeaders(LEAVE_REQUEST_EXTRA_HEADERS);
      const body = await request.json();
      const data = { ...body, status: body.status || 'Pending' };

      await this.repository.add(data);
      return NextResponse.json({ message: 'Leave request submitted successfully' });
    } catch (error) {
      console.error('API Error (POST):', error);
      return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 });
    }
  }

  async handlePatch(request: Request): Promise<NextResponse> {
    try {
      await this.repository.ensureHeaders(LEAVE_REQUEST_EXTRA_HEADERS);
      const body = await request.json();
      const { id, ...updatedData } = body;
      if (!id) return NextResponse.json({ error: 'Leave request ID is required' }, { status: 400 });

      // Approving / rejecting requires manager
      if (updatedData.status === 'Approved' || updatedData.status === 'Rejected') {
        const denied = AuthorizationService.getInstance().requireManager(request);
        if (denied) return denied;
      }

      await this.repository.update(id, updatedData);
      return NextResponse.json({ message: 'Leave request updated successfully' });
    } catch (error) {
      console.error('API Error (PATCH):', error);
      return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
    }
  }

  async handleDelete(request: Request): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Leave request ID is required' }, { status: 400 });

      await this.repository.delete(id);
      return NextResponse.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
      console.error('API Error (DELETE):', error);
      return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 });
    }
  }
}
