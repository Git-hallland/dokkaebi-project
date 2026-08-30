"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { boardCategories, type BoardCategoryKey } from "@/lib/board-categories";

import { CategoryIcon } from "./CategoryIcon";
import styles from "./MobileMenuDrawer.module.css";

const MENU_ORDER_KEY = "dokkaebiMobileMenuOrder";

type MenuKey = BoardCategoryKey;

const menuItems = boardCategories;

type MoveDirection = "left" | "right" | "up" | "down";

const defaultOrder: MenuKey[] = menuItems.map((item) => item.key);

function isValidOrder(value: unknown): value is MenuKey[] {
  if (!Array.isArray(value) || value.length !== defaultOrder.length) {
    return false;
  }

  const uniqueValues = new Set(value);
  return (
    uniqueValues.size === defaultOrder.length &&
    value.every((key) => defaultOrder.includes(key as MenuKey))
  );
}

function getMoveTarget(index: number, direction: MoveDirection) {
  if (direction === "left") return index % 3 === 0 ? -1 : index - 1;
  if (direction === "right") return index % 3 === 2 ? -1 : index + 1;
  if (direction === "up") return index - 3;
  return index + 3;
}

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
  const [isEditing, setIsEditing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<MenuKey | null>(null);
  const [menuOrder, setMenuOrder] = useState<MenuKey[]>(defaultOrder);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      try {
        const storedOrder = JSON.parse(window.localStorage.getItem(MENU_ORDER_KEY) ?? "null");
        if (isValidOrder(storedOrder)) {
          setMenuOrder(storedOrder);
        }
      } catch {
        setMenuOrder(defaultOrder);
      }
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setIsEditing(false);
    setSelectedKey(null);
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

  const moveSelectedItem = (direction: MoveDirection) => {
    if (!selectedKey) return;

    setMenuOrder((currentOrder) => {
      const currentIndex = currentOrder.indexOf(selectedKey);
      const targetIndex = getMoveTarget(currentIndex, direction);

      if (targetIndex < 0 || targetIndex >= currentOrder.length) return currentOrder;

      const nextOrder = [...currentOrder];
      [nextOrder[currentIndex], nextOrder[targetIndex]] = [
        nextOrder[targetIndex],
        nextOrder[currentIndex],
      ];
      try {
        window.localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(nextOrder));
      } catch {
        // Keep the reordered menu in memory when storage is unavailable.
      }
      return nextOrder;
    });
  };

  const orderedItems = menuOrder.map(
    (key) => menuItems.find((item) => item.key === key) ?? menuItems[0],
  );
  const selectedIndex = selectedKey ? menuOrder.indexOf(selectedKey) : -1;

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
          <div className={`${styles.menuGrid} ${isEditing ? styles.editing : ""}`}>
            {orderedItems.map((item) => {
              const itemContent = (
                <>
                  <CategoryIcon className={styles.menuIcon} title={item.title} />
                  <span>{item.title}</span>
                </>
              );

              if (isEditing) {
                return (
                  <button
                    key={item.key}
                    className={`${styles.menuItem} ${selectedKey === item.key ? styles.selected : ""}`}
                    type="button"
                    aria-pressed={selectedKey === item.key}
                    onClick={() => setSelectedKey(item.key)}
                  >
                    {itemContent}
                  </button>
                );
              }

              const isCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.key}
                  className={`${styles.menuItem} ${isCurrent ? styles.current : ""}`}
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={closeDrawer}
                >
                  {itemContent}
                </Link>
              );
            })}
          </div>
        </nav>

        {isEditing ? (
          <div className={styles.editPanel}>
            <p role="status">
              {selectedKey
                ? `${menuItems.find((item) => item.key === selectedKey)?.title} 선택됨`
                : "이동할 메뉴를 먼저 선택하세요."}
            </p>
            <div className={styles.moveControls} aria-label="메뉴 순서 이동">
              <button
                type="button"
                aria-label="선택한 메뉴 왼쪽으로 이동"
                disabled={selectedIndex < 0 || selectedIndex % 3 === 0}
                onClick={() => moveSelectedItem("left")}
              >
                ←
              </button>
              <button
                type="button"
                aria-label="선택한 메뉴 위로 이동"
                disabled={selectedIndex < 3}
                onClick={() => moveSelectedItem("up")}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="선택한 메뉴 아래로 이동"
                disabled={selectedIndex < 0 || selectedIndex + 3 >= menuOrder.length}
                onClick={() => moveSelectedItem("down")}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="선택한 메뉴 오른쪽으로 이동"
                disabled={
                  selectedIndex < 0 ||
                  selectedIndex % 3 === 2 ||
                  selectedIndex + 1 >= menuOrder.length
                }
                onClick={() => moveSelectedItem("right")}
              >
                →
              </button>
            </div>
          </div>
        ) : null}

        <button
          className={styles.editButton}
          type="button"
          onClick={() => {
            setIsEditing((current) => !current);
            setSelectedKey(null);
          }}
        >
          {isEditing ? "편집 완료" : "메뉴 편집"}
        </button>
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
