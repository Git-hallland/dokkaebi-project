import type { Metadata } from "next";
import { headers } from "next/headers";

import { ProfilePageClient } from "@/components/ProfilePageClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "프로필 | 도깨비의세계 비공식 위키",
  description: "도깨비의세계 비공식 위키의 로그인 및 사용자 프로필 페이지입니다.",
  robots: {
    index: false,
    follow: false,
  },
};

type ProfilePageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const [params, session] = await Promise.all([
    searchParams,
    headers().then((requestHeaders) => auth.api.getSession({ headers: requestHeaders })),
  ]);
  const authoredContents = session
    ? await prisma.content.findMany({
        where: { authorId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : [];

  return (
    <ProfilePageClient
      authoredContents={authoredContents.map((content) => ({
        ...content,
        createdAt: content.createdAt.toISOString(),
        updatedAt: content.updatedAt.toISOString(),
      }))}
      hasOAuthError={Boolean(params.authError ?? params.error)}
    />
  );
}
