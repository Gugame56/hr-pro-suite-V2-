import { NextResponse } from 'next/server';
import { SlipService } from '@/lib/services/SlipService';
import type { PlanDuration } from '@/lib/subscription';

export async function POST(req: Request) {
  try {
    const { slipData, planDuration } = await req.json();

    if (!slipData) {
      return NextResponse.json(
        { error: 'กรุณาแนบรูปภาพหรือลิงก์สลิปโอนเงิน' },
        { status: 400 }
      );
    }

    if (!planDuration) {
      return NextResponse.json(
        { error: 'กรุณาระบุแพ็กเกจที่ต้องการตรวจสอบ' },
        { status: 400 }
      );
    }

    const slipSvc = SlipService.getInstance();
    const result = await slipSvc.verifySlip(slipData, planDuration as PlanDuration);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error (VERIFY SLIP):', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป' },
      { status: 500 }
    );
  }
}
