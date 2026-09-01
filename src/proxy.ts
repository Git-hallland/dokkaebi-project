import type { NextRequest } from "next/server";

import {
  frontendOnlyApiResponse,
  shouldBlockFrontendOnlyApi,
} from "@/lib/runtime-mode";

export function proxy(request: NextRequest) {
  if (shouldBlockFrontendOnlyApi(request.nextUrl.pathname)) {
    return frontendOnlyApiResponse();
  }
}

export const config = {
  matcher: "/api/:path*",
};
