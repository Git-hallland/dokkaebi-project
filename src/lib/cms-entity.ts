export const CMS_ENTITY_BOARD_TYPES = ["skills", "items", "monsters", "regions"] as const;
export const CMS_SKILL_CATEGORIES = ["절명", "척살", "강타", "파멸", "저격", "연타", "기동", "주술", "기만", "제압", "강인", "헌신", "미분류"] as const;
export const CMS_ITEM_CATEGORIES = ["무기", "방어구", "장신구", "소모품", "재료", "성장", "퀘스트", "재화", "기타"] as const;
export const CMS_DETAIL_STATUSES = ["PUBLISHED", "UNRELEASED"] as const;
export const CMS_DETAIL_STATUS_LABELS = { PUBLISHED: "정보 공개", UNRELEASED: "정보 미공개" } as const;
export type CmsDetailStatus = (typeof CMS_DETAIL_STATUSES)[number];

export const CMS_SKILL_LEVEL_LIMITS = {
  description: 5_000,
  label: 80,
  levels: 20,
  metadataBytes: 10_000,
  metadataItems: 20,
  metadataKey: 40,
  metadataValue: 200,
} as const;

export type CmsSkillLevelInput = Readonly<{
  description: string | null;
  id: string | null;
  label: string;
  metadata: Readonly<Record<string, string>>;
  order: number;
}>;

export function readSkillLevelMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export function filterEntityContents<T extends Readonly<{ entityCategory: string | null; summary: string | null; title: string }>>(
  contents: readonly T[],
  query: string,
  selectedCategory: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  return contents.filter((content) => {
    const category = content.entityCategory || "미분류";
    const categoryMatches = selectedCategory === "전체" || category === selectedCategory;
    const queryMatches = !normalizedQuery || [content.title, content.summary ?? "", category].some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
    return categoryMatches && queryMatches;
  });
}
