type GuideSection = Readonly<{
  title: string;
  paragraphs: readonly string[];
  items?: readonly string[];
}>;

type GuideSource = Readonly<{
  title: string;
  url: string;
  publishedAt: string;
  checkedAt: string;
}>;

type ContentStatus = "draft" | "review" | "published" | "archived";

export type GuideSummary = Readonly<{
  slug: string;
  category: string;
  title: string;
  summary: string;
  contentStatus: ContentStatus;
  sourceStatus: string;
  updatedAt?: string;
  gameVersion?: string;
  notice: string;
  sections: readonly GuideSection[];
  sources: readonly GuideSource[];
}>;

export const guides: readonly GuideSummary[] = [
  {
    slug: "official-systems-overview",
    category: "공식 정보",
    title: "출시 전 공개 시스템 한눈에 보기",
    summary:
      "공식 미디어 쇼케이스에서 공개된 주요 시스템과 현재 확인 가능한 범위를 정리했습니다.",
    contentStatus: "published",
    sourceStatus: "공식 출처 확인",
    updatedAt: "2026-08-30",
    gameVersion: "출시 전 공개 정보",
    notice:
      "이 문서는 출시 전 공식 발표를 요약한 자료입니다. 실제 플레이 방식과 수치는 출시 후 달라질 수 있습니다.",
    sections: [
      {
        title: "공개된 주요 시스템",
        paragraphs: [
          "카카오게임즈는 도깨비의세계를 2D 도트 캐릭터와 3D 배경을 결합한 2.5D MMORPG로 소개했습니다.",
        ],
        items: [
          "직업에 구애받지 않고 12개의 스킬 스타일을 조합하는 무한 스킬 덱 빌딩",
          "이용자가 참여 여부를 직접 선택하는 선택적 PvP",
          "오프라인 상태에서도 활동하는 문파 PvE 분신 파견",
          "활동 데이터를 바탕으로 정보를 제공하는 AI 비서 묘롱",
          "최대 9,000명이 참여할 수 있다고 발표된 차원 점령전",
        ],
      },
      {
        title: "아직 확인이 필요한 부분",
        paragraphs: [
          "공식 발표는 시스템의 방향과 명칭을 소개한 단계입니다. 세부 규칙, 보상, 밸런스, 참여 조건은 9월 온라인 쇼케이스와 후속 공지를 통해 추가 공개될 예정입니다.",
          "현재 공개 정보만으로 특정 스킬 조합이나 콘텐츠 공략을 단정하지 않으며, 출시 후 실제 게임 버전을 기준으로 다시 검수합니다.",
        ],
      },
      {
        title: "출시 일정 기준",
        paragraphs: [
          "2026년 8월 27일 카카오게임즈 보도자료 기준으로 9월 온라인 쇼케이스와 10월 정식 출시를 목표로 준비 중입니다. 목표 일정은 변경될 수 있으므로 최신 공식 공지를 우선합니다.",
        ],
      },
    ],
    sources: [
      {
        title: "신작 ‘도깨비의세계’ 미디어 쇼케이스 개최… 20일 사전등록 시작",
        url: "https://www.kakaogamescorp.com/news/press/detail/2382",
        publishedAt: "2026-08-20",
        checkedAt: "2026-08-30",
      },
      {
        title: "신작 2.5D MMORPG ‘도깨비의세계’, 반란 광고 조회수 1,000만 돌파",
        url: "https://www.kakaogamescorp.com/news/press/detail/2387",
        publishedAt: "2026-08-27",
        checkedAt: "2026-08-30",
      },
    ],
  },
];

export const publishedGuides = guides.filter((guide) => guide.contentStatus === "published");

export function findPublishedGuide(slug: string) {
  return publishedGuides.find((guide) => guide.slug === slug);
}
