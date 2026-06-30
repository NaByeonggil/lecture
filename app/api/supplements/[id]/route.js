import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}
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

// GET /api/supplements/:id  — 단건 조회
export async function GET(_request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const sid = parseId(id);
    if (!sid) {
      return NextResponse.json({ error: "잘못된 id 입니다." }, { status: 400 });
    }
    const rows = await sql`
      SELECT id, owner, name, brand, category, timing, image_url, nutrients, created_at
      FROM supplements WHERE id = ${sid}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ supplement: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/supplements/:id  — 수정
export async function PUT(request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const sid = parseId(id);
    if (!sid) {
      return NextResponse.json({ error: "잘못된 id 입니다." }, { status: 400 });
    }
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
      UPDATE supplements
         SET name = ${name}, brand = ${brand}, category = ${category},
             timing = ${timing}, image_url = ${imageUrl},
             nutrients = ${JSON.stringify(nutrients)}::jsonb
       WHERE id = ${sid}
      RETURNING id, owner, name, brand, category, timing, image_url, nutrients, created_at
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ supplement: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/supplements/:id  — 보관함에서 삭제(복용 기록도 CASCADE 삭제)
export async function DELETE(_request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const sid = parseId(id);
    if (!sid) {
      return NextResponse.json({ error: "잘못된 id 입니다." }, { status: 400 });
    }
    const rows = await sql`DELETE FROM supplements WHERE id = ${sid} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
