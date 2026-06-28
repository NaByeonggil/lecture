import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/lectures — 연결 가능한 강의 목록
export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT id, title, subject, instructor
      FROM lectures
      ORDER BY subject, title
    `;
    return NextResponse.json({ lectures: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
