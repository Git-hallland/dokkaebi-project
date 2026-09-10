"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import type { SiteSearchResult } from "@/lib/site-search";

import styles from "./SiteSearch.module.css";

type SiteSearchProps = Readonly<{
  inputId: string;
  className?: string;
}>;

export function SiteSearch({ inputId, className }: SiteSearchProps) {
  const router = useRouter();
  const generatedId = useId();
  const listId = `${inputId}-${generatedId.replace(/:/gu, "")}-suggestions`;
  const statusId = `${inputId}-status`;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("검색어를 두 글자 이상 입력하면 빠른 결과를 보여드립니다.");
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const normalized = query.trim();
    if (Array.from(normalized).length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsLoading(true);
      void fetch(`/api/search/suggestions?q=${encodeURIComponent(normalized)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as { message?: string; results?: SiteSearchResult[] };
          if (!response.ok) throw new Error(payload.message ?? "현재 검색할 수 없습니다.");
          const nextResults = payload.results ?? [];
          setResults(nextResults);
          setActiveIndex(-1);
          setMessage(nextResults.length > 0 ? `${nextResults.length}개의 빠른 검색 결과` : "검색 결과가 없습니다.");
          setIsOpen(true);
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setResults([]);
            setMessage(error instanceof Error ? error.message : "현재 검색할 수 없습니다.");
            setIsOpen(true);
          }
        })
        .finally(() => setIsLoading(false));
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function submitSearch() {
    const normalized = query.trim();
    if (!normalized) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(normalized)}`);
  }

  return (
    <form
      className={`${styles.wrapper} ${className ?? ""}`}
      role="search"
      aria-label="위키 전체 검색"
      onSubmit={(event) => {
        event.preventDefault();
        submitSearch();
      }}
    >
      <div className={styles.search}>
        <svg className={styles.icon} aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <label className="sr-only" htmlFor={inputId}>위키 전체 검색</label>
        <input
          id={inputId}
          type="search"
          placeholder="도술, 아이템, 공략 검색"
          value={query}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-describedby={statusId}
          aria-expanded={isOpen}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setActiveIndex(-1);
            if (Array.from(value.trim()).length < 2) {
              setResults([]);
              setIsOpen(false);
              setIsLoading(false);
              setMessage("검색어를 두 글자 이상 입력하면 빠른 결과를 보여드립니다.");
            }
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              setActiveIndex(-1);
            } else if (event.key === "ArrowDown" && results.length > 0) {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp" && results.length > 0) {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
              event.preventDefault();
              setIsOpen(false);
              router.push(results[activeIndex].href);
            }
          }}
        />
        <button type="submit" disabled={!query.trim()}>검색</button>
      </div>
      <span id={statusId} className="sr-only" aria-live="polite">
        {isLoading ? "검색 중입니다." : message}
      </span>
      {isOpen ? (
        <div className={styles.suggestions}>
          {results.length > 0 ? (
            <ul id={listId} role="listbox">
              {results.map((result, index) => (
                <li id={`${listId}-${index}`} role="option" aria-selected={activeIndex === index} key={`${result.type}-${result.id}`}>
                  <Link href={result.href} onClick={() => setIsOpen(false)}>
                    <strong>{result.title}</strong>
                    <span>{result.typeLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">{isLoading ? "검색 중…" : message}</p>
          )}
          <button className={styles.allResults} type="submit">전체 검색 결과 보기</button>
        </div>
      ) : null}
    </form>
  );
}
