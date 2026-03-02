import { NextRequest, NextResponse } from 'next/server';
import { expireOverduePayments } from '@/lib/expire-payments';

/**
 * Cron job: ยกเลิกออเดอร์ที่เกิน 30 นาทีแล้วยังไม่ชำระเงิน
 * เรียกใช้จาก Vercel Cron หรือ external cron ทุก 5 นาที
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const querySecret = request.nextUrl.searchParams.get('secret');
      if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const expiredCount = await expireOverduePayments();

    return NextResponse.json({
      success: true,
      expiredCount,
      message: expiredCount > 0 ? `ยกเลิก ${expiredCount} ออเดอร์ที่เกินเวลา` : 'ไม่มีออเดอร์ที่หมดเวลา',
    });
  } catch (error) {
    console.error('Expire payments error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยกเลิกออเดอร์ที่หมดเวลา' },
      { status: 500 }
    );
  }
}
