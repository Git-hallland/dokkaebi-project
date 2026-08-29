export type GuideSummary = Readonly<{
  slug: string;
  category: string;
  title: string;
  summary: string;
  sourceStatus: string;
  updatedAt?: string;
  gameVersion?: string;
}>;

export const guideExamples: readonly GuideSummary[] = [
  {
    slug: "example-guide",
    category: "화면 예시",
    title: "공략 게시글 예시",
    summary:
      "공략 목록과 상세 화면 구성을 확인하기 위한 placeholder이며 실제 게임 정보가 아닙니다.",
    sourceStatus: "검수 전 예시",
  },
];

export function findGuide(slug: string) {
  return guideExamples.find((guide) => guide.slug === slug);
}
