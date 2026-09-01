export type BoardCategoryKey =
  | "guides"
  | "skills"
  | "items"
  | "monsters"
  | "regions"
  | "dungeons"
  | "crafting"
  | "events"
  | "patches";

export type BoardCategory = Readonly<{
  key: BoardCategoryKey;
  title: string;
  href: `/${string}`;
  description: string;
  homeDescription: string;
}>;

export const boardCategories: readonly BoardCategory[] = [
  {
    key: "guides",
    title: "공략게시판",
    href: "/community",
    description: "이용자가 작성한 공략과 팁을 최신순 또는 인기순으로 확인합니다.",
    homeDescription: "이용자가 공유한 공략과 팁을 확인하고 직접 작성할 수 있습니다.",
  },
  {
    key: "skills",
    title: "클래스 / 스킬",
    href: "/skills",
    description: "공식적으로 확인된 클래스와 스킬 정보를 정리하는 게시판입니다.",
    homeDescription: "공식적으로 공개된 전투와 성장 정보를 확인한 뒤 제공합니다.",
  },
  {
    key: "items",
    title: "아이템 / 장비",
    href: "/items",
    description: "출처가 확인된 아이템과 장비 정보를 정리하는 게시판입니다.",
    homeDescription: "획득과 활용 정보를 검증할 수 있는 자료가 확보되면 공개합니다.",
  },
  {
    key: "monsters",
    title: "몬스터 / 보스",
    href: "/monsters",
    description: "확인 가능한 몬스터와 보스 정보를 정리하는 게시판입니다.",
    homeDescription: "등장 조건과 공략 정보는 실제 확인 가능한 범위에서 다룹니다.",
  },
  {
    key: "regions",
    title: "지역 / NPC",
    href: "/regions",
    description: "공식적으로 확인된 지역과 NPC 정보를 정리하는 게시판입니다.",
    homeDescription: "지역과 인물 정보가 공식적으로 확인되면 찾아보기 쉽게 연결합니다.",
  },
  {
    key: "dungeons",
    title: "던전 / 콘텐츠",
    href: "/dungeons",
    description: "참여 조건과 진행 방식이 확인된 콘텐츠를 정리하는 게시판입니다.",
    homeDescription: "참여 조건과 진행 방식이 공개된 콘텐츠부터 정리합니다.",
  },
  {
    key: "crafting",
    title: "제작 / 생활",
    href: "/crafting",
    description: "검증된 제작과 생활 정보를 정리하는 게시판입니다.",
    homeDescription: "반복해서 찾아볼 가치가 있는 제작·생활 정보를 준비합니다.",
  },
  {
    key: "events",
    title: "이벤트 / 쿠폰",
    href: "/events",
    description: "기간과 출처가 확인된 이벤트와 쿠폰 정보를 정리하는 게시판입니다.",
    homeDescription: "기간과 출처를 다시 확인한 유효한 정보만 제공할 예정입니다.",
  },
  {
    key: "patches",
    title: "패치노트",
    href: "/patches",
    description: "공식 변경 사항과 적용 시점을 정리하는 게시판입니다.",
    homeDescription: "공식 변경 사항을 최신 정보와 이전 기록으로 구분해 정리합니다.",
  },
] as const;

export function getBoardCategory(key: BoardCategoryKey) {
  const category = boardCategories.find((item) => item.key === key);

  if (!category) {
    throw new Error(`Unknown board category: ${key}`);
  }

  return category;
}
