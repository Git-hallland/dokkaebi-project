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

test("footer external links are accessible and open safely in a new tab", () => {
  for (const href of [
    "https://open.kakao.com/o/gESeLyBi",
    "https://toon.at/donate/hallland",
  ]) {
    assert.match(footer, new RegExp(`href="${href.replaceAll("/", "\\/")}"`, "u"));
  }

  assert.equal((footer.match(/target="_blank"/gu) ?? []).length, 2);
  assert.equal((footer.match(/rel="noopener noreferrer"/gu) ?? []).length, 2);
  assert.equal((footer.match(/aria-label="[^"]+새 탭에서 열기"/gu) ?? []).length, 2);
  assert.match(footerCss, /min-height:\s*2\.75rem/u);
  assert.match(footerCss, /flex-wrap:\s*wrap/u);
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
