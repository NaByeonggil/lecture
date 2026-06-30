import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normOwner(v) {
  const o = (v ?? "").toString().trim();
  return o === "nahuiyun" || o === "nahuiseong" ? o : null;
}

// GET /api/stats?owner=nahuiyun  — 복용 통계
export async function GET(request) {
  try {
    await ensureSchema();
    const owner = normOwner(new URL(request.url).searchParams.get("owner"));
    if (!owner) {
      return NextResponse.json({ error: "owner 파라미터가 필요합니다." }, { status: 400 });
    }

    // 제품은 공동 풀, 복용 통계는 사람별
    const supRows = await sql`
      SELECT id, name, nutrients FROM supplements WHERE owner = 'shared'
    `;
    const supplementCount = supRows.length;

    // 오늘 복용 현황
    const todayTaken = await sql`
      SELECT supplement_id FROM intake_logs
      WHERE owner = ${owner} AND taken_date = CURRENT_DATE AND taken = true
    `;
    const takenIds = new Set(todayTaken.map((r) => Number(r.supplement_id)));

    // 최근 7일 복용 꾸준함(%) = 7일간 taken 기록 수 / (영양제 수 * 7)
    const wk = await sql`
      SELECT count(*)::int AS n FROM intake_logs
      WHERE owner = ${owner}
        AND taken = true
        AND taken_date > CURRENT_DATE - INTERVAL '7 days'
    `;
    const denom = supplementCount * 7;
    const adherence7d = denom > 0 ? Math.round((wk[0].n / denom) * 100) : 0;

    // 오늘 섭취한 영양 성분 합산(단위가 제각각이라 문자열로 모아 표시)
    const nutrientMap = new Map();
    for (const s of supRows) {
      if (!takenIds.has(Number(s.id))) continue;
      const list = Array.isArray(s.nutrients) ? s.nutrients : [];
      for (const nu of list) {
        const key = (nu?.name ?? "").trim();
        if (!key) continue;
        if (!nutrientMap.has(key)) nutrientMap.set(key, []);
        if (nu.amount) nutrientMap.get(key).push(String(nu.amount));
      }
    }
    const nutrientsToday = [...nutrientMap.entries()].map(([name, amounts]) => ({
      name,
      amounts,
    }));

    return NextResponse.json({
      supplementCount,
      today: { total: supplementCount, taken: takenIds.size },
      adherence7d,
      nutrientsToday,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
