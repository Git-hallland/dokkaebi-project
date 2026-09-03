"use client";

import { usePathname } from "next/navigation";
import styles from "./DesktopAdRail.module.css";

type AdSize = "300x250" | "300x600" | "fluid";

const STANDARD_AD_ROUTES = new Set([
  "/",
  "/community",
  "/guides",
  "/skills",
  "/items",
  "/monsters",
  "/regions",
  "/dungeons",
  "/crafting",
  "/events",
  "/patches",
]);

function usesStandardAdRail(pathname: string) {
  return (
    STANDARD_AD_ROUTES.has(pathname) ||
    pathname.startsWith("/community/") ||
    pathname.startsWith("/guides/")
  );
}

export function AdSlot({ position, size }: Readonly<{ position: number; size: AdSize }>) {
  const label = size === "fluid" ? "배너 영역" : size.replace("x", " × ");
  const sizeClass = size === "300x250" ? styles.size300x250 : size === "300x600" ? styles.size300x600 : "";

  return (
    <div
      className={`${styles.slot} ${sizeClass}`}
      role="region"
      aria-label={`광고 영역 ${position}, ${label}`}
      data-ad-size={size}
    >
      <span>광고</span>
      <small>{label}</small>
    </div>
  );
}

export function DesktopAdRail() {
  const pathname = usePathname();
  const isStandardAdRoute = usesStandardAdRail(pathname);

  return (
    <aside
      className={`${styles.rail} ${isStandardAdRoute ? styles.standardRail : ""}`}
      aria-label="우측 광고"
      data-standard-ads={isStandardAdRoute ? "true" : undefined}
    >
      <AdSlot position={1} size={isStandardAdRoute ? "300x250" : "fluid"} />
      <AdSlot position={2} size={isStandardAdRoute ? "300x600" : "fluid"} />
    </aside>
  );
}
