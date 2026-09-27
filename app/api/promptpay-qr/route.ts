import { NextResponse } from 'next/server';
import { generatePromptPayQRCode } from '@/lib/promptpay';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const amountStr = searchParams.get('amount');
    const target =
      searchParams.get('target') ||
      process.env.NEXT_PUBLIC_PROMPTPAY_NUMBER ||
      '140000996792631';

    const amount = amountStr ? parseFloat(amountStr) : undefined;
    const qrDataUrl = await generatePromptPayQRCode(target, amount);

    return NextResponse.json({
      success: true,
      qrDataUrl,
      target,
      amount,
    });
  } catch (error: any) {
    console.error('API Error (PROMPTPAY QR):', error);
    return NextResponse.json(
      { error: error.message || 'ไม่สามารถสร้าง QR Code ได้' },
      { status: 500 }
    );
  }
}
