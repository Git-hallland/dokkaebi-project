import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [headerCss, mobileMenu, footer, footerCss, layoutCss, sidebarCss, adRailCss, globalsCss, homeCss] =
  await Promise.all([
    readFile(new URL("../components/SiteHeader.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/MobileMenuDrawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/Sidebar.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/DesktopAdRail.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.module.css", import.meta.url), "utf8"),
  ]);

const [rootLayout, packageJson] = await Promise.all([
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../package.json", import.meta.url), "utf8"),
]);

test("Vercel Web Analytics is mounted once in the root layout", () => {
  assert.match(packageJson, /"@vercel\/analytics":/u);
  assert.match(rootLayout, /import \{ Analytics \} from "@vercel\/analytics\/next";/u);
  assert.equal((rootLayout.match(/<Analytics\s*\/>/gu) ?? []).length, 1);
});

test("desktop header keeps the logo centered and utilities in the right column", () => {
  assert.match(
    headerCss,
    /grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\)/u,
  );
  assert.match(headerCss, /\.brand\s*\{[\s\S]*grid-column:\s*2/u);
  assert.match(headerCss, /\.desktopTools\s*\{[\s\S]*grid-column:\s*3/u);
  assert.match(headerCss, /\.desktopTools\s*\{[\s\S]*justify-content:\s*flex-end/u);
});

test("mobile drawer no longer exposes or persists menu editing", () => {
  assert.doesNotMatch(mobileMenu, /메뉴\s*편집|편집\s*완료/u);
  assert.doesNotMatch(mobileMenu, /localStorage|MENU_ORDER_KEY|moveSelectedItem/u);
  assert.match(mobileMenu, /menuItems\.map/u);
});

test("community links moved out of the footer without removing policy information", async () => {
  const cards = await readFile(new URL("../components/HomeCommunityCards.tsx", import.meta.url), "utf8");
  for (const href of [
    "https://open.kakao.com/o/gESeLyBi",
    "https://toon.at/donate/hallland",
  ]) {
    assert.match(cards, new RegExp(`href="${href.replaceAll("/", "\\/")}"`, "u"));
  }

  assert.equal((cards.match(/target="_blank"/gu) ?? []).length, 2);
  assert.equal((cards.match(/rel="noopener noreferrer"/gu) ?? []).length, 2);
  assert.doesNotMatch(footer, /SupporterRanking|open\.kakao\.com|toon\.at/u);
  assert.match(footer, /위키 운영 원칙/u);
});

test("supporter ranking is an accessible responsive modal", async () => {
  const [ranking, rankingCss] = await Promise.all([
    readFile(new URL("../components/SupporterRanking.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SupporterRanking.module.css", import.meta.url), "utf8"),
  ]);
  assert.match(ranking, /<dialog/u);
  assert.match(ranking, /showModal\(\)/u);
  assert.match(ranking, /aria-labelledby="supporter-ranking-title"/u);
  assert.match(ranking, /aria-label="후원자 랭킹 닫기"/u);
  assert.match(rankingCss, /grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/u);
  assert.match(rankingCss, /@media \(max-width: 30rem\)[\s\S]*grid-template-columns: 1fr/u);
});

test("foldable widths retain the mobile shell until the shared desktop breakpoint", () => {
  for (const source of [headerCss, layoutCss, sidebarCss]) {
    assert.match(source, /max-width:\s*62rem/u);
  }
  assert.match(adRailCss, /max-width:\s*75rem/u);
  assert.doesNotMatch(
    [headerCss, layoutCss, sidebarCss, adRailCss, footerCss].join("\n"),
    /@media\s*\(width:/u,
  );
  assert.match(globalsCss, /html\s*\{[\s\S]*min-width:\s*0/u);
  assert.match(homeCss, /@media\s*\(max-width:\s*75rem\)[\s\S]*\.hero\s*\{[\s\S]*margin-inline:\s*0/u);
});

test("search suggestions and video carousel stay responsive and keyboard accessible", async () => {
  const [search, searchCss, carousel] = await Promise.all([
    readFile(new URL("../components/SiteSearch.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteSearch.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/YouTubeVideoCarousel.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(search, /role="combobox"/u);
  assert.match(search, /event\.key === "Escape"/u);
  assert.match(search, /event\.key === "ArrowDown"/u);
  assert.match(search, /\}, 250\)/u);
  assert.match(searchCss, /calc\(100vw - 2rem\)/u);
  assert.match(carousel, /aria-label="이전 인기 영상"/u);
  assert.match(carousel, /aria-label="다음 인기 영상"/u);
  assert.match(carousel, /AUTO_SLIDE_INTERVAL_MS = 3_000/u);
  assert.match(carousel, /INTERACTION_PAUSE_MS = 7_000/u);
  assert.match(carousel, /document\.visibilityState/u);
  assert.match(carousel, /prefers-reduced-motion: reduce/u);
  assert.doesNotMatch(carousel, /reducedMotionRef\.current\) return/u);
  assert.match(carousel, /ResizeObserver/u);
  assert.doesNotMatch(carousel, /hoveredRef/u);
  assert.match(homeCss, /\.videoCarousel\s*\{[\s\S]*overflow:\s*hidden/u);
  assert.match(homeCss, /\.videoRailAnimating\s*\{[\s\S]*transform 1000ms cubic-bezier\(0\.25, 0\.46, 0\.45, 0\.94\)/u);
  assert.match(homeCss, /\.videoRail\s*\{[\s\S]*will-change:\s*transform/u);
  assert.match(homeCss, /\.carouselActions\s*\{[\s\S]*position:\s*absolute/u);
  assert.match(homeCss, /\.carouselActions\s*\{[\s\S]*top:\s*calc\(9\.375cqi/u);
  assert.match(homeCss, /\.popularPanel \[role="tabpanel"\][\s\S]*overflow:\s*hidden/u);
  assert.match(homeCss, /--video-card-width:\s*calc\(100% - var\(--video-card-gap\) - var\(--video-card-peek\)\)/u);
  assert.match(carousel, /style=\{\{ transform: `translate3d/u);
  assert.match(carousel, /videos\.slice\(-cloneCount\)[\s\S]*videos\.slice\(0, cloneCount\)/u);
  assert.match(carousel, /setPointerCapture/u);
  assert.match(carousel, /onTransitionEnd=\{handleTransitionEnd\}/u);
  assert.match(carousel, /normalizeTrackPosition/u);
  assert.match(carousel, /sourceIndex === activeSourceIndex \? styles\.activeVideo/u);
  assert.match(homeCss, /li:not\(\.activeVideo\)[\s\S]*\.videoMeta[\s\S]*opacity:\s*0/u);
  assert.match(carousel, /const animateTo = useCallback/u);
  assert.match(carousel, /requestAnimationFrame\(\(\) => \{[\s\S]*requestAnimationFrame/u);
  assert.doesNotMatch(carousel, /scrollLeft|scrollTo|scrollSnapType/u);
});

test("home starts on videos and route loading waits before it becomes visible", async () => {
  const [tabs, loading] = await Promise.all([
    readFile(new URL("../app/HomePopularTabs.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/DelayedLoadingFallback.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(tabs, /useState<TabKey>\("videos"\)/u);
  assert.ok(tabs.indexOf("인기 영상") < tabs.indexOf("인기글"));
  assert.match(loading, /LOADING_DELAY_MS = 250/u);
  assert.match(loading, /clearTimeout/u);
  assert.doesNotMatch(loading, /await new Promise/u);
});
