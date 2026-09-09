export const CMS_BOARD_CONFIG = [
  { key: "skills", href: "/skills", label: "도술" },
  { key: "items", href: "/items", label: "아이템 / 장비" },
  { key: "monsters", href: "/monsters", label: "몬스터 / 보스" },
  { key: "regions", href: "/regions", label: "지역 / NPC" },
  { key: "dungeons", href: "/dungeons", label: "던전 / 콘텐츠" },
  { key: "crafting", href: "/crafting", label: "제작 / 생활" },
  { key: "events", href: "/events", label: "이벤트 / 쿠폰" },
  { key: "patches", href: "/patches", label: "패치노트" },
] as const;

export type CmsBoardType = (typeof CMS_BOARD_CONFIG)[number]["key"];

export const CMS_BOARD_TYPES = CMS_BOARD_CONFIG.map((board) => board.key) as readonly CmsBoardType[];

export function getCmsBoard(type: CmsBoardType) {
  const board = CMS_BOARD_CONFIG.find((candidate) => candidate.key === type);
  if (!board) throw new Error(`Unknown CMS board: ${type}`);
  return board;
}
