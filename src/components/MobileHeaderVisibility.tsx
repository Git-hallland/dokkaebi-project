"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 62rem)";
const SCROLL_THRESHOLD = 18;
const TOP_VISIBILITY_RANGE = 24;

type MobileHeaderVisibilityProps = Readonly<{
  children: ReactNode;
  className: string;
  hiddenClassName: string;
}>;

export function MobileHeaderVisibility({
  children,
  className,
  hiddenClassName,
}: MobileHeaderVisibilityProps) {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const frameId = useRef<number | null>(null);

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    lastScrollY.current = window.scrollY;

    const updateVisibility = () => {
      frameId.current = null;

      const currentScrollY = Math.max(window.scrollY, 0);

      if (!mobileQuery.matches || currentScrollY <= TOP_VISIBILITY_RANGE) {
        setIsHidden(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      const scrollDelta = currentScrollY - lastScrollY.current;

      if (Math.abs(scrollDelta) < SCROLL_THRESHOLD) {
        return;
      }

      setIsHidden(scrollDelta > 0);
      lastScrollY.current = currentScrollY;
    };

    const handleScroll = () => {
      if (frameId.current === null) {
        frameId.current = window.requestAnimationFrame(updateVisibility);
      }
    };

    const handleBreakpointChange = () => {
      lastScrollY.current = window.scrollY;
      setIsHidden(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    mobileQuery.addEventListener("change", handleBreakpointChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      mobileQuery.removeEventListener("change", handleBreakpointChange);

      if (frameId.current !== null) {
        window.cancelAnimationFrame(frameId.current);
      }
    };
  }, []);

  return (
    <header className={isHidden ? `${className} ${hiddenClassName}` : className}>
      {children}
    </header>
  );
}
