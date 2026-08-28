export type MobileNavIconName = "home" | "board" | "bookmark" | "profile";

type MobileNavIconProps = Readonly<{
  name: MobileNavIconName;
  className?: string;
}>;

function IconPaths({ name }: Readonly<{ name: MobileNavIconName }>) {
  switch (name) {
    case "home":
      return <path d="m3.5 10 8.5-7 8.5 7v10.5h-6v-6h-5v6h-6Z" />;
    case "board":
      return (
        <>
          <path d="M5 4h14v16H5Z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </>
      );
    case "bookmark":
      return <path d="M6 3.5h12v18L12 17l-6 4.5Z" />;
    case "profile":
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </>
      );
  }
}

export function MobileNavIcon({ name, className }: MobileNavIconProps) {
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
        strokeWidth="1.7"
      >
        <IconPaths name={name} />
      </g>
    </svg>
  );
}
