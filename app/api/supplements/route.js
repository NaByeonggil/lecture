import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 제품(보관함)은 나희윤·나희성 공동 풀 — owner 는 'shared' 고정
const SHARED = "shared";

function normTiming(v) {
  const t = (v ?? "").toString().trim();
  return t === "morning" || t === "noon" || t === "evening" ? t : "";
}

function normImageUrl(v) {
  const s = (v ?? "").toString().trim();
  return /^https:\/\//.test(s) ? s.slice(0, 1000) : "";
}

function normNutrients(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map((n) => ({
      name: String(n?.name ?? "").trim().slice(0, 100),
      amount: String(n?.amount ?? "").trim().slice(0, 50),
    }))
    .filter((n) => n.name)
    .slice(0, 30);
}

// GET /api/supplements  — 공동 보관함 목록(나희윤·나희성 공유)
export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT id, owner, name, brand, category, timing, image_url, nutrients, created_at
      FROM supplements
      WHERE owner = ${SHARED}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ supplements: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/supplements  — 공동 보관함에 영양제 등록
export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const name = (body.name ?? "").toString().trim();
    const brand = (body.brand ?? "").toString().trim();
    const category = (body.category ?? "").toString().trim().slice(0, 50);
    const timing = normTiming(body.timing);
    const imageUrl = normImageUrl(body.image_url);
    const nutrients = normNutrients(body.nutrients);

    if (!name) {
      return NextResponse.json({ error: "제품명을 입력하세요." }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO supplements (owner, name, brand, category, timing, image_url, nutrients)
      VALUES (${SHARED}, ${name}, ${brand}, ${category}, ${timing}, ${imageUrl}, ${JSON.stringify(nutrients)}::jsonb)
      RETURNING id, owner, name, brand, category, timing, image_url, nutrients, created_at
    `;
    return NextResponse.json({ supplement: rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
