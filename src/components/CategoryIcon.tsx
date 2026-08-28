type CategoryIconProps = Readonly<{
  title: string;
  className?: string;
}>;

function IconPaths({ title }: Readonly<{ title: string }>) {
  switch (title) {
    case "초보자 가이드":
      return (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
          <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z" />
        </>
      );
    case "클래스 / 스킬":
      return (
        <>
          <path d="m14.5 4.5 5-1-1 5L9 18l-3 1 1-3Z" />
          <path d="m5 19-1.5 1.5M13 6l5 5M6.5 4.5v-2M5.5 3.5h2" />
        </>
      );
    case "아이템 / 장비":
      return (
        <path d="M12 3 5.5 5.5v5.8c0 4.2 2.6 7.9 6.5 9.7 3.9-1.8 6.5-5.5 6.5-9.7V5.5Zm-3 8.5 2 2 4-4" />
      );
    case "몬스터 / 보스":
      return (
        <>
          <path d="M7 8.5 4 5v5l2 2v4.5L9.5 21h5l3.5-4.5V12l2-2V5l-3 3.5" />
          <path d="M9 13h.01M15 13h.01M10 17h4" />
        </>
      );
    case "지역 / NPC":
      return (
        <>
          <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
          <circle cx="12" cy="10" r="2" />
        </>
      );
    case "던전 / 콘텐츠":
      return (
        <>
          <path d="M5 21V8l3-4h8l3 4v13M8 21v-9h8v9" />
          <path d="M10.5 16h3M12 14.5v3" />
        </>
      );
    case "제작 / 생활":
      return (
        <>
          <path d="m14 6 4-3 3 3-3 4M15.5 8.5 8 16" />
          <path d="m5.5 13.5 5 5L8 21l-5-5Z" />
        </>
      );
    case "이벤트 / 쿠폰":
      return (
        <>
          <path d="M4 10h16v11H4ZM3 6h18v4H3ZM12 6v15" />
          <path d="M12 6H8.5A2.5 2.5 0 1 1 11 3.5ZM12 6h3.5A2.5 2.5 0 1 0 13 3.5Z" />
        </>
      );
    case "패치노트":
    default:
      return (
        <>
          <path d="M6 3h8l4 4v14H6Z" />
          <path d="M14 3v5h4M9 12h6M9 16h6" />
        </>
      );
  }
}

export function CategoryIcon({ title, className }: CategoryIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      >
        <IconPaths title={title} />
      </g>
    </svg>
  );
}
