import { neon } from "@neondatabase/serverless";

// Vercel Postgres(Neon) 통합이 주입하는 연결 문자열.
// 통합 설정에 따라 변수명이 다를 수 있어 가능한 후보를 모두 확인한다.
function connString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null
  );
}

let _client;

// neon() 을 빌드 시점이 아니라 첫 쿼리 시점에 지연 초기화한다.
function client() {
  if (!_client) {
    const cs = connString();
    if (!cs) {
      throw new Error(
        "데이터베이스 연결 문자열이 없습니다. Vercel Storage에서 Postgres를 프로젝트에 연결한 뒤 `vercel env pull .env.local` 을 실행하세요."
      );
    }
    _client = neon(cs);
  }
  return _client;
}

// 태그드 템플릿으로 사용: sql`SELECT ...`
export function sql(strings, ...values) {
  return client()(strings, ...values);
}

let schemaReady;

// 최초 요청 시 테이블을 보장(서버리스 환경에서 안전한 lazy 마이그레이션).
export function ensureSchema() {
  if (!schemaReady) schemaReady = runMigrations();
  return schemaReady;
}

async function runMigrations() {
  // 강의 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS lectures (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title       TEXT        NOT NULL DEFAULT '',
      subject     TEXT        NOT NULL DEFAULT '',
      instructor  TEXT        NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // 노트 테이블
  await sql`
    CREATE TABLE IF NOT EXISTS notes (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title       TEXT        NOT NULL DEFAULT '',
      subject     TEXT        NOT NULL DEFAULT '',
      content     TEXT        NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // 기존 notes 테이블에 강의 연결 컬럼 추가(idempotent)
  await sql`
    ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS lecture_id BIGINT REFERENCES lectures(id) ON DELETE SET NULL
  `;

  // 노트 편집 화면(디자인)에 맞춘 추가 필드들(idempotent)
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS note_date DATE`;
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS topic   TEXT  NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS summary TEXT  NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags    JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS status  TEXT  NOT NULL DEFAULT 'final'`;
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb`;
  // 도해(mermaid): [{ title, code }, ...]
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS diagrams JSONB NOT NULL DEFAULT '[]'::jsonb`;

  // 강의 시드(비어 있을 때만) — 디자인 시안의 강의들
  const counted = await sql`SELECT count(*)::int AS n FROM lectures`;
  if (counted[0].n === 0) {
    await sql`
      INSERT INTO lectures (title, subject, instructor) VALUES
      (${"제4장: 인지 발달의 단계"}, ${"심리학 개론"}, ${"김민준 교수"}),
      (${"알고리즘 분석의 기초"}, ${"자료구조"}, ${"이서연 교수"}),
      (${"미생물학 실험 보고서 작성법"}, ${"미생물학"}, ${"박지호 교수"}),
      (${"19세기 유럽과 근대 서양사"}, ${"서양사"}, ${"최유진 교수"}),
      (${"소비자 행동론과 마케팅 원론"}, ${"마케팅"}, ${"정다은 교수"})
    `;
  }
}
