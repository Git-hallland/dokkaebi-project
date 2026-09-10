"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { boardCategories } from "@/lib/board-categories";

import { CategoryIcon } from "./CategoryIcon";
import styles from "./MobileMenuDrawer.module.css";

const menuItems = boardCategories;
const prefetchedRoutes = new Set(["/community", "/skills", "/items"]);

type MobileMenuDrawerProps = Readonly<{
  triggerClassName: string;
}>;

export function MobileMenuDrawer({ triggerClassName }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    const layerElement = drawerRef.current?.parentElement;
    const backgroundElements = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element !== layerElement,
      )
      .map((element) => ({ element, wasInert: element.inert }));

    backgroundElements.forEach(({ element }) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";

    const focusTimer = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusableElements = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      backgroundElements.forEach(({ element, wasInert }) => {
        element.inert = wasInert;
      });
      triggerElement?.focus();
    };
  }, [closeDrawer, isOpen]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 62rem)");
    const handleBreakpointChange = () => {
      if (!mobileQuery.matches) closeDrawer();
    };

    mobileQuery.addEventListener("change", handleBreakpointChange);
    return () => mobileQuery.removeEventListener("change", handleBreakpointChange);
  }, [closeDrawer]);

  const drawer = (
    <div className={`${styles.layer} ${isOpen ? styles.layerOpen : ""}`}>
      <button
        className={styles.backdrop}
        type="button"
        aria-label="메뉴 닫기"
        tabIndex={-1}
        onClick={closeDrawer}
      />
      <section
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
      >
        <header className={styles.drawerHeader}>
          <div>
            <span>도깨비의 세계 WIKI</span>
            <h2 id="mobile-menu-title">전체 메뉴</h2>
          </div>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            type="button"
            aria-label="메뉴 닫기"
            onClick={closeDrawer}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <nav aria-label="모바일 전체 카테고리">
          <div className={styles.menuGrid}>
            {menuItems.map((item) => {
              const itemContent = (
                <>
                  <CategoryIcon className={styles.menuIcon} title={item.title} />
                  <span>{item.title}</span>
                </>
              );

              const isCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.key}
                  className={`${styles.menuItem} ${isCurrent ? styles.current : ""}`}
                  href={item.href}
                  prefetch={prefetchedRoutes.has(item.href)}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={closeDrawer}
                >
                  {itemContent}
                </Link>
              );
            })}
          </div>
        </nav>
      </section>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        className={triggerClassName}
        type="button"
        aria-label="메뉴 열기"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {isMounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
