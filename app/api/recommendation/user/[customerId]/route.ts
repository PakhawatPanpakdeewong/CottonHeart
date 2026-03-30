import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  const idNum = Number(customerId);

  if (!Number.isFinite(idNum) || idNum <= 0) {
    return NextResponse.json({ error: 'Invalid customerId' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`https://api.pjaichat.xyz/recommendation/user/${idNum}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    const rawText = await upstream.text();
    let json: any = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = { raw: rawText };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream error', status: upstream.status, data: json },
        { status: upstream.status }
      );
    }

    // Enrich upstream items with productId (our app routes use productid)
    try {
      const items: any[] = Array.isArray(json?.items) ? json.items : [];
      const variantIds = Array.from(
        new Set(
          items
            .map((it) => Number(it?.variant_id ?? it?.variantId ?? it?.variantid))
            .filter((n) => Number.isFinite(n) && n > 0)
        )
      );

      if (variantIds.length > 0) {
        const result = await pool.query(
          `SELECT pv.variantid, pv.productid
           FROM productvariants pv
           WHERE pv.variantid = ANY($1::int[])`,
          [variantIds]
        );
        const map = new Map<number, number>();
        for (const row of result.rows) {
          map.set(Number(row.variantid), Number(row.productid));
        }

        json.items = items.map((it) => {
          const vid = Number(it?.variant_id ?? it?.variantId ?? it?.variantid);
          const pid = map.get(vid);
          return pid ? { ...it, productId: pid } : it;
        });
      }
    } catch {
      // Ignore enrichment failures; still return upstream JSON
    }

    return NextResponse.json(json, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch recommendation', detail: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

