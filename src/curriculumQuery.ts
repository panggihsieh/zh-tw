export const curriculumEntities = ["lesson", "character", "word", "source"] as const;
export type CurriculumEntity = (typeof curriculumEntities)[number];

export interface CurriculumQueryPlan {
  entity: CurriculumEntity;
  keyword?: string;
  publisher?: string;
  year?: string;
  grade?: number;
  term?: "上" | "下";
  lessonTitle?: string;
  sourceKind?: string;
  explanation?: string;
}

const base = {
  lesson: `SELECT e.publisher, e.year, e.grade, e.term, l.title AS lesson,
    COUNT(DISTINCT lc.glyph) AS character_count, l.source AS source_url
    FROM lessons l JOIN editions e ON e.id = l.edition_id
    LEFT JOIN lesson_characters lc ON lc.lesson_id = l.id`,
  character: `SELECT e.publisher, e.year, e.grade, e.term, l.title AS lesson,
    lc.glyph AS item, lc.reading, lc.definition, lc.source AS source_url
    FROM lesson_characters lc JOIN lessons l ON l.id = lc.lesson_id
    JOIN editions e ON e.id = l.edition_id`,
  word: `SELECT e.publisher, e.year, e.grade, e.term, l.title AS lesson,
    w.text AS item, w.reading, COALESCE(lw.meaning, w.definition) AS definition,
    COALESCE(lw.source, w.source_url) AS source_url
    FROM lesson_words lw JOIN words w ON w.id = lw.word_id
    JOIN lessons l ON l.id = lw.lesson_id JOIN editions e ON e.id = l.edition_id`,
  source: `SELECT kind, title, url AS source_url FROM sources`,
} satisfies Record<CurriculumEntity, string>;

export function normalizeCurriculumPlan(value: unknown): CurriculumQueryPlan {
  if (!value || typeof value !== "object") throw Error("AI 查詢計畫格式不符");
  const input = value as Record<string, unknown>;
  if (!curriculumEntities.includes(input.entity as CurriculumEntity))
    throw Error("AI 查詢類型不符");
  const plan: CurriculumQueryPlan = { entity: input.entity as CurriculumEntity };
  for (const key of ["keyword", "publisher", "year", "lessonTitle", "sourceKind", "explanation"] as const) {
    const item = input[key];
    if (item !== undefined) {
      if (typeof item !== "string" || item.length > 160) throw Error(`AI 查詢欄位 ${key} 不符`);
      if (item.trim()) plan[key] = item.trim();
    }
  }
  if (input.grade !== undefined) {
    if (!Number.isInteger(input.grade) || Number(input.grade) < 1 || Number(input.grade) > 6)
      throw Error("AI 查詢年級不符");
    plan.grade = Number(input.grade);
  }
  if (input.term !== undefined) {
    if (!(["上", "下"] as unknown[]).includes(input.term)) throw Error("AI 查詢學期不符");
    plan.term = input.term as "上" | "下";
  }
  return plan;
}

export function compileCurriculumQuery(raw: CurriculumQueryPlan) {
  const plan = normalizeCurriculumPlan(raw),
    where: string[] = [],
    params: Array<string | number> = [];
  const add = (clause: string, value: string | number | undefined) => {
    if (value === undefined || value === "") return;
    where.push(clause);
    params.push(value);
  };
  if (plan.entity === "source") {
    add("kind = ?", plan.sourceKind);
    if (plan.keyword) {
      where.push("(title LIKE ? OR url LIKE ?)");
      params.push(`%${plan.keyword}%`, `%${plan.keyword}%`);
    }
  } else {
    add("e.publisher = ?", plan.publisher);
    add("e.year = ?", plan.year);
    add("e.grade = ?", plan.grade);
    add("e.term = ?", plan.term);
    if (plan.lessonTitle) {
      where.push("l.title LIKE ?");
      params.push(`%${plan.lessonTitle}%`);
    }
    if (plan.keyword) {
      const columns =
        plan.entity === "character"
          ? ["lc.glyph", "lc.reading", "lc.definition"]
          : plan.entity === "word"
            ? ["w.text", "w.reading", "w.definition", "lw.meaning"]
            : ["l.title"];
      where.push(`(${columns.map((column) => `${column} LIKE ?`).join(" OR ")})`);
      params.push(...columns.map(() => `%${plan.keyword}%`));
    }
  }
  const group = plan.entity === "lesson" ? " GROUP BY e.id, l.id" : "";
  return {
    sql: `${base[plan.entity]}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}${group} LIMIT 200`,
    params,
  };
}
