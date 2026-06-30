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

  // ── 영양제 트래커 ──────────────────────────────────────────────
  // 영양제(보관함 / 등록)
  await sql`
    CREATE TABLE IF NOT EXISTS supplements (
      id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      owner      TEXT        NOT NULL,
      name       TEXT        NOT NULL,
      brand      TEXT        NOT NULL DEFAULT '',
      category   TEXT        NOT NULL DEFAULT '',
      nutrients  JSONB       NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_supplements_owner ON supplements(owner)`;

  // 제품(보관함)은 공동 풀로 통합 — 기존 사람별 제품을 'shared' 로 전환(idempotent)
  await sql`UPDATE supplements SET owner = 'shared' WHERE owner IN ('nahuiyun', 'nahuiseong')`;

  // 복용 시간대(아침/점심/저녁) — 'morning' | 'noon' | 'evening' | ''(미지정)
  await sql`ALTER TABLE supplements ADD COLUMN IF NOT EXISTS timing TEXT NOT NULL DEFAULT ''`;
  // 라벨 사진(카메라 스캔) URL
  await sql`ALTER TABLE supplements ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''`;
  // 기존 데이터 백필(미지정만): 미네랄은 저녁, 그 외 아침 (idempotent)
  await sql`
    UPDATE supplements
       SET timing = CASE WHEN category = 'mineral' THEN 'evening' ELSE 'morning' END
     WHERE timing = ''
  `;

  // 일일 복용 기록(오늘의 복용 체크 / 통계)
  await sql`
    CREATE TABLE IF NOT EXISTS intake_logs (
      id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      supplement_id BIGINT      NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
      owner         TEXT        NOT NULL,
      taken_date    DATE        NOT NULL,
      taken         BOOLEAN     NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (supplement_id, taken_date)
    )
  `;

  // 영양제 시드(비어 있을 때만) — 나희윤 / 나희성 샘플
  const supCount = await sql`SELECT count(*)::int AS n FROM supplements`;
  if (supCount[0].n === 0) {
    await sql`
      INSERT INTO supplements (owner, name, brand, category, timing, nutrients) VALUES
      (${"shared"}, ${"종합비타민"}, ${"Nature's Bounty"}, ${"multivitamin"}, ${"morning"},
        ${JSON.stringify([{ name: "비타민 C", amount: "500mg" }, { name: "비타민 D3", amount: "1000IU" }])}::jsonb),
      (${"shared"}, ${"오메가-3"}, ${"Nordic Naturals"}, ${"omega3"}, ${"morning"},
        ${JSON.stringify([{ name: "EPA", amount: "1280mg" }, { name: "DHA", amount: "650mg" }])}::jsonb),
      (${"shared"}, ${"마그네슘"}, ${"Pure Encapsulations"}, ${"mineral"}, ${"evening"},
        ${JSON.stringify([{ name: "마그네슘", amount: "120mg" }])}::jsonb),
      (${"shared"}, ${"비타민 C"}, ${"Now Foods"}, ${"vitamin_c"}, ${"noon"},
        ${JSON.stringify([{ name: "비타민 C", amount: "1000mg" }])}::jsonb),
      (${"shared"}, ${"유산균"}, ${"Culturelle"}, ${"probiotic"}, ${"morning"},
        ${JSON.stringify([{ name: "유산균", amount: "100억 CFU" }])}::jsonb),
      (${"shared"}, ${"비타민 D3 + K2"}, ${"Thorne Health"}, ${"multivitamin"}, ${"noon"},
        ${JSON.stringify([{ name: "비타민 D3", amount: "5000IU" }, { name: "비타민 K2", amount: "90mcg" }])}::jsonb)
    `;
  }

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
