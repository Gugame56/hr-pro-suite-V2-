import { NextResponse } from 'next/server';
import { BaseController } from './BaseController';

export class LoansController extends BaseController {
  private static _instance: LoansController;

  constructor() {
    super('Loans', { requireManager: false });
    this.handlePatch = this.handlePatch.bind(this);
  }

  static getInstance(): LoansController {
    if (!LoansController._instance) {
      LoansController._instance = new LoansController();
    }
    return LoansController._instance;
  }

  /** Override PATCH: require manager only for status changes (Approved/Rejected) */
  async handlePatch(request: Request): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { id, ...updatedData } = body;
      if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

      // Approving / rejecting a loan is a management action
      if (updatedData.status === 'Approved' || updatedData.status === 'Rejected') {
        const denied = this.authService.requireManager(request);
        if (denied) return denied;
      }

      await this.repository.update(id, updatedData);
      return NextResponse.json({ message: 'Loan updated successfully' });
    } catch (error) {
      console.error('API Error (PATCH Loans):', error);
      return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
    }
  }
}
