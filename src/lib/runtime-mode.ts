export const FRONTEND_ONLY_ENV = "FRONTEND_ONLY";

export function isFrontendOnlyValue(value: string | undefined) {
  return value === "true";
}

export function isFrontendOnly() {
  return isFrontendOnlyValue(process.env.FRONTEND_ONLY);
}

export function frontendOnlyApiResponse() {
  return Response.json(
    {
      code: "FRONTEND_ONLY_PREVIEW",
      error: "frontend_only_preview",
      message: "이 기능은 프론트엔드 미리보기 환경에서 사용할 수 없습니다.",
    },
    { status: 503 },
  );
}

export function shouldBlockFrontendOnlyApi(pathname: string, frontendOnly = isFrontendOnly()) {
  return frontendOnly && (pathname === "/api" || pathname.startsWith("/api/"));
}
