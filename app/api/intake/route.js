import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normOwner(v) {
  const o = (v ?? "").toString().trim();
  return o === "nahuiyun" || o === "nahuiseong" ? o : null;
}

// YYYY-MM-DD 형식만 허용. 없으면 null(=서버의 CURRENT_DATE 사용)
function normDate(v) {
  const s = (v ?? "").toString().trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// GET /api/intake?owner=nahuiyun&date=YYYY-MM-DD
// 해당 날짜 기준으로 owner의 모든 영양제 + 복용 여부를 반환
export async function GET(request) {
  try {
    await ensureSchema();
    const params = new URL(request.url).searchParams;
    const owner = normOwner(params.get("owner"));
    if (!owner) {
      return NextResponse.json({ error: "owner 파라미터가 필요합니다." }, { status: 400 });
    }
    const date = normDate(params.get("date"));
    // 제품은 공동 풀(shared), 복용 여부는 사람별(owner) 로 매칭
    const rows = await sql`
      SELECT s.id, s.name, s.brand, s.category, s.timing, s.nutrients,
             COALESCE(l.taken, false) AS taken
      FROM supplements s
      LEFT JOIN intake_logs l
        ON l.supplement_id = s.id
       AND l.owner = ${owner}
       AND l.taken_date = COALESCE(${date}::date, CURRENT_DATE)
      WHERE s.owner = 'shared'
      ORDER BY s.created_at ASC
    `;
    return NextResponse.json({ items: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/intake  body { owner, supplement_id, date?, taken }
// 복용 여부 토글(upsert)
export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const owner = normOwner(body.owner);
    const sid = Number(body.supplement_id);
    const date = normDate(body.date);
    const taken = body.taken !== false; // 기본 true

    if (!owner) {
      return NextResponse.json({ error: "owner 값이 올바르지 않습니다." }, { status: 400 });
    }
    if (!Number.isInteger(sid) || sid <= 0) {
      return NextResponse.json({ error: "supplement_id 가 올바르지 않습니다." }, { status: 400 });
    }

    // 공동 풀에 해당 제품이 존재하는지 확인
    const own = await sql`SELECT id FROM supplements WHERE id = ${sid} AND owner = 'shared'`;
    if (own.length === 0) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }

    const rows = await sql`
      INSERT INTO intake_logs (supplement_id, owner, taken_date, taken)
      VALUES (${sid}, ${owner}, COALESCE(${date}::date, CURRENT_DATE), ${taken})
      ON CONFLICT (supplement_id, taken_date)
      DO UPDATE SET taken = EXCLUDED.taken
      RETURNING supplement_id, taken_date, taken
    `;
    return NextResponse.json({ log: rows[0] }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
