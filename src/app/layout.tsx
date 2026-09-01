import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DesktopAdRail } from "@/components/DesktopAdRail";
import { FloatingAdSlot } from "@/components/FloatingAdSlot";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Sidebar } from "@/components/Sidebar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { isFrontendOnly } from "@/lib/runtime-mode";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "DokkaebiProject | 도깨비의세계 비공식 위키",
  description: "도깨비의세계 정보를 준비 중인 비공식 팬 위키입니다.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  const frontendOnly = isFrontendOnly();
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 건너뛰기
        </a>
        <SiteHeader frontendOnly={frontendOnly} />
        {frontendOnly ? <div className={styles.previewBadge}>Frontend Preview</div> : null}
        <div className={styles.shell}>
          <Sidebar />
          <main id="main-content" className={styles.content}>
            {children}
          </main>
          <DesktopAdRail />
        </div>
        <SiteFooter />
        <FloatingAdSlot />
        <MobileBottomNav frontendOnly={frontendOnly} />
      </body>
    </html>
  );
}
