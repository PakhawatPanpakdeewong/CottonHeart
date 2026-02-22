import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

interface StockCheckItem {
  id: string;
  sku?: string | null;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: StockCheckItem[] = Array.isArray(body.items) ? body.items : body;

    if (!items?.length) {
      return NextResponse.json({ results: [] });
    }

    const results: { id: string; available: number; sufficient: boolean }[] = [];

    for (const item of items) {
      const productId = parseInt(item.id, 10);
      if (isNaN(productId)) {
        results.push({ id: item.id, available: 0, sufficient: false });
        continue;
      }

      let variantId: number | null = null;
      if (item.sku?.trim()) {
        const vRes = await pool.query(
          'SELECT variantid FROM productvariants WHERE productid = $1 AND sku = $2 AND isactive = true',
          [productId, item.sku.trim()]
        );
        variantId = vRes.rows[0]?.variantid ?? null;
      }
      if (variantId === null) {
        const vRes = await pool.query(
          'SELECT variantid FROM productvariants WHERE productid = $1 AND isactive = true ORDER BY price ASC LIMIT 1',
          [productId]
        );
        variantId = vRes.rows[0]?.variantid ?? null;
      }

      let available = 0;
      if (variantId) {
        const invRes = await pool.query(
          'SELECT COALESCE(SUM(availablequantity), 0)::int as total FROM inventories WHERE variantid = $1',
          [variantId]
        );
        available = parseInt(invRes.rows[0]?.total || '0', 10);
      }

      const qty = Math.max(0, Math.floor(item.quantity || 0));
      results.push({
        id: item.id,
        available,
        sufficient: available >= qty,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Stock check error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
